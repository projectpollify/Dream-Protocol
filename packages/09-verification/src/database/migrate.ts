/**
 * Migration Runner
 * Module 09: Verification
 */

import { runAllMigrations } from '.';
import { closePool } from '.';

async function migrate() {
  try {
    console.log('🚀 Starting migrations for Module 09: Verification...');
    await runAllMigrations();
    console.log('✅ All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

migrate();
