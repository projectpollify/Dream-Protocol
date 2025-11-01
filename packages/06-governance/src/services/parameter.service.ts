/**
 * Module 06: Governance - Parameter Whitelist Service
 * Dream Protocol - Manage voteable platform parameters
 *
 * Handles:
 * - Parameter validation and bounds checking
 * - Vote proposal creation for parameters
 * - Super-majority enforcement
 * - Voting history tracking
 */

import { PoolClient } from 'pg';
import { query, transaction } from '../utils/database';
import {
  ParameterCategory,
  ValueType,
  PollType,
} from '../types';

// ============================================================================
// Types
// ============================================================================

export interface Parameter {
  id: string;
  parameterName: string;
  parameterCategory: ParameterCategory;
  valueType: ValueType;
  minValue?: string;
  maxValue?: string;
  defaultValue: string;
  currentValue: string;
  description: string;
  rationale?: string;
  requiresSuperMajority: boolean;
  minimumVoteDurationDays: number;
  maximumVoteDurationDays: number;
  requiresVerificationToVote: boolean;
  minimumVoteQuorum: number;
  quorumPercentageOfVerified: number;
  quorumEnforcement: 'absolute' | 'percentage' | 'either';
  isVoteable: boolean;
  isEmergencyParameter: boolean;
  lastVotedOn?: Date;
  timesVotedOn: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ParameterValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ParameterVoteHistory {
  pollId: string;
  votedOn: Date;
  oldValue: string;
  newValue: string;
  approved: boolean;
  yesPercentage: number;
}

// ============================================================================
// Parameter Retrieval
// ============================================================================

/**
 * Get all voteable parameters
 */
export async function getAllParameters(
  filters?: {
    category?: ParameterCategory;
    voteableOnly?: boolean;
  }
): Promise<Parameter[]> {
  let sql = `SELECT * FROM parameter_whitelist WHERE 1=1`;
  const params: any[] = [];
  let paramIndex = 1;

  if (filters?.category) {
    sql += ` AND parameter_category = $${paramIndex}`;
    params.push(filters.category);
    paramIndex++;
  }

  if (filters?.voteableOnly) {
    sql += ` AND is_voteable = TRUE`;
  }

  sql += ` ORDER BY parameter_category, parameter_name`;

  const result = await query(sql, params);
  return result.rows.map(mapRowToParameter);
}

/**
 * Get specific parameter by name
 */
export async function getParameterByName(
  parameterName: string
): Promise<Parameter | null> {
  const result = await query(
    `SELECT * FROM parameter_whitelist WHERE parameter_name = $1`,
    [parameterName]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapRowToParameter(result.rows[0]);
}

/**
 * Get parameter details for poll creation
 */
export async function getParameterDetails(
  client: PoolClient | null,
  parameterName: string
): Promise<{
  currentValue: string;
  minValue?: string;
  maxValue?: string;
  requiresSuperMajority: boolean;
  isVoteable: boolean;
}> {
  const queryFn = client ? client.query.bind(client) : query;

  const result = await queryFn(
    `SELECT current_value, min_value, max_value, requires_super_majority, is_voteable
     FROM parameter_whitelist
     WHERE parameter_name = $1`,
    [parameterName]
  );

  if (result.rows.length === 0) {
    throw new Error(`Parameter not found: ${parameterName}`);
  }

  const row = result.rows[0];

  return {
    currentValue: row.current_value,
    minValue: row.min_value || undefined,
    maxValue: row.max_value || undefined,
    requiresSuperMajority: row.requires_super_majority,
    isVoteable: row.is_voteable,
  };
}

// ============================================================================
// Parameter Validation
// ============================================================================

/**
 * Validate a proposed parameter value against constraints
 */
export async function validateParameterValue(
  parameterName: string,
  proposedValue: string
): Promise<ParameterValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Get parameter definition
  const parameter = await getParameterByName(parameterName);

  if (!parameter) {
    errors.push(`Parameter '${parameterName}' is not in the whitelist`);
    return { isValid: false, errors, warnings };
  }

  if (!parameter.isVoteable) {
    errors.push(`Parameter '${parameterName}' is currently not voteable (may be frozen)`);
    return { isValid: false, errors, warnings };
  }

  // Validate value type
  const typeValidation = validateValueType(proposedValue, parameter.valueType);
  if (!typeValidation.isValid) {
    errors.push(`Invalid value type. Expected ${parameter.valueType}.`);
    return { isValid: false, errors, warnings };
  }

  // Validate bounds (for numeric types)
  if (parameter.valueType === ValueType.INTEGER || parameter.valueType === ValueType.DECIMAL) {
    const numValue = parseFloat(proposedValue);

    if (parameter.minValue !== null && parameter.minValue !== undefined) {
      const minValue = parseFloat(parameter.minValue);
      if (numValue < minValue) {
        errors.push(`Value ${proposedValue} is below minimum allowed value: ${parameter.minValue}`);
      }
    }

    if (parameter.maxValue !== null && parameter.maxValue !== undefined) {
      const maxValue = parseFloat(parameter.maxValue);
      if (numValue > maxValue) {
        errors.push(`Value ${proposedValue} is above maximum allowed value: ${parameter.maxValue}`);
      }
    }
  }

  // Check if value is same as current
  if (proposedValue === parameter.currentValue) {
    warnings.push(`Proposed value is identical to current value: ${parameter.currentValue}`);
  }

  // Check if parameter requires super-majority
  if (parameter.requiresSuperMajority) {
    warnings.push(`This parameter requires 66% super-majority approval`);
  }

  // Check if parameter is emergency parameter
  if (parameter.isEmergencyParameter) {
    warnings.push(`This is an emergency parameter - changes take effect immediately`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate value type
 */
function validateValueType(
  value: string,
  expectedType: ValueType
): { isValid: boolean } {
  switch (expectedType) {
    case ValueType.INTEGER:
      return { isValid: /^-?\d+$/.test(value) && !isNaN(parseInt(value, 10)) };

    case ValueType.DECIMAL:
      return { isValid: !isNaN(parseFloat(value)) };

    case ValueType.BOOLEAN:
      return { isValid: value === 'true' || value === 'false' };

    case ValueType.TEXT:
      return { isValid: true }; // Any string is valid for text

    default:
      return { isValid: false };
  }
}

// ============================================================================
// Parameter Voting History
// ============================================================================

/**
 * Get voting history for a parameter
 */
export async function getParameterVotingHistory(
  parameterName: string
): Promise<ParameterVoteHistory[]> {
  const result = await query(
    `SELECT
      gp.id as poll_id,
      gp.created_at as voted_on,
      gp.parameter_current_value as old_value,
      gp.parameter_proposed_value as new_value,
      gp.status = 'approved' as approved,
      gp.final_yes_percentage as yes_percentage
     FROM governance_polls gp
     WHERE gp.parameter_name = $1
       AND gp.poll_type = $2
     ORDER BY gp.created_at DESC`,
    [parameterName, PollType.PARAMETER_VOTE]
  );

  return result.rows.map(row => ({
    pollId: row.poll_id,
    votedOn: row.voted_on,
    oldValue: row.old_value,
    newValue: row.new_value,
    approved: row.approved,
    yesPercentage: parseFloat(row.yes_percentage || '0'),
  }));
}

/**
 * Update parameter after successful vote
 */
export async function updateParameterValue(
  client: PoolClient,
  parameterName: string,
  newValue: string
): Promise<void> {
  await client.query(
    `UPDATE parameter_whitelist
     SET current_value = $1,
         last_voted_on = NOW(),
         times_voted_on = times_voted_on + 1,
         updated_at = NOW()
     WHERE parameter_name = $2`,
    [newValue, parameterName]
  );
}

// ============================================================================
// Parameter Freezing (After Rollbacks)
// ============================================================================

/**
 * Freeze parameter after 3 rollbacks
 */
export async function freezeParameter(
  client: PoolClient,
  parameterName: string,
  freezeDays: number = 90
): Promise<void> {
  await client.query(
    `UPDATE parameter_whitelist
     SET is_voteable = FALSE,
         updated_at = NOW()
     WHERE parameter_name = $1`,
    [parameterName]
  );
}

/**
 * Unfreeze parameter after freeze period expires
 */
export async function unfreezeParameter(
  parameterName: string
): Promise<void> {
  await query(
    `UPDATE parameter_whitelist
     SET is_voteable = TRUE,
         updated_at = NOW()
     WHERE parameter_name = $1`,
    [parameterName]
  );
}

/**
 * Check if parameter is frozen
 */
export async function isParameterFrozen(
  parameterName: string
): Promise<boolean> {
  const result = await query(
    `SELECT is_voteable FROM parameter_whitelist WHERE parameter_name = $1`,
    [parameterName]
  );

  if (result.rows.length === 0) {
    return false;
  }

  return !result.rows[0].is_voteable;
}

// ============================================================================
// Seed Initial Parameters
// ============================================================================

/**
 * Seed the initial 9 parameters from the spec
 */
export async function seedInitialParameters(): Promise<void> {
  const initialParameters = [
    // Economic Accessibility (4 parameters)
    {
      parameterName: 'poll_creation_cost_general',
      parameterCategory: ParameterCategory.ECONOMIC_ACCESSIBILITY,
      valueType: ValueType.INTEGER,
      minValue: '100',
      maxValue: '5000',
      defaultValue: '500',
      currentValue: '500',
      description: 'Cost in PollCoin to create a general community poll',
      rationale: 'Prevents spam while keeping polls accessible',
      requiresSuperMajority: false,
      minimumVoteDurationDays: 7,
      maximumVoteDurationDays: 14,
    },
    {
      parameterName: 'poll_creation_cost_parameter',
      parameterCategory: ParameterCategory.ECONOMIC_ACCESSIBILITY,
      valueType: ValueType.INTEGER,
      minValue: '500',
      maxValue: '10000',
      defaultValue: '1000',
      currentValue: '1000',
      description: 'Cost in PollCoin to create a parameter vote poll',
      rationale: 'Higher cost for governance changes to prevent manipulation',
      requiresSuperMajority: true,
      minimumVoteDurationDays: 7,
      maximumVoteDurationDays: 14,
    },
    {
      parameterName: 'minimum_gratium_stake',
      parameterCategory: ParameterCategory.ECONOMIC_ACCESSIBILITY,
      valueType: ValueType.INTEGER,
      minValue: '1',
      maxValue: '100',
      defaultValue: '10',
      currentValue: '10',
      description: 'Minimum Gratium required to stake on a poll outcome',
      rationale: 'Keeps staking accessible while preventing dust stakes',
      requiresSuperMajority: false,
      minimumVoteDurationDays: 7,
      maximumVoteDurationDays: 14,
    },
    {
      parameterName: 'gratium_stake_reward_multiplier',
      parameterCategory: ParameterCategory.ECONOMIC_ACCESSIBILITY,
      valueType: ValueType.DECIMAL,
      minValue: '1.0',
      maxValue: '3.0',
      defaultValue: '1.5',
      currentValue: '1.5',
      description: 'Reward multiplier for winning Gratium stakes',
      rationale: 'Incentivizes informed prediction while preventing excessive risk',
      requiresSuperMajority: false,
      minimumVoteDurationDays: 7,
      maximumVoteDurationDays: 14,
    },

    // Feature Access (2 parameters)
    {
      parameterName: 'minimum_light_score_to_vote',
      parameterCategory: ParameterCategory.FEATURE_ACCESS,
      valueType: ValueType.DECIMAL,
      minValue: '0.0',
      maxValue: '50.0',
      defaultValue: '10.0',
      currentValue: '10.0',
      description: 'Minimum Light Score required to vote on governance polls',
      rationale: 'Ensures voters have demonstrated constructive participation',
      requiresSuperMajority: true,
      minimumVoteDurationDays: 14,
      maximumVoteDurationDays: 21,
    },
    {
      parameterName: 'minimum_poh_score_for_delegation',
      parameterCategory: ParameterCategory.FEATURE_ACCESS,
      valueType: ValueType.DECIMAL,
      minValue: '50.0',
      maxValue: '90.0',
      defaultValue: '70.0',
      currentValue: '70.0',
      description: 'Minimum Proof of Humanity score to receive vote delegations',
      rationale: 'Prevents bots from accumulating delegated voting power',
      requiresSuperMajority: true,
      minimumVoteDurationDays: 14,
      maximumVoteDurationDays: 21,
    },

    // System Parameters (3 parameters)
    {
      parameterName: 'poll_minimum_vote_quorum',
      parameterCategory: ParameterCategory.SYSTEM_PARAMETERS,
      valueType: ValueType.INTEGER,
      minValue: '100',
      maxValue: '10000',
      defaultValue: '1000',
      currentValue: '1000',
      description: 'Minimum number of votes required for a poll to pass',
      rationale: 'Ensures sufficient participation for legitimacy',
      requiresSuperMajority: true,
      minimumVoteDurationDays: 14,
      maximumVoteDurationDays: 21,
    },
    {
      parameterName: 'poll_approval_percentage',
      parameterCategory: ParameterCategory.SYSTEM_PARAMETERS,
      valueType: ValueType.INTEGER,
      minValue: '50',
      maxValue: '75',
      defaultValue: '50',
      currentValue: '50',
      description: 'Percentage of Yes votes required for poll approval',
      rationale: 'Simple majority for most decisions',
      requiresSuperMajority: true,
      minimumVoteDurationDays: 14,
      maximumVoteDurationDays: 21,
    },
    {
      parameterName: 'poll_default_duration_days',
      parameterCategory: ParameterCategory.SYSTEM_PARAMETERS,
      valueType: ValueType.INTEGER,
      minValue: '3',
      maxValue: '30',
      defaultValue: '7',
      currentValue: '7',
      description: 'Default voting period for governance polls (in days)',
      rationale: 'Balances thorough deliberation with timely decisions',
      requiresSuperMajority: false,
      minimumVoteDurationDays: 7,
      maximumVoteDurationDays: 14,
    },
  ];

  return transaction(async (client: PoolClient) => {
    for (const param of initialParameters) {
      // Check if parameter already exists
      const existing = await client.query(
        `SELECT id FROM parameter_whitelist WHERE parameter_name = $1`,
        [param.parameterName]
      );

      if (existing.rows.length > 0) {
        console.log(`Parameter '${param.parameterName}' already exists, skipping...`);
        continue;
      }

      // Insert parameter
      await client.query(
        `INSERT INTO parameter_whitelist (
          parameter_name,
          parameter_category,
          value_type,
          min_value,
          max_value,
          default_value,
          current_value,
          description,
          rationale,
          requires_super_majority,
          minimum_vote_duration_days,
          maximum_vote_duration_days,
          requires_verification_to_vote,
          minimum_vote_quorum,
          quorum_percentage_of_verified,
          quorum_enforcement,
          is_voteable,
          is_emergency_parameter
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
        [
          param.parameterName,
          param.parameterCategory,
          param.valueType,
          param.minValue,
          param.maxValue,
          param.defaultValue,
          param.currentValue,
          param.description,
          param.rationale,
          param.requiresSuperMajority,
          param.minimumVoteDurationDays,
          param.maximumVoteDurationDays,
          true, // requiresVerificationToVote
          1000, // minimumVoteQuorum
          5.0, // quorumPercentageOfVerified
          'either', // quorumEnforcement
          true, // isVoteable
          false, // isEmergencyParameter
        ]
      );

      console.log(`✅ Seeded parameter: ${param.parameterName}`);
    }
  });
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Map database row to Parameter interface
 */
function mapRowToParameter(row: any): Parameter {
  return {
    id: row.id,
    parameterName: row.parameter_name,
    parameterCategory: row.parameter_category,
    valueType: row.value_type,
    minValue: row.min_value,
    maxValue: row.max_value,
    defaultValue: row.default_value,
    currentValue: row.current_value,
    description: row.description,
    rationale: row.rationale,
    requiresSuperMajority: row.requires_super_majority,
    minimumVoteDurationDays: row.minimum_vote_duration_days,
    maximumVoteDurationDays: row.maximum_vote_duration_days,
    requiresVerificationToVote: row.requires_verification_to_vote,
    minimumVoteQuorum: row.minimum_vote_quorum,
    quorumPercentageOfVerified: parseFloat(row.quorum_percentage_of_verified),
    quorumEnforcement: row.quorum_enforcement,
    isVoteable: row.is_voteable,
    isEmergencyParameter: row.is_emergency_parameter,
    lastVotedOn: row.last_voted_on,
    timesVotedOn: row.times_voted_on,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================================================
// Export
// ============================================================================

export default {
  getAllParameters,
  getParameterByName,
  getParameterDetails,
  validateParameterValue,
  getParameterVotingHistory,
  updateParameterValue,
  freezeParameter,
  unfreezeParameter,
  isParameterFrozen,
  seedInitialParameters,
};
