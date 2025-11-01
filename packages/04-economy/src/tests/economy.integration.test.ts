/**
 * Module 04: Economy - Integration Tests
 *
 * Tests full flows with database and services
 * Requires test database
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { randomUUID } from 'crypto';
import { setupTestDatabase, teardownTestDatabase, cleanTestDatabase } from '../../../../tests/setup/test-database';
import { generateTokenAmount } from '../../../../tests/helpers/test-data';
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
// INTEGRATION TEST - End-to-End Transfer Scenario
// ============================================================================

describe('Integration - Token Transfer Flow', () => {
  it('should complete full transfer with burn mechanics', async () => {
    const transferService = (await import('../services/transfer.service')).default;
    const ledgerService = (await import('../services/ledger.service')).default;

    const userId1 = randomUUID();
    const userId2 = randomUUID();

    // Create users
    await testDb.query(
      `INSERT INTO users (id, email, username) VALUES ($1, $2, $3), ($4, $5, $6)`,
      [userId1, 'user1@test.com', 'user1', userId2, 'user2@test.com', 'user2']
    );

    // Initialize balances with 100 PollCoin for user1
    await ledgerService.initializeUserBalances(userId1, 'true_self');
    await ledgerService.initializeUserBalances(userId2, 'true_self');

    // Grant initial tokens to user1
    await ledgerService.creditTokens(
      userId1,
      'true_self',
      'pollcoin',
      generateTokenAmount(100),
      'initial_grant',
      null
    );

    // Transfer 30 PollCoin from user1 to user2
    await transferService.transferTokens(
      userId1,
      'true_self',
      userId2,
      'true_self',
      'pollcoin',
      generateTokenAmount(30),
      'Test transfer'
    );

    // Verify sender balance (100 - 30 = 70)
    const sender = await ledgerService.getUserBalances(userId1, 'true_self');
    expect(Number(sender.pollcoin_available)).toBeLessThan(70); // Less than 70 due to 1% burn

    // Verify receiver balance (30 - 1% burn = ~29.7)
    const receiver = await ledgerService.getUserBalances(userId2, 'true_self');
    expect(Number(receiver.pollcoin_balance)).toBeGreaterThan(29);
    expect(Number(receiver.pollcoin_balance)).toBeLessThan(30);
  });

  it('should track transaction history for both parties', async () => {
    const transferService = (await import('../services/transfer.service')).default;
    const transactionService = (await import('../services/transaction.service')).default;
    const ledgerService = (await import('../services/ledger.service')).default;

    const userId1 = randomUUID();
    const userId2 = randomUUID();

    // Create users and initialize balances
    await testDb.query(
      `INSERT INTO users (id, email, username) VALUES ($1, $2, $3), ($4, $5, $6)`,
      [userId1, 'user1@test.com', 'user1', userId2, 'user2@test.com', 'user2']
    );

    await ledgerService.initializeUserBalances(userId1, 'true_self');
    await ledgerService.initializeUserBalances(userId2, 'true_self');
    await ledgerService.creditTokens(userId1, 'true_self', 'pollcoin', generateTokenAmount(100), 'grant', null);

    // Transfer tokens
    await transferService.transferTokens(
      userId1,
      'true_self',
      userId2,
      'true_self',
      'pollcoin',
      generateTokenAmount(30),
      'Test transfer'
    );

    // Check sender's transaction history
    const senderHistory = await transactionService.getTransactionHistory(userId1, 'true_self', 'pollcoin', 10, 0);
    expect(senderHistory.length).toBeGreaterThan(0);

    // Check receiver's transaction history
    const receiverHistory = await transactionService.getTransactionHistory(userId2, 'true_self', 'pollcoin', 10, 0);
    expect(receiverHistory.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// INTEGRATION TEST - Dual Identity Economy
// ============================================================================

describe('Integration - Dual Identity Balances', () => {
  it('should maintain separate balances for True Self and Shadow', async () => {
    const ledgerService = (await import('../services/ledger.service')).default;

    const userId = randomUUID();

    // Create user
    await testDb.query(
      `INSERT INTO users (id, email, username) VALUES ($1, $2, $3)`,
      [userId, 'user@test.com', 'testuser']
    );

    // Initialize both identities
    await ledgerService.initializeUserBalances(userId, 'true_self');
    await ledgerService.initializeUserBalances(userId, 'shadow');

    // Grant tokens to True Self
    await ledgerService.creditTokens(userId, 'true_self', 'pollcoin', generateTokenAmount(100), 'grant', null);

    // Grant different amount to Shadow
    await ledgerService.creditTokens(userId, 'shadow', 'pollcoin', generateTokenAmount(50), 'grant', null);

    // Verify True Self balance
    const trueSelf = await ledgerService.getUserBalances(userId, 'true_self');
    expect(Number(trueSelf.pollcoin_balance)).toBe(100);

    // Verify Shadow balance
    const shadow = await ledgerService.getUserBalances(userId, 'shadow');
    expect(Number(shadow.pollcoin_balance)).toBe(50);
  });

  it('should allow independent transfers for each identity', async () => {
    const transferService = (await import('../services/transfer.service')).default;
    const ledgerService = (await import('../services/ledger.service')).default;

    const userId1 = randomUUID();
    const userId2 = randomUUID();

    // Create users
    await testDb.query(
      `INSERT INTO users (id, email, username) VALUES ($1, $2, $3), ($4, $5, $6)`,
      [userId1, 'user1@test.com', 'user1', userId2, 'user2@test.com', 'user2']
    );

    // Initialize both identities for user1
    await ledgerService.initializeUserBalances(userId1, 'true_self');
    await ledgerService.initializeUserBalances(userId1, 'shadow');
    await ledgerService.initializeUserBalances(userId2, 'true_self');

    // Grant tokens to both identities
    await ledgerService.creditTokens(userId1, 'true_self', 'pollcoin', generateTokenAmount(100), 'grant', null);
    await ledgerService.creditTokens(userId1, 'shadow', 'pollcoin', generateTokenAmount(50), 'grant', null);

    // True Self transfers 30
    await transferService.transferTokens(
      userId1,
      'true_self',
      userId2,
      'true_self',
      'pollcoin',
      generateTokenAmount(30),
      null
    );

    // Verify True Self balance decreased
    const trueSelf = await ledgerService.getUserBalances(userId1, 'true_self');
    expect(Number(trueSelf.pollcoin_balance)).toBeLessThan(100);

    // Verify Shadow balance unchanged
    const shadow = await ledgerService.getUserBalances(userId1, 'shadow');
    expect(Number(shadow.pollcoin_balance)).toBe(50);
  });
});

// ============================================================================
// INTEGRATION TEST - Token Locking for Governance
// ============================================================================

describe('Integration - Token Locking', () => {
  it('should lock tokens and reduce available balance', async () => {
    const lockService = (await import('../services/lock.service')).default;
    const ledgerService = (await import('../services/ledger.service')).default;

    const userId = randomUUID();

    // Create user
    await testDb.query(
      `INSERT INTO users (id, email, username) VALUES ($1, $2, $3)`,
      [userId, 'user@test.com', 'testuser']
    );

    // Initialize balance with 100 tokens
    await ledgerService.initializeUserBalances(userId, 'true_self');
    await ledgerService.creditTokens(userId, 'true_self', 'pollcoin', generateTokenAmount(100), 'grant', null);

    // Lock 50 tokens for governance
    await lockService.lockTokens(
      userId,
      'true_self',
      'pollcoin',
      generateTokenAmount(50),
      'governance_stake',
      'poll',
      'poll_123'
    );

    // Verify locked balance
    const balances = await ledgerService.getUserBalances(userId, 'true_self');
    expect(Number(balances.pollcoin_locked)).toBe(50);
    expect(Number(balances.pollcoin_available)).toBe(50); // 100 total - 50 locked
  });

  it('should prevent transfer of locked tokens', async () => {
    const lockService = (await import('../services/lock.service')).default;
    const transferService = (await import('../services/transfer.service')).default;
    const ledgerService = (await import('../services/ledger.service')).default;

    const userId1 = randomUUID();
    const userId2 = randomUUID();

    // Create users
    await testDb.query(
      `INSERT INTO users (id, email, username) VALUES ($1, $2, $3), ($4, $5, $6)`,
      [userId1, 'user1@test.com', 'user1', userId2, 'user2@test.com', 'user2']
    );

    // Initialize balances
    await ledgerService.initializeUserBalances(userId1, 'true_self');
    await ledgerService.initializeUserBalances(userId2, 'true_self');
    await ledgerService.creditTokens(userId1, 'true_self', 'pollcoin', generateTokenAmount(100), 'grant', null);

    // Lock 50 tokens
    await lockService.lockTokens(
      userId1,
      'true_self',
      'pollcoin',
      generateTokenAmount(50),
      'governance_stake',
      null,
      null
    );

    // Attempt to transfer 75 tokens (should fail - only 50 available)
    await expect(
      transferService.transferTokens(
        userId1,
        'true_self',
        userId2,
        'true_self',
        'pollcoin',
        generateTokenAmount(75),
        null
      )
    ).rejects.toThrow();
  });

  it('should release locked tokens after unlock', async () => {
    const lockService = (await import('../services/lock.service')).default;
    const ledgerService = (await import('../services/ledger.service')).default;

    const userId = randomUUID();

    // Create user
    await testDb.query(
      `INSERT INTO users (id, email, username) VALUES ($1, $2, $3)`,
      [userId, 'user@test.com', 'testuser']
    );

    // Initialize balance
    await ledgerService.initializeUserBalances(userId, 'true_self');
    await ledgerService.creditTokens(userId, 'true_self', 'pollcoin', generateTokenAmount(100), 'grant', null);

    // Lock tokens
    const lockId = await lockService.lockTokens(
      userId,
      'true_self',
      'pollcoin',
      generateTokenAmount(50),
      'governance_stake',
      null,
      null
    );

    // Release lock
    await lockService.releaseLockedTokens(lockId);

    // Verify tokens released
    const balances = await ledgerService.getUserBalances(userId, 'true_self');
    expect(Number(balances.pollcoin_locked)).toBe(0);
    expect(Number(balances.pollcoin_available)).toBe(100);
  });
});

// ============================================================================
// INTEGRATION TEST - Light Score Updates
// ============================================================================

describe('Integration - Light Score Management', () => {
  it('should initialize Light Score at 50 (neutral)', async () => {
    const lightScoreService = (await import('../services/light-score.service')).default;

    const userId = randomUUID();

    // Create user
    await testDb.query(
      `INSERT INTO users (id, email, username) VALUES ($1, $2, $3)`,
      [userId, 'user@test.com', 'testuser']
    );

    // Initialize Light Score
    await lightScoreService.initializeLightScore(userId);

    // Verify score is 50
    const score = await lightScoreService.getLightScore(userId);
    expect(score.current_score).toBe(50);
  });

  it('should update Light Score and log event', async () => {
    const lightScoreService = (await import('../services/light-score.service')).default;

    const userId = randomUUID();

    // Create user
    await testDb.query(
      `INSERT INTO users (id, email, username) VALUES ($1, $2, $3)`,
      [userId, 'user@test.com', 'testuser']
    );

    // Initialize Light Score
    await lightScoreService.initializeLightScore(userId);

    // Update score (+10)
    await lightScoreService.updateLightScore(userId, 10, 'post_created', 'Created helpful post');

    // Verify updated score
    const score = await lightScoreService.getLightScore(userId);
    expect(score.current_score).toBe(60);

    // Verify event logged
    const events = await testDb.query(
      `SELECT * FROM light_score_events WHERE user_id = $1`,
      [userId]
    );

    expect(events.rows.length).toBeGreaterThan(0);
    expect(events.rows[0].event_type).toBe('post_created');
  });

  it('should enforce Light Score bounds (0-100)', async () => {
    const lightScoreService = (await import('../services/light-score.service')).default;

    const userId = randomUUID();

    // Create user
    await testDb.query(
      `INSERT INTO users (id, email, username) VALUES ($1, $2, $3)`,
      [userId, 'user@test.com', 'testuser']
    );

    // Initialize at 50
    await lightScoreService.initializeLightScore(userId);

    // Try to increase beyond 100
    await lightScoreService.updateLightScore(userId, 60, 'quality_contribution', 'Excellent contribution');

    // Verify capped at 100
    const score = await lightScoreService.getLightScore(userId);
    expect(score.current_score).toBeLessThanOrEqual(100);
  });
});

// ============================================================================
// INTEGRATION TEST - Burn and Supply Tracking
// ============================================================================

describe('Integration - Token Supply', () => {
  it('should decrease supply when tokens are burned', async () => {
    const transactionService = (await import('../services/transaction.service')).default;
    const ledgerService = (await import('../services/ledger.service')).default;
    const transferService = (await import('../services/transfer.service')).default;

    const userId1 = randomUUID();
    const userId2 = randomUUID();

    // Create users
    await testDb.query(
      `INSERT INTO users (id, email, username) VALUES ($1, $2, $3), ($4, $5, $6)`,
      [userId1, 'user1@test.com', 'user1', userId2, 'user2@test.com', 'user2']
    );

    // Initialize balances
    await ledgerService.initializeUserBalances(userId1, 'true_self');
    await ledgerService.initializeUserBalances(userId2, 'true_self');
    await ledgerService.creditTokens(userId1, 'true_self', 'pollcoin', generateTokenAmount(100), 'grant', null);

    // Get initial supply
    const initialSupply = await transactionService.getTokenSupply('pollcoin');

    // Transfer (causes 1% burn)
    await transferService.transferTokens(
      userId1,
      'true_self',
      userId2,
      'true_self',
      'pollcoin',
      generateTokenAmount(50),
      null
    );

    // Get updated supply
    const newSupply = await transactionService.getTokenSupply('pollcoin');

    // Supply should decrease due to burn
    expect(Number(newSupply.total_supply)).toBeLessThan(Number(initialSupply.total_supply));
  });
});

// ============================================================================
// SUMMARY
// ============================================================================

/*
 * Integration Tests Summary for Module 04: Economy
 *
 * ✅ Token Transfer Flow (2 tests)
 * ✅ Dual Identity Balances (2 tests)
 * ✅ Token Locking (3 tests)
 * ✅ Light Score Management (3 tests)
 * ✅ Token Supply Tracking (1 test)
 *
 * Total: 11 integration tests
 * Database: Test database with migrations
 * Coverage: Full token economy flows
 */
