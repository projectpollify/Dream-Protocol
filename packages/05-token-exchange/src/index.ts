/**
 * Module 05: Token Exchange Integration - Main Entry Point
 *
 * Exports all services, types, and routes for the Token Exchange module
 */

import express, { Express } from 'express';
import dotenv from 'dotenv';
import exchangeRoutes from './routes/exchange.routes';
import { healthCheck } from './utils/database';

// Load environment variables
dotenv.config();

// ============================================================================
// EXPORTS - Services
// ============================================================================

export { default as purchaseService } from './services/purchase.service';
export { default as pricingService } from './services/pricing.service';
export { default as dexService } from './services/dex.service';
export { default as complianceService } from './services/compliance.service';
export { default as limitsService } from './services/limits.service';

// ============================================================================
// EXPORTS - Types
// ============================================================================

export * from './types/token-exchange.types';

// ============================================================================
// EXPORTS - Database Utils
// ============================================================================

export * from './utils/database';

// ============================================================================
// EXPORTS - Routes
// ============================================================================

export { exchangeRoutes };

// ============================================================================
// MODULE INITIALIZATION
// ============================================================================

/**
 * Initialize the Token Exchange module
 * @param app Express application instance
 * @param basePath Base path for routes (default: /api/v1/exchange)
 */
export function initializeTokenExchangeModule(
  app: Express,
  basePath: string = '/api/v1/exchange'
): void {
  // Register routes
  app.use(basePath, exchangeRoutes);

  console.log(`✓ Token Exchange module initialized at ${basePath}`);
}

/**
 * Check if Token Exchange module is healthy
 */
export async function checkHealth(): Promise<boolean> {
  return healthCheck();
}

// ============================================================================
// STANDALONE SERVER (for development/testing)
// ============================================================================

/**
 * Start standalone server for module testing
 */
export async function startStandaloneServer(port: number = 3005): Promise<void> {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // CORS (development only)
  app.use((_req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', '*');
    res.header('Access-Control-Allow-Methods', '*');
    next();
  });

  // Initialize module
  initializeTokenExchangeModule(app);

  // Root endpoint
  app.get('/', (_req, res) => {
    res.json({
      module: 'token-exchange',
      version: '1.0.0',
      status: 'running',
      strategy: 'spot-only',
      tokens: {
        pollcoin: {
          symbol: 'POLL',
          on_platform: true,
          dex_listing: true,
        },
        gratium: {
          symbol: 'GRAT',
          on_platform: true,
          dex_listing: true,
        },
      },
      endpoints: [
        'GET /api/v1/exchange/prices',
        'POST /api/v1/exchange/quote',
        'POST /api/v1/exchange/initiate-purchase',
        'POST /api/v1/exchange/complete-purchase',
        'GET /api/v1/exchange/purchase-history',
        'GET /api/v1/exchange/dex-listings',
        'GET /api/v1/exchange/compliance-status',
        'POST /api/v1/exchange/report-violation',
        'GET /api/v1/exchange/limits',
        'GET /api/v1/exchange/tiers',
        'GET /api/v1/exchange/health',
      ],
    });
  });

  // Health check
  const healthy = await checkHealth();
  if (!healthy) {
    console.error('❌ Database health check failed');
    process.exit(1);
  }

  // Start server
  app.listen(port, () => {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   🦄 DREAM PROTOCOL - MODULE 05: TOKEN EXCHANGE');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`   Status: Running`);
    console.log(`   Port: ${port}`);
    console.log(`   Base Path: /api/v1/exchange`);
    console.log(`   Database: Connected ✓`);
    console.log('');
    console.log('   Core Philosophy:');
    console.log('   "Safe Harbor for Capital - Spot-Only Strategy"');
    console.log('');
    console.log('   Token Acquisition:');
    console.log('   - On-Platform Purchases (Fiat → Token)');
    console.log('   - DEX Trading (Uniswap, Sushiswap, etc.)');
    console.log('   - Platform Rewards');
    console.log('');
    console.log('   Spot-Only Enforcement:');
    console.log('   - ✓ No short selling');
    console.log('   - ✓ No leverage/margin');
    console.log('   - ✓ No lending protocols');
    console.log('   - ✓ No futures/derivatives');
    console.log('   - ✓ 24/7 compliance monitoring');
    console.log('');
    console.log('   Purchase Tiers:');
    console.log('   - Unverified: 500/day, 5K/month');
    console.log('   - Basic: 2.5K/day, 25K/month');
    console.log('   - Verified: 10K/day, 100K/month');
    console.log('   - Premium: 50K/day, 500K/month');
    console.log('   - Institutional: No limits');
    console.log('');
    console.log('   Payment Partners:');
    console.log('   - Stripe (Primary)');
    console.log('   - MoonPay (Global)');
    console.log('   - Wyre (Backup)');
    console.log('');
    console.log('   Available Services:');
    console.log('   - Token Pricing (On-Platform + Market)');
    console.log('   - Purchase Flow (Quote → Pay → Receive)');
    console.log('   - DEX Monitoring & Compliance');
    console.log('   - Tier-Based Limits');
    console.log('   - Violation Reporting');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
  });
}

// ============================================================================
// RUN STANDALONE SERVER (if executed directly)
// ============================================================================

if (require.main === module) {
  const port = parseInt(process.env.PORT || '3005');
  startStandaloneServer(port).catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}
