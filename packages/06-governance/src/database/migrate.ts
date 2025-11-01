/**
 * Module 06: Governance - Database Migration Script
 *
 * Run this to create all governance tables
 * Usage: tsx src/database/migrate.ts
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load .env from project root
// Navigate up from packages/06-governance to project root
const envPath = path.resolve(process.cwd(), '../../.env');
console.log(`Loading .env from: ${envPath}`);
dotenv.config({ path: envPath });

// Verify environment variables are loaded
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD || '';
const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = parseInt(process.env.DB_PORT || '5432', 10);
const dbName = process.env.DB_NAME;

console.log(`Attempting to connect as: ${dbUser}@${dbHost}:${dbPort}/${dbName}`);

if (!dbUser || !dbName) {
  throw new Error('Missing required database environment variables: DB_USER, DB_NAME');
}

// Create pool with proper config
const pool = new Pool({
  user: dbUser,
  password: dbPassword,
  host: dbHost,
  port: dbPort,
  database: dbName,
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   MODULE 06: GOVERNANCE - DATABASE MIGRATION');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');

    // Read schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

    console.log('📄 Reading schema from:', schemaPath);
    console.log('');

    // Begin transaction
    await client.query('BEGIN');

    console.log('🔄 Executing migration...');
    console.log('');

    // Execute schema
    await client.query(schemaSql);

    // Commit transaction
    await client.query('COMMIT');

    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('📊 Tables created:');
    console.log('   1. governance_polls');
    console.log('   2. governance_votes');
    console.log('   3. governance_delegations');
    console.log('   4. parameter_whitelist');
    console.log('   5. constitutional_articles');
    console.log('   6. governance_actions');
    console.log('   7. shadow_consensus_snapshots');
    console.log('   8. governance_stakes');
    console.log('   9. governance_stake_pools');
    console.log('');
    console.log('🎯 Next step: Run seed script to populate initial data');
    console.log('   Command: tsx src/database/seed.ts');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('');
    console.error('❌ Migration failed!');
    console.error('');
    console.error('Error:', error);
    console.error('');
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Check if tables already exist
async function checkExistingTables() {
  const client = await pool.connect();

  try {
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name LIKE 'governance_%'
      ORDER BY table_name
    `);

    if (result.rows.length > 0) {
      console.log('');
      console.log('⚠️  WARNING: Governance tables already exist!');
      console.log('');
      console.log('Existing tables:');
      result.rows.forEach((row: any) => {
        console.log(`   - ${row.table_name}`);
      });
      console.log('');
      console.log('This migration will DROP and recreate all tables.');
      console.log('All data will be lost!');
      console.log('');
      console.log('To proceed, set FORCE_MIGRATION=true');
      console.log('   FORCE_MIGRATION=true tsx src/database/migrate.ts');
      console.log('');

      if (process.env.FORCE_MIGRATION !== 'true') {
        process.exit(0);
      }
    }
  } finally {
    client.release();
  }
}

// Main execution
(async () => {
  await checkExistingTables();
  await runMigration();
})();
