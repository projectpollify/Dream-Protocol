/**
 * Module 05: Token Exchange Integration - Main Entry Point
 *
 * Exports all services, types, and routes for the Token Exchange module
 *
 * This module is a LIBRARY - it does NOT run its own server
 * The API Gateway mounts the router exported by createExchangeRouter()
 */

import { Router } from 'express';
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
// ROUTER EXPORT (Main entry point for API Gateway)
// ============================================================================

/**
 * Create and return the Exchange router
 * This is the PRIMARY export used by the API Gateway
 */
export function createExchangeRouter(): Router {
  return exchangeRoutes;
}

/**
 * Check if Token Exchange module is healthy
 */
export async function checkHealth(): Promise<boolean> {
  return healthCheck();
}

// ============================================================================
// LEGACY EXPORTS (deprecated - use createExchangeRouter instead)
// ============================================================================

/**
 * @deprecated Use createExchangeRouter() instead
 */
export function initializeTokenExchangeModule(
  app: any,
  basePath: string = '/api/v1/exchange'
): void {
  console.warn('⚠️  initializeTokenExchangeModule is deprecated. Use createExchangeRouter() instead.');
  app.use(basePath, exchangeRoutes);
}

// ============================================================================
// NO STANDALONE SERVER
// ============================================================================
// This module is a library and does NOT run its own server.
// Use createExchangeRouter() to get the router for mounting in API Gateway.
