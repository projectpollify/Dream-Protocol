/**
 * Module 05: Token Exchange - DEX Monitoring Service
 *
 * Monitors external DEX listings for spot-only compliance
 */

import {
  DexListing,
  GetDexListingsResponse,
  TokenType,
  ComplianceStatus,
} from '../types/token-exchange.types';
import { query, insert, update, findMany } from '../utils/database';

// ============================================================================
// DEX Listing Management
// ============================================================================

/**
 * Add or update a DEX listing
 */
export async function upsertDexListing(data: {
  dex_name: string;
  dex_chain: string;
  token_type: TokenType;
  pool_address: string;
  trading_pair: string;
  liquidity_usd: number;
  price_usd?: number;
  volume_24h?: number;
  price_change_24h?: number;
  is_leverage_pool?: boolean;
  is_shorting_enabled?: boolean;
  has_lending_integration?: boolean;
}): Promise<DexListing> {
  // Check if listing already exists
  const existing = await query<DexListing>(
    `SELECT * FROM dex_listings WHERE dex_name = $1 AND pool_address = $2`,
    [data.dex_name, data.pool_address]
  );

  if (existing.rows.length > 0) {
    // Update existing
    const updated = await update<DexListing>(
      'dex_listings',
      { dex_name: data.dex_name, pool_address: data.pool_address },
      {
        liquidity_usd: data.liquidity_usd.toString(),
        price_usd: data.price_usd?.toString(),
        volume_24h: data.volume_24h?.toString(),
        price_change_24h: data.price_change_24h?.toString(),
        is_leverage_pool: data.is_leverage_pool || false,
        is_shorting_enabled: data.is_shorting_enabled || false,
        has_lending_integration: data.has_lending_integration || false,
        last_checked_at: new Date(),
      }
    );
    return updated!;
  } else {
    // Insert new
    return await insert<DexListing>('dex_listings', {
      dex_name: data.dex_name,
      dex_chain: data.dex_chain,
      token_type: data.token_type,
      pool_address: data.pool_address,
      trading_pair: data.trading_pair,
      liquidity_usd: data.liquidity_usd.toString(),
      price_usd: data.price_usd?.toString(),
      volume_24h: data.volume_24h?.toString(),
      price_change_24h: data.price_change_24h?.toString(),
      is_leverage_pool: data.is_leverage_pool || false,
      is_shorting_enabled: data.is_shorting_enabled || false,
      has_lending_integration: data.has_lending_integration || false,
      compliance_status: 'monitoring',
      listed_at: new Date(),
    });
  }
}

/**
 * Get all DEX listings
 */
export async function getDexListings(
  tokenType?: TokenType
): Promise<GetDexListingsResponse> {
  const listings = tokenType
    ? await findMany<DexListing>('dex_listings', { token_type: tokenType })
    : await findMany<DexListing>('dex_listings');

  return {
    listings: listings.map((listing) => ({
      dex_name: listing.dex_name,
      dex_chain: listing.dex_chain,
      token_type: listing.token_type,
      trading_pair: listing.trading_pair,
      pool_address: listing.pool_address,
      liquidity_usd: parseFloat(listing.liquidity_usd),
      price_usd: parseFloat(listing.price_usd || '0'),
      volume_24h: parseFloat(listing.volume_24h || '0'),
      compliance_status: listing.compliance_status,
      is_leverage_pool: listing.is_leverage_pool,
      is_shorting_enabled: listing.is_shorting_enabled,
      listed_at: listing.listed_at || new Date(),
    })),
  };
}

/**
 * Check spot-only compliance for a DEX listing
 */
export async function checkCompliance(listingId: string): Promise<ComplianceStatus> {
  const listing = await query<DexListing>(
    `SELECT * FROM dex_listings WHERE id = $1`,
    [listingId]
  );

  if (listing.rows.length === 0) {
    throw new Error('DEX listing not found');
  }

  const dex = listing.rows[0];

  // Determine compliance status
  let complianceStatus: ComplianceStatus = 'compliant';

  if (
    dex.is_leverage_pool ||
    dex.is_shorting_enabled ||
    dex.has_lending_integration
  ) {
    complianceStatus = 'violation_detected';
  }

  // Update compliance status if changed
  if (dex.compliance_status !== complianceStatus) {
    await update<DexListing>(
      'dex_listings',
      { id: listingId },
      { compliance_status: complianceStatus }
    );
  }

  return complianceStatus;
}

/**
 * Monitor all DEX listings for compliance (scheduled job)
 */
export async function monitorAllListings(): Promise<{
  total: number;
  compliant: number;
  violations: number;
}> {
  const allListings = await findMany<DexListing>('dex_listings');

  let compliantCount = 0;
  let violationCount = 0;

  for (const listing of allListings) {
    const status = await checkCompliance(listing.id);
    if (status === 'compliant') {
      compliantCount++;
    } else if (status === 'violation_detected') {
      violationCount++;
    }
  }

  return {
    total: allListings.length,
    compliant: compliantCount,
    violations: violationCount,
  };
}

// ============================================================================
// Exports
// ============================================================================

export default {
  upsertDexListing,
  getDexListings,
  checkCompliance,
  monitorAllListings,
};
