/**
 * Module 04: Economy - Lock Service
 *
 * Handles token locking/staking for governance, veracity bonds, etc.
 */

import { PoolClient } from 'pg';
import {
  LockTokensDTO,
  StakeResponse,
  UnstakeResponse,
  TokenLock,
  formatTokenAmount,
} from '../types/economy.types';
import { transaction, query, findOne } from '../utils/database';
import { getLedger, updateLockedBalance } from './ledger.service';

// ============================================================================
// Token Locking/Staking
// ============================================================================

/**
 * Lock tokens (stake for governance, bonds, etc.)
 */
export async function lockTokens(
  data: LockTokensDTO
): Promise<StakeResponse> {
  const {
    userId,
    identityMode,
    tokenType,
    amount,
    lockType,
    referenceType,
    referenceId,
    unlockAt,
  } = data;

  if (amount <= BigInt(0)) {
    throw new Error('Lock amount must be greater than 0');
  }

  return await transaction(async (client: PoolClient) => {
    // Get current ledger
    const ledger = await getLedger(userId, identityMode);

    if (!ledger) {
      throw new Error(
        `Ledger not found for user ${userId} in ${identityMode} mode`
      );
    }

    // Check available balance
    const availableBalance =
      tokenType === 'pollcoin'
        ? ledger.pollcoin_available
        : ledger.gratium_available;

    if (BigInt(availableBalance) < amount) {
      throw new Error(
        `Insufficient ${tokenType} balance to lock. Available: ${formatTokenAmount(
          BigInt(availableBalance)
        )}, Required: ${formatTokenAmount(amount)}`
      );
    }

    // Increase locked amount in ledger
    await updateLockedBalance(
      client,
      userId,
      identityMode,
      tokenType,
      amount // Positive to lock
    );

    // Create lock record
    const lockResult = await client.query<TokenLock>(
      `INSERT INTO token_locks (
        user_id, identity_mode, token_type, amount,
        lock_type, reference_type, reference_id,
        unlock_at, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        userId,
        identityMode,
        tokenType,
        amount.toString(),
        lockType,
        referenceType || null,
        referenceId || null,
        unlockAt || null,
        'active',
      ]
    );

    const lock = lockResult.rows[0];

    // Update total supply locked
    await client.query(
      `UPDATE token_supply
       SET total_locked = total_locked + $1, updated_at = NOW()
       WHERE token_type = $2`,
      [amount.toString(), tokenType]
    );

    // Record transaction
    await client.query(
      `INSERT INTO token_transactions (
        transaction_type, token_type, amount,
        from_user_id, from_identity_mode,
        reference_type, reference_id,
        status, completed_at, memo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9)`,
      [
        'stake',
        tokenType,
        amount.toString(),
        userId,
        identityMode,
        referenceType || null,
        referenceId || null,
        'completed',
        `Locked as ${lockType}`,
      ]
    );

    return {
      success: true,
      lock_id: lock.id,
      amount_locked: formatTokenAmount(amount),
      unlock_at: unlockAt,
    };
  });
}

/**
 * Release locked tokens (unstake)
 */
export async function releaseLockedTokens(
  lockId: string
): Promise<UnstakeResponse> {
  return await transaction(async (client: PoolClient) => {
    // Get lock
    const lock = await findOne<TokenLock>('token_locks', { id: lockId });

    if (!lock) {
      throw new Error('Lock not found');
    }

    if (lock.status !== 'active') {
      throw new Error(`Lock is not active (status: ${lock.status})`);
    }

    // Check if unlock time has passed (if set)
    if (lock.unlock_at && new Date() < lock.unlock_at) {
      const timeRemaining = lock.unlock_at.getTime() - Date.now();
      const hoursRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60));
      throw new Error(
        `Tokens are still locked. ${hoursRemaining} hours remaining until unlock.`
      );
    }

    // Update lock status
    await client.query(
      `UPDATE token_locks
       SET status = $1, released_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      ['released', lockId]
    );

    // Reduce locked amount in ledger
    await updateLockedBalance(
      client,
      lock.user_id,
      lock.identity_mode,
      lock.token_type,
      -BigInt(lock.amount) // Negative to unlock
    );

    // Update total supply locked
    await client.query(
      `UPDATE token_supply
       SET total_locked = total_locked - $1, updated_at = NOW()
       WHERE token_type = $2`,
      [lock.amount.toString(), lock.token_type]
    );

    // Record transaction
    await client.query(
      `INSERT INTO token_transactions (
        transaction_type, token_type, amount,
        to_user_id, to_identity_mode,
        reference_type, reference_id,
        status, completed_at, memo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9)`,
      [
        'unstake',
        lock.token_type,
        lock.amount.toString(),
        lock.user_id,
        lock.identity_mode,
        lock.reference_type || null,
        lock.reference_id || null,
        'completed',
        `Released from ${lock.lock_type}`,
      ]
    );

    return {
      success: true,
      amount_released: formatTokenAmount(BigInt(lock.amount)),
      token_type: lock.token_type,
    };
  });
}

