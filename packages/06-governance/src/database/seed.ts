/**
 * Module 06: Governance - Database Seed Script
 *
 * Seeds initial data:
 * - 9 voteable parameters
 * - 6 constitutional articles
 *
 * Usage: tsx src/database/seed.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import parameterService from '../services/parameter.service';
import constitutionalService from '../services/constitutional.service';

// Load .env from project root
// Navigate up from packages/06-governance to project root
const envPath = path.resolve(process.cwd(), '../../.env');
console.log(`Loading .env from: ${envPath}`);
dotenv.config({ path: envPath });

async function seedDatabase() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   MODULE 06: GOVERNANCE - DATABASE SEEDING');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  try {
    // Seed parameters
    console.log('📊 Seeding Parameter Whitelist...');
    console.log('');
    await parameterService.seedInitialParameters();
    console.log('');
    console.log('✅ Seeded 9 parameters:');
    console.log('');
    console.log('   Economic Accessibility (4):');
    console.log('   - poll_creation_cost_general (500 PollCoin)');
    console.log('   - poll_creation_cost_parameter (1000 PollCoin)');
    console.log('   - minimum_gratium_stake (10 Gratium)');
    console.log('   - gratium_stake_reward_multiplier (1.5x)');
    console.log('');
    console.log('   Feature Access (2):');
    console.log('   - minimum_light_score_to_vote (10.0)');
    console.log('   - minimum_poh_score_for_delegation (70.0)');
    console.log('');
    console.log('   System Parameters (3):');
    console.log('   - poll_minimum_vote_quorum (1000 votes)');
    console.log('   - poll_approval_percentage (50%)');
    console.log('   - poll_default_duration_days (7 days)');
    console.log('');

    // Seed constitutional articles
    console.log('📜 Seeding Constitutional Articles...');
    console.log('');
    await constitutionalService.seedConstitutionalArticles();
    console.log('');
    console.log('✅ Seeded 6 constitutional articles:');
    console.log('');
    console.log('   1. Dual-Identity Architecture');
    console.log('      → Cannot disable shadow voting system');
    console.log('');
    console.log('   2. Privacy Guarantees');
    console.log('      → Cannot force identity revelation');
    console.log('');
    console.log('   3. Proof of Humanity Requirement');
    console.log('      → Cannot disable PoH verification');
    console.log('');
    console.log('   4. Arweave Permanence');
    console.log('      → Cannot disable permanent storage');
    console.log('');
    console.log('   5. Spot-Only Token Strategy');
    console.log('      → Cannot enable shorts/leverage');
    console.log('');
    console.log('   6. Emergency Rollback Protocol');
    console.log('      → Cannot disable rollback system');
    console.log('');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('🎉 Database seeding completed successfully!');
    console.log('');
    console.log('📊 Summary:');
    console.log('   - 9 voteable parameters added');
    console.log('   - 6 constitutional articles added');
    console.log('');
    console.log('🚀 Governance module is ready to use!');
    console.log('');
    console.log('Next steps:');
    console.log('   1. Start the governance API server');
    console.log('   2. Create your first poll');
    console.log('   3. Test dual-mode voting');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');

    process.exit(0);

  } catch (error) {
    console.error('');
    console.error('❌ Seeding failed!');
    console.error('');
    console.error('Error:', error);
    console.error('');
    process.exit(1);
  }
}

// Main execution
seedDatabase();
