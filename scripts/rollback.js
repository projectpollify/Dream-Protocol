#!/usr/bin/env node

/**
 * Database Rollback Script
 *
 * Drops tables created by migrations (in reverse order)
 * WARNING: This will DELETE ALL DATA!
 */

const { execSync } = require('child_process');
const readline = require('readline');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const DB_USER = process.env.DB_USER || 'dream_admin';
const DB_NAME = process.env.DB_NAME || 'dreamprotocol_dev';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || '5432';

console.log('');
console.log('═══════════════════════════════════════════════════════════');
console.log('   ⚠️  DREAM PROTOCOL - DATABASE ROLLBACK');
console.log('═══════════════════════════════════════════════════════════');
console.log(`   Database: ${DB_NAME}`);
console.log(`   Host: ${DB_HOST}:${DB_PORT}`);
console.log('═══════════════════════════════════════════════════════════');
console.log('');

// Define rollback commands for each migration (in reverse order)
const rollbackCommands = [
  {
    migration: '006_economy_schema.sql',
    sql: `
      DROP TABLE IF EXISTS token_supply CASCADE;
      DROP TABLE IF EXISTS light_score_events CASCADE;
      DROP TABLE IF EXISTS light_scores CASCADE;
      DROP TABLE IF EXISTS token_locks CASCADE;
      DROP TABLE IF EXISTS token_transactions CASCADE;
      DROP TABLE IF EXISTS token_ledger CASCADE;
    `
  },
  {
    migration: '005_user_module.sql',
    sql: `
      DROP TABLE IF EXISTS profile_avatars CASCADE;
      DROP TABLE IF EXISTS user_account_status CASCADE;
      DROP TABLE IF EXISTS user_preferences CASCADE;
      DROP TABLE IF EXISTS user_settings CASCADE;
      DROP TABLE IF EXISTS user_profiles CASCADE;
    `
  },
  {
    migration: '004_bridge_legacy.sql',
    sql: `
      DROP TABLE IF EXISTS migration_history CASCADE;
      DROP TABLE IF EXISTS migration_errors CASCADE;
      DROP TABLE IF EXISTS feature_flags CASCADE;
      DROP TABLE IF EXISTS feature_flag_usage CASCADE;
      DROP TABLE IF EXISTS feature_rollout_groups CASCADE;
      DROP TABLE IF EXISTS user_feature_overrides CASCADE;
      DROP TABLE IF EXISTS api_compatibility_layer CASCADE;
    `
  },
  {
    migration: '003_create_identity_tables.sql',
    sql: `
      DROP TABLE IF EXISTS identity_mode_history CASCADE;
      DROP TABLE IF EXISTS identity_sessions CASCADE;
      DROP TABLE IF EXISTS utxo_pools CASCADE;
      DROP TABLE IF EXISTS duality_tokens CASCADE;
      DROP TABLE IF EXISTS decentralized_identifiers CASCADE;
    `
  },
  {
    migration: '002_create_dual_wallets.sql',
    sql: `
      DROP TABLE IF EXISTS dual_wallets CASCADE;
    `
  },
  {
    migration: '001_create_users_table.sql',
    sql: `
      DROP TABLE IF EXISTS users CASCADE;
    `
  }
];

console.log('⚠️  WARNING: This will DROP ALL TABLES and DELETE ALL DATA!');
console.log('');
console.log('The following tables will be dropped (in this order):');
rollbackCommands.forEach((cmd, i) => {
  console.log(`   ${i + 1}. ${cmd.migration}`);
});
console.log('');

// Ask for confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Type "ROLLBACK" (all caps) to confirm: ', (answer) => {
  rl.close();

  if (answer !== 'ROLLBACK') {
    console.log('\n❌ Rollback cancelled');
    process.exit(0);
  }

  console.log('');
  console.log('Starting rollback...');
  console.log('');

  let successCount = 0;

  // Execute rollback commands
  for (const cmd of rollbackCommands) {
    console.log(`▶ Rolling back: ${cmd.migration}`);

    try {
      execSync(`psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -c "${cmd.sql}"`, {
        stdio: 'pipe',
        env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD }
      });
      console.log(`   ✓ ${cmd.migration} rolled back`);
      successCount++;
    } catch (error) {
      console.error(`   ✗ ${cmd.migration} rollback failed`);
      console.error('');
      console.error('Error:', error.stderr?.toString() || error.message);
      process.exit(1);
    }
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`   ✓ Rollback completed (${successCount} migrations reversed)`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('All tables have been dropped. Database is empty.');
  console.log('Run "pnpm db:migrate" to recreate the schema.');
  console.log('');
});
