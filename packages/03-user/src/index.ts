/**
 * Module 03: User - Main Entry Point
 *
 * Exports all services, types, and routes for the User module
 */

import express, { Express } from 'express';
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
// MODULE INITIALIZATION
// ============================================================================

/**
 * Initialize the User module
 * @param app Express application instance
 * @param basePath Base path for routes (default: /api/v1/users)
 */
export function initializeUserModule(
  app: Express,
  basePath: string = '/api/v1/users'
): void {
  // Register routes
  app.use(basePath, userRoutes);

  console.log(`✓ User module initialized at ${basePath}`);
}

/**
 * Check if User module is healthy
 */
export async function checkHealth(): Promise<boolean> {
  return healthCheck();
}

// ============================================================================
// STANDALONE SERVER (for development/testing)
// ============================================================================

/**
 * Start standalone server for module testing
 */
export async function startStandaloneServer(port: number = 3003): Promise<void> {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // CORS (development only)
  app.use((_req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', '*');
    res.header('Access-Control-Allow-Methods', '*');
    next();
  });

  // Initialize module
  initializeUserModule(app);

  // Root endpoint
  app.get('/', (_req, res) => {
    res.json({
      module: 'user',
      version: '1.0.0',
      status: 'running',
      endpoints: [
        'POST /api/v1/users/profile/create',
        'GET /api/v1/users/profile/:userId',
        'PATCH /api/v1/users/profile/:userId',
        'GET /api/v1/users/profile/search',
        'GET /api/v1/users/settings',
        'PATCH /api/v1/users/settings',
        'POST /api/v1/users/settings/password/change',
        'POST /api/v1/users/settings/email/verify',
        'POST /api/v1/users/avatar/upload',
        'GET /api/v1/users/avatar/:userId',
        'DELETE /api/v1/users/avatar/:avatarId',
        'GET /api/v1/users/account/status/:userId',
        'PATCH /api/v1/users/account/status',
        'POST /api/v1/users/account/verify',
        'GET /api/v1/users/health',
      ],
    });
  });

  // Health check
  const healthy = await checkHealth();
  if (!healthy) {
    console.error('❌ Database health check failed');
    process.exit(1);
  }

  // Start server
  app.listen(port, () => {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   🏛️  DREAM PROTOCOL - MODULE 03: USER');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`   Status: Running`);
    console.log(`   Port: ${port}`);
    console.log(`   Base Path: /api/v1/users`);
    console.log(`   Database: Connected ✓`);
    console.log('');
    console.log('   Available Services:');
    console.log('   - Profile Management (True Self + Shadow)');
    console.log('   - User Settings & Preferences');
    console.log('   - Account Status & Moderation');
    console.log('   - Avatar Upload & Processing');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
  });
}

// ============================================================================
// RUN STANDALONE SERVER (if executed directly)
// ============================================================================

if (require.main === module) {
  const port = parseInt(process.env.PORT || '3003');
  startStandaloneServer(port).catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}
