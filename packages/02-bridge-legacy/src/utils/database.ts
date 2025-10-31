/**
 * Database Connection Manager
 * Manages connections to both legacy MVP and new Dream Protocol databases
 */

import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// ========== New Dream Protocol Database ==========

const newDbConfig: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'dreamprotocol',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

export const db = new Pool(newDbConfig);

// Test connection
db.on('connect', () => {
  console.log('[Bridge] Connected to Dream Protocol database');
});

db.on('error', (err) => {
  console.error('[Bridge] Unexpected error on Dream Protocol database client', err);
});

// ========== Legacy MVP Database (READ-ONLY) ==========

const legacyDbConfig: PoolConfig = {
  host: process.env.LEGACY_DB_HOST || 'localhost',
  port: parseInt(process.env.LEGACY_DB_PORT || '5432'),
  database: process.env.LEGACY_DB_NAME || 'mvp_legacy',
  user: process.env.LEGACY_DB_READONLY_USER || 'postgres',
  password: process.env.LEGACY_DB_READONLY_PASSWORD,
  max: 10, // Fewer connections for read-only
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

export const legacyDb = new Pool(legacyDbConfig);

// Test connection
legacyDb.on('connect', () => {
  console.log('[Bridge] Connected to Legacy MVP database (READ-ONLY)');
});

legacyDb.on('error', (err) => {
  console.error('[Bridge] Unexpected error on Legacy MVP database client', err);
});

// ========== Database Health Checks ==========

export async function checkDatabaseConnections(): Promise<{
  newDb: boolean;
  legacyDb: boolean;
  errors: string[];
}> {
  const result = {
    newDb: false,
    legacyDb: false,
    errors: [] as string[],
  };

  // Check new database
  try {
    await db.query('SELECT 1');
    result.newDb = true;
  } catch (error: any) {
    result.errors.push(`New DB connection failed: ${error.message}`);
  }

  // Check legacy database
  try {
    await legacyDb.query('SELECT 1');
    result.legacyDb = true;
  } catch (error: any) {
    result.errors.push(`Legacy DB connection failed: ${error.message}`);
  }

  return result;
}

// ========== Graceful Shutdown ==========

export async function closeDatabaseConnections(): Promise<void> {
  try {
    await db.end();
    console.log('[Bridge] Closed Dream Protocol database connection');
  } catch (error) {
    console.error('[Bridge] Error closing Dream Protocol database:', error);
  }

  try {
    await legacyDb.end();
    console.log('[Bridge] Closed Legacy MVP database connection');
  } catch (error) {
    console.error('[Bridge] Error closing Legacy MVP database:', error);
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  await closeDatabaseConnections();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeDatabaseConnections();
  process.exit(0);
});
