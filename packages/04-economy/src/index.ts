/**
 * Module 04: Economy - Main Entry Point
 *
 * Exports all services, types, and routes for the Economy module
 *
 * This module is a LIBRARY - it does NOT run its own server
 * The API Gateway mounts the router exported by createEconomyRouter()
 */

import { Router } from 'express';
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
// ROUTER EXPORT (Main entry point for API Gateway)
// ============================================================================

/**
 * Create and return the Economy router
 * This is the PRIMARY export used by the API Gateway
 */
export function createEconomyRouter(): Router {
  return economyRoutes;
}

/**
 * Check if Economy module is healthy
 */
export async function checkHealth(): Promise<boolean> {
  return healthCheck();
}

// ============================================================================
// LEGACY EXPORTS (deprecated - use createEconomyRouter instead)
// ============================================================================

/**
 * @deprecated Use createEconomyRouter() instead
 */
export function initializeEconomyModule(
  app: any,
  basePath: string = '/api/v1/economy'
): void {
  console.warn('⚠️  initializeEconomyModule is deprecated. Use createEconomyRouter() instead.');
  app.use(basePath, economyRoutes);
}

// ============================================================================
// NO STANDALONE SERVER
// ============================================================================
// This module is a library and does NOT run its own server.
// Use createEconomyRouter() to get the router for mounting in API Gateway.
