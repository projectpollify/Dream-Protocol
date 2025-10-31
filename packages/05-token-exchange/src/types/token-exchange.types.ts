/**
 * Module 05: Token Exchange Integration - Types
 *
 * Type definitions for on-platform token purchases, DEX monitoring,
 * and spot-only compliance enforcement
 */

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export type TokenType = 'pollcoin' | 'gratium';
export type IdentityMode = 'true_self' | 'shadow';
export type FiatCurrency = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD';
export type PaymentProvider = 'stripe' | 'moonpay' | 'wyre';

export type PurchaseStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'cancelled';

export type VerificationTier =
  | 'unverified'
  | 'basic'
  | 'verified'
  | 'premium'
  | 'institutional';

export type ComplianceStatus =
  | 'compliant'
  | 'violation_detected'
  | 'monitoring'
  | 'blocked';

export type AlertType =
  | 'lending_integration_detected'
  | 'shorting_enabled_on_pool'
  | 'margin_trading_enabled'
  | 'flash_loan_enabled'
  | 'unusual_volume_spike'
  | 'price_manipulation_suspected'
  | 'whale_accumulation'
  | 'regulatory_concern';

export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertStatus = 'open' | 'investigating' | 'resolved' | 'dismissed';

export type KYCResult = 'pass' | 'fail' | 'pending' | 'manual_review';

// ============================================================================
// DATABASE TYPES
// ============================================================================

/**
 * token_purchase_orders table
 */
export interface TokenPurchaseOrder {
  id: string;
  user_id: string;
  identity_mode: IdentityMode;

  // Purchase Details
  fiat_amount: string; // DECIMAL stored as string
  fiat_currency: FiatCurrency;
  token_type: TokenType;
  token_amount: string; // BIGINT stored as string

  // Pricing
  price_per_token: string; // DECIMAL stored as string
  premium_percentage: string; // DECIMAL stored as string

  // Payment Provider
  payment_provider: PaymentProvider;
  provider_transaction_id: string;

  // Status
  status: PurchaseStatus;

  // KYC/AML
  kyc_verified: boolean;
  aml_check_result: KYCResult | null;
  geographic_region: string | null;

  // Metadata
  ip_address: string | null;
  user_agent: string | null;
  refund_reason: string | null;

  // Timestamps
  created_at: Date;
  completed_at: Date | null;
  updated_at: Date;
}

/**
 * dex_listings table
 */
export interface DexListing {
  id: string;

  // DEX Info
  dex_name: string;
  dex_chain: string;
  token_type: TokenType;
  pool_address: string;

  // Listing Details
  trading_pair: string;
  liquidity_usd: string; // DECIMAL stored as string

  // Spot-Only Compliance
  is_leverage_pool: boolean;
  is_shorting_enabled: boolean;
  has_lending_integration: boolean;
  compliance_status: ComplianceStatus;

  // Pricing
  price_usd: string | null; // DECIMAL stored as string
  volume_24h: string | null; // DECIMAL stored as string
  price_change_24h: string | null; // DECIMAL stored as string

  // Metadata
  listed_at: Date | null;
  last_checked_at: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * purchase_limits table
 */
export interface PurchaseLimit {
  id: string;
  user_id: string;

  // Tier System
  verification_tier: VerificationTier;

  // Limits (in tokens)
  daily_limit: string; // BIGINT stored as string
  monthly_limit: string; // BIGINT stored as string
  yearly_limit: string; // BIGINT stored as string

  // Current Period Totals
  purchased_today: string; // BIGINT stored as string
  purchased_this_month: string; // BIGINT stored as string
  purchased_this_year: string; // BIGINT stored as string

  // Tracking
  last_purchase_at: Date | null;
  last_reset_daily: Date;
  last_reset_monthly: Date;
  last_reset_yearly: Date;

