/**
 * Module 04: Economy - Type Definitions
 *
 * Types for the 4-token economy system:
 * - PollCoin (governance)
 * - Gratium (tipping/staking)
 * - Light Score (reputation)
 */

// ============================================================================
// Base Types
// ============================================================================

export type TokenType = 'pollcoin' | 'gratium';
export type IdentityMode = 'true_self' | 'shadow';
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'reversed';
export type LockStatus = 'active' | 'released' | 'slashed' | 'expired';
export type TrendDirection = 'up' | 'down' | 'stable';

export type TransactionType =
  | 'transfer'
  | 'tip'
  | 'stake'
  | 'unstake'
  | 'burn'
  | 'reward'
  | 'purchase'
  | 'poll_creation'
  | 'vote_cost'
  | 'veracity_bond'
  | 'prediction_market';

export type LockType =
  | 'governance_stake'
  | 'veracity_bond'
  | 'prediction_market'
  | 'poll_stake'
  | 'escrow'
  | 'penalty'
  | 'cooldown';

export type LightScoreEventType =
  | 'post_created'
  | 'helpful_comment'
  | 'verification_completed'
  | 'governance_participation'
  | 'bond_created'
  | 'prediction_correct'
  | 'spam_detected'
  | 'violation'
  | 'helpful_vote'
  | 'quality_contribution';

// ============================================================================
// Database Models
// ============================================================================

export interface TokenLedger {
  id: string;
  user_id: string;
  identity_mode: IdentityMode;
  pollcoin_balance: bigint;
  gratium_balance: bigint;
  pollcoin_locked: bigint;
  gratium_locked: bigint;
  pollcoin_available: bigint; // Computed
  gratium_available: bigint; // Computed
  created_at: Date;
  updated_at: Date;
}

export interface TokenTransaction {
  id: string;
  transaction_type: TransactionType;
  token_type: TokenType;
  amount: bigint;
  from_user_id?: string;
  from_identity_mode?: IdentityMode;
  to_user_id?: string;
  to_identity_mode?: IdentityMode;
  fee_amount: bigint;
  burn_amount: bigint;
  reference_type?: string;
  reference_id?: string;
  memo?: string;
  status: TransactionStatus;
  created_at: Date;
  completed_at?: Date;
  blockchain_tx_hash?: string;
  blockchain_confirmed: boolean;
}

export interface TokenLock {
  id: string;
  user_id: string;
  identity_mode: IdentityMode;
  token_type: TokenType;
  amount: bigint;
  lock_type: LockType;
  reference_type?: string;
  reference_id?: string;
  locked_at: Date;
  unlock_at?: Date;
  released_at?: Date;
  status: LockStatus;
  created_at: Date;
  updated_at: Date;
}

