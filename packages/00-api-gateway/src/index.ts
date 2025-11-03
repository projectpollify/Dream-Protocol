/**
 * Dream Protocol API Gateway
 * Unified entry point for all backend modules
 *
 * This gateway:
 * - Listens on port 3001 (public-facing)
 * - Routes requests to backend modules on ports 3002-3010
 * - Handles CORS, authentication, and error handling
 * - Provides health checks and monitoring
 */

import express, { Request, Response, NextFunction, Express } from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import dotenv from 'dotenv';

import { loadConfig } from './config';
import { createLogger } from './logger';
import {
  handleGatewayHealth,
  handlePing,
  handleInfo,
} from './health';

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
 * Create and register proxy middleware for each module
 */
config.modules.forEach((module) => {
  const target = `http://localhost:${module.internalPort}`;

  app.use(
    module.basePath,
    createProxyMiddleware({
      target,
      changeOrigin: true,
      pathRewrite: {
        [`^${module.basePath}`]: '', // Remove base path when forwarding
      },
      onProxyReq: (proxyReq: any, req: Request) => {
        // Forward request headers
        if (req.body && Object.keys(req.body).length > 0) {
          const bodyData = JSON.stringify(req.body);
          proxyReq.setHeader('Content-Type', 'application/json');
          proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
          proxyReq.write(bodyData);
        }

        // Add gateway headers for debugging
        proxyReq.setHeader('X-Forwarded-By', 'Dream-Protocol-Gateway');
        proxyReq.setHeader('X-Module', module.name);
      },
      onProxyRes: (proxyRes: any) => {
        // Add response header indicating which module served the request
        proxyRes.headers['X-Served-By'] = module.name;
      },
      onError: (err: Error, req: Request, res: Response) => {
        logger.error(
          `Proxy error for ${module.name}:${module.internalPort}`,
          err.message
        );

        if (!res.headersSent) {
          res.status(503).json({
            success: false,
            error: `Module "${module.name}" is unavailable`,
            details: err.message,
            module: module.name,
            timestamp: new Date().toISOString(),
          });
        }
      },
    })
  );

  logger.info(
    `Registered route: ${module.basePath} -> localhost:${module.internalPort} (${module.name})`
  );
});

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
  logger.info(`🚀 Dream Protocol API Gateway started`);
  logger.info(`📍 Listening on http://localhost:${PORT}`);
  logger.info(`🌍 CORS enabled for: ${config.corsOrigin.join(', ')}`);
  logger.info(`🔧 Environment: ${config.nodeEnv}`);
  logger.info(`📦 Routing to ${config.modules.length} backend modules`);
  logger.info('');
  logger.info('Available endpoints:');
  logger.info('  GET  /ping          - Health check');
  logger.info('  GET  /health        - Detailed health status');
  logger.info('  GET  /info          - Gateway information');
  logger.info('');
  logger.info('Backend modules:');
  config.modules.forEach((m) => {
    logger.info(`  ${m.basePath.padEnd(25)} -> :${m.internalPort} (${m.name})`);
  });
  logger.info('');
});

export default app;
