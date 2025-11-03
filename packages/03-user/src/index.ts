/**
 * Module 03: User - Main Entry Point
 *
 * Exports all services, types, and routes for the User module
 *
 * This module is a LIBRARY - it does NOT run its own server
 * The API Gateway mounts the router exported by createUserRouter()
 */

import { Router } from 'express';
import dotenv from 'dotenv';
import userRoutes from './routes/user.routes';
import { healthCheck } from './utils/database';

// Load environment variables
dotenv.config();

// ============================================================================
// EXPORTS - Services
// ============================================================================

export { default as profileService } from './services/profile.service';
export { default as settingsService } from './services/settings.service';
export { default as accountService } from './services/account.service';
export { default as avatarService } from './services/avatar.service';

// ============================================================================
// EXPORTS - Types
// ============================================================================

export * from './types/user.types';

// ============================================================================
// EXPORTS - Database Utils
// ============================================================================

export * from './utils/database';

// ============================================================================
// EXPORTS - Routes
// ============================================================================

export { userRoutes };

// ============================================================================
// ROUTER EXPORT (Main entry point for API Gateway)
// ============================================================================

/**
 * Create and return the User router
 * This is the PRIMARY export used by the API Gateway
 */
export function createUserRouter(): Router {
  return userRoutes;
}

/**
 * Check if User module is healthy
 */
export async function checkHealth(): Promise<boolean> {
  return healthCheck();
}

// ============================================================================
// LEGACY EXPORTS (deprecated - use createUserRouter instead)
// ============================================================================

/**
 * @deprecated Use createUserRouter() instead
 */
export function initializeUserModule(
  app: any,
  basePath: string = '/api/v1/users'
): void {
  console.warn('⚠️  initializeUserModule is deprecated. Use createUserRouter() instead.');
  app.use(basePath, userRoutes);
}

// ============================================================================
// NO STANDALONE SERVER
// ============================================================================
// This module is a library and does NOT run its own server.
// Use createUserRouter() to get the router for mounting in API Gateway.
