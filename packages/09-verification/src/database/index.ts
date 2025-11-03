/**
 * Database Connection & Utilities
 * Module 09: Verification
 */

import { Pool, QueryResult } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      user: process.env.DB_USER || 'dream_admin',
      password: process.env.DB_PASSWORD,
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'dreamprotocol_dev',
    });
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export async function query<T = any>(text: string, params?: any[]): Promise<QueryResult<any>> {
  const client = getPool();
  return client.query(text, params);
}

export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const result = await query<T>(text, params);
  return result.rows[0] || null;
}

export async function runMigration(name: string): Promise<void> {
  const migrationsDir = path.join(__dirname, 'migrations');
  const migrationFile = path.join(migrationsDir, name);

  if (!fs.existsSync(migrationFile)) {
    throw new Error(`Migration file not found: ${name}`);
  }

  const sql = fs.readFileSync(migrationFile, 'utf-8');
  const client = getPool();

  try {
    await client.query(sql);
    console.log(`✅ Migration completed: ${name}`);
  } catch (error) {
    console.error(`❌ Migration failed: ${name}`, error);
    throw error;
  }
}

export async function runAllMigrations(): Promise<void> {
  const migrationsDir = path.join(__dirname, 'migrations');

  if (!fs.existsSync(migrationsDir)) {
    console.log('ℹ️  No migrations directory found');
    return;
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`📦 Running ${files.length} migrations...`);

  for (const file of files) {
    await runMigration(file);
  }

  console.log('✅ All migrations completed!');
}
