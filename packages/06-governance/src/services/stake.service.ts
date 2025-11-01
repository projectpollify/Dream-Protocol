/**
 * Module 06: Governance - Gratium Staking Service
 * Dream Protocol - Prediction Market on Poll Outcomes
 *
 * Users can stake Gratium on YES/NO outcomes:
 * - Winners earn proportional share of entire pool
 * - Losers forfeit their stake (goes to winners)
 * - 10 Gratium minimum stake
 * - Stakes lock until poll closes
 */

import { PoolClient } from 'pg';
import { query, transaction } from '../utils/database';
import economyIntegration from './economy-integration.service';
import {
  GovernanceStake,
  GovernanceStakePool,
  CreateStakeRequest,
  StakeStatus,
  PoolStatus,
  VoteOption,
  IdentityMode,
  ConfidenceLevel,
  PollStatus,
} from '../types';

// ============================================================================
// Constants
// ============================================================================

const MINIMUM_STAKE_AMOUNT = 10; // 10 Gratium minimum
const DEFAULT_REWARD_MULTIPLIER = 1.5; // Winners get 1.5x (if equal pools)

// ============================================================================
// Stake Creation
// ============================================================================

/**
 * Create a new Gratium stake on a poll outcome
 *
 * @param userId - User creating the stake
 * @param identityMode - 'true_self' or 'shadow'
 * @param voterDid - User's DID (pseudonymous)
 * @param stakeData - Stake details (pollId, position, amount)
 * @param lightScore - User's Light Score at stake time
 * @returns Created stake record
 */
