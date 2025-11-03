/**
 * Module 10: Analytics - Entry Point
 * Hybrid pattern: works as both a module import and standalone server
 */

import express, { Express, Request, Response } from 'express';
import { Pool } from 'pg';
import analyticsRoutes from './routes/analytics.routes';
import * as db from './utils/database';

// ============================================================================
// Module Initialization
// ============================================================================

/**
 * Initialize the Analytics module
 * Call this from the main application to set up the database connection
 */
export async function initializeModule(dbPool: Pool): Promise<void> {
  db.initializeDatabase(dbPool);
  console.log('✅ Module 10 (Analytics) initialized');
}

/**
 * Get Express router for integrating into main app
 */
export function getAnalyticsRouter(): express.Router {
  return analyticsRoutes;
}

// ============================================================================
// Service Exports (for use by other modules)
// ============================================================================

export { default as analyticsService } from './services/analytics.service';
export { default as trendAnalysisService } from './services/trend-analysis.service';
export { default as heatScoreService } from './services/heat-score.service';

// ============================================================================
// Type Exports
// ============================================================================

export * from './types';

// ============================================================================
// Standalone Server Mode
// ============================================================================

/**
 * Start the Analytics module as a standalone server
 * Useful for development and testing
 */
async function startStandaloneServer(port: number = 3010): Promise<void> {
  const app: Express = express();

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Initialize database connection
  const dbPool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'dream_protocol',
  });

  try {
    // Test database connection
    const testConnection = await dbPool.query('SELECT NOW()');
    console.log('✅ Database connected:', testConnection.rows[0]);
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }

  // Initialize module
  await initializeModule(dbPool);

  // Mount routes
  app.use('/api/v1/analytics', analyticsRoutes);

  // Health check
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      module: 'analytics',
      version: '1.0.0',
      uptime: process.uptime(),
    });
  });

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: 'Endpoint not found',
      path: req.path,
      method: req.method,
    });
  });

  // Error handler
  app.use((err: Error, req: Request, res: Response) => {
    console.error('Error:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: err.message,
    });
  });

  // Start server
  app.listen(port, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║        Module 10: Analytics Server Running                 ║
║                                                            ║
║   Listening on: http://localhost:${port}                    ║
║   API Docs: http://localhost:${port}/api/v1/analytics      ║
║                                                            ║
║   Endpoints:                                              ║
║   - Shadow Consensus: GET /api/v1/analytics/shadow...   ║
║   - Predictions: GET /api/v1/analytics/predictions/...  ║
║   - Heat Scores: POST /api/v1/analytics/calculate-heat  ║
║   - Platform Health: GET /api/v1/analytics/...platform  ║
║                                                            ║
║   Press Ctrl+C to stop                                    ║
╚════════════════════════════════════════════════════════════╝
    `);
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n⏹️  Shutting down gracefully...');
    dbPool.end();
    process.exit(0);
  });
}

// ============================================================================
// Auto-run Block (for standalone mode)
// ============================================================================

// Check if this file is being run directly
if (require.main === module) {
  const port = parseInt(process.env.PORT || '3010');
  startStandaloneServer(port).catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

export default {
  initializeModule,
  getAnalyticsRouter,
  startStandaloneServer,
};
