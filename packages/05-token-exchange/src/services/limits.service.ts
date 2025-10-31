/**
 * Module 05: Token Exchange - Purchase Limits Service
 *
 * Manages tier-based purchase limits for users
 */

import {
  PurchaseLimit,
  VerificationTier,
  TIER_LIMITS,
} from '../types/token-exchange.types';
import { query, insert, update, findOne } from '../utils/database';
import { PoolClient } from 'pg';

// ============================================================================
// Initialize Purchase Limits
// ============================================================================

/**
 * Initialize purchase limits for a new user
 */
export async function initializePurchaseLimits(userId: string): Promise<PurchaseLimit> {
  // Check if limits already exist
  const existing = await findOne<PurchaseLimit>('purchase_limits', { user_id: userId });

  if (existing) {
    return existing;
  }

  // Create default limits (unverified tier)
  const defaultTier: VerificationTier = 'unverified';
  const limits = TIER_LIMITS[defaultTier];

  return await insert<PurchaseLimit>('purchase_limits', {
    user_id: userId,
    verification_tier: defaultTier,
    daily_limit: limits.daily.toString(),
    monthly_limit: limits.monthly.toString(),
    yearly_limit: limits.yearly.toString(),
    purchased_today: '0',
    purchased_this_month: '0',
    purchased_this_year: '0',
  });
}

// ============================================================================
// Get Purchase Limits
// ============================================================================

/**
 * Get user's current purchase limits and usage
 */
export async function getPurchaseLimits(userId: string): Promise<{
  tier: VerificationTier;
  limits: {
    daily: string;
    monthly: string;
    yearly: string;
  };
  used: {
    daily: string;
    monthly: string;
    yearly: string;
  };
  remaining: {
    daily: string;
    monthly: string;
    yearly: string;
  };
  last_purchase: Date | null;
  next_reset: {
    daily: Date;
    monthly: Date;
    yearly: Date;
  };
}> {
  const limits = await findOne<PurchaseLimit>('purchase_limits', { user_id: userId });

  if (!limits) {
    throw new Error('Purchase limits not initialized for user');
  }

  // Calculate remaining limits
  const remainingDaily = BigInt(limits.daily_limit) - BigInt(limits.purchased_today);
  const remainingMonthly = BigInt(limits.monthly_limit) - BigInt(limits.purchased_this_month);
  const remainingYearly = BigInt(limits.yearly_limit) - BigInt(limits.purchased_this_year);

  // Calculate next reset dates
  const nextDailyReset = new Date(limits.last_reset_daily);
  nextDailyReset.setDate(nextDailyReset.getDate() + 1);

  const nextMonthlyReset = new Date(limits.last_reset_monthly);
  nextMonthlyReset.setMonth(nextMonthlyReset.getMonth() + 1);

  const nextYearlyReset = new Date(limits.last_reset_yearly);
  nextYearlyReset.setFullYear(nextYearlyReset.getFullYear() + 1);

  return {
    tier: limits.verification_tier,
    limits: {
      daily: limits.daily_limit,
      monthly: limits.monthly_limit,
      yearly: limits.yearly_limit,
    },
    used: {
      daily: limits.purchased_today,
      monthly: limits.purchased_this_month,
      yearly: limits.purchased_this_year,
    },
    remaining: {
      daily: remainingDaily.toString(),
      monthly: remainingMonthly.toString(),
      yearly: remainingYearly.toString(),
    },
    last_purchase: limits.last_purchase_at,
    next_reset: {
      daily: nextDailyReset,
      monthly: nextMonthlyReset,
      yearly: nextYearlyReset,
    },
  };
}

// ============================================================================
// Upgrade Tier
// ============================================================================

/**
 * Upgrade user to a higher verification tier
 */
