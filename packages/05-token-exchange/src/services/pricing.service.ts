/**
 * Module 05: Token Exchange - Pricing Service
 *
 * Manages token pricing from multiple sources (on-platform, DEX, market)
 */

import {
  TokenType,
  GetPricesDTO,
  PricesResponse,
  TokenPriceInfo,
  PriceHistory,
} from '../types/token-exchange.types';
import { query, insert, findMany } from '../utils/database';

// ============================================================================
// Get Current Prices
// ============================================================================

/**
 * Get real-time prices from all sources
 */
export async function getPrices(data: GetPricesDTO = {}): Promise<PricesResponse> {
  const { tokens = ['pollcoin', 'gratium'], sources = ['on_platform', 'market'] } = data;

  const response: PricesResponse = {
    timestamp: new Date(),
  };

  // Fetch prices for each requested token
  for (const token of tokens) {
    const priceInfo: TokenPriceInfo = {};

    // Get on-platform price
    if (sources.includes('on_platform')) {
      priceInfo.on_platform = await getOnPlatformPrice(token);
    }

    // Get market price from DEXes
    if (sources.includes('market')) {
      priceInfo.market = await getMarketPrice(token);
    }

    response[token as TokenType] = priceInfo;
  }

  return response;
}

/**
 * Get on-platform price (market price + premium)
 */
async function getOnPlatformPrice(tokenType: TokenType): Promise<{
  price_usd: number;
  fee_included: boolean;
  available_limit?: string;
}> {
  // Get latest market price
  const marketPrice = await getLatestMarketPrice(tokenType);

  // Apply 15% premium
  const onPlatformPrice = marketPrice * 1.15;

  return {
    price_usd: parseFloat(onPlatformPrice.toFixed(4)),
    fee_included: true,
    available_limit: undefined, // Could add platform inventory tracking here
  };
}

/**
 * Get market price aggregated from DEXes
 */
async function getMarketPrice(tokenType: TokenType): Promise<{
  price_usd: number;
  sources: string[];
  volume_24h: number;
  price_change_24h: number;
  market_cap: number;
}> {
  // Get latest price data from dex_listings
  const listings = await query<{
    dex_name: string;
    price_usd: string;
    volume_24h: string;
    liquidity_usd: string;
  }>(
    `SELECT dex_name, price_usd, volume_24h, liquidity_usd
     FROM dex_listings
     WHERE token_type = $1 AND compliance_status = 'compliant' AND price_usd IS NOT NULL
     ORDER BY liquidity_usd DESC`,
    [tokenType]
  );

  if (listings.rows.length === 0) {
    // Fallback to placeholder prices
    const fallbackPrice = tokenType === 'pollcoin' ? 0.15 : 0.07;
    return {
      price_usd: fallbackPrice,
      sources: ['internal_estimate'],
      volume_24h: 0,
      price_change_24h: 0,
      market_cap: 0,
    };
  }

  // Calculate volume-weighted average price
  let totalVolume = 0;
  let weightedPriceSum = 0;
  const sources: string[] = [];

  for (const listing of listings.rows) {
    const price = parseFloat(listing.price_usd);
    const volume = parseFloat(listing.volume_24h || '0');

    weightedPriceSum += price * volume;
    totalVolume += volume;
    sources.push(listing.dex_name);
  }

  const avgPrice = totalVolume > 0 ? weightedPriceSum / totalVolume : parseFloat(listings.rows[0].price_usd);

  // Calculate 24h price change
  const priceChange24h = await calculate24hPriceChange(tokenType, avgPrice);

  // Estimate market cap (price * circulating supply)
  // In production, fetch actual circulating supply from token contract
  const estimatedSupply = tokenType === 'pollcoin' ? 100_000_000 : 100_000_000;
  const marketCap = avgPrice * estimatedSupply;

  return {
    price_usd: parseFloat(avgPrice.toFixed(4)),
    sources: sources.slice(0, 3), // Top 3 sources by liquidity
    volume_24h: parseFloat(totalVolume.toFixed(2)),
    price_change_24h: priceChange24h,
    market_cap: parseFloat(marketCap.toFixed(2)),
  };
}

/**
 * Get latest market price (helper function)
 */
async function getLatestMarketPrice(tokenType: TokenType): Promise<number> {
  // Try to get from price_history
  const result = await query<{ price_usd: string }>(
    `SELECT price_usd
     FROM price_history
     WHERE token_type = $1 AND source = 'market'
     ORDER BY recorded_at DESC
     LIMIT 1`,
    [tokenType]
  );

  if (result.rows.length > 0) {
    return parseFloat(result.rows[0].price_usd);
  }

  // Fallback to placeholder
  return tokenType === 'pollcoin' ? 0.15 : 0.07;
}

