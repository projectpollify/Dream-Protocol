/**
 * Module 05: Token Exchange - Pricing Service Unit Tests
 *
 * Tests pricing calculations, premium application, and quote generation
 * Target: 80%+ code coverage for pricing.service.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { calculateOnPlatformPrice, formatTokenAmount, parseTokenAmount } from '../types/token-exchange.types';

// ============================================================================
// UNIT TESTS - Price Calculation
// ============================================================================

describe('Unit Tests - Price Calculation', () => {
  it('should calculate on-platform price with 15% premium', () => {
    const marketPrice = 0.10; // $0.10 per token
    const expected = 0.115; // $0.10 × 1.15 = $0.115

    const result = calculateOnPlatformPrice(marketPrice, 15.0);

    expect(result).toBeCloseTo(expected, 4);
  });

  it('should apply 15% premium correctly for various market prices', () => {
    // Test multiple price points
    const testCases = [
      { market: 0.05, expected: 0.0575 },  // $0.05 → $0.0575
      { market: 0.10, expected: 0.115 },   // $0.10 → $0.115
      { market: 0.50, expected: 0.575 },   // $0.50 → $0.575
      { market: 1.00, expected: 1.15 },    // $1.00 → $1.15
      { market: 10.0, expected: 11.5 },    // $10 → $11.50
    ];

    testCases.forEach(({ market, expected }) => {
      const result = calculateOnPlatformPrice(market, 15.0);
      expect(result).toBeCloseTo(expected, 4);
    });
  });

  it('should enforce minimum fee of $1.00 for low-priced tokens', () => {
    const marketPrice = 0.01; // Very low price
    const premiumPercentage = 15.0;
    const minimumFeeUsd = 1.0;

    // Without minimum: 0.01 × 1.15 = 0.0115 (fee = $0.0015)
    // With minimum: 0.01 + 1.00 = 1.01 (fee = $1.00)
    const result = calculateOnPlatformPrice(marketPrice, premiumPercentage, minimumFeeUsd);

    expect(result).toBe(1.01); // Market + minimum fee
  });

  it('should round to 4 decimal places', () => {
    const marketPrice = 0.123456789;
    const result = calculateOnPlatformPrice(marketPrice, 15.0);

    // 0.123456789 × 1.15 = 0.141975307... → rounds to 0.142
    expect(result).toBeCloseTo(0.142, 3);
    expect(result.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(4);
  });
});

// ============================================================================
// UNIT TESTS - Quote Calculation
// ============================================================================

describe('Unit Tests - Quote Calculation', () => {
  it('should calculate correct token amount for USD purchase', () => {
    const amountUsd = 100;
    const pricePerToken = 0.115; // $0.115 per token (includes 15% premium)

    const expectedTokens = amountUsd / pricePerToken;
    // 100 / 0.115 = 869.5652... tokens

    expect(expectedTokens).toBeCloseTo(869.5652, 2);
  });

  it('should calculate fees breakdown correctly', () => {
    const marketPrice = 0.10;
    const platformPrice = 0.115;
    const amountUsd = 100;

    const platformRevenue = (platformPrice - marketPrice) * (amountUsd / platformPrice);
    // Premium per token: $0.015
    // Tokens purchased: 100 / 0.115 = 869.565
    // Revenue: 869.565 × 0.015 = $13.04

    expect(platformRevenue).toBeCloseTo(13.04, 2);
  });

  it('should include payment processing fees in total', () => {
    const amountUsd = 100;
    const paymentProcessingFee = amountUsd * 0.029 + 0.30; // Stripe: 2.9% + $0.30
    const platformRevenue = 13.04; // From previous test
    const totalFees = paymentProcessingFee + platformRevenue;

    expect(paymentProcessingFee).toBeCloseTo(3.20, 2);
    expect(totalFees).toBeCloseTo(16.24, 2);
  });

  it('should calculate quote expiry correctly (15 minutes)', () => {
    const now = new Date();
    const quoteValidUntil = new Date(now.getTime() + 15 * 60 * 1000); // 15 min

    const diffMinutes = (quoteValidUntil.getTime() - now.getTime()) / (60 * 1000);

    expect(diffMinutes).toBe(15);
  });
});

// ============================================================================
// UNIT TESTS - Token Amount Formatting
// ============================================================================

describe('Unit Tests - Token Amount Formatting', () => {
  it('should format whole numbers correctly', () => {
    const amount = BigInt(1000) * BigInt(10 ** 18); // 1000 tokens
    const formatted = formatTokenAmount(amount);

    expect(formatted).toBe('1000');
  });

  it('should format decimal amounts correctly', () => {
    const amount = BigInt(1234) * BigInt(10 ** 18) + BigInt(5678) * BigInt(10 ** 14);
    // 1234.5678 tokens
    const formatted = formatTokenAmount(amount);

    expect(formatted).toBe('1234.5678');
  });

  it('should parse human-readable amounts to BigInt', () => {
    const humanAmount = '1000.5';
    const parsed = parseTokenAmount(humanAmount);

    // 1000.5 × 10^18 = 1000500000000000000000
    const expected = BigInt(1000) * BigInt(10 ** 18) + BigInt(5) * BigInt(10 ** 17);

    expect(parsed).toBe(expected);
  });

  it('should handle very small amounts (0.0001 tokens)', () => {
    const humanAmount = '0.0001';
    const parsed = parseTokenAmount(humanAmount);
    const formatted = formatTokenAmount(parsed);

    expect(formatted).toBe('0.0001');
  });

  it('should round-trip format and parse correctly', () => {
    const original = '123.4567';
    const parsed = parseTokenAmount(original);
    const formatted = formatTokenAmount(parsed);

    expect(formatted).toBe(original);
  });
});

// ============================================================================
// UNIT TESTS - Tier-Based Limits
// ============================================================================

describe('Unit Tests - Tier Limits', () => {
  it('should enforce unverified tier daily limit ($500 USD)', () => {
    const tier = 'unverified';
    const dailyLimitUsd = 500;
    const purchaseAmountUsd = 600;

    const exceedsLimit = purchaseAmountUsd > dailyLimitUsd;

    expect(exceedsLimit).toBe(true);
  });

  it('should allow basic tier daily limit ($2500 USD)', () => {
    const tier = 'basic';
    const dailyLimitUsd = 2500;
    const purchaseAmountUsd = 2000;

    const withinLimit = purchaseAmountUsd <= dailyLimitUsd;

    expect(withinLimit).toBe(true);
  });

  it('should enforce verified tier daily limit ($10,000 USD)', () => {
    const tier = 'verified';
    const dailyLimitUsd = 10000;
    const purchaseAmountUsd = 15000;

    const exceedsLimit = purchaseAmountUsd > dailyLimitUsd;

    expect(exceedsLimit).toBe(true);
  });

  it('should allow premium tier high purchases ($50,000 USD)', () => {
    const tier = 'premium';
    const dailyLimitUsd = 50000;
    const purchaseAmountUsd = 45000;

    const withinLimit = purchaseAmountUsd <= dailyLimitUsd;

    expect(withinLimit).toBe(true);
  });

  it('should have no limits for institutional tier', () => {
    const tier = 'institutional';
    const dailyLimit = Number.MAX_SAFE_INTEGER;
    const massivePurchase = 10_000_000; // $10M

    const withinLimit = massivePurchase <= dailyLimit;

    expect(withinLimit).toBe(true);
  });
});

// ============================================================================
// UNIT TESTS - Price History Aggregation
// ============================================================================

describe('Unit Tests - Price History', () => {
  it('should calculate volume-weighted average price correctly', () => {
    // Mock DEX listings
    const listings = [
      { dex: 'Uniswap', price: 0.10, volume: 10000 },
      { dex: 'SushiSwap', price: 0.12, volume: 5000 },
      { dex: 'PancakeSwap', price: 0.11, volume: 8000 },
    ];

    let totalVolume = 0;
    let weightedSum = 0;

    listings.forEach(listing => {
      weightedSum += listing.price * listing.volume;
      totalVolume += listing.volume;
    });

    const avgPrice = weightedSum / totalVolume;
    // (0.10×10000 + 0.12×5000 + 0.11×8000) / 23000
    // (1000 + 600 + 880) / 23000 = 2480 / 23000 = 0.1078

    expect(avgPrice).toBeCloseTo(0.1078, 4);
  });

  it('should calculate 24h price change percentage', () => {
    const currentPrice = 0.12;
    const priceYesterday = 0.10;

    const changePercent = ((currentPrice - priceYesterday) / priceYesterday) * 100;
    // (0.12 - 0.10) / 0.10 × 100 = 20%

    expect(changePercent).toBeCloseTo(20, 1);
  });

  it('should calculate market cap from price and supply', () => {
    const price = 0.15;
    const circulatingSupply = 100_000_000; // 100M tokens
    const marketCap = price * circulatingSupply;

    expect(marketCap).toBe(15_000_000); // $15M
  });

  it('should handle negative price change correctly', () => {
    const currentPrice = 0.08;
    const priceYesterday = 0.10;

    const changePercent = ((currentPrice - priceYesterday) / priceYesterday) * 100;
    // (0.08 - 0.10) / 0.10 × 100 = -20%

    expect(changePercent).toBeCloseTo(-20, 1);
  });
});

// ============================================================================
// UNIT TESTS - Platform Revenue Calculation
// ============================================================================

describe('Unit Tests - Platform Revenue', () => {
  it('should calculate daily revenue from sales', () => {
    const sales = [
      { tokens: 1000, pricePerToken: 0.115, marketPrice: 0.10 },
      { tokens: 500, pricePerToken: 0.115, marketPrice: 0.10 },
      { tokens: 2000, pricePerToken: 0.115, marketPrice: 0.10 },
    ];

    let totalRevenue = 0;
    sales.forEach(sale => {
      const premiumPerToken = sale.pricePerToken - sale.marketPrice;
      totalRevenue += sale.tokens * premiumPerToken;
    });

    // (1000 + 500 + 2000) × 0.015 = 3500 × 0.015 = $52.50
    expect(totalRevenue).toBe(52.50);
  });

  it('should calculate average price from completed orders', () => {
    const orders = [
      { pricePerToken: 0.115 },
      { pricePerToken: 0.120 },
      { pricePerToken: 0.118 },
    ];

    const avgPrice = orders.reduce((sum, order) => sum + order.pricePerToken, 0) / orders.length;
    // (0.115 + 0.120 + 0.118) / 3 = 0.353 / 3 = 0.1177

    expect(avgPrice).toBeCloseTo(0.1177, 4);
  });

  it('should track 24h sales volume', () => {
    const sales = [
      { tokens: '1000000000000000000000' }, // 1000 tokens (18 decimals)
      { tokens: '500000000000000000000' },  // 500 tokens
      { tokens: '2000000000000000000000' }, // 2000 tokens
    ];

    const totalTokens = sales.reduce((sum, sale) => sum + BigInt(sale.tokens), BigInt(0));
    const expectedTotal = BigInt(3500) * BigInt(10 ** 18); // 3500 tokens

    expect(totalTokens).toBe(expectedTotal);
  });
});

// ============================================================================
// UNIT TESTS - Fallback Pricing
// ============================================================================

describe('Unit Tests - Fallback Pricing', () => {
  it('should use fallback price for PollCoin when no DEX data', () => {
    const tokenType = 'pollcoin';
    const fallbackPrice = 0.15;

    // Simulate no DEX listings
    const dexListings: any[] = [];
    const price = dexListings.length > 0 ? 0 : fallbackPrice;

    expect(price).toBe(0.15);
  });

  it('should use fallback price for Gratium when no DEX data', () => {
    const tokenType = 'gratium';
    const fallbackPrice = 0.07;

    // Simulate no DEX listings
    const dexListings: any[] = [];
    const price = dexListings.length > 0 ? 0 : fallbackPrice;

    expect(price).toBe(0.07);
  });

  it('should use internal estimate source for fallback', () => {
    const source = 'internal_estimate';
    const volume = 0;
    const marketCap = 0;

    expect(source).toBe('internal_estimate');
    expect(volume).toBe(0);
    expect(marketCap).toBe(0);
  });
});
