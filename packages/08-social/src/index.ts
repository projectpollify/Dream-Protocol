/**
 * Module 08: Social - Main Entry Point
 *
 * Exports all services, types, and routes for the Social module
 *
 * This module is a LIBRARY - it does NOT run its own server
 * The API Gateway mounts the router exported by createSocialRouter()
 */

import { Router } from 'express';
import * as dotenv from 'dotenv';
import socialRoutes from './routes/social.routes';
import { healthCheck } from './utils/database';

dotenv.config();

// ============================================================================
// EXPORTS - Services
// ============================================================================

export { default as reactionService } from './services/reaction.service';
export { default as followService } from './services/follow.service';
export { default as notificationService } from './services/notification.service';
export { default as feedService } from './services/feed.service';
export { default as blockService } from './services/block.service';

// ============================================================================
// EXPORTS - Types
// ============================================================================

export * from './types';

// ============================================================================
// EXPORTS - Database Utils
// ============================================================================

export * from './utils/database';

// ============================================================================
// EXPORTS - Routes
// ============================================================================

export { socialRoutes };

// ============================================================================
// ROUTER EXPORT (Main entry point for API Gateway)
// ============================================================================

/**
 * Create and return the Social router
 * This is the PRIMARY export used by the API Gateway
 */
export function createSocialRouter(): Router {
  return socialRoutes;
}

/**
 * Check if Social module is healthy
 */
export async function checkHealth(): Promise<boolean> {
  return healthCheck();
}

// ============================================================================
// LEGACY EXPORTS (deprecated - use createSocialRouter instead)
// ============================================================================

/**
 * @deprecated Use createSocialRouter() instead
 */
export function initializeSocialModule(
  app: any,
  basePath: string = '/api/v1/social'
): void {
  console.warn('⚠️  initializeSocialModule is deprecated. Use createSocialRouter() instead.');
  app.use(basePath, socialRoutes);
}

// ============================================================================
// NO STANDALONE SERVER
// ============================================================================
// This module is a library and does NOT run its own server.
// Use createSocialRouter() to get the router for mounting in API Gateway.
