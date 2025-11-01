/**
 * Module 06: Governance - Economy Integration Service
 * Dream Protocol - Integration layer between Governance and Economy modules
 *
 * Handles:
 * - PollCoin cost deduction for poll creation
 * - Gratium locking for stakes
 * - Light Score validation
 *
 * NOTE: This is a temporary integration layer until we have proper inter-module
 * communication. For MVP, we'll use direct database access. In production,
 * this would call Economy Module APIs.
 */

import { PoolClient } from 'pg';
import { query } from '../utils/database';
import { IdentityMode } from '../types';

// ============================================================================
// PollCoin Operations
// ============================================================================

/**
 * Check if user has sufficient PollCoin balance
 */
export async function checkPollCoinBalance(
  client: PoolClient,
  userId: string,
  identityMode: IdentityMode,
  requiredAmount: bigint
): Promise<boolean> {
  const result = await client.query(
    `SELECT pollcoin_available FROM token_ledger
     WHERE user_id = $1 AND identity_mode = $2`,
    [userId, identityMode]
  );

  if (result.rows.length === 0) {
    return false;
  }

  const available = BigInt(result.rows[0].pollcoin_available);
  return available >= requiredAmount;
}

/**
 * Deduct PollCoin cost for poll creation
 *
 * Implements:
 * - 1% burn (destroyed permanently)
 * - 99% to rewards pool (distributed to voters/stakers)
 */
export async function deductPollCoinCost(
  client: PoolClient,
  userId: string,
  identityMode: IdentityMode,
  cost: bigint
): Promise<void> {
  // Verify balance
  const hasBalance = await checkPollCoinBalance(client, userId, identityMode, cost);

  if (!hasBalance) {
    throw new Error(
      `Insufficient PollCoin balance. Required: ${cost.toString()}`
    );
  }

  // Calculate burn and reward amounts
  const burnAmount = (cost * BigInt(1)) / BigInt(100); // 1%
  const rewardsAmount = cost - burnAmount; // 99%

  // Deduct from user balance
  await client.query(
    `UPDATE token_ledger
     SET pollcoin_balance = pollcoin_balance - $1,
         updated_at = NOW()
     WHERE user_id = $2 AND identity_mode = $3`,
    [cost.toString(), userId, identityMode]
  );

  // Record burn transaction
  await client.query(
    `INSERT INTO token_transactions (
      transaction_type, token_type, amount,
      from_user_id, from_identity_mode,
      status, completed_at, memo
    ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)`,
    [
      'burn',
      'pollcoin',
      burnAmount.toString(),
      userId,
      identityMode,
      'completed',
      'Poll creation cost (1% burn)',
    ]
  );

  // Record transfer to rewards pool
  await client.query(
    `INSERT INTO token_transactions (
      transaction_type, token_type, amount,
      from_user_id, from_identity_mode,
      status, completed_at, memo
    ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)`,
    [
      'governance_reward_pool',
      'pollcoin',
      rewardsAmount.toString(),
      userId,
      identityMode,
      'completed',
      'Poll creation cost (99% to rewards pool)',
    ]
  );

  // Update total supply (burn reduces supply)
  await client.query(
    `UPDATE token_supply
     SET pollcoin_circulating = pollcoin_circulating - $1,
         pollcoin_burned = pollcoin_burned + $1,
         updated_at = NOW()`,
    [burnAmount.toString()]
  );
}

// ============================================================================
// Gratium Operations
// ============================================================================

/**
 * Check if user has sufficient Gratium balance
 */
export async function checkGratiumBalance(
  client: PoolClient,
  userId: string,
  identityMode: IdentityMode,
  requiredAmount: bigint
): Promise<boolean> {
  const result = await client.query(
    `SELECT gratium_available FROM token_ledger
     WHERE user_id = $1 AND identity_mode = $2`,
    [userId, identityMode]
  );

  if (result.rows.length === 0) {
    return false;
  }

  const available = BigInt(result.rows[0].gratium_available);
  return available >= requiredAmount;
}

/**
 * Lock Gratium for governance stake
 * This increases the locked amount in the ledger
 */