export interface LightScore {
  id: string;
  user_id: string;
  current_score: number; // 0-100
  score_7d_ago?: number;
  score_30d_ago?: number;
  score_90d_ago?: number;
  trend_direction?: TrendDirection;
  trend_velocity: number;
  quality_score: number;
  helpfulness_score: number;
  consistency_score: number;
  trust_score: number;
  last_calculated_at: Date;
  calculation_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface LightScoreEvent {
  id: string;
  user_id: string;
  event_type: LightScoreEventType;
  score_change: number;
  old_score: number;
  new_score: number;
  reference_type?: string;
  reference_id?: string;
  pentos_reasoning?: string;
  pentos_confidence?: number; // 0-1
  occurred_at: Date;
}

export interface TokenSupply {
  id: string;
  token_type: TokenType;
  total_minted: bigint;
  total_burned: bigint;
  circulating_supply: bigint; // Computed
  total_locked: bigint;
  available_supply: bigint; // Computed
  emission_rate: number;
  last_emission_at?: Date;
  next_emission_at?: Date;
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// DTOs (Data Transfer Objects)
// ============================================================================

export interface InitializeBalancesDTO {
  userId: string;
  identityMode: IdentityMode;
  initialPollCoin?: bigint;
  initialGratium?: bigint;
}

export interface TransferTokensDTO {
  fromUserId: string;
  fromIdentityMode: IdentityMode;
  toUserId: string;
  toIdentityMode: IdentityMode;
  tokenType: TokenType;
  amount: bigint;
  memo?: string;
  referenceType?: string;
  referenceId?: string;
}

export interface LockTokensDTO {
  userId: string;
  identityMode: IdentityMode;
  tokenType: TokenType;
  amount: bigint;
  lockType: LockType;
  referenceType?: string;
  referenceId?: string;
  unlockAt?: Date;
}

export interface UpdateLightScoreDTO {
  userId: string;
  eventType: LightScoreEventType;
  scoreChange: number;
  reasoning: string;
  confidence: number; // 0-1
  referenceType?: string;
  referenceId?: string;
}

export interface GetBalancesDTO {
  userId: string;
  identityMode: IdentityMode;
}

export interface GetTransactionsDTO {
  userId?: string;
  identityMode?: IdentityMode;
  tokenType?: TokenType;
  transactionType?: TransactionType;
  limit?: number;
  offset?: number;
}

// ============================================================================
// Response Types
// ============================================================================

export interface BalanceResponse {
  user_id: string;
  identity_mode: IdentityMode;
  pollcoin: {
    balance: string; // Formatted as string for display
    locked: string;
    available: string;
  };
  gratium: {
    balance: string;
    locked: string;
    available: string;
  };
  light_score: {
    current: number;
    trend: TrendDirection | null;
    velocity: number;
  };
}

export interface TransferResponse {
  success: boolean;
  transaction_id: string;
  net_amount: string;
  burn_amount: string;
}

export interface StakeResponse {
  success: boolean;
  lock_id: string;
  amount_locked: string;
  unlock_at?: Date;
}

export interface UnstakeResponse {
  success: boolean;
  amount_released: string;
  token_type: TokenType;
}

export interface TransactionHistoryResponse {
  transactions: Array<{
    id: string;
    type: TransactionType;
    token_type: TokenType;
    amount: string;
    from?: {
      user_id: string;
      identity_mode: IdentityMode;
    };
    to?: {
      user_id: string;
      identity_mode: IdentityMode;
    };
    status: TransactionStatus;
    created_at: Date;
  }>;
  total: number;
  limit: number;
  offset: number;
}

export interface LightScoreHistoryResponse {
  current_score: number;
  history: Array<{
    event_type: LightScoreEventType;
    score_change: number;
    old_score: number;
    new_score: number;
    occurred_at: Date;
    reasoning?: string;
  }>;
}

export interface SupplyResponse {
  pollcoin: {
    total_minted: string;
    total_burned: string;
    circulating_supply: string;
    total_locked: string;
    emission_rate: number;
  };
  gratium: {
    total_minted: string;
    total_burned: string;
    circulating_supply: string;
    total_locked: string;
    emission_rate: number;
  };
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Format bigint token amount to human-readable string
 * @param amount Amount in wei (smallest unit)
 * @param decimals Number of decimals (default 18)
 */
export function formatTokenAmount(amount: bigint, decimals: number = 18): string {
  const divisor = BigInt(10) ** BigInt(decimals);
  const whole = amount / divisor;
  const remainder = amount % divisor;

  if (remainder === BigInt(0)) {
    return whole.toString();
  }

  const remainderStr = remainder.toString().padStart(decimals, '0');
  return `${whole}.${remainderStr}`.replace(/\.?0+$/, '');
}

/**
 * Parse human-readable token amount to bigint
 * @param amount String amount (e.g. "100.5")
 * @param decimals Number of decimals (default 18)
 */
export function parseTokenAmount(amount: string, decimals: number = 18): bigint {
  const [whole, fraction = ''] = amount.split('.');
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
  return BigInt(whole + paddedFraction);
}

/**
 * Calculate burn amount based on token type
 * @param amount Transaction amount
 * @param tokenType Token type
 */
export function calculateBurnAmount(amount: bigint, tokenType: TokenType): bigint {
  const burnRate = tokenType === 'pollcoin' ? 0.01 : 0.005; // 1% or 0.5%
  return BigInt(Math.floor(Number(amount) * burnRate));
}

/**
 * Calculate net amount after burn
 * @param amount Transaction amount
 * @param tokenType Token type
 */
export function calculateNetAmount(amount: bigint, tokenType: TokenType): bigint {
  const burnAmount = calculateBurnAmount(amount, tokenType);
  return amount - burnAmount;
}
