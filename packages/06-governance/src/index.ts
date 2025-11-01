/**
 * Module 06: Governance
 * Dual-Mode Democratic Decision-Making Engine for Dream Protocol
 *
 * Main Entry Point
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import { getPool, closePool, healthCheck } from './utils/database';
import routes from './routes';

// Load environment variables
dotenv.config();

// ============================================================================
// Express App Setup
// ============================================================================

const app: Application = express();
const PORT = process.env.PORT || 3006;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS (configure for production)
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Request logging (development)
if (process.env.NODE_ENV === 'development') {
  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// ============================================================================
// Routes
// ============================================================================

// Health check
app.get('/health', async (req: Request, res: Response) => {
  const dbHealthy = await healthCheck();

  res.json({
    service: 'Module 06: Governance',
    status: dbHealthy ? 'healthy' : 'unhealthy',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    database: dbHealthy ? 'connected' : 'disconnected',
  });
});

// API routes
app.use('/api/v1', routes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path,
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[Global Error Handler]', err);

  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
  });
});

// ============================================================================
// Server Lifecycle
// ============================================================================

let server: any;

async function start() {
  try {
    // Initialize database connection
    console.log('[Governance] Initializing database connection...');
    getPool();

    // Test database connection
    const dbHealthy = await healthCheck();
    if (!dbHealthy) {
      throw new Error('Database connection failed');
    }
    console.log('[Governance] ✓ Database connection established');

    // Start server
    server = app.listen(PORT, () => {
      console.log(`[Governance] ✓ Server running on port ${PORT}`);
      console.log(`[Governance] Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`[Governance] Health check: http://localhost:${PORT}/health`);
      console.log(`[Governance] API base: http://localhost:${PORT}/api/v1/governance`);
    });
  } catch (error) {
    console.error('[Governance] Failed to start server:', error);
    process.exit(1);
  }
}

async function stop() {
  console.log('[Governance] Shutting down gracefully...');

  // Close server
  if (server) {
    await new Promise<void>((resolve) => {
      server.close(() => {
        console.log('[Governance] ✓ Server closed');
        resolve();
      });
    });
  }

  // Close database connections
  await closePool();

  console.log('[Governance] ✓ Shutdown complete');
  process.exit(0);
}

// Handle shutdown signals
process.on('SIGTERM', stop);
process.on('SIGINT', stop);

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('[Governance] Uncaught Exception:', error);
  stop();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Governance] Unhandled Rejection at:', promise, 'reason:', reason);
  stop();
});

// ============================================================================
// Start Server (if not in test mode)
// ============================================================================

if (require.main === module) {
  start();
}

// ============================================================================
// Export for testing
// ============================================================================

export { app, start, stop };
export default app;
