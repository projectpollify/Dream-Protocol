/**
 * Module 01: Identity - Main Entry Point
 *
 * Exports all services, types, and routes for the Identity module
 *
 * This module is a LIBRARY - it does NOT run its own server
 * The API Gateway mounts the router exported by createIdentityRouter()
 */

import { Router } from 'express';
import dotenv from 'dotenv';
import identityRoutes from './routes/identity.routes';
import { healthCheck, closePool } from './utils/database';

// Load environment variables
dotenv.config();

// ============================================================================
// EXPORTS - Services
// ============================================================================

export { default as cardanoService } from './services/cardano.service';
export { default as identityService } from './services/identity.service';

// ============================================================================
// EXPORTS - Types
// ============================================================================

export * from './types/identity.types';

// ============================================================================
// EXPORTS - Database Utils
// ============================================================================

export * from './utils/database';

// ============================================================================
// EXPORTS - Utilities
// ============================================================================

export * from './utils/encryption';

// ============================================================================
// EXPORTS - Routes
// ============================================================================

export { identityRoutes };

// ============================================================================
// ROUTER EXPORT (Main entry point for API Gateway)
// ============================================================================

/**
 * Create and return the Identity router
 * This is the PRIMARY export used by the API Gateway
 */
export function createIdentityRouter(): Router {
  return identityRoutes;
}

/**
 * Check if Identity module is healthy
 */
export async function checkHealth(): Promise<boolean> {
  return healthCheck();
}

// ============================================================================
// LEGACY EXPORTS (deprecated - use createIdentityRouter instead)
// ============================================================================

/**
 * @deprecated Use createIdentityRouter() instead
 */
export function initializeIdentityModule(
  app: any,
  basePath: string = '/api/v1/identity'
): void {
  console.warn('⚠️  initializeIdentityModule is deprecated. Use createIdentityRouter() instead.');
  app.use(basePath, identityRoutes);
}

// ============================================================================
// NO STANDALONE SERVER
// ============================================================================
// This module is a library and does NOT run its own server.
// Use createIdentityRouter() to get the router for mounting in API Gateway.
