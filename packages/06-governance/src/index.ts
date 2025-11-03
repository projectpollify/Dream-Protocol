/**
 * Module 06: Governance - Main Entry Point
 * Dual-Mode Democratic Decision-Making Engine for Dream Protocol
 *
 * Exports all services, types, and routes for the Governance module
 *
 * This module is a LIBRARY - it does NOT run its own server
 * The API Gateway mounts the router exported by createGovernanceRouter()
 */

import { Router } from 'express';
import dotenv from 'dotenv';
import governanceRoutes from './routes/governance.routes';
import { healthCheck } from './utils/database';

// Load environment variables
dotenv.config();

// ============================================================================
// EXPORTS - Services
// ============================================================================

export { default as pollService } from './services/poll.service';
export { default as voteService } from './services/vote.service';
export { default as consensusService } from './services/consensus.service';
export { default as delegationService } from './services/delegation.service';
export { default as stakeService } from './services/stake.service';
export { default as rollbackService } from './services/rollback.service';
export { default as parameterService } from './services/parameter.service';
export { default as constitutionalService } from './services/constitutional.service';
export { default as actionService } from './services/action.service';

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

export { governanceRoutes };

// ============================================================================
// ROUTER EXPORT (Main entry point for API Gateway)
// ============================================================================

/**
 * Create and return the Governance router
 * This is the PRIMARY export used by the API Gateway
 */
export function createGovernanceRouter(): Router {
  return governanceRoutes;
}

/**
 * Check if Governance module is healthy
 */
export async function checkHealth(): Promise<boolean> {
  return healthCheck();
}

// ============================================================================
// LEGACY EXPORTS (deprecated - use createGovernanceRouter instead)
// ============================================================================

/**
 * @deprecated Use createGovernanceRouter() instead
 */
export function initializeGovernanceModule(
  app: any,
  basePath: string = '/api/v1/governance'
): void {
  console.warn('⚠️  initializeGovernanceModule is deprecated. Use createGovernanceRouter() instead.');
  app.use(basePath, governanceRoutes);
}

// ============================================================================
// NO STANDALONE SERVER
// ============================================================================
// This module is a library and does NOT run its own server.
// Use createGovernanceRouter() to get the router for mounting in API Gateway.
