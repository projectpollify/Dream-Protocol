/**
 * Module 06: Governance - Emergency Rollback Service
 * Dream Protocol - Quick Reversion of Harmful Governance Decisions
 *
 * 3-Tier Authority System:
 * 1. Founder Unilateral (Year 1-3, 10 tokens)
 * 2. Verified User Petition (100+ users, any time)
 * 3. Automatic Triggers (system-detected issues)
 */

import { PoolClient } from 'pg';
import { query, transaction } from '../utils/database';
import {
  GovernanceAction,
  GovernancePoll,
  RollbackInitiationType,
  ActionStatus,
  PollType,
  PollStatus,
} from '../types';

// ============================================================================
// Constants
// ============================================================================

const FOUNDER_INITIAL_TOKENS = 10; // Founder starts with 10 rollback tokens
const FOUNDER_ROLLBACK_YEARS = 3; // Founder authority lasts 3 years
const PETITION_MINIMUM_USERS = 100; // 100+ verified users required for petition
const PETITION_MINIMUM_POH_SCORE = 70; // Minimum Proof of Humanity score

const ROLLBACK_SUPERMAJORITY = 66; // 66% required to approve rollback
const ROLLBACK_REDUCED_QUORUM = 0.5; // 50% of normal quorum
const ROLLBACK_VOTING_HOURS = 48; // 48-hour voting period

const STANDARD_ROLLBACK_WINDOW_HOURS = 72; // 72 hours for standard decisions
const CONSTITUTIONAL_ROLLBACK_WINDOW_HOURS = 168; // 7 days for constitutional

const MAX_ROLLBACKS_PER_PARAMETER = 3; // After 3 rollbacks, freeze parameter
const PARAMETER_FREEZE_DAYS = 90; // 90-day freeze after 3 rollbacks

// ============================================================================
// Founder Rollback Authority
// ============================================================================

/**
 * Check if founder still has rollback authority
 * Authority decreases over time: Year 1 (100%), Year 2 (66%), Year 3 (33%)
 */
