/**
 * Module 09: Verification - Main Entry Point
 * Multi-layer trust discovery system for Dream Protocol
 *
 * Exports all services, types, and routes for the Verification module
 *
 * This module is a LIBRARY - it does NOT run its own server
 * The API Gateway mounts the router exported by createVerificationRouter()
 */

import { Router } from 'express';
import dotenv from 'dotenv';
import verificationRoutes from './routes/verification.routes';

// Load environment variables
dotenv.config();

// ============================================================================
// EXPORTS - Services
// ============================================================================

export { proofOfHumanityService } from './services/proof-of-humanity.service';
export { veracityBondService } from './services/veracity-bond.service';
export { PredictionMarketService, LMSRCalculator } from './services/prediction-market.service';
export { EpistemicScoringService, EpistemicScoringEngine } from './services/epistemic-scoring.service';

// ============================================================================
// EXPORTS - Types
// ============================================================================

export * from './types';

// ============================================================================
// EXPORTS - Database Utils
// ============================================================================

export { getPool, closePool, query, queryOne, runMigration, runAllMigrations } from './database';

// ============================================================================
// EXPORTS - Routes
// ============================================================================

export { verificationRoutes };

// ============================================================================
// ROUTER EXPORT (Main entry point for API Gateway)
// ============================================================================

/**
 * Create and return the Verification router
 * This is the PRIMARY export used by the API Gateway
 */
export function createVerificationRouter(): Router {
  return verificationRoutes;
}

/**
 * Check if Verification module is healthy
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const { getPool } = require('./database');
    const pool = getPool();
    await pool.query('SELECT 1');
    return true;
  } catch (error) {
    return false;
  }
}

// ============================================================================
// LEGACY EXPORTS (deprecated - use createVerificationRouter instead)
// ============================================================================

/**
 * @deprecated Use createVerificationRouter() instead
 */
export function initializeVerificationModule(
  app: any,
  basePath: string = '/api/v1/verification'
): void {
  console.warn('⚠️  initializeVerificationModule is deprecated. Use createVerificationRouter() instead.');
  app.use(basePath, verificationRoutes);
}

// ============================================================================
// NO STANDALONE SERVER
// ============================================================================
// This module is a library and does NOT run its own server.
// Use createVerificationRouter() to get the router for mounting in API Gateway.
