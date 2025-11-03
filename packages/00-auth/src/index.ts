/**
 * Module 00: Authentication
 * Entry point for the Auth module
 */

import { Router } from 'express';
import authRoutes from './routes/auth.routes';

/**
 * Create and return the Auth router
 * This function is called by the API Gateway
 */
export function createAuthRouter(): Router {
  return authRoutes;
}

// Export middleware for use by other modules
export { requireAuth, optionalAuth } from './middleware/auth.middleware';

// Export types
export * from './types/auth.types';

// Export service for testing
export { default as authService } from './services/auth.service';