  created_at: Date;
  updated_at: Date;
}

/**
 * price_history table
 */
export interface PriceHistory {
  id: string;
  token_type: TokenType;
  source: string;

  // Pricing Data
  price_usd: string; // DECIMAL stored as string
  volume_24h: string | null; // DECIMAL stored as string
  market_cap: string | null; // DECIMAL stored as string

  // On-Platform Stats
  platform_sales_24h: string; // BIGINT stored as string
  platform_revenue_24h: string; // DECIMAL stored as string

  // Metadata
  recorded_at: Date;
  created_at: Date;
}

/**
 * compliance_alerts table
 */
export interface ComplianceAlert {
  id: string;

  // Alert Details
  alert_type: AlertType;
  severity: AlertSeverity;

  // Context
  token_type: TokenType | null;
  dex_name: string | null;
  pool_address: string | null;

  description: string;
  recommended_action: string | null;

  // Status
  status: AlertStatus;
  resolved_at: Date | null;
  resolution_notes: string | null;

  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// DTO TYPES (Data Transfer Objects)
// ============================================================================

/**
 * Get a purchase quote
 */
export interface GetQuoteDTO {
  token_type: TokenType;
  amount_tokens: string; // BigInt as string
  fiat_currency: FiatCurrency;
  payment_method?: 'card' | 'bank' | 'other';
}

export interface QuoteResponse {
  token_type: TokenType;
  amount_tokens: string;
  amount_display: string; // Human-readable (e.g., "1000")
  market_price_usd: number;
  on_platform_price_usd: number;
  fiat_amount: number;
  fiat_currency: FiatCurrency;
  fees: {
    payment_processing: number;
    platform_revenue: number;
    total: number;
  };
  quote_valid_until: Date;
  spot_only_compliance: 'compliant' | 'warning' | 'violation';
}

/**
 * Initiate a purchase
 */
export interface InitiatePurchaseDTO {
  user_id: string;
  token_type: TokenType;
  amount_tokens: string; // BigInt as string
  fiat_currency: FiatCurrency;
  payment_provider: PaymentProvider;
  identity_mode: IdentityMode;
}

export interface InitiatePurchaseResponse {
  purchase_id: string;
  client_secret: string; // For payment provider
  redirect_url: string;
  status: PurchaseStatus;
  created_at: Date;
}

/**
 * Complete a purchase
 */
export interface CompletePurchaseDTO {
  purchase_id: string;
  payment_intent_id: string;
  user_id: string;
}

export interface CompletePurchaseResponse {
  success: boolean;
  purchase_id: string;
  token_type: TokenType;
  amount_received: string;
  amount_display: string;
  transaction_id: string;
  status: PurchaseStatus;
  tokens_credited_at: Date;
  balance: string;
}

/**
 * Get prices from all sources
 */
export interface GetPricesDTO {
  tokens?: TokenType[];
  sources?: string[];
}

export interface TokenPriceInfo {
  on_platform?: {
    price_usd: number;
    fee_included: boolean;
    available_limit?: string;
  };
  market?: {
    price_usd: number;
    sources: string[];
    volume_24h: number;
    price_change_24h: number;
    market_cap: number;
  };
}

export interface PricesResponse {
  pollcoin?: TokenPriceInfo;
  gratium?: TokenPriceInfo;
  timestamp: Date;
}

/**
 * Get purchase history
 */
export interface GetPurchaseHistoryDTO {
  user_id: string;
  limit?: number;
  offset?: number;
  status?: PurchaseStatus;
}

export interface PurchaseHistoryItem {
  id: string;
  token_type: TokenType;
  amount_tokens: string;
  fiat_amount: number;
  fiat_currency: FiatCurrency;
  price_per_token: number;
  status: PurchaseStatus;
  completed_at: Date | null;
  payment_provider: PaymentProvider;
}

export interface PurchaseHistoryResponse {
  purchases: PurchaseHistoryItem[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Get DEX listings
 */
export interface GetDexListingsResponse {
  listings: {
    dex_name: string;
    dex_chain: string;
    token_type: TokenType;
    trading_pair: string;
    pool_address: string;
    liquidity_usd: number;
    price_usd: number;
    volume_24h: number;
    compliance_status: ComplianceStatus;
    is_leverage_pool: boolean;
    is_shorting_enabled: boolean;
    listed_at: Date;
  }[];
}

/**
 * Get compliance status
 */
export interface ComplianceStatusResponse {
  overall_status: ComplianceStatus;
  last_check: Date;
  tokens: {
    [key in TokenType]?: {
      status: ComplianceStatus;
      total_listings: number;
      compliant_listings: number;
      violations: number;
      summary: string;
    };
  };
  alerts: {
    active: number;
    recent: ComplianceAlert[];
  };
}

/**
 * Report a violation
 */
export interface ReportViolationDTO {
  user_id: string;
  dex_name: string;
  pool_address?: string;
  violation_type: AlertType;
  description: string;
  evidence_url?: string;
}

export interface ReportViolationResponse {
  success: boolean;
  report_id: string;
  status: 'received';
  reward_light_score: boolean;
  message: string;
}

// ============================================================================
// PURCHASE TIER CONFIGURATION
// ============================================================================

export interface TierLimits {
  daily: bigint;
  monthly: bigint;
  yearly: bigint;
}

export const TIER_LIMITS: Record<VerificationTier, TierLimits> = {
  unverified: {
    daily: BigInt(500),
    monthly: BigInt(5000),
    yearly: BigInt(50000),
  },
  basic: {
    daily: BigInt(2500),
    monthly: BigInt(25000),
    yearly: BigInt(250000),
  },
  verified: {
    daily: BigInt(10000),
    monthly: BigInt(100000),
    yearly: BigInt(1000000),
  },
  premium: {
    daily: BigInt(50000),
    monthly: BigInt(500000),
    yearly: BigInt(5000000),
  },
  institutional: {
    daily: BigInt(Number.MAX_SAFE_INTEGER), // No limit
    monthly: BigInt(Number.MAX_SAFE_INTEGER),
    yearly: BigInt(Number.MAX_SAFE_INTEGER),
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format token amount from BigInt to human-readable string
 */
export function formatTokenAmount(amount: bigint | string): string {
  const bn = typeof amount === 'string' ? BigInt(amount) : amount;
  // Assuming 18 decimals (like Ethereum)
  const divisor = BigInt(10 ** 18);
  const whole = bn / divisor;
  const fraction = bn % divisor;

  if (fraction === BigInt(0)) {
    return whole.toString();
  }

  // Include up to 4 decimal places
  const fractionStr = fraction.toString().padStart(18, '0').slice(0, 4);
  return `${whole}.${fractionStr}`;
}

/**
 * Parse token amount from human-readable to BigInt
 */
export function parseTokenAmount(amount: string): bigint {
  const parts = amount.split('.');
  const whole = BigInt(parts[0] || '0');
  const fraction = parts[1] || '0';

  // Pad fraction to 18 decimals
  const paddedFraction = fraction.padEnd(18, '0').slice(0, 18);
  const fractionBigInt = BigInt(paddedFraction);

  const multiplier = BigInt(10 ** 18);
  return whole * multiplier + fractionBigInt;
}

/**
 * Calculate on-platform price with premium
 */
export function calculateOnPlatformPrice(
  marketPrice: number,
  premiumPercentage: number = 15.0,
  minimumFeeUsd: number = 1.0
): number {
  // Base premium
  let price = marketPrice * (1 + premiumPercentage / 100);

  // Ensure minimum fee
  let fee = price * (premiumPercentage / 100);
  if (fee < minimumFeeUsd) {
    fee = minimumFeeUsd;
    price = marketPrice + fee;
  }

  return parseFloat(price.toFixed(4));
}
