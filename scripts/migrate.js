#!/usr/bin/env node

/**
 * Database Migration Runner
 *
 * Runs all SQL migrations in order (001, 002, 003, etc.)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const MIGRATIONS_DIR = path.join(__dirname, '../database/migrations');
const DB_USER = process.env.DB_USER || 'dream_admin';
const DB_NAME = process.env.DB_NAME || 'dreamprotocol_dev';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || '5432';

console.log('');
console.log('═══════════════════════════════════════════════════════════');
console.log('   🗄️  DREAM PROTOCOL - DATABASE MIGRATION');
console.log('═══════════════════════════════════════════════════════════');
console.log(`   Database: ${DB_NAME}`);
console.log(`   Host: ${DB_HOST}:${DB_PORT}`);
console.log(`   User: ${DB_USER}`);
console.log('═══════════════════════════════════════════════════════════');
console.log('');

// Get all migration files in order
const files = fs.readdirSync(MIGRATIONS_DIR)
  .filter(f => f.endsWith('.sql'))
  .sort();

if (files.length === 0) {
  console.log('❌ No migration files found in', MIGRATIONS_DIR);
  process.exit(1);
}

console.log('📋 Found', files.length, 'migration files:');
files.forEach((file, i) => {
  console.log(`   ${i + 1}. ${file}`);
});
console.log('');

// Run each migration
let successCount = 0;
let failedFile = null;

for (const file of files) {
  const filePath = path.join(MIGRATIONS_DIR, file);
  console.log(`▶ Running: ${file}`);

  try {
    execSync(`psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -f "${filePath}"`, {
      stdio: 'pipe',
      env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD }
    });
    console.log(`   ✓ ${file} completed successfully`);
    successCount++;
  } catch (error) {
    console.error(`   ✗ ${file} FAILED`);
    console.error('');
    console.error('Error output:');
    console.error(error.stderr?.toString() || error.message);
    failedFile = file;
    break;
  }
}

console.log('');
console.log('═══════════════════════════════════════════════════════════');

if (failedFile) {
  console.log(`   ❌ Migration failed at: ${failedFile}`);
  console.log(`   ✓ ${successCount}/${files.length} migrations completed`);
  console.log('═══════════════════════════════════════════════════════════');
  process.exit(1);
} else {
  console.log(`   ✓ All ${successCount} migrations completed successfully!`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('Database schema is ready. You can now start the application.');
  console.log('');
}