/**
 * Slash locked tokens (penalty for governance violations)
 */
export async function slashLockedTokens(
  lockId: string,
  reason: string
): Promise<void> {
  await transaction(async (client: PoolClient) => {
    // Get lock
    const lock = await findOne<TokenLock>('token_locks', { id: lockId });

    if (!lock) {
      throw new Error('Lock not found');
    }

    if (lock.status !== 'active') {
      throw new Error('Lock is not active');
    }

    // Update lock status to slashed
    await client.query(
      `UPDATE token_locks
       SET status = $1, updated_at = NOW()
       WHERE id = $2`,
      ['slashed', lockId]
    );

    // Reduce locked amount in ledger (tokens are confiscated)
    await updateLockedBalance(
      client,
      lock.user_id,
      lock.identity_mode,
      lock.token_type,
      -BigInt(lock.amount) // Negative to unlock
    );

    // Reduce total balance (tokens are permanently removed)
    await client.query(
      `UPDATE token_ledger
       SET ${
         lock.token_type === 'pollcoin' ? 'pollcoin_balance' : 'gratium_balance'
       } = ${
        lock.token_type === 'pollcoin' ? 'pollcoin_balance' : 'gratium_balance'
      } - $1,
           updated_at = NOW()
       WHERE user_id = $2 AND identity_mode = $3`,
      [lock.amount.toString(), lock.user_id, lock.identity_mode]
    );

    // Update total supply (burned)
    await client.query(
      `UPDATE token_supply
       SET total_locked = total_locked - $1,
           total_burned = total_burned + $1,
           updated_at = NOW()
       WHERE token_type = $2`,
      [lock.amount.toString(), lock.token_type]
    );

    // Record transaction
    await client.query(
      `INSERT INTO token_transactions (
        transaction_type, token_type, amount,
        from_user_id, from_identity_mode,
        burn_amount, status, completed_at, memo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)`,
      [
        'burn',
        lock.token_type,
        lock.amount.toString(),
        lock.user_id,
        lock.identity_mode,
        lock.amount.toString(),
        'completed',
        `Slashed: ${reason}`,
      ]
    );
  });
}

/**
 * Get all active locks for a user
 */
export async function getUserLocks(
  userId: string,
  identityMode: 'true_self' | 'shadow'
): Promise<TokenLock[]> {
  const result = await query<TokenLock>(
    `SELECT * FROM token_locks
     WHERE user_id = $1 AND identity_mode = $2 AND status = $3
     ORDER BY locked_at DESC`,
    [userId, identityMode, 'active']
  );

  return result.rows;
}

/**
 * Get lock by ID
 */
export async function getLock(lockId: string): Promise<TokenLock | null> {
  return await findOne<TokenLock>('token_locks', { id: lockId });
}

/**
 * Get total locked amount for a user
 */
export async function getTotalLocked(
  userId: string,
  identityMode: 'true_self' | 'shadow',
  tokenType: 'pollcoin' | 'gratium'
): Promise<bigint> {
  const result = await query<{ total: string }>(
    `SELECT COALESCE(SUM(amount), 0) as total
     FROM token_locks
     WHERE user_id = $1 AND identity_mode = $2 AND token_type = $3 AND status = $4`,
    [userId, identityMode, tokenType, 'active']
  );

  return BigInt(result.rows[0].total);
}

export default {
  lockTokens,
  releaseLockedTokens,
  slashLockedTokens,
  getUserLocks,
  getLock,
  getTotalLocked,
};
