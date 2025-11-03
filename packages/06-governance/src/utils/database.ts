/**
 * Module 06: Governance - Database Utility
 * PostgreSQL connection pool and query helpers
 */

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from project root
// Try multiple possible locations to handle different execution contexts
const possibleEnvPaths = [
  path.resolve(__dirname, '../../../../.env'),  // From compiled dist/utils/database.js
  path.resolve(__dirname, '../../../.env'),     // From src/utils/database.ts
  path.resolve(process.cwd(), '.env'),           // From project root
  path.resolve(process.cwd(), '../../.env'),     // From packages/06-governance
];

let envLoaded = false;
for (const envPath of possibleEnvPaths) {
  const result = dotenv.config({ path: envPath });
  if (!result.error) {
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.warn('[Governance] Warning: Could not load .env file from any expected location');
}

// ============================================================================
// Database Configuration
// ============================================================================

// Build connection string from individual variables or use DATABASE_URL if provided
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD || '';
const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = process.env.DB_PORT || '5432';
const dbName = process.env.DB_NAME;

const connectionString = process.env.DATABASE_URL ||
  `postgresql://${dbUser}${dbPassword ? ':' + dbPassword : ''}@${dbHost}:${dbPort}/${dbName}`;

const poolConfig = {
  connectionString,
  min: parseInt(process.env.DATABASE_POOL_MIN || '2', 10),
  max: parseInt(process.env.DATABASE_POOL_MAX || '10', 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// ============================================================================
// Connection Pool
// ============================================================================

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool(poolConfig);

    pool.on('error', (err) => {
      console.error('Unexpected error on idle database client', err);
      process.exit(-1);
    });

    console.log('[Governance] Database connection pool created');
  }

  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('[Governance] Database connection pool closed');
  }
}

// ============================================================================
// Query Helpers
// ============================================================================

export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  const pool = getPool();

  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;

    if (process.env.NODE_ENV === 'development') {
      console.log('[Query]', { text, duration, rows: result.rowCount });
    }

    return result;
  } catch (error) {
    console.error('[Query Error]', { text, params, error });
    throw error;
  }
}

export async function getClient(): Promise<PoolClient> {
  const pool = getPool();
  return await pool.connect();
}

// ============================================================================
// Transaction Helper
// ============================================================================

export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClient();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ============================================================================
// Health Check
// ============================================================================

export async function healthCheck(): Promise<boolean> {
  try {
    const result = await query('SELECT NOW() as now');
    return result.rows.length > 0;
  } catch (error) {
    console.error('[Health Check Failed]', error);
    return false;
  }
}

// ============================================================================
// Export
// ============================================================================

export default {
  getPool,
  closePool,
  query,
  getClient,
  transaction,
  healthCheck,
};
