/**
 * Module 04: Economy - Transaction Service
 *
 * Query and manage transaction history
 */

import {
  GetTransactionsDTO,
  TransactionHistoryResponse,
  TokenTransaction,
  SupplyResponse,
  TokenSupply,
  formatTokenAmount,
} from '../types/economy.types';
import { query } from '../utils/database';

// ============================================================================
// Transaction History
// ============================================================================

/**
 * Get transaction history for a user
 */
export async function getTransactionHistory(
  data: GetTransactionsDTO
): Promise<TransactionHistoryResponse> {
  const {
    userId,
    identityMode,
    tokenType,
    transactionType,
    limit = 20,
    offset = 0,
  } = data;

  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  // Build WHERE clause
  if (userId) {
    conditions.push(
      `(from_user_id = $${paramIndex} OR to_user_id = $${paramIndex})`
    );
    values.push(userId);
    paramIndex++;
  }

  if (identityMode) {
    conditions.push(
      `(from_identity_mode = $${paramIndex} OR to_identity_mode = $${paramIndex})`
    );
    values.push(identityMode);
    paramIndex++;
  }

  if (tokenType) {
    conditions.push(`token_type = $${paramIndex}`);
    values.push(tokenType);
    paramIndex++;
  }

  if (transactionType) {
    conditions.push(`transaction_type = $${paramIndex}`);
    values.push(transactionType);
    paramIndex++;
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get total count
  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM token_transactions ${whereClause}`,
    values
  );

  const total = parseInt(countResult.rows[0].count);

  // Get transactions
  const txResult = await query<TokenTransaction>(
    `SELECT * FROM token_transactions
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...values, limit, offset]
  );

  return {
    transactions: txResult.rows.map((tx) => ({
      id: tx.id,
      type: tx.transaction_type,
      token_type: tx.token_type,
      amount: formatTokenAmount(tx.amount),
      from: tx.from_user_id
        ? {
            user_id: tx.from_user_id,
            identity_mode: tx.from_identity_mode!,
          }
        : undefined,
      to: tx.to_user_id
        ? {
            user_id: tx.to_user_id,
            identity_mode: tx.to_identity_mode!,
          }
        : undefined,
      status: tx.status,
      created_at: tx.created_at,
    })),
    total,
    limit,
    offset,
  };
}

/**
 * Get token supply metrics (public endpoint)
 */
export async function getTokenSupply(): Promise<SupplyResponse> {
  const result = await query<TokenSupply>(
    `SELECT * FROM token_supply ORDER BY token_type`
  );

  const pollcoin = result.rows.find((row) => row.token_type === 'pollcoin');
  const gratium = result.rows.find((row) => row.token_type === 'gratium');

  if (!pollcoin || !gratium) {
    throw new Error('Token supply not initialized');
  }

  return {
    pollcoin: {
      total_minted: formatTokenAmount(pollcoin.total_minted),
      total_burned: formatTokenAmount(pollcoin.total_burned),
      circulating_supply: formatTokenAmount(pollcoin.circulating_supply),
      total_locked: formatTokenAmount(pollcoin.total_locked),
      emission_rate: parseFloat(pollcoin.emission_rate.toString()),
    },
    gratium: {
      total_minted: formatTokenAmount(gratium.total_minted),
      total_burned: formatTokenAmount(gratium.total_burned),
      circulating_supply: formatTokenAmount(gratium.circulating_supply),
      total_locked: formatTokenAmount(gratium.total_locked),
      emission_rate: parseFloat(gratium.emission_rate.toString()),
    },
  };
}

/**
 * Get transaction by ID
 */
export async function getTransactionById(
  transactionId: string
): Promise<TokenTransaction | null> {
  const result = await query<TokenTransaction>(
    `SELECT * FROM token_transactions WHERE id = $1`,
    [transactionId]
  );

  return result.rows[0] || null;
}

/**
 * Get transaction stats for a user
 */
export async function getUserTransactionStats(
  userId: string,
  identityMode: 'true_self' | 'shadow'
): Promise<{
  total_sent: { pollcoin: string; gratium: string };
  total_received: { pollcoin: string; gratium: string };
  total_burned: { pollcoin: string; gratium: string };
  transaction_count: number;
}> {
  // Total sent
  const sentResult = await query<{
    token_type: string;
    total: string;
  }>(
    `SELECT token_type, COALESCE(SUM(amount), 0) as total
     FROM token_transactions
     WHERE from_user_id = $1 AND from_identity_mode = $2
       AND transaction_type IN ('transfer', 'tip', 'burn', 'stake')
     GROUP BY token_type`,
    [userId, identityMode]
  );

  // Total received
  const receivedResult = await query<{
    token_type: string;
    total: string;
  }>(
    `SELECT token_type, COALESCE(SUM(amount), 0) as total
     FROM token_transactions
     WHERE to_user_id = $1 AND to_identity_mode = $2
       AND transaction_type IN ('transfer', 'tip', 'reward', 'unstake')
     GROUP BY token_type`,
    [userId, identityMode]
  );

  // Total burned
  const burnedResult = await query<{
    token_type: string;
    total: string;
  }>(
    `SELECT token_type, COALESCE(SUM(burn_amount), 0) as total
     FROM token_transactions
     WHERE (from_user_id = $1 AND from_identity_mode = $2)
        OR (to_user_id = $1 AND to_identity_mode = $2)
     GROUP BY token_type`,
    [userId, identityMode]
  );

  // Transaction count
  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count
     FROM token_transactions
     WHERE (from_user_id = $1 AND from_identity_mode = $2)
        OR (to_user_id = $1 AND to_identity_mode = $2)`,
    [userId, identityMode]
  );

  const sentPollcoin =
    sentResult.rows.find((r) => r.token_type === 'pollcoin')?.total || '0';
  const sentGratium =
    sentResult.rows.find((r) => r.token_type === 'gratium')?.total || '0';

  const receivedPollcoin =
    receivedResult.rows.find((r) => r.token_type === 'pollcoin')?.total || '0';
  const receivedGratium =
    receivedResult.rows.find((r) => r.token_type === 'gratium')?.total || '0';

  const burnedPollcoin =
    burnedResult.rows.find((r) => r.token_type === 'pollcoin')?.total || '0';
  const burnedGratium =
    burnedResult.rows.find((r) => r.token_type === 'gratium')?.total || '0';

  return {
    total_sent: {
      pollcoin: formatTokenAmount(BigInt(sentPollcoin)),
      gratium: formatTokenAmount(BigInt(sentGratium)),
    },
    total_received: {
      pollcoin: formatTokenAmount(BigInt(receivedPollcoin)),
      gratium: formatTokenAmount(BigInt(receivedGratium)),
    },
    total_burned: {
      pollcoin: formatTokenAmount(BigInt(burnedPollcoin)),
      gratium: formatTokenAmount(BigInt(burnedGratium)),
    },
    transaction_count: parseInt(countResult.rows[0].count),
  };
}

export default {
  getTransactionHistory,
  getTokenSupply,
  getTransactionById,
  getUserTransactionStats,
};
