/**
 * Module 02: Bridge Legacy - Main Entry Point
 *
 * Exports all services, types, and routes for the Bridge Legacy module
 *
 * This module is a LIBRARY - it does NOT run its own server
 * The API Gateway mounts the router exported by createBridgeRouter()
 */

import { Router } from 'express';
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
// ROUTER EXPORT (Main entry point for API Gateway)
// ============================================================================

/**
 * Create and return the Bridge router
 * This is the PRIMARY export used by the API Gateway
 */
export function createBridgeRouter(): Router {
  return bridgeRoutes;
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
// LEGACY EXPORTS (deprecated - use createBridgeRouter instead)
// ============================================================================

/**
 * @deprecated Use createBridgeRouter() instead
 */
export function initializeBridgeModule(
  app: any,
  basePath: string = '/api/v1/bridge'
): void {
  console.warn('⚠️  initializeBridgeModule is deprecated. Use createBridgeRouter() instead.');
  app.use(basePath, bridgeRoutes);
}

// ============================================================================
// NO STANDALONE SERVER
// ============================================================================
// This module is a library and does NOT run its own server.
// Use createBridgeRouter() to get the router for mounting in API Gateway.
