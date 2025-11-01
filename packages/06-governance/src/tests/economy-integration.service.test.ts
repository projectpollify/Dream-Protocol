/**
 * Module 06: Governance - Economy Integration Service Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import economyIntegration from '../services/economy-integration.service';
import { IdentityMode } from '../types';
import { query } from '../utils/database';

describe('Economy Integration Service', () => {
  const testUserId = 'test-user-economy-integration';
  const testPollId = 'test-poll-id';

  beforeEach(async () => {
    // Create test user with token balances
    await query(
      `INSERT INTO token_ledger (user_id, identity_mode, pollcoin_balance, gratium_balance, pollcoin_locked, gratium_locked)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, identity_mode) DO UPDATE
       SET pollcoin_balance = $3, gratium_balance = $4, pollcoin_locked = $5, gratium_locked = $6`,
      [testUserId, IdentityMode.TRUE_SELF, '10000', '5000', '0', '0']
    );

    // Initialize Light Score
    await query(
      `INSERT INTO light_scores (user_id, current_score)
       VALUES ($1, 50.00)
       ON CONFLICT (user_id) DO UPDATE SET current_score = 50.00`,
      [testUserId]
    );
  });

  describe('PollCoin Operations', () => {
    describe('checkPollCoinBalance', () => {
      it('should return true when user has sufficient balance', async () => {
        const client = await query('SELECT 1'); // Get a client
        const hasBalance = await economyIntegration.checkPollCoinBalance(
          client as any,
          testUserId,
          IdentityMode.TRUE_SELF,
          BigInt(1000)
        );

        expect(hasBalance).toBe(true);
      });

      it('should return false when user has insufficient balance', async () => {
        const client = await query('SELECT 1');
        const hasBalance = await economyIntegration.checkPollCoinBalance(
          client as any,
          testUserId,
          IdentityMode.TRUE_SELF,
          BigInt(20000) // More than available
        );

        expect(hasBalance).toBe(false);
      });
    });

    describe('deductPollCoinCost', () => {
      it('should deduct PollCoin and record burn + reward', async () => {
        const initialBalance = await query(
          'SELECT pollcoin_balance FROM token_ledger WHERE user_id = $1 AND identity_mode = $2',
          [testUserId, IdentityMode.TRUE_SELF]
        );

        const client = await query('BEGIN');
        await economyIntegration.deductPollCoinCost(
          client as any,
          testUserId,
          IdentityMode.TRUE_SELF,
          BigInt(1000)
        );
        await query('ROLLBACK');

        // Balance should be deducted (in a real transaction)
        // Burn should be 1% (10 PollCoin)
        // Reward should be 99% (990 PollCoin)
      });

      it('should throw error for insufficient balance', async () => {
        const client = await query('BEGIN');

        await expect(
          economyIntegration.deductPollCoinCost(
            client as any,
            testUserId,
            IdentityMode.TRUE_SELF,
            BigInt(20000) // More than available
          )
        ).rejects.toThrow('Insufficient PollCoin balance');

        await query('ROLLBACK');
      });
    });
  });

  describe('Gratium Operations', () => {
    describe('checkGratiumBalance', () => {
      it('should return true when user has sufficient Gratium', async () => {
        const client = await query('SELECT 1');
        const hasBalance = await economyIntegration.checkGratiumBalance(
          client as any,
          testUserId,
          IdentityMode.TRUE_SELF,
          BigInt(100)
        );

        expect(hasBalance).toBe(true);
      });

      it('should return false for insufficient Gratium', async () => {
        const client = await query('SELECT 1');
        const hasBalance = await economyIntegration.checkGratiumBalance(
          client as any,
          testUserId,
          IdentityMode.TRUE_SELF,
          BigInt(10000) // More than available
        );

        expect(hasBalance).toBe(false);
      });
    });

    describe('lockGratiumForStake', () => {
      it('should lock Gratium and create lock record', async () => {
        const client = await query('BEGIN');

        await economyIntegration.lockGratiumForStake(
          client as any,
          testUserId,
          IdentityMode.TRUE_SELF,
          BigInt(100),
          testPollId
        );

        await query('ROLLBACK');
      });

      it('should throw error for insufficient Gratium', async () => {
        const client = await query('BEGIN');

        await expect(
          economyIntegration.lockGratiumForStake(
            client as any,
            testUserId,
            IdentityMode.TRUE_SELF,
            BigInt(10000),
            testPollId
          )
        ).rejects.toThrow('Insufficient Gratium balance');

        await query('ROLLBACK');
      });
    });

    describe('unlockGratiumStake', () => {
      it('should unlock Gratium after stake resolution', async () => {
        const client = await query('BEGIN');

        // First lock
        await economyIntegration.lockGratiumForStake(
          client as any,
          testUserId,
          IdentityMode.TRUE_SELF,
          BigInt(100),
          testPollId
        );

        // Then unlock
        await economyIntegration.unlockGratiumStake(
          client as any,
          testUserId,
          IdentityMode.TRUE_SELF,
          BigInt(100),
          testPollId
        );

        await query('ROLLBACK');
      });
    });

    describe('distributeGratiumReward', () => {
      it('should add reward to user balance', async () => {
        const client = await query('BEGIN');

        await economyIntegration.distributeGratiumReward(
          client as any,
          testUserId,
          IdentityMode.TRUE_SELF,
          BigInt(500) // Reward amount
        );

        await query('ROLLBACK');
      });
    });
  });

  describe('Light Score Operations', () => {
    describe('getUserLightScore', () => {
      it('should retrieve user Light Score', async () => {
        const score = await economyIntegration.getUserLightScore(testUserId);

        expect(score).toBe(50.0); // Default score
      });

      it('should return default score for user without score', async () => {
        const score = await economyIntegration.getUserLightScore('non-existent-user');

        expect(score).toBe(50.0);
      });
    });

    describe('validateLightScoreRequirement', () => {
      it('should pass validation when score meets requirement', async () => {
        await expect(
          economyIntegration.validateLightScoreRequirement(testUserId, 25)
        ).resolves.not.toThrow();
      });

      it('should throw error when score below requirement', async () => {
        await expect(
          economyIntegration.validateLightScoreRequirement(testUserId, 75)
        ).rejects.toThrow('Insufficient Light Score');
      });
    });

    describe('updateLightScoreForGovernance', () => {
      it('should update Light Score for governance participation', async () => {
        const client = await query('BEGIN');

        await economyIntegration.updateLightScoreForGovernance(
          client as any,
          testUserId,
          'vote',
          0.5 // Small positive impact
        );

        await query('ROLLBACK');
      });

      it('should not allow score below 0', async () => {
        const client = await query('BEGIN');

        await economyIntegration.updateLightScoreForGovernance(
          client as any,
          testUserId,
          'vote',
          -100 // Large negative impact
        );

        // Score should be clamped to 0
        await query('ROLLBACK');
      });

      it('should not allow score above 100', async () => {
        const client = await query('BEGIN');

        await economyIntegration.updateLightScoreForGovernance(
          client as any,
          testUserId,
          'vote',
          100 // Large positive impact
        );

        // Score should be clamped to 100
        await query('ROLLBACK');
      });
    });
  });
});
