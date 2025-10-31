/**
 * Module 04: Economy - Ledger Service
 *
 * Manages token balances (PollCoin and Gratium) for users
 */

import { PoolClient } from 'pg';
import {
  TokenLedger,
  InitializeBalancesDTO,
  GetBalancesDTO,
  BalanceResponse,
  IdentityMode,
  formatTokenAmount,
} from '../types/economy.types';
import { query, insert, findOne, transaction } from '../utils/database';

// ============================================================================
// Ledger Management
// ============================================================================

/**
 * Initialize token balances for a user identity
 */
export async function initializeUserBalances(
  data: InitializeBalancesDTO
): Promise<TokenLedger> {
  const { userId, identityMode, initialPollCoin, initialGratium } = data;

  // Check if ledger already exists
  const existing = await findOne<TokenLedger>('token_ledger', {
    user_id: userId,
    identity_mode: identityMode,
  });

  if (existing) {
    throw new Error(
      `Ledger already exists for user ${userId} in ${identityMode} mode`
    );
  }

  return await transaction(async (client: PoolClient) => {
    // Create ledger entry
    const ledger = await client.query<TokenLedger>(
      `INSERT INTO token_ledger (
        user_id,
        identity_mode,
        pollcoin_balance,
        gratium_balance,
        pollcoin_locked,
        gratium_locked
      ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        userId,
        identityMode,
        initialPollCoin || BigInt(0),
        initialGratium || BigInt(0),
        BigInt(0),
        BigInt(0),
      ]
    );

    // Initialize Light Score (in light_scores table)
    await client.query(
      `INSERT INTO light_scores (user_id, current_score)
       VALUES ($1, 50.00)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId]
    );

    // Record initial transactions if any
    if (initialPollCoin && initialPollCoin > BigInt(0)) {
      await client.query(
        `INSERT INTO token_transactions (
          transaction_type, token_type, amount,
          to_user_id, to_identity_mode,
          status, completed_at, memo
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)`,
        [
          'reward',
          'pollcoin',
          initialPollCoin.toString(),
          userId,
          identityMode,
          'completed',
          'Welcome bonus',
        ]
      );
    }

    if (initialGratium && initialGratium > BigInt(0)) {
      await client.query(
        `INSERT INTO token_transactions (
          transaction_type, token_type, amount,
          to_user_id, to_identity_mode,
          status, completed_at, memo
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)`,
        [
          'reward',
          'gratium',
          initialGratium.toString(),
          userId,
          identityMode,
          'completed',
          'Welcome bonus',
        ]
      );
    }

    return ledger.rows[0];
  });
}

/**
 * Get user balances (PollCoin, Gratium, Light Score)
 */
export async function getUserBalances(
  data: GetBalancesDTO
): Promise<BalanceResponse> {
  const { userId, identityMode } = data;

  // Get token balances
  const ledger = await findOne<TokenLedger>('token_ledger', {
    user_id: userId,
    identity_mode: identityMode,
  });

  if (!ledger) {
    throw new Error(
      `No ledger found for user ${userId} in ${identityMode} mode`
    );
  }

  // Get Light Score
  const lightScoreResult = await query(
    `SELECT current_score, trend_direction, trend_velocity
     FROM light_scores WHERE user_id = $1`,
    [userId]
  );

  const lightScore = lightScoreResult.rows[0] || {
    current_score: 50.0,
    trend_direction: null,
    trend_velocity: 0.0,
  };

  return {
    user_id: userId,
    identity_mode: identityMode,
    pollcoin: {
      balance: formatTokenAmount(ledger.pollcoin_balance),
      locked: formatTokenAmount(ledger.pollcoin_locked),
      available: formatTokenAmount(ledger.pollcoin_available),
    },
    gratium: {
      balance: formatTokenAmount(ledger.gratium_balance),
      locked: formatTokenAmount(ledger.gratium_locked),
      available: formatTokenAmount(ledger.gratium_available),
    },
    light_score: {
      current: parseFloat(lightScore.current_score),
      trend: lightScore.trend_direction,
      velocity: parseFloat(lightScore.trend_velocity),
    },
  };
}

