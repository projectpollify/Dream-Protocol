/**
 * Database Seed
 * Module 09: Verification
 * Creates test data for development
 */

import { query, closePool } from '.';

async function seed() {
  try {
    console.log('🌱 Seeding Module 09: Verification with test data...');

    // Check if we have test users
    const userResult = await query('SELECT COUNT(*) as count FROM users LIMIT 1');
    if (userResult.rows[0].count === 0) {
      console.log('⚠️  No users found. Please seed Module 03: User first.');
      return;
    }

    // Get a test user
    const testUserResult = await query('SELECT id FROM users LIMIT 1');
    const testUserId = testUserResult.rows[0].id;

    // Insert test PoH records
    console.log('Creating test Proof of Humanity records...');
    await query(
      `INSERT INTO proof_of_humanity (
        user_id, identity_mode, level, status,
        behavioral_score, biometric_score, social_score, temporal_score, economic_score,
        methods_completed
      ) VALUES
        ($1, 'true_self', 3, 'verified', 0.85, 0.90, 0.80, 0.75, 0.70, ARRAY['email', 'phone', 'worldcoin']),
        ($1, 'shadow', 2, 'verified', 0.75, 0.00, 0.70, 0.65, 0.60, ARRAY['email', 'phone'])
      ON CONFLICT (user_id, identity_mode) DO NOTHING`,
      [testUserId]
    );

    // Insert test veracity bonds
    console.log('Creating test Veracity Bond records...');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await query(
      `INSERT INTO veracity_bonds (
        user_id, identity_mode, bond_type, target_id, target_type,
        gratium_amount, status, claim_text, confidence_level, expires_at
      ) VALUES
        ($1, 'true_self', 'claim', '00000000-0000-0000-0000-000000000001', 'post', 500, 'active', 'This is a great idea', 8, $2),
        ($1, 'shadow', 'claim', '00000000-0000-0000-0000-000000000002', 'comment', 300, 'active', 'I disagree with this', 6, $2)
      ON CONFLICT DO NOTHING`,
      [testUserId, expiresAt]
    );

    console.log('✅ Seeding completed successfully!');
    console.log('\n📊 Test Data Created:');
    console.log(`   - 2 PoH records (True Self + Shadow) for user: ${testUserId}`);
    console.log(`   - 2 Veracity Bonds (active)`);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

seed();
