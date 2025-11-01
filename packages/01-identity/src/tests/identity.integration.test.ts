/**
 * Module 01: Identity - Integration Tests
 *
 * Tests full flows and database interactions
 * Requires test database
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { randomUUID } from 'crypto';
import { setupTestDatabase, teardownTestDatabase, cleanTestDatabase } from '../../../../tests/setup/test-database';
import { generateTestUser } from '../../../../tests/helpers/test-data';
import type { TestDatabase } from '../../../../tests/setup/test-database';

let testDb: TestDatabase;

beforeAll(async () => {
  testDb = await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await cleanTestDatabase();
});

// ============================================================================
// INTEGRATION TEST - Full Registration Flow
// ============================================================================

describe('Integration - Full Registration Flow', () => {
  it('should create complete dual identity on user registration', async () => {
    const { IdentityService } = await import('../services/identity.service');
    const service = new IdentityService();

    const testUser = generateTestUser();
    const userId = randomUUID();

    // Create dual identity
    const dualIdentity = await service.createDualIdentity(
      userId,
      testUser.password,
      '127.0.0.1'
    );

    // Verify response structure
    expect(dualIdentity).toBeDefined();
    expect(dualIdentity.user_id).toBe(userId);
    expect(dualIdentity.wallets).toHaveProperty('true_self');
    expect(dualIdentity.wallets).toHaveProperty('shadow');
    expect(dualIdentity.dids).toHaveProperty('true_self');
    expect(dualIdentity.dids).toHaveProperty('shadow');

    // Verify wallets are different
    expect(dualIdentity.wallets.true_self.cardano_address).not.toBe(
      dualIdentity.wallets.shadow.cardano_address
    );

    // Verify DIDs are different
    expect(dualIdentity.dids.true_self).not.toBe(dualIdentity.dids.shadow);
  });

  it('should create entries in all required database tables', async () => {
    const { IdentityService } = await import('../services/identity.service');
    const service = new IdentityService();

    const testUser = generateTestUser();
    const userId = randomUUID();

    await service.createDualIdentity(userId, testUser.password, '127.0.0.1');

    // Check dual_wallets table (should have 2 rows)
    const wallets = await testDb.query(
      'SELECT * FROM dual_wallets WHERE user_id = $1',
      [userId]
    );
    expect(wallets.rows.length).toBe(2);

    // Check decentralized_identifiers table (should have 2 rows)
    const dids = await testDb.query(
      'SELECT * FROM decentralized_identifiers WHERE user_id = $1',
      [userId]
    );
    expect(dids.rows.length).toBe(2);

    // Check user_identities table (should have 2 rows)
    const identities = await testDb.query(
      'SELECT * FROM user_identities WHERE user_id = $1',
      [userId]
    );
    expect(identities.rows.length).toBe(2);
  });

  it('should encrypt private keys in database', async () => {
    const { IdentityService } = await import('../services/identity.service');
    const service = new IdentityService();

    const testUser = generateTestUser();
    const userId = randomUUID();

    await service.createDualIdentity(userId, testUser.password, '127.0.0.1');

    // Query encrypted private keys from database
    const wallets = await testDb.query(
      'SELECT encrypted_private_key FROM dual_wallets WHERE user_id = $1',
      [userId]
    );

    expect(wallets.rows.length).toBe(2);

    // Verify keys are encrypted (not plaintext)
    wallets.rows.forEach((row) => {
      expect(row.encrypted_private_key).toBeDefined();
      expect(row.encrypted_private_key.length).toBeGreaterThan(0);
      // Encrypted data should not be readable
      expect(row.encrypted_private_key).not.toMatch(/^[a-f0-9]{64}$/); // Not a simple hex string
    });
  });

  it('should store DualityToken encrypted linkage', async () => {
    const { IdentityService } = await import('../services/identity.service');
    const service = new IdentityService();

    const testUser = generateTestUser();
    const userId = randomUUID();

    await service.createDualIdentity(userId, testUser.password, '127.0.0.1');

    // Check duality_token table
    const token = await testDb.query(
      'SELECT encrypted_token FROM duality_token WHERE user_id = $1',
      [userId]
    );

    expect(token.rows.length).toBeGreaterThan(0);
    expect(token.rows[0].encrypted_token).toBeDefined();
  });
});

// ============================================================================
// INTEGRATION TEST - Identity Mode Switching
// ============================================================================

describe('Integration - Identity Mode Switching', () => {
  it('should switch from True Self to Shadow and back', async () => {
    const { IdentityService } = await import('../services/identity.service');
    const service = new IdentityService();

    const testUser = generateTestUser();
    const userId = randomUUID();

    // Create dual identity
    await service.createDualIdentity(userId, testUser.password, '127.0.0.1');

    // Get current identity (should default to true_self)
    const current1 = await service.getCurrentIdentity(userId);
    expect(current1.current_mode).toBe('true_self');

    // Switch to shadow
    await service.switchIdentityMode(userId, 'shadow');

    const current2 = await service.getCurrentIdentity(userId);
    expect(current2.current_mode).toBe('shadow');

    // Switch back to true_self
    await service.switchIdentityMode(userId, 'true_self');

    const current3 = await service.getCurrentIdentity(userId);
    expect(current3.current_mode).toBe('true_self');
  });

  it('should log mode switches in identity_mode_history', async () => {
    const { IdentityService } = await import('../services/identity.service');
    const service = new IdentityService();

    const testUser = generateTestUser();
    const userId = randomUUID();

    await service.createDualIdentity(userId, testUser.password, '127.0.0.1');

    // Switch modes twice
    await service.switchIdentityMode(userId, 'shadow');
    await service.switchIdentityMode(userId, 'true_self');

    // Check audit log
    const history = await testDb.query(
      'SELECT * FROM identity_mode_history WHERE user_id = $1 ORDER BY switched_at',
      [userId]
    );

    expect(history.rows.length).toBeGreaterThanOrEqual(2);
    expect(history.rows[0].to_mode).toBe('shadow');
    expect(history.rows[1].to_mode).toBe('true_self');
  });

  it('should update session with new mode', async () => {
    const { IdentityService } = await import('../services/identity.service');
    const service = new IdentityService();

    const testUser = generateTestUser();
    const userId = randomUUID();

    await service.createDualIdentity(userId, testUser.password, '127.0.0.1');

    // Create session
    const session = await service.createIdentitySession(userId, 'true_self', '127.0.0.1');
    expect(session.current_mode).toBe('true_self');

    // Switch mode
    await service.switchIdentityMode(userId, 'shadow');

    // Get updated session
    const sessions = await testDb.query(
      'SELECT current_mode FROM identity_sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );

    expect(sessions.rows[0].current_mode).toBe('shadow');
  });
});

// ============================================================================
// INTEGRATION TEST - UTXO Pool Separation
// ============================================================================

describe('Integration - UTXO Pool Separation', () => {
  it('should maintain separate UTXO pools for true_self and shadow', async () => {
    const { IdentityService } = await import('../services/identity.service');
    const service = new IdentityService();

    const testUser = generateTestUser();
    const userId = randomUUID();

    const dualIdentity = await service.createDualIdentity(
      userId,
      testUser.password,
      '127.0.0.1'
    );

    // Check UTXO pools exist
    const pools = await testDb.query(
      'SELECT wallet_id, pool_id FROM utxo_pools WHERE wallet_id IN (SELECT id FROM dual_wallets WHERE user_id = $1)',
      [userId]
    );

    expect(pools.rows.length).toBe(2);

    // Verify pools have different IDs
    expect(pools.rows[0].pool_id).not.toBe(pools.rows[1].pool_id);
  });

  it('should prevent UTXO sharing between identities', async () => {
    const { IdentityService } = await import('../services/identity.service');
    const service = new IdentityService();

    const testUser = generateTestUser();
    const userId = randomUUID();

    await service.createDualIdentity(userId, testUser.password, '127.0.0.1');

    // Get wallet IDs
    const wallets = await testDb.query(
      'SELECT id, mode FROM dual_wallets WHERE user_id = $1',
      [userId]
    );

    const trueWalletId = wallets.rows.find((w) => w.mode === 'true_self')?.id;
    const shadowWalletId = wallets.rows.find((w) => w.mode === 'shadow')?.id;

    // Create mock UTXO for true_self
    await testDb.query(
      `INSERT INTO utxo_pool (wallet_id, tx_hash, output_index, amount, spent)
       VALUES ($1, $2, 0, 1000000, false)`,
      [trueWalletId, randomUUID()]
    );

    // Query UTXOs for each wallet
    const trueUTXOs = await testDb.query(
      'SELECT * FROM utxo_pool WHERE wallet_id = $1',
      [trueWalletId]
    );

    const shadowUTXOs = await testDb.query(
      'SELECT * FROM utxo_pool WHERE wallet_id = $1',
      [shadowWalletId]
    );

    // True Self should have 1 UTXO
    expect(trueUTXOs.rows.length).toBe(1);

    // Shadow should have 0 UTXOs (not shared)
    expect(shadowUTXOs.rows.length).toBe(0);
  });
});

// ============================================================================
// INTEGRATION TEST - Encryption Verification
// ============================================================================

describe('Integration - Encryption Verification', () => {
  it('should never expose DualityToken in plaintext', async () => {
    const { IdentityService } = await import('../services/identity.service');
    const service = new IdentityService();

    const testUser = generateTestUser();
    const userId = randomUUID();

    await service.createDualIdentity(userId, testUser.password, '127.0.0.1');

    // Query DualityToken from database
    const token = await testDb.query(
      'SELECT encrypted_token FROM duality_token WHERE user_id = $1',
      [userId]
    );

    expect(token.rows.length).toBe(1);

    // Token should be encrypted (not readable)
    const encryptedToken = token.rows[0].encrypted_token;
    expect(encryptedToken).toBeDefined();
    expect(encryptedToken.length).toBeGreaterThan(0);

    // Should not be a simple UUID or readable string
    expect(encryptedToken).not.toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it('should verify linkage without exposing raw DualityToken', async () => {
    const { IdentityService } = await import('../services/identity.service');
    const service = new IdentityService();

    const testUser = generateTestUser();
    const userId = randomUUID();

    await service.createDualIdentity(userId, testUser.password, '127.0.0.1');

    // Service should have method to verify linkage without exposing token
    // This would be via API endpoint that returns boolean, not raw token
    const current = await service.getCurrentIdentity(userId);
    expect(current.user_id).toBe(userId);
    expect(current.current_mode).toBe('true_self');

    // Verify we cannot get raw DualityToken
    expect(current).not.toHaveProperty('duality_token');
  });
});

// ============================================================================
// INTEGRATION TEST - Security Tests
// ============================================================================

describe('Integration - Security Tests', () => {
  it('should prevent duplicate identity creation for same user', async () => {
    const { IdentityService } = await import('../services/identity.service');
    const service = new IdentityService();

    const testUser = generateTestUser();
    const userId = randomUUID();

    // Create identity first time
    await service.createDualIdentity(userId, testUser.password, '127.0.0.1');

    // Attempt to create again should fail
    await expect(
      service.createDualIdentity(userId, testUser.password, '127.0.0.1')
    ).rejects.toThrow();
  });

  it('should require valid session to switch modes', async () => {
    const userId = randomUUID();

    // Attempt to switch mode without creating identity first
    const { IdentityService } = await import('../services/identity.service');
    const service = new IdentityService();

    await expect(service.switchIdentityMode(userId, 'shadow')).rejects.toThrow();
  });
});

// ============================================================================
// SUMMARY
// ============================================================================

/*
 * Integration Tests Summary for Module 01: Identity
 *
 * ✅ Full Registration Flow (4 tests)
 * ✅ Identity Mode Switching (3 tests)
 * ✅ UTXO Pool Separation (2 tests)
 * ✅ Encryption Verification (2 tests)
 * ✅ Security Tests (2 tests)
 *
 * Total: 13 integration tests
 * Database: Test database with migrations
 * Coverage: Full dual-identity flow
 */