export async function createStake(
  userId: string,
  identityMode: IdentityMode,
  voterDid: string,
  stakeData: CreateStakeRequest,
  lightScore?: number
): Promise<GovernanceStake> {
  return transaction(async (client: PoolClient) => {
    // Step 1: Validate stake amount
    if (stakeData.gratiumAmount < MINIMUM_STAKE_AMOUNT) {
      throw new Error(`Minimum stake is ${MINIMUM_STAKE_AMOUNT} Gratium`);
    }

    // Step 2: Validate poll exists and is active
    const pollResult = await client.query(
      `SELECT id, status, poll_end_at
       FROM governance_polls
       WHERE id = $1`,
      [stakeData.pollId]
    );

    if (pollResult.rows.length === 0) {
      throw new Error('Poll not found');
    }

    const poll = pollResult.rows[0];

    if (poll.status !== PollStatus.ACTIVE && poll.status !== PollStatus.PENDING) {
      throw new Error(`Cannot stake on poll with status: ${poll.status}`);
    }

    // Check if poll has already ended
    if (new Date(poll.poll_end_at) < new Date()) {
      throw new Error('Poll has already closed');
    }

    // Step 3: Validate stake position (only 'yes' or 'no', not 'abstain')
    if (stakeData.stakedPosition === VoteOption.ABSTAIN) {
      throw new Error('Cannot stake on ABSTAIN position');
    }

    // Step 4: Check if user already has a stake for this identity on this poll
    const existingStakeResult = await client.query(
      `SELECT id FROM governance_stakes
       WHERE governance_poll_id = $1
         AND user_id = $2
         AND identity_mode = $3`,
      [stakeData.pollId, userId, identityMode]
    );

    if (existingStakeResult.rows.length > 0) {
      throw new Error(
        `You already have a ${identityMode} stake on this poll. ` +
        `To change your stake, withdraw the existing one first.`
      );
    }

    // Step 5: Check user's Gratium balance (integrated with Module 04 - Economy)
    const hasBalance = await economyIntegration.checkGratiumBalance(
      client,
      userId,
      identityMode,
      BigInt(stakeData.gratiumAmount)
    );
    if (!hasBalance) {
      throw new Error(`Insufficient Gratium balance. Required: ${stakeData.gratiumAmount}`);
    }

    // Step 6: Calculate confidence level
    const confidenceLevel = calculateConfidenceLevel(stakeData.gratiumAmount);

    // Step 7: Create the stake record
    const stakeResult = await client.query<GovernanceStake>(
      `INSERT INTO governance_stakes (
        governance_poll_id,
        user_id,
        identity_mode,
        staker_did,
        staked_position,
        gratium_amount,
        status,
        reward_multiplier,
        confidence_level,
        reasoning_text,
        light_score_at_stake_time
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        stakeData.pollId,
        userId,
        identityMode,
        voterDid,
        stakeData.stakedPosition,
        stakeData.gratiumAmount,
        StakeStatus.ACTIVE,
        DEFAULT_REWARD_MULTIPLIER,
        confidenceLevel,
        stakeData.reasoning,
        lightScore,
      ]
    );

    const stake = stakeResult.rows[0];

    // Step 8: Update or create stake pool
    await updateStakePool(client, stakeData.pollId, stakeData.stakedPosition, stakeData.gratiumAmount);

    // Step 9: Lock Gratium tokens (integrated with economy module)
    await economyIntegration.lockGratiumForStake(
      client,
      userId,
      identityMode,
      BigInt(stakeData.gratiumAmount),
      stakeData.pollId
    );

    return stake;
  });
}

// ============================================================================
// Stake Pool Management
// ============================================================================

/**
 * Update stake pool totals when new stake is created
 */
async function updateStakePool(
  client: PoolClient,
  pollId: string,
  position: VoteOption,
  amount: number
): Promise<void> {
  // Check if pool exists
  const poolResult = await client.query(
    `SELECT id, total_yes_stake, total_no_stake, yes_stakers_count, no_stakers_count
     FROM governance_stake_pools
     WHERE governance_poll_id = $1`,
    [pollId]
  );

  if (poolResult.rows.length === 0) {
    // Create new pool
    await client.query(
      `INSERT INTO governance_stake_pools (
        governance_poll_id,
        total_yes_stake,
        total_no_stake,
        yes_stakers_count,
        no_stakers_count,
        pool_status
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        pollId,
        position === VoteOption.YES ? amount : 0,
        position === VoteOption.NO ? amount : 0,
        position === VoteOption.YES ? 1 : 0,
        position === VoteOption.NO ? 1 : 0,
        PoolStatus.OPEN,
      ]
    );
  } else {
    // Update existing pool
    const pool = poolResult.rows[0];

    const updateQuery =
      position === VoteOption.YES
        ? `UPDATE governance_stake_pools
           SET total_yes_stake = total_yes_stake + $1,
               yes_stakers_count = yes_stakers_count + 1,
               updated_at = NOW()
           WHERE governance_poll_id = $2`
        : `UPDATE governance_stake_pools
           SET total_no_stake = total_no_stake + $1,
               no_stakers_count = no_stakers_count + 1,
               updated_at = NOW()
           WHERE governance_poll_id = $2`;

    await client.query(updateQuery, [amount, pollId]);
  }

  // Update pool metadata (averages, largest stake)
  await updateStakePoolMetadata(client, pollId);
}

/**
 * Update stake pool metadata (averages, largest stake)
 */
async function updateStakePoolMetadata(client: PoolClient, pollId: string): Promise<void> {
  const metadataResult = await client.query(
    `SELECT
       AVG(CASE WHEN staked_position = 'yes' THEN gratium_amount END) as avg_yes,
       AVG(CASE WHEN staked_position = 'no' THEN gratium_amount END) as avg_no,
       MAX(gratium_amount) as largest_stake
     FROM governance_stakes
     WHERE governance_poll_id = $1
       AND status = 'active'`,
    [pollId]
  );

  const metadata = metadataResult.rows[0];

  await client.query(
    `UPDATE governance_stake_pools
     SET average_yes_stake = $1,
         average_no_stake = $2,
         largest_single_stake = $3,
         updated_at = NOW()
     WHERE governance_poll_id = $4`,
    [metadata.avg_yes || 0, metadata.avg_no || 0, metadata.largest_stake || 0, pollId]
  );
}

// ============================================================================
// Reward Distribution (Called when poll closes)
// ============================================================================

/**
 * Distribute rewards when poll closes
 * - Winners split entire pool proportionally
 * - Losers forfeit their stake
 *
 * @param pollId - Poll that just closed
 * @param winningPosition - 'yes' or 'no' (poll result)
 */
export async function distributeStakeRewards(pollId: string, winningPosition: VoteOption): Promise<void> {
  return transaction(async (client: PoolClient) => {
    // Step 1: Get stake pool totals
    const poolResult = await client.query<GovernanceStakePool>(
      `SELECT * FROM governance_stake_pools
       WHERE governance_poll_id = $1`,
      [pollId]
    );

    if (poolResult.rows.length === 0) {
      // No stakes on this poll, nothing to distribute
      return;
    }

    const pool = poolResult.rows[0];

    // Step 2: Handle edge cases
    if (winningPosition === VoteOption.ABSTAIN) {
      // No clear winner, refund all stakes
      await refundAllStakes(client, pollId, 'Poll ended without clear winner');
      return;
    }

    // Check if it's a tie (50/50)
    const totalPool = pool.totalYesStake + pool.totalNoStake;
    if (totalPool === 0) {
      // No stakes at all
      return;
    }

    // Step 3: Get all stakes on this poll
    const stakesResult = await client.query<GovernanceStake>(
      `SELECT * FROM governance_stakes
       WHERE governance_poll_id = $1
         AND status = 'active'`,
      [pollId]
    );

    const stakes = stakesResult.rows;

    // Separate winners and losers
    const winners = stakes.filter((s) => s.stakedPosition === winningPosition);
    const losers = stakes.filter((s) => s.stakedPosition !== winningPosition);

    if (winners.length === 0) {
      // No winners (shouldn't happen, but handle gracefully)
      await refundAllStakes(client, pollId, 'No winners found');
      return;
    }

    // Step 4: Calculate total winning stake
    const totalWinningStake = winners.reduce((sum, stake) => sum + BigInt(stake.gratiumAmount), BigInt(0));

    // Step 5: Distribute rewards proportionally
    let totalDistributed = BigInt(0);

    for (const winner of winners) {
      // Calculate winner's share of total pool
      // Formula: (winner_stake / total_winning_stakes) × total_pool
      const winnerStake = BigInt(winner.gratiumAmount);
      const rewardAmount = (winnerStake * BigInt(totalPool)) / totalWinningStake;

      // Update stake record
      await client.query(
        `UPDATE governance_stakes
         SET status = $1,
             gratium_reward = $2,
             reward_paid_at = NOW(),
             updated_at = NOW()
         WHERE id = $3`,
        [StakeStatus.WON, rewardAmount.toString(), winner.id]
      );

      // Unlock stake and credit reward to winner's account
      await economyIntegration.unlockGratiumStake(
        client,
        winner.userId,
        winner.identityMode as IdentityMode,
        BigInt(winner.gratiumAmount),
        pollId
      );

      await economyIntegration.distributeGratiumReward(
        client,
        winner.userId,
        winner.identityMode as IdentityMode,
        rewardAmount
      );

      totalDistributed += rewardAmount;
    }

    // Step 6: Mark losers as lost
    for (const loser of losers) {
      await client.query(
        `UPDATE governance_stakes
         SET status = $1,
             gratium_reward = 0,
             updated_at = NOW()
         WHERE id = $2`,
        [StakeStatus.LOST, loser.id]
      );

      // Loser's stake is unlocked but not refunded (forfeited to winners)
      await economyIntegration.unlockGratiumStake(
        client,
        loser.userId,
        loser.identityMode as IdentityMode,
        BigInt(loser.gratiumAmount),
        pollId
      );
      // Note: Balance was already deducted when locked, so no additional action needed
    }

    // Step 7: Update stake pool status
    await client.query(
      `UPDATE governance_stake_pools
       SET pool_status = $1,
           winning_position = $2,
           total_rewards_distributed = $3,
           distribution_completed_at = NOW(),
           updated_at = NOW()
       WHERE governance_poll_id = $4`,
      [PoolStatus.DISTRIBUTED, winningPosition, totalDistributed.toString(), pollId]
    );
  });
}

/**
 * Refund all stakes (when poll is cancelled or invalid)
 */
async function refundAllStakes(client: PoolClient, pollId: string, reason: string): Promise<void> {
  // Get all active stakes
  const stakesResult = await client.query<GovernanceStake>(
    `SELECT * FROM governance_stakes
     WHERE governance_poll_id = $1
       AND status = 'active'`,
    [pollId]
  );

  const stakes = stakesResult.rows;

  // Refund each stake
  for (const stake of stakes) {
    await client.query(
      `UPDATE governance_stakes
       SET status = $1,
           gratium_reward = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [StakeStatus.REFUNDED, stake.gratiumAmount, stake.id]
    );

    // Unlock and refund tokens (integrated with economy module)
    await economyIntegration.unlockGratiumStake(
      client,
      stake.userId,
      stake.identityMode as IdentityMode,
      BigInt(stake.gratiumAmount),
      pollId
    );
  }

  // Update pool status
  await client.query(
    `UPDATE governance_stake_pools
     SET pool_status = $1,
         updated_at = NOW()
     WHERE governance_poll_id = $2`,
    [PoolStatus.REFUNDED, pollId]
  );
}

// ============================================================================
// Stake Queries
// ============================================================================

/**
 * Get stake pool for a poll
 */
export async function getStakePool(pollId: string): Promise<GovernanceStakePool | null> {
  const result = await query<GovernanceStakePool>(
    `SELECT * FROM governance_stake_pools
     WHERE governance_poll_id = $1`,
    [pollId]
  );

  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Get all stakes for a poll
 */
export async function getPollStakes(pollId: string): Promise<GovernanceStake[]> {
  const result = await query<GovernanceStake>(
    `SELECT * FROM governance_stakes
     WHERE governance_poll_id = $1
     ORDER BY created_at DESC`,
    [pollId]
  );

  return result.rows;
}

/**
 * Get user's stakes for a poll (both True Self and Shadow)
 */
export async function getUserStakesForPoll(
  userId: string,
  pollId: string
): Promise<{ trueSelf?: GovernanceStake; shadow?: GovernanceStake }> {
  const result = await query<GovernanceStake>(
    `SELECT * FROM governance_stakes
     WHERE user_id = $1
       AND governance_poll_id = $2`,
    [userId, pollId]
  );

  const trueSelfStake = result.rows.find((s) => s.identityMode === IdentityMode.TRUE_SELF);
  const shadowStake = result.rows.find((s) => s.identityMode === IdentityMode.SHADOW);

  return {
    trueSelf: trueSelfStake,
    shadow: shadowStake,
  };
}

/**
 * Get user's stake history across all polls
 */
export async function getUserStakeHistory(userId: string, limit = 50): Promise<GovernanceStake[]> {
  const result = await query<GovernanceStake>(
    `SELECT gs.*, gp.title as poll_title
     FROM governance_stakes gs
     JOIN governance_polls gp ON gs.governance_poll_id = gp.id
     WHERE gs.user_id = $1
     ORDER BY gs.created_at DESC
     LIMIT $2`,
    [userId, limit]
  );

  return result.rows;
}

/**
 * Calculate potential reward for a stake position
 * (Shows user what they'd earn if they win)
 */
export async function calculatePotentialReward(
  pollId: string,
  position: VoteOption,
  stakeAmount: number
): Promise<{
  currentPool: { yes: number; no: number };
  potentialReward: number;
  rewardMultiplier: number;
}> {
  const pool = await getStakePool(pollId);

  if (!pool) {
    return {
      currentPool: { yes: 0, no: 0 },
      potentialReward: stakeAmount,
      rewardMultiplier: 1.0,
    };
  }

  // Calculate what the pool would be after user stakes
  const newYesPool = position === VoteOption.YES ? pool.totalYesStake + stakeAmount : pool.totalYesStake;
  const newNoPool = position === VoteOption.NO ? pool.totalNoStake + stakeAmount : pool.totalNoStake;
  const totalPool = newYesPool + newNoPool;

  // Calculate user's share if they win
  const winningPool = position === VoteOption.YES ? newYesPool : newNoPool;
  const userShare = stakeAmount / winningPool;
  const potentialReward = Math.floor(totalPool * userShare);

  const rewardMultiplier = potentialReward / stakeAmount;

  return {
    currentPool: {
      yes: pool.totalYesStake,
      no: pool.totalNoStake,
    },
    potentialReward,
    rewardMultiplier: Math.round(rewardMultiplier * 100) / 100,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate confidence level based on stake amount
 */
function calculateConfidenceLevel(amount: number): ConfidenceLevel {
  if (amount < 100) {
    return ConfidenceLevel.LOW;
  } else if (amount < 1000) {
    return ConfidenceLevel.MEDIUM;
  } else if (amount < 10000) {
    return ConfidenceLevel.HIGH;
  } else {
    return ConfidenceLevel.EXTREME;
  }
}

/**
 * Validate stake request
 */
export function validateStakeRequest(stakeData: CreateStakeRequest): {
  valid: boolean;
  error?: string;
} {
  if (stakeData.gratiumAmount < MINIMUM_STAKE_AMOUNT) {
    return {
      valid: false,
      error: `Minimum stake is ${MINIMUM_STAKE_AMOUNT} Gratium`,
    };
  }

  if (stakeData.stakedPosition === VoteOption.ABSTAIN) {
    return {
      valid: false,
      error: 'Cannot stake on ABSTAIN position',
    };
  }

  if (stakeData.gratiumAmount <= 0) {
    return {
      valid: false,
      error: 'Stake amount must be positive',
    };
  }

  return { valid: true };
}

// ============================================================================
// Export
// ============================================================================

export default {
  createStake,
  distributeStakeRewards,
  getStakePool,
  getPollStakes,
  getUserStakesForPoll,
  getUserStakeHistory,
  calculatePotentialReward,
  validateStakeRequest,
};