export async function upgradeTier(
  userId: string,
  newTier: VerificationTier
): Promise<PurchaseLimit> {
  const currentLimits = await findOne<PurchaseLimit>('purchase_limits', { user_id: userId });

  if (!currentLimits) {
    throw new Error('Purchase limits not initialized for user');
  }

  // Validate tier progression (can only upgrade, not downgrade)
  const tierOrder: VerificationTier[] = [
    'unverified',
    'basic',
    'verified',
    'premium',
    'institutional',
  ];

  const currentTierIndex = tierOrder.indexOf(currentLimits.verification_tier);
  const newTierIndex = tierOrder.indexOf(newTier);

  if (newTierIndex <= currentTierIndex) {
    throw new Error('Can only upgrade to a higher tier');
  }

  // Get new limits
  const newLimits = TIER_LIMITS[newTier];

  // Update tier and limits
  const updated = await update<PurchaseLimit>(
    'purchase_limits',
    { user_id: userId },
    {
      verification_tier: newTier,
      daily_limit: newLimits.daily.toString(),
      monthly_limit: newLimits.monthly.toString(),
      yearly_limit: newLimits.yearly.toString(),
    }
  );

  return updated!;
}

// ============================================================================
// Reset Limits (Scheduled Job)
// ============================================================================

/**
 * Reset daily limits for all users (runs daily at midnight)
 */
export async function resetDailyLimits(): Promise<number> {
  const result = await query(
    `UPDATE purchase_limits
     SET purchased_today = 0,
         last_reset_daily = NOW(),
         updated_at = NOW()
     WHERE last_reset_daily < NOW() - INTERVAL '1 day'`
  );

  return result.rowCount || 0;
}

/**
 * Reset monthly limits for all users (runs monthly)
 */
export async function resetMonthlyLimits(): Promise<number> {
  const result = await query(
    `UPDATE purchase_limits
     SET purchased_this_month = 0,
         last_reset_monthly = NOW(),
         updated_at = NOW()
     WHERE last_reset_monthly < NOW() - INTERVAL '1 month'`
  );

  return result.rowCount || 0;
}

/**
 * Reset yearly limits for all users (runs yearly)
 */
export async function resetYearlyLimits(): Promise<number> {
  const result = await query(
    `UPDATE purchase_limits
     SET purchased_this_year = 0,
         last_reset_yearly = NOW(),
         updated_at = NOW()
     WHERE last_reset_yearly < NOW() - INTERVAL '1 year'`
  );

  return result.rowCount || 0;
}

// ============================================================================
// Tier Information
// ============================================================================

/**
 * Get information about all verification tiers
 */
export function getTierInfo(): Record<
  VerificationTier,
  {
    name: string;
    daily_limit: string;
    monthly_limit: string;
    yearly_limit: string;
    requirements: string[];
  }
> {
  return {
    unverified: {
      name: 'Unverified',
      daily_limit: TIER_LIMITS.unverified.daily.toString(),
      monthly_limit: TIER_LIMITS.unverified.monthly.toString(),
      yearly_limit: TIER_LIMITS.unverified.yearly.toString(),
      requirements: ['Email verified'],
    },
    basic: {
      name: 'Basic',
      daily_limit: TIER_LIMITS.basic.daily.toString(),
      monthly_limit: TIER_LIMITS.basic.monthly.toString(),
      yearly_limit: TIER_LIMITS.basic.yearly.toString(),
      requirements: ['Phone verified', 'ID verified'],
    },
    verified: {
      name: 'Verified',
      daily_limit: TIER_LIMITS.verified.daily.toString(),
      monthly_limit: TIER_LIMITS.verified.monthly.toString(),
      yearly_limit: TIER_LIMITS.verified.yearly.toString(),
      requirements: ['Full KYC', 'AML pass'],
    },
    premium: {
      name: 'Premium',
      daily_limit: TIER_LIMITS.premium.daily.toString(),
      monthly_limit: TIER_LIMITS.premium.monthly.toString(),
      yearly_limit: TIER_LIMITS.premium.yearly.toString(),
      requirements: ['Verified tier', '$500K+ net worth'],
    },
    institutional: {
      name: 'Institutional',
      daily_limit: 'No limit',
      monthly_limit: 'No limit',
      yearly_limit: 'No limit',
      requirements: ['Corporate verification'],
    },
  };
}

// ============================================================================
// Exports
// ============================================================================

export default {
  initializePurchaseLimits,
  getPurchaseLimits,
  upgradeTier,
  resetDailyLimits,
  resetMonthlyLimits,
  resetYearlyLimits,
  getTierInfo,
};
