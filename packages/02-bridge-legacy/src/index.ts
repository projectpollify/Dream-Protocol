/**
 * Module 02: Bridge Legacy - Main Entry Point
 *
 * Exports all services, types, and routes for the Bridge Legacy module
 */

import express, { Express } from 'express';
import dotenv from 'dotenv';
import bridgeRoutes from './routes/bridge.routes';
import { checkDatabaseConnections, closeDatabaseConnections } from './utils/database';

// Load environment variables
dotenv.config();

// ============================================================================
// EXPORTS - Services
// ============================================================================

export { default as featureFlagService } from './services/feature-flag.service';
export { default as dataMigrationService } from './services/data-migration.service';
export { default as adapterService } from './services/adapter.service';

// ============================================================================
// EXPORTS - Types
// ============================================================================

export * from './types/bridge.types';

// ============================================================================
// EXPORTS - Database Utils
// ============================================================================

export * from './utils/database';

// ============================================================================
// EXPORTS - Routes
// ============================================================================

export { bridgeRoutes };

// ============================================================================
// MODULE INITIALIZATION
// ============================================================================

/**
 * Initialize the Bridge Legacy module
 * @param app Express application instance
 * @param basePath Base path for routes (default: /api/v1/bridge)
 */
export function initializeBridgeModule(
  app: Express,
  basePath: string = '/api/v1/bridge'
): void {
  // Register routes
  app.use(basePath, bridgeRoutes);

  console.log(`✓ Bridge Legacy module initialized at ${basePath}`);
}

/**
 * Check if Bridge module is healthy
 */
export async function checkHealth(): Promise<{
  newDb: boolean;
  legacyDb: boolean;
  errors: string[];
}> {
  return checkDatabaseConnections();
}

// ============================================================================
// STANDALONE SERVER (for development/testing)
// ============================================================================

/**
 * Start standalone server for module testing
 */
export async function startStandaloneServer(port: number = 3002): Promise<void> {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // CORS (development only)
  app.use((_req, res, next) => {
    res.header('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    );
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    if (_req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Initialize module
  initializeBridgeModule(app);

  // Root endpoint
  app.get('/', (_req, res) => {
    res.json({
      module: 'bridge-legacy',
      version: '1.0.0',
      status: 'running',
      endpoints: [
        'GET /api/v1/bridge/feature-flags',
        'GET /api/v1/bridge/feature-flags/:flagName',
        'GET /api/v1/bridge/feature-flags/all/admin',
        'POST /api/v1/bridge/feature-flags',
        'PATCH /api/v1/bridge/feature-flags/:flagName/percentage',
        'POST /api/v1/bridge/feature-flags/:flagName/enable',
        'POST /api/v1/bridge/feature-flags/:flagName/disable',
        'POST /api/v1/bridge/feature-flags/:flagName/whitelist',
        'DELETE /api/v1/bridge/feature-flags/:flagName/whitelist/:userId',
        'POST /api/v1/bridge/migration/start',
        'POST /api/v1/bridge/migration/validate',
        'POST /api/v1/bridge/migration/rollback',
        'GET /api/v1/bridge/rollout-status',
        'GET /api/v1/bridge/rollout-status/:flagName',
        'GET /api/v1/bridge/health',
      ],
    });
  });

  // Health check endpoint
  app.get('/health', async (_req, res) => {
    const health = await checkHealth();
    res.json({
      status: health.newDb && health.legacyDb ? 'ok' : 'degraded',
      module: 'bridge-legacy',
      databases: {
        new: health.newDb,
        legacy: health.legacyDb,
      },
      errors: health.errors,
      timestamp: new Date().toISOString(),
    });
  });

  // Error handling middleware
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  });

  // Health check database
  const health = await checkHealth();
  if (!health.newDb || !health.legacyDb) {
    console.error('❌ Database health check failed');
    console.error('New DB:', health.newDb ? '✓' : '✗');
    console.error('Legacy DB:', health.legacyDb ? '✓' : '✗');
    if (health.errors.length > 0) {
      health.errors.forEach((error) => console.error('  -', error));
    }
    process.exit(1);
  }

  // Start server
  app.listen(port, () => {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   🌉 DREAM PROTOCOL - MODULE 02: BRIDGE LEGACY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`   Status: Running`);
    console.log(`   Port: ${port}`);
    console.log(`   Base Path: /api/v1/bridge`);
    console.log(`   New Database: Connected ✓`);
    console.log(`   Legacy Database: Connected ✓ (READ-ONLY)`);
    console.log('');
    console.log('   Available Services:');
    console.log('   - Feature Flag Management (Gradual Rollout)');
    console.log('   - Data Migration (MVP → Dream Protocol)');
    console.log('   - API Adapter (Request Routing)');
    console.log('   - Migration Validation & Rollback');
    console.log('   - Dual Database Access (New + Legacy)');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
  });

  // Handle shutdown gracefully
  const shutdownHandler = async () => {
    console.log('\nShutting down gracefully...');
    await closeDatabaseConnections();
    process.exit(0);
  };

  process.on('SIGTERM', shutdownHandler);
  process.on('SIGINT', shutdownHandler);
}

// ============================================================================
// RUN STANDALONE SERVER (if executed directly)
// ============================================================================

if (require.main === module) {
  const port = parseInt(process.env.API_PORT || process.env.PORT || '3002');
  startStandaloneServer(port).catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}
