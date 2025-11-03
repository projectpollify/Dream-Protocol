/**
 * Module 07: Content - Main Entry Point
 *
 * Exports all services, types, and routes for the Content module
 *
 * This module is a LIBRARY - it does NOT run its own server
 * The API Gateway mounts the router exported by createContentRouter()
 */

import { Router } from 'express';
import * as dotenv from 'dotenv';
import contentRoutes from './routes/content.routes';
import { healthCheck } from './utils/database';

dotenv.config();

// ============================================================================
// EXPORTS - Services
// ============================================================================

export { default as postService } from './services/post.service';
export { default as commentService } from './services/comment.service';
export { default as discussionService } from './services/discussion.service';
export { default as moderationService } from './services/moderation.service';

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

export { contentRoutes };

// ============================================================================
// ROUTER EXPORT (Main entry point for API Gateway)
// ============================================================================

/**
 * Create and return the Content router
 * This is the PRIMARY export used by the API Gateway
 */
export function createContentRouter(): Router {
  return contentRoutes;
}

/**
 * Check if Content module is healthy
 */
export async function checkHealth(): Promise<boolean> {
  return healthCheck();
}

// ============================================================================
// LEGACY EXPORTS (deprecated - use createContentRouter instead)
// ============================================================================

/**
 * @deprecated Use createContentRouter() instead
 */
export function initializeContentModule(
  app: any,
  basePath: string = '/api/v1/content'
): void {
  console.warn('⚠️  initializeContentModule is deprecated. Use createContentRouter() instead.');
  app.use(basePath, contentRoutes);
}

// ============================================================================
// NO STANDALONE SERVER
// ============================================================================
// This module is a library and does NOT run its own server.
// Use createContentRouter() to get the router for mounting in API Gateway.
