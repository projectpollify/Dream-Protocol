/**
 * Module 02: Bridge Legacy - Database Utilities
 *
 * Manages connections to BOTH legacy MVP and new Dream Protocol databases
 * Uses functional pattern while supporting dual database access
 */

import { Pool, PoolClient, PoolConfig, QueryResult } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// ============================================================================
// Database Connection Pools
// ============================================================================

// New Dream Protocol Database
const newDbConfig: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'dreamprotocol_dev',
  user: process.env.DB_USER || 'dream_admin',
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

export const pool = new Pool(newDbConfig);
export const db = pool; // Alias for backward compatibility

// Legacy MVP Database (READ-ONLY)
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

export const legacyPool = new Pool(legacyDbConfig);
export const legacyDb = legacyPool; // Alias for backward compatibility

// Error handling
pool.on('connect', () => {
  if (process.env.NODE_ENV === 'development') {
    console.log('[Bridge] Connected to Dream Protocol database');
  }
});

pool.on('error', (err) => {
  console.error('[Bridge] Unexpected error on Dream Protocol database:', err);
});

legacyPool.on('connect', () => {
  if (process.env.NODE_ENV === 'development') {
    console.log('[Bridge] Connected to Legacy MVP database (READ-ONLY)');
  }
});

legacyPool.on('error', (err) => {
  console.error('[Bridge] Unexpected error on Legacy MVP database:', err);
});

// ============================================================================
// Core Query Functions (New Database)
// ============================================================================

/**
 * Execute a query on the new Dream Protocol database
 */
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<any>> {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;

    if (process.env.NODE_ENV === 'development') {
      console.log('[Bridge] Executed query', { text, duration, rows: result.rowCount });
    }

    return result;
  } catch (error: any) {
    console.error('[Bridge] Database query error:', error);
    throw error;
  }
}

/**
 * Execute a query on the legacy database (READ-ONLY)
 */
export async function legacyQuery<T = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<any>> {
  const start = Date.now();
  try {
    const result = await legacyPool.query(text, params);
    const duration = Date.now() - start;

    if (process.env.NODE_ENV === 'development') {
      console.log('[Bridge] Executed legacy query', { text, duration, rows: result.rowCount });
    }

    return result;
  } catch (error: any) {
    console.error('[Bridge] Legacy database query error:', error);
    throw error;
  }
}

/**
 * Get a client from the new database pool for transactions
 */
export async function getClient(): Promise<PoolClient> {
  return await pool.connect();
}

/**
 * Get a client from the legacy database pool (READ-ONLY)
 */
export async function getLegacyClient(): Promise<PoolClient> {
  return await legacyPool.connect();
}

/**
 * Execute multiple queries in a transaction (new database only)
 */
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
    console.error('[Bridge] Transaction error:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Health check - verify both database connections
 */
export async function healthCheck(): Promise<boolean> {
  try {
    await query('SELECT 1');
    return true;
  } catch (error) {
    console.error('[Bridge] Database health check failed:', error);
    return false;
  }
}

/**
 * Check both database connections
 */
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
    await query('SELECT 1');
    result.newDb = true;
  } catch (error: any) {
    result.errors.push(`New DB connection failed: ${error.message}`);
  }

  // Check legacy database
  try {
    await legacyQuery('SELECT 1');
    result.legacyDb = true;
  } catch (error: any) {
    result.errors.push(`Legacy DB connection failed: ${error.message}`);
  }

  return result;
}

/**
 * Close all database connections (graceful shutdown)
 */
export async function closePool(): Promise<void> {
  await closeDatabaseConnections();
}

/**
 * Close both database connections
 */
export async function closeDatabaseConnections(): Promise<void> {
  try {
    await pool.end();
    console.log('[Bridge] Closed Dream Protocol database connection');
  } catch (error) {
    console.error('[Bridge] Error closing Dream Protocol database:', error);
  }

  try {
    await legacyPool.end();
    console.log('[Bridge] Closed Legacy MVP database connection');
  } catch (error) {
    console.error('[Bridge] Error closing Legacy MVP database:', error);
  }
}

// ============================================================================
// Query Helpers (New Database)
// ============================================================================

/**
 * Find one record
 */
export async function findOne<T>(
  table: string,
  conditions: Record<string, any>
): Promise<T | null> {
  const keys = Object.keys(conditions);
  const values = Object.values(conditions);
  const whereClause = keys.map((key, i) => `${key} = $${i + 1}`).join(' AND ');

  const result = await query<T>(
    `SELECT * FROM ${table} WHERE ${whereClause} LIMIT 1`,
    values
  );

  return result.rows[0] || null;
}

/**
 * Find many records
 */
