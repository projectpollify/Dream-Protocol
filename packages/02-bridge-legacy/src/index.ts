/**
 * Bridge Legacy Module Entry Point
 * Exports services, routes, and types for MVP to Dream Protocol migration
 */

// Services
export { featureFlagService } from './services/feature-flag.service';
export { dataMigrationService } from './services/data-migration.service';
export { adapterService } from './services/adapter.service';

// Routes
export { default as bridgeRoutes } from './routes/bridge.routes';

// Database utilities
export {
  db,
  legacyDb,
  checkDatabaseConnections,
  closeDatabaseConnections,
} from './utils/database';

// Types
export * from './types/bridge.types';

console.log('[Bridge Legacy] Module loaded successfully');
