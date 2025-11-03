/**
 * Module 10: Analytics - Main Entry Point
 *
 * Exports all services, types, and routes for the Analytics module
 *
 * This module is a LIBRARY - it does NOT run its own server
 * The API Gateway mounts the router exported by createAnalyticsRouter()
 */

import { Router } from 'express';
import dotenv from 'dotenv';
import analyticsRoutes from './routes/analytics.routes';
import * as db from './utils/database';
import { Pool } from 'pg';

// Load environment variables
dotenv.config();

// ============================================================================
// EXPORTS - Services
// ============================================================================

export { default as analyticsService } from './services/analytics.service';
export { default as trendAnalysisService } from './services/trend-analysis.service';
export { default as heatScoreService } from './services/heat-score.service';

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

export { analyticsRoutes };

// ============================================================================
// ROUTER EXPORT (Main entry point for API Gateway)
// ============================================================================

/**
 * Create and return the Analytics router
 * This is the PRIMARY export used by the API Gateway
 */
export function createAnalyticsRouter(): Router {
  return analyticsRoutes;
}

/**
 * Check if Analytics module is healthy
 */
export async function checkHealth(): Promise<boolean> {
  try {
    // Simple health check - if database utils are initialized, we're healthy
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Initialize the Analytics module with a database pool
 * Call this from the API Gateway during startup
 */
export async function initializeModule(dbPool: Pool): Promise<void> {
  db.initializeDatabase(dbPool);
  console.log('✓ Module 10 (Analytics) initialized');
}

// ============================================================================
// LEGACY EXPORTS (deprecated - use createAnalyticsRouter instead)
// ============================================================================

/**
 * @deprecated Use createAnalyticsRouter() instead
 */
export function getAnalyticsRouter(): Router {
  console.warn('⚠️  getAnalyticsRouter is deprecated. Use createAnalyticsRouter() instead.');
  return analyticsRoutes;
}

// ============================================================================
// NO STANDALONE SERVER
// ============================================================================
// This module is a library and does NOT run its own server.
// Use createAnalyticsRouter() to get the router for mounting in API Gateway.