/**
 * Calculate 24-hour price change percentage
 */
async function calculate24hPriceChange(
  tokenType: TokenType,
  currentPrice: number
): Promise<number> {
  // Get price from 24 hours ago
  const result = await query<{ price_usd: string }>(
    `SELECT price_usd
     FROM price_history
     WHERE token_type = $1
       AND source = 'market'
       AND recorded_at <= NOW() - INTERVAL '24 hours'
     ORDER BY recorded_at DESC
     LIMIT 1`,
    [tokenType]
  );

  if (result.rows.length === 0) {
    return 0; // No historical data
  }

  const priceYesterday = parseFloat(result.rows[0].price_usd);
  const change = ((currentPrice - priceYesterday) / priceYesterday) * 100;

  return parseFloat(change.toFixed(2));
}

// ============================================================================
// Price History Recording
// ============================================================================

/**
 * Record current price to history (called by scheduled job)
 */
export async function recordPriceSnapshot(
  tokenType: TokenType,
  source: string,
  priceData: {
    price_usd: number;
    volume_24h?: number;
    market_cap?: number;
    platform_sales_24h?: bigint;
    platform_revenue_24h?: number;
  }
): Promise<void> {
  await insert<PriceHistory>('price_history', {
    token_type: tokenType,
    source,
    price_usd: priceData.price_usd.toString(),
    volume_24h: priceData.volume_24h?.toString() || null,
    market_cap: priceData.market_cap?.toString() || null,
    platform_sales_24h: priceData.platform_sales_24h?.toString() || '0',
    platform_revenue_24h: priceData.platform_revenue_24h?.toString() || '0',
  });
}

/**
 * Get price history for analytics
 */
export async function getPriceHistory(
  tokenType: TokenType,
  source: string,
  timeRange: '1h' | '24h' | '7d' | '30d' | '1y' = '24h'
): Promise<PriceHistory[]> {
  const intervalMap = {
    '1h': '1 hour',
    '24h': '24 hours',
    '7d': '7 days',
    '30d': '30 days',
    '1y': '1 year',
  };

  const interval = intervalMap[timeRange];

  return await findMany<PriceHistory>(
    'price_history',
    {
      token_type: tokenType,
      source,
    },
    {
      orderBy: 'recorded_at DESC',
    }
  );
}

/**
 * Get platform statistics (24h sales and revenue)
 */
export async function getPlatformStats(): Promise<{
  pollcoin: {
    sales_24h: string;
    revenue_24h: number;
    avg_price_24h: number;
  };
  gratium: {
    sales_24h: string;
    revenue_24h: number;
    avg_price_24h: number;
  };
}> {
  // Get stats for pollcoin
  const pollStats = await query<{
    total_tokens: string;
    total_revenue: string;
    avg_price: string;
  }>(
    `SELECT
      SUM(token_amount) as total_tokens,
      SUM(fiat_amount) as total_revenue,
      AVG(price_per_token) as avg_price
     FROM token_purchase_orders
     WHERE token_type = 'pollcoin'
       AND status = 'completed'
       AND completed_at >= NOW() - INTERVAL '24 hours'`
  );

  // Get stats for gratium
  const gratStats = await query<{
    total_tokens: string;
    total_revenue: string;
    avg_price: string;
  }>(
    `SELECT
      SUM(token_amount) as total_tokens,
      SUM(fiat_amount) as total_revenue,
      AVG(price_per_token) as avg_price
     FROM token_purchase_orders
     WHERE token_type = 'gratium'
       AND status = 'completed'
       AND completed_at >= NOW() - INTERVAL '24 hours'`
  );

  return {
    pollcoin: {
      sales_24h: pollStats.rows[0]?.total_tokens || '0',
      revenue_24h: parseFloat(pollStats.rows[0]?.total_revenue || '0'),
      avg_price_24h: parseFloat(pollStats.rows[0]?.avg_price || '0'),
    },
    gratium: {
      sales_24h: gratStats.rows[0]?.total_tokens || '0',
      revenue_24h: parseFloat(gratStats.rows[0]?.total_revenue || '0'),
      avg_price_24h: parseFloat(gratStats.rows[0]?.avg_price || '0'),
    },
  };
}

// ============================================================================
// Exports
// ============================================================================

export default {
  getPrices,
  recordPriceSnapshot,
  getPriceHistory,
  getPlatformStats,
};
