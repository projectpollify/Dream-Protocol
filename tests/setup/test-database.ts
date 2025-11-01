/**
 * Test Database Setup Utility
 *
 * Creates a separate test database for integration tests
 * Runs migrations and provides cleanup utilities
 */

import { Pool, PoolClient } from 'pg';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const TEST_DB_NAME = 'dreamprotocol_test';

export class TestDatabase {
  private pool: Pool | null = null;
  private originalDbName: string;

  constructor() {
    this.originalDbName = process.env.DB_NAME || 'dreamprotocol_dev';
  }

  /**
   * Create test database and run migrations
   */
  async setup(): Promise<void> {
    console.log('🔧 Setting up test database...');

    // Connect to default postgres database to create test db
    const adminPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: 'postgres',
      user: process.env.DB_USER || 'dream_admin',
      password: process.env.DB_PASSWORD,
    });

    try {
      // Drop test database if exists
      await adminPool.query(`DROP DATABASE IF EXISTS ${TEST_DB_NAME}`);
      console.log(`✓ Dropped existing test database: ${TEST_DB_NAME}`);

      // Create test database
      await adminPool.query(`CREATE DATABASE ${TEST_DB_NAME}`);
      console.log(`✓ Created test database: ${TEST_DB_NAME}`);
    } catch (error) {
      console.error('Error creating test database:', error);
      throw error;
    } finally {
      await adminPool.end();
    }

    // Connect to test database
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: TEST_DB_NAME,
      user: process.env.DB_USER || 'dream_admin',
      password: process.env.DB_PASSWORD,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Run migrations
    await this.runMigrations();

    console.log('✅ Test database ready');
  }

  /**
   * Run all migrations on test database
   */
  private async runMigrations(): Promise<void> {
    const migrationsDir = path.join(__dirname, '../../database/migrations');

    if (!fs.existsSync(migrationsDir)) {
      console.warn('⚠️  No migrations directory found');
      return;
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    console.log(`📦 Running ${files.length} migrations...`);

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      try {
        await this.pool!.query(sql);
        console.log(`  ✓ ${file}`);
      } catch (error) {
        console.error(`  ✗ ${file} failed:`, error);
        throw error;
      }
    }

    console.log('✓ All migrations completed');
  }

  /**
   * Clean all data from tables (for test isolation)
   */
  async cleanAll(): Promise<void> {
    if (!this.pool) {
      throw new Error('Test database not initialized');
    }

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Get all tables
      const result = await client.query(`
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename NOT LIKE 'pg_%'
      `);

      // Truncate all tables
      for (const row of result.rows) {
        await client.query(`TRUNCATE TABLE ${row.tablename} CASCADE`);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error cleaning database:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get a database client for running queries
   */
  async getClient(): Promise<PoolClient> {
    if (!this.pool) {
      throw new Error('Test database not initialized');
    }
    return await this.pool.connect();
  }

  /**
   * Run a query on the test database
   */
  async query(text: string, params?: any[]): Promise<any> {
    if (!this.pool) {
      throw new Error('Test database not initialized');
    }
    return await this.pool.query(text, params);
  }

  /**
   * Tear down test database
   */
  async teardown(): Promise<void> {
    console.log('🧹 Tearing down test database...');

    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }

    // Connect to default postgres database to drop test db
    const adminPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: 'postgres',
      user: process.env.DB_USER || 'dream_admin',
      password: process.env.DB_PASSWORD,
    });

    try {
      // Drop test database
      await adminPool.query(`DROP DATABASE IF EXISTS ${TEST_DB_NAME}`);
      console.log(`✓ Dropped test database: ${TEST_DB_NAME}`);
    } catch (error) {
      console.error('Error dropping test database:', error);
    } finally {
      await adminPool.end();
    }

    console.log('✅ Test database cleaned up');
  }

  /**
   * Get pool instance (for direct access if needed)
   */
  getPool(): Pool {
    if (!this.pool) {
      throw new Error('Test database not initialized');
    }
    return this.pool;
  }
}

// Singleton instance
let testDb: TestDatabase | null = null;

/**
 * Get or create test database instance
 */
export function getTestDatabase(): TestDatabase {
  if (!testDb) {
    testDb = new TestDatabase();
  }
  return testDb;
}

/**
 * Setup test database before all tests
 */
export async function setupTestDatabase(): Promise<TestDatabase> {
  const db = getTestDatabase();
  await db.setup();
  return db;
}

/**
 * Teardown test database after all tests
 */
export async function teardownTestDatabase(): Promise<void> {
  if (testDb) {
    await testDb.teardown();
    testDb = null;
  }
}

/**
 * Clean test database between tests
 */
export async function cleanTestDatabase(): Promise<void> {
  const db = getTestDatabase();
  await db.cleanAll();
}