export async function checkFounderAuthority(
  founderId: string
): Promise<{
  hasAuthority: boolean;
  tokensRemaining: number;
  yearsActive: number;
  authorityPercentage: number;
}> {
  // Get platform launch date (when founder authority started)
  const platformLaunchResult = await query(
    `SELECT created_at FROM governance_polls ORDER BY created_at ASC LIMIT 1`
  );

  if (platformLaunchResult.rows.length === 0) {
    // Platform just launched, founder has full authority
    return {
      hasAuthority: true,
      tokensRemaining: FOUNDER_INITIAL_TOKENS,
      yearsActive: 0,
      authorityPercentage: 100,
    };
  }

  const platformLaunchDate = new Date(platformLaunchResult.rows[0].created_at);
  const now = new Date();
  const yearsActive = (now.getTime() - platformLaunchDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

  // Check if beyond 3-year window
  if (yearsActive > FOUNDER_ROLLBACK_YEARS) {
    return {
      hasAuthority: false,
      tokensRemaining: 0,
      yearsActive: Math.floor(yearsActive),
      authorityPercentage: 0,
    };
  }

  // Calculate authority percentage based on years active
  let authorityPercentage = 100;
  if (yearsActive > 2) {
    authorityPercentage = 33; // Year 3: 33%
  } else if (yearsActive > 1) {
    authorityPercentage = 66; // Year 2: 66%
  } else {
    authorityPercentage = 100; // Year 1: 100%
  }

  // Count remaining tokens
  const tokensResult = await query(
    `SELECT COUNT(*) as used_tokens
     FROM governance_actions
     WHERE rollback_initiated_by_user_id = $1
       AND rollback_initiation_type = $2`,
    [founderId, RollbackInitiationType.FOUNDER_UNILATERAL]
  );

  const usedTokens = parseInt(tokensResult.rows[0].used_tokens, 10);
  const tokensRemaining = FOUNDER_INITIAL_TOKENS - usedTokens;

  return {
    hasAuthority: tokensRemaining > 0,
    tokensRemaining,
    yearsActive: Math.floor(yearsActive),
    authorityPercentage,
  };
}

/**
 * Initiate founder unilateral rollback (uses one token)
 */
export async function initiateFounderRollback(
  founderId: string,
  actionId: string,
  reason: string
): Promise<{ rollbackPollId: string; tokensRemaining: number }> {
  return transaction(async (client: PoolClient) => {
    // Step 1: Verify founder authority
    const authority = await checkFounderAuthority(founderId);

    if (!authority.hasAuthority) {
      throw new Error(
        `Founder rollback authority exhausted. ` +
        `Used all ${FOUNDER_INITIAL_TOKENS} tokens or beyond Year ${FOUNDER_ROLLBACK_YEARS}.`
      );
    }

    // Step 2: Get governance action details
    const actionResult = await client.query<GovernanceAction>(
      `SELECT * FROM governance_actions WHERE id = $1`,
      [actionId]
    );

    if (actionResult.rows.length === 0) {
      throw new Error('Governance action not found');
    }

    const action = actionResult.rows[0];

    if (action.status !== ActionStatus.COMPLETED) {
      throw new Error(`Cannot rollback action with status: ${action.status}`);
    }

    // Step 3: Check rollback window
    if (!isWithinRollbackWindow(action)) {
      throw new Error('Rollback window expired');
    }

    // Step 4: Create emergency rollback poll
    const rollbackPoll = await createRollbackPoll(
      client,
      founderId,
      action,
      reason,
      RollbackInitiationType.FOUNDER_UNILATERAL
    );

    // Step 5: Use one founder token
    const tokensRemaining = authority.tokensRemaining - 1;

    await client.query(
      `UPDATE governance_actions
       SET founder_rollback_tokens_remaining = $1
       WHERE id = $2`,
      [tokensRemaining, actionId]
    );

    return {
      rollbackPollId: rollbackPoll.id,
      tokensRemaining,
    };
  });
}

// ============================================================================
// Verified User Petition System
// ============================================================================

/**
 * Create a petition for rollback (requires 100+ verified users)
 */
export async function createRollbackPetition(
  initiatorUserId: string,
  actionId: string,
  reason: string,
  petitionerUserIds: string[]
): Promise<{ petitionId: string; requiresVote: boolean }> {
  return transaction(async (client: PoolClient) => {
    // Step 1: Validate petition has enough users
    if (petitionerUserIds.length < PETITION_MINIMUM_USERS) {
      throw new Error(
        `Petition requires at least ${PETITION_MINIMUM_USERS} verified users. ` +
        `Provided: ${petitionerUserIds.length}`
      );
    }

    // Step 2: Verify all petitioners are verified humans with PoH score 70+
    const verifiedResult = await client.query(
      `SELECT COUNT(*) as verified_count
       FROM user_profiles
       WHERE user_id = ANY($1)
         AND poh_score >= $2`,
      [petitionerUserIds, PETITION_MINIMUM_POH_SCORE]
    );

    const verifiedCount = parseInt(verifiedResult.rows[0].verified_count, 10);

    if (verifiedCount < PETITION_MINIMUM_USERS) {
      throw new Error(
        `Petition requires ${PETITION_MINIMUM_USERS} users with PoH score ${PETITION_MINIMUM_POH_SCORE}+. ` +
        `Valid petitioners: ${verifiedCount}`
      );
    }

    // Step 3: Get governance action
    const actionResult = await client.query<GovernanceAction>(
      `SELECT * FROM governance_actions WHERE id = $1`,
      [actionId]
    );

    if (actionResult.rows.length === 0) {
      throw new Error('Governance action not found');
    }

    const action = actionResult.rows[0];

    if (action.status !== ActionStatus.COMPLETED) {
      throw new Error(`Cannot rollback action with status: ${action.status}`);
    }

    // Step 4: Check rollback window
    if (!isWithinRollbackWindow(action)) {
      throw new Error('Rollback window expired');
    }

    // Step 5: Create rollback poll
    const rollbackPoll = await createRollbackPoll(
      client,
      initiatorUserId,
      action,
      reason,
      RollbackInitiationType.VERIFIED_USER_PETITION
    );

    // Step 6: Record petition (could add separate table for tracking)
    // For now, we'll just note it in the poll description

    return {
      petitionId: rollbackPoll.id,
      requiresVote: true, // Petition always requires community vote
    };
  });
}

// ============================================================================
// Automatic Trigger Detection
// ============================================================================

/**
 * Check if governance action should trigger automatic rollback
 */
export async function checkAutomaticTriggers(
  actionId: string
): Promise<{
  shouldRollback: boolean;
  triggers: string[];
}> {
  const triggers: string[] = [];

  // Get action details
  const actionResult = await query<GovernanceAction>(
    `SELECT * FROM governance_actions WHERE id = $1`,
    [actionId]
  );

  if (actionResult.rows.length === 0) {
    return { shouldRollback: false, triggers: [] };
  }

  const action = actionResult.rows[0];

  // Trigger 1: Critical bug causing financial loss
  // TODO: Integrate with error monitoring system
  // if (await detectCriticalBug(action)) {
  //   triggers.push('Critical bug detected causing financial loss');
  // }

  // Trigger 2: Security vulnerability actively exploited
  // TODO: Integrate with security monitoring
  // if (await detectSecurityExploit(action)) {
  //   triggers.push('Security vulnerability actively exploited');
  // }

  // Trigger 3: Parameter change causing >20% user exodus
  const userExodusResult = await query(
    `SELECT COUNT(*) as recent_deletions
     FROM user_account_status
     WHERE status = 'deleted'
       AND updated_at > $1`,
    [action.executedAt]
  );

  const recentDeletions = parseInt(userExodusResult.rows[0].recent_deletions, 10);
  const totalUsersResult = await query(`SELECT COUNT(*) as total FROM users`);
  const totalUsers = parseInt(totalUsersResult.rows[0].total, 10);

  if (totalUsers > 0 && (recentDeletions / totalUsers) > 0.2) {
    triggers.push(`User exodus detected: ${Math.round((recentDeletions / totalUsers) * 100)}% of users deleted accounts`);
  }

  // Trigger 4: Thalyra detects governance manipulation
  // TODO: Integrate with Thalyra AI monitoring
  // if (await thalyraDetectsManipulation(action)) {
  //   triggers.push('Thalyra detected governance manipulation');
  // }

  return {
    shouldRollback: triggers.length > 0,
    triggers,
  };
}

/**
 * Initiate automatic rollback based on system triggers
 */
export async function initiateAutomaticRollback(
  actionId: string,
  triggers: string[]
): Promise<string> {
  return transaction(async (client: PoolClient) => {
    const actionResult = await client.query<GovernanceAction>(
      `SELECT * FROM governance_actions WHERE id = $1`,
      [actionId]
    );

    if (actionResult.rows.length === 0) {
      throw new Error('Governance action not found');
    }

    const action = actionResult.rows[0];

    const reason = `Automatic rollback triggered:\n${triggers.map(t => `- ${t}`).join('\n')}`;

    const rollbackPoll = await createRollbackPoll(
      client,
      'system', // System-initiated
      action,
      reason,
      RollbackInitiationType.AUTOMATIC_TRIGGER
    );

    return rollbackPoll.id;
  });
}

// ============================================================================
// Rollback Poll Creation
// ============================================================================

/**
 * Create a rollback poll (emergency vote)
 */
async function createRollbackPoll(
  client: PoolClient,
  initiatorUserId: string,
  action: GovernanceAction,
  reason: string,
  initiationType: RollbackInitiationType
): Promise<GovernancePoll> {
  // Calculate reduced quorum (50% of normal)
  const normalQuorum = 1000; // From spec
  const reducedQuorum = Math.floor(normalQuorum * ROLLBACK_REDUCED_QUORUM);

  // Create poll with 48-hour voting period
  const pollEndAt = new Date(Date.now() + ROLLBACK_VOTING_HOURS * 60 * 60 * 1000);

  const pollResult = await client.query<GovernancePoll>(
    `INSERT INTO governance_polls (
      title,
      description,
      poll_type,
      poll_start_at,
      poll_end_at,
      poll_duration_minutes,
      status,
      approval_required_percentage,
      minimum_vote_quorum,
      created_by_user_id,
      governance_action_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *`,
    [
      `Emergency Rollback: ${action.parameterName || 'Governance Action'}`,
      `${reason}\n\nOriginal Action:\n- Parameter: ${action.parameterName}\n- Old Value: ${action.oldValue}\n- New Value: ${action.newValue}\n\nVote YES to rollback this decision.`,
      PollType.EMERGENCY_ROLLBACK,
      new Date(),
      pollEndAt,
      ROLLBACK_VOTING_HOURS * 60,
      PollStatus.ACTIVE,
      ROLLBACK_SUPERMAJORITY, // 66% required
      reducedQuorum,
      initiatorUserId,
      action.id,
    ]
  );

  // Update action to mark rollback initiated
  await client.query(
    `UPDATE governance_actions
     SET rollback_initiated_by_user_id = $1,
         rollback_initiation_type = $2,
         updated_at = NOW()
     WHERE id = $3`,
    [initiatorUserId, initiationType, action.id]
  );

  return pollResult.rows[0];
}

// ============================================================================
// Rollback Execution
// ============================================================================

/**
 * Execute approved rollback (revert parameter to previous value)
 */
export async function executeRollback(rollbackPollId: string): Promise<void> {
  return transaction(async (client: PoolClient) => {
    // Step 1: Get rollback poll
    const pollResult = await client.query<GovernancePoll>(
      `SELECT * FROM governance_polls WHERE id = $1`,
      [rollbackPollId]
    );

    if (pollResult.rows.length === 0) {
      throw new Error('Rollback poll not found');
    }

    const poll = pollResult.rows[0];

    if (poll.pollType !== PollType.EMERGENCY_ROLLBACK) {
      throw new Error('Not a rollback poll');
    }

    if (poll.status !== PollStatus.APPROVED) {
      throw new Error(`Cannot execute rollback poll with status: ${poll.status}`);
    }

    // Step 2: Get original action
    if (!poll.governanceActionId) {
      throw new Error('No governance action linked to rollback poll');
    }

    const actionResult = await client.query<GovernanceAction>(
      `SELECT * FROM governance_actions WHERE id = $1`,
      [poll.governanceActionId]
    );

    if (actionResult.rows.length === 0) {
      throw new Error('Original governance action not found');
    }

    const originalAction = actionResult.rows[0];

    // Step 3: Revert parameter to old value
    if (originalAction.parameterName) {
      await client.query(
        `UPDATE parameter_whitelist
         SET current_value = $1,
             updated_at = NOW()
         WHERE parameter_name = $2`,
        [originalAction.oldValue, originalAction.parameterName]
      );
    }

    // Step 4: Mark original action as rolled back
    await client.query(
      `UPDATE governance_actions
       SET status = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [ActionStatus.ROLLED_BACK, originalAction.id]
    );

    // Step 5: Check rollback count for this parameter
    const rollbackCountResult = await client.query(
      `SELECT COUNT(*) as rollback_count
       FROM governance_actions
       WHERE parameter_name = $1
         AND status = $2`,
      [originalAction.parameterName, ActionStatus.ROLLED_BACK]
    );

    const rollbackCount = parseInt(rollbackCountResult.rows[0].rollback_count, 10);

    // Step 6: Freeze parameter if rolled back 3+ times
    if (rollbackCount >= MAX_ROLLBACKS_PER_PARAMETER) {
      const freezeUntil = new Date(Date.now() + PARAMETER_FREEZE_DAYS * 24 * 60 * 60 * 1000);

      await client.query(
        `UPDATE governance_actions
         SET parameter_frozen_until = $1,
             rollback_count_for_parameter = $2
         WHERE parameter_name = $3`,
        [freezeUntil, rollbackCount, originalAction.parameterName]
      );

      // Also mark parameter as temporarily not voteable
      await client.query(
        `UPDATE parameter_whitelist
         SET is_voteable = FALSE
         WHERE parameter_name = $1`,
        [originalAction.parameterName]
      );
    }

    // Step 7: Mark rollback poll as executed
    await client.query(
      `UPDATE governance_polls
       SET status = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [PollStatus.EXECUTED, rollbackPollId]
    );
  });
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if action is within rollback window
 */
function isWithinRollbackWindow(action: GovernanceAction): boolean {
  if (!action.executedAt) {
    return false; // Not executed yet
  }

  if (!action.rollbackWindowExpiresAt) {
    // Calculate expiration based on action type
    const windowHours = action.actionType === 'constitutional'
      ? CONSTITUTIONAL_ROLLBACK_WINDOW_HOURS
      : STANDARD_ROLLBACK_WINDOW_HOURS;

    const expiresAt = new Date(
      new Date(action.executedAt).getTime() + windowHours * 60 * 60 * 1000
    );

    return new Date() < expiresAt;
  }

  return new Date() < new Date(action.rollbackWindowExpiresAt);
}

/**
 * Get rollback status for an action
 */
export async function getRollbackStatus(actionId: string): Promise<{
  canRollback: boolean;
  windowExpiresAt?: Date;
  hoursRemaining?: number;
  rollbackCount: number;
  isParameterFrozen: boolean;
}> {
  const actionResult = await query<GovernanceAction>(
    `SELECT * FROM governance_actions WHERE id = $1`,
    [actionId]
  );

  if (actionResult.rows.length === 0) {
    throw new Error('Action not found');
  }

  const action = actionResult.rows[0];

  const canRollback = action.canBeRolledBack && isWithinRollbackWindow(action);

  let windowExpiresAt: Date | undefined;
  let hoursRemaining: number | undefined;

  if (action.executedAt) {
    const windowHours = action.actionType === 'constitutional'
      ? CONSTITUTIONAL_ROLLBACK_WINDOW_HOURS
      : STANDARD_ROLLBACK_WINDOW_HOURS;

    windowExpiresAt = new Date(
      new Date(action.executedAt).getTime() + windowHours * 60 * 60 * 1000
    );

    hoursRemaining = Math.max(
      0,
      (windowExpiresAt.getTime() - Date.now()) / (60 * 60 * 1000)
    );
  }

  // Check if parameter is frozen
  const isParameterFrozen = action.parameterFrozenUntil
    ? new Date() < new Date(action.parameterFrozenUntil)
    : false;

  return {
    canRollback,
    windowExpiresAt,
    hoursRemaining: hoursRemaining ? Math.round(hoursRemaining) : undefined,
    rollbackCount: action.rollbackCountForParameter || 0,
    isParameterFrozen,
  };
}

// ============================================================================
// Export
// ============================================================================

export default {
  checkFounderAuthority,
  initiateFounderRollback,
  createRollbackPetition,
  checkAutomaticTriggers,
  initiateAutomaticRollback,
  executeRollback,
  getRollbackStatus,
};
