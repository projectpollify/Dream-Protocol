/**
 * Module 03: User - Database Utility
 *
 * PostgreSQL connection pool and query helper functions
 */

import { Pool, PoolClient, QueryResult } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// ============================================================================
// DATABASE CONNECTION POOL
// ============================================================================

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'dream_protocol',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Timeout for acquiring a connection
});

// Error handling for pool
pool.on('error', (err: Error) => {
  console.error('Unexpected error on idle database client', err);
  process.exit(-1);
});

// ============================================================================
// QUERY HELPERS
// ============================================================================

/**
 * Execute a single query
 */
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<any>> {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;

    // Log slow queries (> 100ms)
    if (duration > 100) {
      console.warn('Slow query detected:', { text, duration, rows: result.rowCount });
    }

    return result;
  } catch (error) {
    console.error('Database query error:', { text, error });
    throw error;
  }
}

/**
 * Get a client from the pool for transactions
 */
export async function getClient(): Promise<PoolClient> {
  return pool.connect();
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
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Close all connections in the pool
 */
export async function closePool(): Promise<void> {
  await pool.end();
}

// ============================================================================
// QUERY BUILDER HELPERS
// ============================================================================

/**
 * Build a WHERE clause from filters
 */
export function buildWhereClause(
  filters: Record<string, any>,
  startIndex: number = 1
): { clause: string; values: any[] } {
  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = startIndex;

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null) {
      conditions.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  const clause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { clause, values };
}

/**
 * Build an UPDATE SET clause
 */
export function buildSetClause(
  updates: Record<string, any>,
  startIndex: number = 1
): { clause: string; values: any[] } {
  const setClauses: string[] = [];
  const values: any[] = [];
  let paramIndex = startIndex;

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      setClauses.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  const clause = setClauses.join(', ');
  return { clause, values };
}

/**
 * Build an INSERT clause with column names and placeholders
 */
export function buildInsertClause(data: Record<string, any>): {
  columns: string;
  placeholders: string;
  values: any[];
} {
  const columns: string[] = [];
  const placeholders: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      columns.push(key);
      placeholders.push(`$${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  return {
    columns: columns.join(', '),
    placeholders: placeholders.join(', '),
    values,
  };
}

// ============================================================================
// COMMON QUERIES
// ============================================================================

/**
 * Check if a record exists
 */
export async function exists(
  table: string,
  filters: Record<string, any>
): Promise<boolean> {
  const { clause, values } = buildWhereClause(filters);
  const result = await query<{ exists: boolean }>(
    `SELECT EXISTS(SELECT 1 FROM ${table} ${clause})`,
    values
  );
  return result.rows[0].exists;
}

/**
 * Find a single record
 */
export async function findOne<T>(
  table: string,
  filters: Record<string, any>
): Promise<T | null> {
  const { clause, values } = buildWhereClause(filters);
  const result = await query<T>(`SELECT * FROM ${table} ${clause} LIMIT 1`, values);
  return result.rows[0] || null;
}

/**
 * Find multiple records
 */
export async function findMany<T>(
  table: string,
  filters: Record<string, any> = {},
  options: { limit?: number; offset?: number; orderBy?: string } = {}
): Promise<T[]> {
  const { clause, values } = buildWhereClause(filters);
  let queryText = `SELECT * FROM ${table} ${clause}`;

  if (options.orderBy) {
    queryText += ` ORDER BY ${options.orderBy}`;
  }

  if (options.limit) {
    queryText += ` LIMIT ${options.limit}`;
  }

  if (options.offset) {
    queryText += ` OFFSET ${options.offset}`;
  }

  const result = await query<T>(queryText, values);
  return result.rows;
}

/**
 * Insert a record
 */
export async function insertOne<T>(
  table: string,
  data: Record<string, any>
): Promise<T> {
  const { columns, placeholders, values } = buildInsertClause(data);
  const result = await query<T>(
    `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING *`,
    values
  );
  return result.rows[0];
}

/**
 * Update a record
 */
export async function updateOne<T>(
  table: string,
  filters: Record<string, any>,
  updates: Record<string, any>
): Promise<T | null> {
  const { clause: setClause, values: setValues } = buildSetClause(updates);
  const { clause: whereClause, values: whereValues } = buildWhereClause(
    filters,
    setValues.length + 1
  );

  const result = await query<T>(
    `UPDATE ${table} SET ${setClause} ${whereClause} RETURNING *`,
    [...setValues, ...whereValues]
  );

  return result.rows[0] || null;
}

/**
 * Delete a record
 */
export async function deleteOne(
  table: string,
  filters: Record<string, any>
): Promise<boolean> {
  const { clause, values } = buildWhereClause(filters);
  const result = await query(`DELETE FROM ${table} ${clause}`, values);
  return (result.rowCount || 0) > 0;
}

/**
 * Count records
 */
export async function count(
  table: string,
  filters: Record<string, any> = {}
): Promise<number> {
  const { clause, values } = buildWhereClause(filters);
  const result = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM ${table} ${clause}`,
    values
  );
  return parseInt(result.rows[0].count);
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * Test database connection
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

// Export the pool for advanced use cases
export { pool };
