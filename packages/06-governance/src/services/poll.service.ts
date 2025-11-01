/**
 * Module 06: Governance - Poll Service
 * Poll creation, management, and status tracking
 */

import { query, transaction } from '../utils/database';
import { generateSectionMultipliers } from '../utils/section-assignment';
import economyIntegration from './economy-integration.service';
import {
  GovernancePoll,
  PollType,
  PollStatus,
  CreatePollRequest,
  PollFilters,
  SectionMultipliers,
  IdentityMode,
} from '../types';

// ============================================================================
// Poll Creation
// ============================================================================

/**
 * Creates a new governance poll with all validations
 *
 * Steps:
 * 1. Validate user eligibility (Light Score, PoH, etc.)
 * 2. Check PollCoin balance and deduct cost
 * 3. Validate parameter (if parameter vote)
 * 4. Generate section multipliers
 * 5. Create poll in database
 * 6. Create stake pool entry
 *
 * @throws Error if validation fails or insufficient PollCoin
 */
export async function createPoll(
  userId: string,
  request: CreatePollRequest
): Promise<GovernancePoll> {
  // Step 1: Validate user eligibility
  await validateUserEligibility(userId, request.pollType);

  // Step 2: Calculate poll cost
  const pollCost = calculatePollCost(request.pollType);

  // Step 3: Validate parameter (if parameter vote)
  if (request.pollType === PollType.PARAMETER_VOTE) {
    if (!request.parameterName || !request.parameterProposedValue) {
      throw new Error('Parameter name and proposed value required for parameter votes');
    }
    await validateParameter(request.parameterName, request.parameterProposedValue);
  }

  // Step 4: Generate section multipliers
  const sectionMultipliers = generateSectionMultipliers();

  // Step 5: Calculate poll timing
  const pollStartAt = new Date();
  const pollEndAt = new Date(pollStartAt.getTime() + request.durationDays * 24 * 60 * 60 * 1000);
  const pollDurationMinutes = request.durationDays * 24 * 60;

  // Step 6: Create poll in transaction
  return await transaction(async (client) => {
    // Deduct PollCoin cost (1% burn, 99% to rewards pool)
    await deductPollCoinCost(client, userId, pollCost);

    // Get parameter details if parameter vote
    let parameterDetails: any = {};
    if (request.pollType === PollType.PARAMETER_VOTE) {
      parameterDetails = await getParameterDetails(client, request.parameterName!);
    }

    // Insert poll
    const pollResult = await client.query<GovernancePoll>(
      `INSERT INTO governance_polls (
        title,
        description,
        proposal_url,
        poll_type,
        parameter_name,
        parameter_current_value,
        parameter_proposed_value,
        parameter_min_value,
        parameter_max_value,
        parameter_in_whitelist,
        poll_start_at,
        poll_end_at,
        poll_duration_minutes,
        section_multipliers,
        created_by_user_id,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        request.title,
        request.description,
        request.proposalUrl || null,
        request.pollType,
        request.parameterName || null,
        parameterDetails.currentValue || null,
        request.parameterProposedValue || null,
        parameterDetails.minValue || null,
        parameterDetails.maxValue || null,
        request.pollType === PollType.PARAMETER_VOTE,
        pollStartAt,
        pollEndAt,
        pollDurationMinutes,
        JSON.stringify(sectionMultipliers),
        userId,
        PollStatus.ACTIVE,
      ]
    );

    const poll = pollResult.rows[0];

    // Create stake pool entry
    await client.query(
      `INSERT INTO governance_stake_pools (governance_poll_id, pool_status)
       VALUES ($1, 'open')`,
      [poll.id]
    );

    return poll;
  });
}

// ============================================================================
// Validation Helpers
// ============================================================================

async function validateUserEligibility(userId: string, pollType: PollType): Promise<void> {
  // Check Proof of Humanity requirement
  const userResult = await query(
    `SELECT is_verified_human FROM users WHERE id = $1`,
    [userId]
  );

  if (userResult.rows.length === 0) {
    throw new Error('User not found');
  }

  const user = userResult.rows[0];

  if (!user.is_verified_human) {
    throw new Error('Proof of Humanity verification required to create polls');
  }

  // Check Light Score requirement using economy integration
  const minReputation = parseInt(
    process.env.MINIMUM_REPUTATION_TO_CREATE_POLL || '25',
    10
  );

  await economyIntegration.validateLightScoreRequirement(userId, minReputation);
}

async function validateParameter(parameterName: string, proposedValue: string): Promise<void> {
  const result = await query(
    `SELECT * FROM parameter_whitelist WHERE parameter_name = $1 AND is_voteable = true`,
    [parameterName]
  );

  if (result.rows.length === 0) {
    throw new Error(
      `Parameter "${parameterName}" is not in whitelist or not voteable`
    );
  }

  const param = result.rows[0];

  // Validate value type and range
  if (param.value_type === 'integer' || param.value_type === 'decimal') {
    const numValue = parseFloat(proposedValue);
    const minValue = param.min_value ? parseFloat(param.min_value) : -Infinity;
    const maxValue = param.max_value ? parseFloat(param.max_value) : Infinity;

    if (numValue < minValue || numValue > maxValue) {
      throw new Error(
        `Proposed value ${proposedValue} outside allowed range [${param.min_value}, ${param.max_value}]`
      );
    }
  }

  if (param.value_type === 'boolean') {
    if (proposedValue !== 'true' && proposedValue !== 'false') {
      throw new Error('Boolean parameter must be "true" or "false"');
    }
  }
}

async function getParameterDetails(client: any, parameterName: string): Promise<any> {
  const result = await client.query(
    `SELECT current_value, min_value, max_value FROM parameter_whitelist WHERE parameter_name = $1`,
    [parameterName]
  );

  return result.rows[0] || {};
}

function calculatePollCost(pollType: PollType): number {
  if (pollType === PollType.PARAMETER_VOTE || pollType === PollType.CONSTITUTIONAL) {
    return parseInt(process.env.POLL_CREATION_COST_GOVERNANCE || '1000', 10);
  }
  return parseInt(process.env.POLL_CREATION_COST_GENERAL || '500', 10);
}

async function deductPollCoinCost(
  client: any,
  userId: string,
  cost: number,
  identityMode: IdentityMode = IdentityMode.TRUE_SELF
): Promise<void> {
  // Use economy integration to deduct PollCoin
  await economyIntegration.deductPollCoinCost(
    client,
    userId,
    identityMode,
    BigInt(cost)
  );
}

// ============================================================================
// Poll Retrieval
// ============================================================================

export async function getPollById(pollId: string): Promise<GovernancePoll | null> {
  const result = await query<GovernancePoll>(
    `SELECT * FROM governance_polls WHERE id = $1`,
    [pollId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

export async function listPolls(filters: PollFilters = {}): Promise<GovernancePoll[]> {
  const conditions: string[] = [];
  const params: any[] = [];
  let paramCount = 1;

  if (filters.status) {
    conditions.push(`status = $${paramCount++}`);
    params.push(filters.status);
  }

  if (filters.pollType) {
    conditions.push(`poll_type = $${paramCount++}`);
    params.push(filters.pollType);
  }

  if (filters.createdByUserId) {
    conditions.push(`created_by_user_id = $${paramCount++}`);
    params.push(filters.createdByUserId);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = filters.limit || 50;
  const offset = filters.offset || 0;

  const result = await query<GovernancePoll>(
    `SELECT * FROM governance_polls
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramCount++} OFFSET $${paramCount}`,
    [...params, limit, offset]
  );

  return result.rows;
}

// ============================================================================
// Poll Status Management
// ============================================================================

export async function updatePollStatus(pollId: string, status: PollStatus): Promise<void> {
  await query(
    `UPDATE governance_polls SET status = $1, updated_at = NOW() WHERE id = $2`,
    [status, pollId]
  );
}

export async function closePoll(pollId: string): Promise<void> {
  await transaction(async (client) => {
    // Get poll details
    const pollResult = await client.query(
      `SELECT * FROM governance_polls WHERE id = $1`,
      [pollId]
    );

    if (pollResult.rows.length === 0) {
      throw new Error('Poll not found');
    }

    const poll = pollResult.rows[0];

    // Calculate final percentages
    const totalVotes = poll.total_yes_votes + poll.total_no_votes + poll.total_abstain_votes;
    const finalYesPercentage =
      totalVotes > 0 ? (poll.total_yes_votes / totalVotes) * 100 : 0;
    const finalNoPercentage = totalVotes > 0 ? (poll.total_no_votes / totalVotes) * 100 : 0;

    // Check quorum
    const quorumMet = totalVotes >= poll.minimum_vote_quorum;

    // Determine if approved
    const isApproved =
      quorumMet && finalYesPercentage > poll.approval_required_percentage;
    const newStatus = isApproved ? PollStatus.APPROVED : PollStatus.REJECTED;

    // Update poll
    await client.query(
      `UPDATE governance_polls
       SET status = $1,
           final_yes_percentage = $2,
           final_no_percentage = $3,
           quorum_met = $4,
           updated_at = NOW()
       WHERE id = $5`,
      [newStatus, finalYesPercentage, finalNoPercentage, quorumMet, pollId]
    );

    // Close stake pool
    await client.query(
      `UPDATE governance_stake_pools
       SET pool_status = 'closed'
       WHERE governance_poll_id = $1`,
      [pollId]
    );
  });
}

// ============================================================================
// Poll Statistics
// ============================================================================

export async function getPollStatistics(pollId: string) {
  const result = await query(
    `SELECT
       total_yes_votes,
       total_no_votes,
       total_abstain_votes,
       total_yes_weighted,
       total_no_weighted,
       total_unique_voters,
       minimum_vote_quorum,
       quorum_met,
       shadow_consensus_percentage,
       public_vs_private_gap
     FROM governance_polls
     WHERE id = $1`,
    [pollId]
  );

  if (result.rows.length === 0) {
    throw new Error('Poll not found');
  }

  return result.rows[0];
}

// ============================================================================
// Export
// ============================================================================

export default {
  createPoll,
  getPollById,
  listPolls,
  updatePollStatus,
  closePoll,
  getPollStatistics,
};
