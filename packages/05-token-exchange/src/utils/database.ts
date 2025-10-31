/**
 * Module 05: Token Exchange - Database Utilities
 *
 * Database connection and query utilities for the Token Exchange module
 */

import { Pool, PoolClient, QueryResult } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// ============================================================================
// Database Connection Pool
// ============================================================================

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'dreamprotocol',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20, // Maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Execute a single query
 */
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;

    if (process.env.NODE_ENV === 'development') {
      console.log('Executed query', { text, duration, rows: result.rowCount });
    }

    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

/**
 * Get a client from the pool for transactions
 */
export async function getClient(): Promise<PoolClient> {
  return await pool.connect();
}

/**
 * Execute multiple queries in a transaction
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
    console.error('Transaction error:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Health check - verify database connection
 */
export async function healthCheck(): Promise<boolean> {
  try {
    await query('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

/**
 * Close all connections (for graceful shutdown)
 */
export async function closePool(): Promise<void> {
  await pool.end();
}

// ============================================================================
// Typed Query Builders
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
// Export pool for advanced usage
// ============================================================================

export { pool };
