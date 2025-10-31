/**
 * Module 04: Economy - Transfer Service
 *
 * Handles token transfers between users with burn mechanics
 */

import { PoolClient } from 'pg';
import {
  TransferTokensDTO,
  TransferResponse,
  TokenTransaction,
  calculateBurnAmount,
  formatTokenAmount,
} from '../types/economy.types';
import { transaction } from '../utils/database';
import { getLedger, updateBalance } from './ledger.service';

// ============================================================================
// Token Transfers
// ============================================================================

/**
 * Transfer tokens from one user to another
 * Includes automatic burn mechanics (1% for PollCoin, 0.5% for Gratium)
 */
export async function transferTokens(
  data: TransferTokensDTO
): Promise<TransferResponse> {
  const {
    fromUserId,
    fromIdentityMode,
    toUserId,
    toIdentityMode,
    tokenType,
    amount,
    memo,
    referenceType,
    referenceId,
  } = data;

  // Validation
  if (amount <= BigInt(0)) {
    throw new Error('Transfer amount must be greater than 0');
  }

  if (fromUserId === toUserId && fromIdentityMode === toIdentityMode) {
    throw new Error('Cannot transfer to the same identity');
  }

  return await transaction(async (client: PoolClient) => {
    // Get sender ledger
    const senderLedger = await getLedger(fromUserId, fromIdentityMode);

    if (!senderLedger) {
      throw new Error(
        `Sender ledger not found for user ${fromUserId} in ${fromIdentityMode} mode`
      );
    }

    // Check available balance
    const availableBalance =
      tokenType === 'pollcoin'
        ? senderLedger.pollcoin_available
        : senderLedger.gratium_available;

    if (BigInt(availableBalance) < amount) {
      throw new Error(
        `Insufficient ${tokenType} balance. Available: ${formatTokenAmount(
          BigInt(availableBalance)
        )}, Required: ${formatTokenAmount(amount)}`
      );
    }

    // Get receiver ledger
    const receiverLedger = await getLedger(toUserId, toIdentityMode);

    if (!receiverLedger) {
      throw new Error(
        `Receiver ledger not found for user ${toUserId} in ${toIdentityMode} mode`
      );
    }

    // Calculate burn amount
    const burnAmount = calculateBurnAmount(amount, tokenType);
    const netAmount = amount - burnAmount;

    // Deduct from sender
    await updateBalance(
      client,
      fromUserId,
      fromIdentityMode,
      tokenType,
      -amount // Negative to subtract
    );

    // Add to receiver (net amount after burn)
    await updateBalance(
      client,
      toUserId,
      toIdentityMode,
      tokenType,
      netAmount // Positive to add
    );

    // Update total supply (burned tokens)
    await client.query(
      `UPDATE token_supply
       SET total_burned = total_burned + $1, updated_at = NOW()
       WHERE token_type = $2`,
      [burnAmount.toString(), tokenType]
    );

    // Record transaction
    const txResult = await client.query<TokenTransaction>(
      `INSERT INTO token_transactions (
        transaction_type, token_type, amount,
        from_user_id, from_identity_mode,
        to_user_id, to_identity_mode,
        burn_amount, memo,
        reference_type, reference_id,
        status, completed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      RETURNING *`,
      [
        'transfer',
        tokenType,
        amount.toString(),
        fromUserId,
        fromIdentityMode,
        toUserId,
        toIdentityMode,
        burnAmount.toString(),
        memo || null,
        referenceType || null,
        referenceId || null,
        'completed',
      ]
    );

    const transaction = txResult.rows[0];

    return {
      success: true,
      transaction_id: transaction.id,
      net_amount: formatTokenAmount(netAmount),
      burn_amount: formatTokenAmount(burnAmount),
    };
  });
}

/**
 * Tip tokens to another user (alias for transfer with context)
 */
export async function tipTokens(
  fromUserId: string,
  fromIdentityMode: 'true_self' | 'shadow',
  toUserId: string,
  toIdentityMode: 'true_self' | 'shadow',
  amount: bigint,
  referenceType?: string,
  referenceId?: string,
  memo?: string
): Promise<TransferResponse> {
  return await transferTokens({
    fromUserId,
    fromIdentityMode,
    toUserId,
    toIdentityMode,
    tokenType: 'gratium', // Tips are always Gratium
    amount,
    memo: memo || 'Tip',
    referenceType,
    referenceId,
  });
}

/**
 * Burn tokens (remove from circulation)
 */
export async function burnTokens(
  userId: string,
  identityMode: 'true_self' | 'shadow',
  tokenType: 'pollcoin' | 'gratium',
  amount: bigint,
  reason?: string
): Promise<string> {
  if (amount <= BigInt(0)) {
    throw new Error('Burn amount must be greater than 0');
  }

  return await transaction(async (client: PoolClient) => {
    // Get user ledger
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
      throw new Error('Insufficient balance to burn');
    }

    // Deduct from user
    await updateBalance(client, userId, identityMode, tokenType, -amount);

    // Update total supply
    await client.query(
      `UPDATE token_supply
       SET total_burned = total_burned + $1, updated_at = NOW()
       WHERE token_type = $2`,
      [amount.toString(), tokenType]
    );

    // Record transaction
    const txResult = await client.query<TokenTransaction>(
      `INSERT INTO token_transactions (
        transaction_type, token_type, amount,
        from_user_id, from_identity_mode,
        burn_amount, memo,
        status, completed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *`,
      [
        'burn',
        tokenType,
        amount.toString(),
        userId,
        identityMode,
        amount.toString(),
        reason || 'Manual burn',
        'completed',
      ]
    );

    return txResult.rows[0].id;
  });
}

/**
 * Reward tokens to a user (system operation)
 */
export async function rewardTokens(
  userId: string,
  identityMode: 'true_self' | 'shadow',
  tokenType: 'pollcoin' | 'gratium',
  amount: bigint,
  reason: string
): Promise<string> {
  if (amount <= BigInt(0)) {
    throw new Error('Reward amount must be greater than 0');
  }

  return await transaction(async (client: PoolClient) => {
    // Add to user balance
    await updateBalance(client, userId, identityMode, tokenType, amount);

    // Update total supply (minted)
    await client.query(
      `UPDATE token_supply
       SET total_minted = total_minted + $1, updated_at = NOW()
       WHERE token_type = $2`,
      [amount.toString(), tokenType]
    );

    // Record transaction
    const txResult = await client.query<TokenTransaction>(
      `INSERT INTO token_transactions (
        transaction_type, token_type, amount,
        to_user_id, to_identity_mode,
        memo, status, completed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *`,
      [
        'reward',
        tokenType,
        amount.toString(),
        userId,
        identityMode,
        reason,
        'completed',
      ]
    );

    return txResult.rows[0].id;
  });
}

export default {
  transferTokens,
  tipTokens,
  burnTokens,
  rewardTokens,
};
