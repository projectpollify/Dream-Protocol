/**
 * Dream Protocol API Gateway
 * Unified entry point for all backend modules
 *
 * This gateway:
 * - Listens on port 3001 (ONLY backend server)
 * - Mounts all module routers directly (NO proxying)
 * - Handles CORS, authentication, and error handling
 * - Provides health checks and monitoring
 */

import express, { Request, Response, NextFunction, Express } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { loadConfig } from './config';
import { createLogger } from './logger';
import {
  handleGatewayHealth,
  handlePing,
  handleInfo,
} from './health';

// Import all module routers
import { createAuthRouter } from '@dream/auth';
import { createIdentityRouter } from '@dream/identity';
import { createBridgeRouter } from '@dream/bridge-legacy';
import { createUserRouter } from '@dream/user';
import { createEconomyRouter } from '@dream/economy';
import { createExchangeRouter } from '@dream/token-exchange';
import { createGovernanceRouter } from '@dream/governance';
import { createContentRouter } from '@dream/content';
import { createSocialRouter } from '@dream/social';
import { createVerificationRouter} from '@dream/verification';
import { createAnalyticsRouter } from '@dream/analytics';

// Load environment variables
dotenv.config();

const logger = createLogger('Gateway', 'info');
const config = loadConfig();

const app: Express = express();

// ==================== MIDDLEWARE ====================

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS Configuration
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.debug(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });

  next();
});

// ==================== HEALTH ENDPOINTS ====================

// Gateway health check (checks all modules)
app.get('/health', async (req: Request, res: Response) => {
  await handleGatewayHealth(req, res, config.modules, config.gatewayPort);
});

// Simple ping
app.get('/ping', (req: Request, res: Response) => {
  handlePing(req, res);
});

// Gateway info
app.get('/info', (req: Request, res: Response) => {
  handleInfo(req, res, config.modules, config.gatewayPort);
});

// ==================== MODULE ROUTING ====================

/**
 * Mount module routers directly (no proxying to separate servers)
 * Each module exports a createRouter() function that returns an Express Router
 */

// Mount all module routers
app.use('/api/v1/auth', createAuthRouter());
app.use('/api/v1/identity', createIdentityRouter());
app.use('/api/v1/bridge', createBridgeRouter());
app.use('/api/v1/users', createUserRouter());
app.use('/api/v1/economy', createEconomyRouter());
app.use('/api/v1/exchange', createExchangeRouter());
app.use('/api/v1/governance', createGovernanceRouter());
app.use('/api/v1/content', createContentRouter());
app.use('/api/v1/social', createSocialRouter());
app.use('/api/v1/verification', createVerificationRouter());
app.use('/api/v1/analytics', createAnalyticsRouter());

logger.info('✓ Mounted 10 module routers');

// ==================== 404 HANDLER ====================

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `No route found for ${req.method} ${req.path}`,
    availableRoutes: config.modules.map((m) => m.basePath),
    timestamp: new Date().toISOString(),
  });
});

// ==================== ERROR HANDLER ====================

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error(`Unhandled error: ${err.message}`, err);

  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
    timestamp: new Date().toISOString(),
  });
});

// ==================== START SERVER ====================

const PORT = config.gatewayPort;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  logger.info('');
  logger.info('═══════════════════════════════════════════════════════════');
  logger.info('   🚀 DREAM PROTOCOL - API GATEWAY');
  logger.info('═══════════════════════════════════════════════════════════');
  logger.info(`   📍 Listening on: http://localhost:${PORT}`);
  logger.info(`   🌍 CORS Origins: ${config.corsOrigin.join(', ')}`);
  logger.info(`   🔧 Environment: ${config.nodeEnv}`);
  logger.info(`   📦 Modules: 11 routers mounted (NO separate servers)`);
  logger.info('');
  logger.info('   Gateway Endpoints:');
  logger.info('     GET  /ping          - Health check');
  logger.info('     GET  /health        - Detailed health status');
  logger.info('     GET  /info          - Gateway information');
  logger.info('');
  logger.info('   Module Routes (all in-process):');
  logger.info('     /api/v1/auth           - Authentication (Register/Login)');
  logger.info('     /api/v1/identity       - Identity & Dual Wallets');
  logger.info('     /api/v1/bridge         - Legacy MVP Bridge');
  logger.info('     /api/v1/users          - User Profiles & Settings');
  logger.info('     /api/v1/economy        - Token Economy');
  logger.info('     /api/v1/exchange       - Token Exchange');
  logger.info('     /api/v1/governance     - Governance & Voting');
  logger.info('     /api/v1/content        - Posts & Discussions');
  logger.info('     /api/v1/social         - Social Interactions');
  logger.info('     /api/v1/verification   - Verification & Truth Systems');
  logger.info('     /api/v1/analytics      - Analytics & Insights');
  logger.info('═══════════════════════════════════════════════════════════');
  logger.info('');
});

export default app;
