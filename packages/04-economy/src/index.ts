/**
 * Module 04: Economy - Main Entry Point
 *
 * Exports all services, types, and routes for the Economy module
 */

import express, { Express } from 'express';
import dotenv from 'dotenv';
import economyRoutes from './routes/economy.routes';
import { healthCheck } from './utils/database';

// Load environment variables
dotenv.config();

// ============================================================================
// EXPORTS - Services
// ============================================================================

export { default as ledgerService } from './services/ledger.service';
export { default as transferService } from './services/transfer.service';
export { default as lockService } from './services/lock.service';
export { default as lightScoreService } from './services/light-score.service';
export { default as transactionService } from './services/transaction.service';

// ============================================================================
// EXPORTS - Types
// ============================================================================

export * from './types/economy.types';

// ============================================================================
// EXPORTS - Database Utils
// ============================================================================

export * from './utils/database';

// ============================================================================
// EXPORTS - Routes
// ============================================================================

export { economyRoutes };

// ============================================================================
// MODULE INITIALIZATION
// ============================================================================

/**
 * Initialize the Economy module
 * @param app Express application instance
 * @param basePath Base path for routes (default: /api/v1/economy)
 */
export function initializeEconomyModule(
  app: Express,
  basePath: string = '/api/v1/economy'
): void {
  // Register routes
  app.use(basePath, economyRoutes);

  console.log(`✓ Economy module initialized at ${basePath}`);
}

/**
 * Check if Economy module is healthy
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
export async function startStandaloneServer(port: number = 3004): Promise<void> {
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
  initializeEconomyModule(app);

  // Root endpoint
  app.get('/', (_req, res) => {
    res.json({
      module: 'economy',
      version: '1.0.0',
      status: 'running',
      tokens: {
        pollcoin: {
          symbol: 'POLL',
          purpose: 'Governance & polls',
          burn_rate: '1%',
        },
        gratium: {
          symbol: 'GRAT',
          purpose: 'Tipping & staking',
          burn_rate: '0.5%',
        },
        light_score: {
          range: '0-100',
          purpose: 'Reputation metric',
          managed_by: 'Pentos AI',
        },
      },
      endpoints: [
        'GET /api/v1/economy/balances',
        'POST /api/v1/economy/transfer',
        'POST /api/v1/economy/tip',
        'POST /api/v1/economy/stake',
        'POST /api/v1/economy/unstake',
        'GET /api/v1/economy/locks',
        'GET /api/v1/economy/transactions',
        'GET /api/v1/economy/transaction/:id',
        'GET /api/v1/economy/stats',
        'GET /api/v1/economy/light-score',
        'GET /api/v1/economy/light-score/history',
        'GET /api/v1/economy/supply',
        'GET /api/v1/economy/health',
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
    console.log('   💰 DREAM PROTOCOL - MODULE 04: ECONOMY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`   Status: Running`);
    console.log(`   Port: ${port}`);
    console.log(`   Base Path: /api/v1/economy`);
    console.log(`   Database: Connected ✓`);
    console.log('');
    console.log('   Token System:');
    console.log('   - PollCoin (POLL): Governance & Polls');
    console.log('   - Gratium (GRAT): Tipping & Staking');
    console.log('   - Light Score: Reputation (0-100)');
    console.log('');
    console.log('   Spot-Only Strategy:');
    console.log('   - ✓ No short selling');
    console.log('   - ✓ No leverage/margin');
    console.log('   - ✓ No futures contracts');
    console.log('   - ✓ Safe harbor for capital');
    console.log('');
    console.log('   Available Services:');
    console.log('   - Token Ledger & Balances');
    console.log('   - Transfers & Tips (with burn mechanics)');
    console.log('   - Token Locking/Staking');
    console.log('   - Light Score Management (Pentos integration)');
    console.log('   - Transaction History & Analytics');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
  });
}

// ============================================================================
// RUN STANDALONE SERVER (if executed directly)
// ============================================================================

if (require.main === module) {
  const port = parseInt(process.env.PORT || '3004');
  startStandaloneServer(port).catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}