/**
 * Get raw ledger entry (for internal use)
 */
export async function getLedger(
  userId: string,
  identityMode: IdentityMode
): Promise<TokenLedger | null> {
  return await findOne<TokenLedger>('token_ledger', {
    user_id: userId,
    identity_mode: identityMode,
  });
}

/**
 * Check if user has sufficient available balance
 */
export async function hasAvailableBalance(
  userId: string,
  identityMode: IdentityMode,
  tokenType: 'pollcoin' | 'gratium',
  amount: bigint
): Promise<boolean> {
  const ledger = await getLedger(userId, identityMode);

  if (!ledger) {
    return false;
  }

  const availableBalance =
    tokenType === 'pollcoin'
      ? ledger.pollcoin_available
      : ledger.gratium_available;

  return BigInt(availableBalance) >= amount;
}

/**
 * Update ledger balance (internal use only - called by transaction services)
 */
export async function updateBalance(
  client: PoolClient,
  userId: string,
  identityMode: IdentityMode,
  tokenType: 'pollcoin' | 'gratium',
  delta: bigint // Positive to add, negative to subtract
): Promise<void> {
  const balanceField =
    tokenType === 'pollcoin' ? 'pollcoin_balance' : 'gratium_balance';

  const result = await client.query(
    `UPDATE token_ledger
     SET ${balanceField} = ${balanceField} + $1, updated_at = NOW()
     WHERE user_id = $2 AND identity_mode = $3
     RETURNING *`,
    [delta.toString(), userId, identityMode]
  );

  if (result.rowCount === 0) {
    throw new Error(
      `Ledger not found for user ${userId} in ${identityMode} mode`
    );
  }

  // Verify balance didn't go negative
  const updatedLedger = result.rows[0];
  const finalBalance =
    tokenType === 'pollcoin'
      ? updatedLedger.pollcoin_balance
      : updatedLedger.gratium_balance;

  if (BigInt(finalBalance) < BigInt(0)) {
    throw new Error('Insufficient balance - transaction would result in negative balance');
  }
}

/**
 * Update locked balance (internal use only - called by lock services)
 */
export async function updateLockedBalance(
  client: PoolClient,
  userId: string,
  identityMode: IdentityMode,
  tokenType: 'pollcoin' | 'gratium',
  delta: bigint // Positive to lock, negative to unlock
): Promise<void> {
  const lockedField =
    tokenType === 'pollcoin' ? 'pollcoin_locked' : 'gratium_locked';

  const result = await client.query(
    `UPDATE token_ledger
     SET ${lockedField} = ${lockedField} + $1, updated_at = NOW()
     WHERE user_id = $2 AND identity_mode = $3
     RETURNING *`,
    [delta.toString(), userId, identityMode]
  );

  if (result.rowCount === 0) {
    throw new Error(
      `Ledger not found for user ${userId} in ${identityMode} mode`
    );
  }

  // Verify locked didn't go negative
  const updatedLedger = result.rows[0];
  const finalLocked =
    tokenType === 'pollcoin'
      ? updatedLedger.pollcoin_locked
      : updatedLedger.gratium_locked;

  if (BigInt(finalLocked) < BigInt(0)) {
    throw new Error('Cannot unlock more than currently locked');
  }

  // Verify available balance is not negative
  const finalAvailable =
    tokenType === 'pollcoin'
      ? updatedLedger.pollcoin_available
      : updatedLedger.gratium_available;

  if (BigInt(finalAvailable) < BigInt(0)) {
    throw new Error('Insufficient available balance for lock');
  }
}

export default {
  initializeUserBalances,
  getUserBalances,
  getLedger,
  hasAvailableBalance,
  updateBalance,
  updateLockedBalance,
};