export async function lockGratiumForStake(
  client: PoolClient,
  userId: string,
  identityMode: IdentityMode,
  amount: bigint,
  pollId: string
): Promise<void> {
  // Verify balance
  const hasBalance = await checkGratiumBalance(client, userId, identityMode, amount);

  if (!hasBalance) {
    throw new Error(
      `Insufficient Gratium balance. Required: ${amount.toString()}`
    );
  }

  // Increase locked amount in ledger
  await client.query(
    `UPDATE token_ledger
     SET gratium_locked = gratium_locked + $1,
         updated_at = NOW()
     WHERE user_id = $2 AND identity_mode = $3`,
    [amount.toString(), userId, identityMode]
  );

  // Create lock record
  await client.query(
    `INSERT INTO token_locks (
      user_id, identity_mode, token_type, amount,
      lock_type, reference_type, reference_id,
      status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      userId,
      identityMode,
      'gratium',
      amount.toString(),
      'governance_stake',
      'governance_poll',
      pollId,
      'active',
    ]
  );
}

/**
 * Unlock Gratium after stake resolution
 * This decreases the locked amount in the ledger
 */
export async function unlockGratiumStake(
  client: PoolClient,
  userId: string,
  identityMode: IdentityMode,
  amount: bigint,
  pollId: string
): Promise<void> {
  // Decrease locked amount in ledger
  await client.query(
    `UPDATE token_ledger
     SET gratium_locked = gratium_locked - $1,
         updated_at = NOW()
     WHERE user_id = $2 AND identity_mode = $3`,
    [amount.toString(), userId, identityMode]
  );

  // Mark lock as released
  await client.query(
    `UPDATE token_locks
     SET status = 'released',
         unlocked_at = NOW(),
         updated_at = NOW()
     WHERE user_id = $1
       AND identity_mode = $2
       AND reference_id = $3
       AND lock_type = 'governance_stake'
       AND status = 'active'`,
    [userId, identityMode, pollId]
  );
}

/**
 * Distribute Gratium rewards to winning stakers
 */
export async function distributeGratiumReward(
  client: PoolClient,
  userId: string,
  identityMode: IdentityMode,
  rewardAmount: bigint
): Promise<void> {
  // Add to user balance
  await client.query(
    `UPDATE token_ledger
     SET gratium_balance = gratium_balance + $1,
         updated_at = NOW()
     WHERE user_id = $2 AND identity_mode = $3`,
    [rewardAmount.toString(), userId, identityMode]
  );

  // Record reward transaction
  await client.query(
    `INSERT INTO token_transactions (
      transaction_type, token_type, amount,
      to_user_id, to_identity_mode,
      status, completed_at, memo
    ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)`,
    [
      'reward',
      'gratium',
      rewardAmount.toString(),
      userId,
      identityMode,
      'completed',
      'Governance stake reward (correct prediction)',
    ]
  );
}

// ============================================================================
// Light Score Operations
// ============================================================================

/**
 * Get user's current Light Score
 */
export async function getUserLightScore(userId: string): Promise<number> {
  const result = await query(
    `SELECT current_score FROM light_scores WHERE user_id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    return 50.0; // Default score
  }

  return parseFloat(result.rows[0].current_score);
}

/**
 * Validate user meets minimum Light Score requirement
 */
export async function validateLightScoreRequirement(
  userId: string,
  minimumScore: number
): Promise<void> {
  const currentScore = await getUserLightScore(userId);

  if (currentScore < minimumScore) {
    throw new Error(
      `Insufficient Light Score to vote. Required: ${minimumScore}, Current: ${currentScore.toFixed(2)}`
    );
  }
}

/**
 * Update Light Score (called after governance participation)
 *
 * In production, this would call Pentos AI.
 * For MVP, we use simple heuristics.
 */
export async function updateLightScoreForGovernance(
  client: PoolClient,
  userId: string,
  eventType: 'vote' | 'stake' | 'poll_creation' | 'delegation',
  impact: number = 0.5
): Promise<void> {
  // Get current score
  const currentScoreResult = await client.query(
    `SELECT current_score FROM light_scores WHERE user_id = $1`,
    [userId]
  );

  let currentScore = 50.0;
  if (currentScoreResult.rows.length > 0) {
    currentScore = parseFloat(currentScoreResult.rows[0].current_score);
  }

  // Calculate new score (bounded 0-100)
  const newScore = Math.max(0, Math.min(100, currentScore + impact));

  // Update score
  await client.query(
    `INSERT INTO light_scores (user_id, current_score, last_calculated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (user_id) DO UPDATE
     SET current_score = $2,
         last_calculated_at = NOW(),
         calculation_count = light_scores.calculation_count + 1,
         updated_at = NOW()`,
    [userId, newScore]
  );

  // Log event
  await client.query(
    `INSERT INTO light_score_events (
      user_id, event_type, score_change,
      old_score, new_score,
      reference_type, pentos_reasoning
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      userId,
      eventType,
      impact,
      currentScore,
      newScore,
      'governance_participation',
      `Governance participation: ${eventType}`,
    ]
  );
}

// ============================================================================
// Export
// ============================================================================

export default {
  checkPollCoinBalance,
  deductPollCoinCost,
  checkGratiumBalance,
  lockGratiumForStake,
  unlockGratiumStake,
  distributeGratiumReward,
  getUserLightScore,
  validateLightScoreRequirement,
  updateLightScoreForGovernance,
};