export async function findMany<T>(
  table: string,
  conditions?: Record<string, any>,
  options?: {
    orderBy?: string;
    limit?: number;
    offset?: number;
  }
): Promise<T[]> {
  let sql = `SELECT * FROM ${table}`;
  const values: any[] = [];

  if (conditions && Object.keys(conditions).length > 0) {
    const keys = Object.keys(conditions);
    const condValues = Object.values(conditions);
    const whereClause = keys.map((key, i) => `${key} = $${i + 1}`).join(' AND ');
    sql += ` WHERE ${whereClause}`;
    values.push(...condValues);
  }

  if (options?.orderBy) {
    sql += ` ORDER BY ${options.orderBy}`;
  }

  if (options?.limit) {
    sql += ` LIMIT ${options.limit}`;
  }

  if (options?.offset) {
    sql += ` OFFSET ${options.offset}`;
  }

  const result = await query<T>(sql, values);
  return result.rows;
}

/**
 * Insert a record
 */
export async function insert<T>(
  table: string,
  data: Record<string, any>
): Promise<T> {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

  const result = await query<T>(
    `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`,
    values
  );

  return result.rows[0];
}

/**
 * Update a record
 */
export async function update<T>(
  table: string,
  conditions: Record<string, any>,
  data: Record<string, any>
): Promise<T | null> {
  const dataKeys = Object.keys(data);
  const dataValues = Object.values(data);
  const conditionKeys = Object.keys(conditions);
  const conditionValues = Object.values(conditions);

  const setClause = dataKeys
    .map((key, i) => `${key} = $${i + 1}`)
    .join(', ');

  const whereClause = conditionKeys
    .map((key, i) => `${key} = $${i + 1 + dataKeys.length}`)
    .join(' AND ');

  const result = await query<T>(
    `UPDATE ${table} SET ${setClause}, updated_at = NOW() WHERE ${whereClause} RETURNING *`,
    [...dataValues, ...conditionValues]
  );

  return result.rows[0] || null;
}

/**
 * Delete a record
 */
export async function deleteRecord(
  table: string,
  conditions: Record<string, any>
): Promise<number> {
  const keys = Object.keys(conditions);
  const values = Object.values(conditions);
  const whereClause = keys.map((key, i) => `${key} = $${i + 1}`).join(' AND ');

  const result = await query(
    `DELETE FROM ${table} WHERE ${whereClause}`,
    values
  );

  return result.rowCount || 0;
}

/**
 * Count records
 */
export async function count(
  table: string,
  conditions?: Record<string, any>
): Promise<number> {
  let sql = `SELECT COUNT(*) as count FROM ${table}`;
  const values: any[] = [];

  if (conditions && Object.keys(conditions).length > 0) {
    const keys = Object.keys(conditions);
    const condValues = Object.values(conditions);
    const whereClause = keys.map((key, i) => `${key} = $${i + 1}`).join(' AND ');
    sql += ` WHERE ${whereClause}`;
    values.push(...condValues);
  }

  const result = await query<{ count: string }>(sql, values);
  return parseInt(result.rows[0].count);
}

// ============================================================================
// Legacy Database Query Helpers (READ-ONLY)
// ============================================================================

/**
 * Find one record from legacy database
 */
export async function legacyFindOne<T>(
  table: string,
  conditions: Record<string, any>
): Promise<T | null> {
  const keys = Object.keys(conditions);
  const values = Object.values(conditions);
  const whereClause = keys.map((key, i) => `${key} = $${i + 1}`).join(' AND ');

  const result = await legacyQuery<T>(
    `SELECT * FROM ${table} WHERE ${whereClause} LIMIT 1`,
    values
  );

  return result.rows[0] || null;
}

/**
 * Find many records from legacy database
 */
export async function legacyFindMany<T>(
  table: string,
  conditions?: Record<string, any>,
  options?: {
    orderBy?: string;
    limit?: number;
    offset?: number;
  }
): Promise<T[]> {
  let sql = `SELECT * FROM ${table}`;
  const values: any[] = [];

  if (conditions && Object.keys(conditions).length > 0) {
    const keys = Object.keys(conditions);
    const condValues = Object.values(conditions);
    const whereClause = keys.map((key, i) => `${key} = $${i + 1}`).join(' AND ');
    sql += ` WHERE ${whereClause}`;
    values.push(...condValues);
  }

  if (options?.orderBy) {
    sql += ` ORDER BY ${options.orderBy}`;
  }

  if (options?.limit) {
    sql += ` LIMIT ${options.limit}`;
  }

  if (options?.offset) {
    sql += ` OFFSET ${options.offset}`;
  }

  const result = await legacyQuery<T>(sql, values);
  return result.rows;
}
