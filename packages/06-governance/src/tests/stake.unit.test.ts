/**
 * Module 06: Governance - Staking Service Unit Tests
 * Dream Protocol - Test Gratium Staking Mechanics
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import stakeService from '../services/stake.service';
import { getPool, closePool, query } from '../utils/database';
import {
  VoteOption,
  IdentityMode,
  StakeStatus,
  PoolStatus,
  PollStatus,
  PollType,
  ConfidenceLevel,
} from '../types';

// ============================================================================
// Test Setup
// ============================================================================

let testUserId: string;
let testPollId: string;
let testDid: string;

beforeAll(async () => {
  // Ensure database connection
  const pool = getPool();
  await pool.query('SELECT NOW()');
});

afterAll(async () => {
  await closePool();
});

beforeEach(async () => {
  // Create test user
  const userResult = await query(
    `INSERT INTO users (id, email, username)
     VALUES (gen_random_uuid(), $1, $2)
     RETURNING id`,
    [`test-${Date.now()}@example.com`, `testuser-${Date.now()}`]
  );
  testUserId = userResult.rows[0].id;
  testDid = `did:agoranet:test_${testUserId.slice(0, 8)}`;

  // Create test poll
  const pollResult = await query(
    `INSERT INTO governance_polls (
      title,
      description,
      poll_type,
      poll_start_at,
      poll_end_at,
      poll_duration_minutes,
      status,
      created_by_user_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id`,
    [
      'Test Poll for Staking',
      'Testing Gratium staking mechanics',
      PollType.GENERAL_COMMUNITY,
      new Date(),
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      10080, // 7 days in minutes
      PollStatus.ACTIVE,
      testUserId,
    ]
  );
  testPollId = pollResult.rows[0].id;
});

// ============================================================================
// Stake Creation Tests
// ============================================================================

describe('Stake Creation', () => {
  it('should create a valid stake on YES position', async () => {
    const stake = await stakeService.createStake(
      testUserId,
      IdentityMode.TRUE_SELF,
      testDid,
      {
        pollId: testPollId,
        identityMode: IdentityMode.TRUE_SELF,
        stakedPosition: VoteOption.YES,
        gratiumAmount: 100,
        reasoning: 'I believe this will pass',
      },
      50.5
    );

    expect(stake).toBeDefined();
    expect(stake.userId).toBe(testUserId);
    expect(stake.stakedPosition).toBe(VoteOption.YES);
    expect(stake.gratiumAmount).toBe(100);
    expect(stake.status).toBe(StakeStatus.ACTIVE);
    expect(stake.confidenceLevel).toBe(ConfidenceLevel.MEDIUM);
    expect(stake.lightScoreAtStakeTime).toBe(50.5);
  });

  it('should create a valid stake on NO position', async () => {
    const stake = await stakeService.createStake(
      testUserId,
      IdentityMode.SHADOW,
      testDid,
      {
        pollId: testPollId,
        identityMode: IdentityMode.SHADOW,
        stakedPosition: VoteOption.NO,
        gratiumAmount: 500,
      }
    );

    expect(stake.stakedPosition).toBe(VoteOption.NO);
    expect(stake.gratiumAmount).toBe(500);
    expect(stake.confidenceLevel).toBe(ConfidenceLevel.MEDIUM);
  });

  it('should reject stake below minimum (10 Gratium)', async () => {
    await expect(
      stakeService.createStake(testUserId, IdentityMode.TRUE_SELF, testDid, {
        pollId: testPollId,
        identityMode: IdentityMode.TRUE_SELF,
        stakedPosition: VoteOption.YES,
        gratiumAmount: 5, // Below minimum
      })
    ).rejects.toThrow('Minimum stake is 10 Gratium');
  });

  it('should reject stake on ABSTAIN position', async () => {
    await expect(
      stakeService.createStake(testUserId, IdentityMode.TRUE_SELF, testDid, {
        pollId: testPollId,
        identityMode: IdentityMode.TRUE_SELF,
        stakedPosition: VoteOption.ABSTAIN,
        gratiumAmount: 100,
      })
    ).rejects.toThrow('Cannot stake on ABSTAIN position');
  });

  it('should reject duplicate stake for same identity', async () => {
    // Create first stake
    await stakeService.createStake(testUserId, IdentityMode.TRUE_SELF, testDid, {
      pollId: testPollId,
      identityMode: IdentityMode.TRUE_SELF,
      stakedPosition: VoteOption.YES,
      gratiumAmount: 100,
    });

    // Try to create second stake with same identity
    await expect(
      stakeService.createStake(testUserId, IdentityMode.TRUE_SELF, testDid, {
        pollId: testPollId,
        identityMode: IdentityMode.TRUE_SELF,
        stakedPosition: VoteOption.NO,
        gratiumAmount: 200,
      })
    ).rejects.toThrow('You already have a true_self stake on this poll');
  });

  it('should allow separate stakes for True Self and Shadow', async () => {
    const trueSelfStake = await stakeService.createStake(
      testUserId,
      IdentityMode.TRUE_SELF,
      testDid,
      {
        pollId: testPollId,
        identityMode: IdentityMode.TRUE_SELF,
        stakedPosition: VoteOption.YES,
        gratiumAmount: 100,
      }
    );

    const shadowStake = await stakeService.createStake(
      testUserId,
      IdentityMode.SHADOW,
      `${testDid}_shadow`,
      {
        pollId: testPollId,
        identityMode: IdentityMode.SHADOW,
        stakedPosition: VoteOption.NO,
        gratiumAmount: 200,
      }
    );

    expect(trueSelfStake.stakedPosition).toBe(VoteOption.YES);
    expect(shadowStake.stakedPosition).toBe(VoteOption.NO);
  });
});

// ============================================================================
// Confidence Level Tests
// ============================================================================

describe('Confidence Level Calculation', () => {
  it('should assign LOW confidence for stakes < 100 Gratium', async () => {
    const stake = await stakeService.createStake(
      testUserId,
      IdentityMode.TRUE_SELF,
      testDid,
      {
        pollId: testPollId,
        identityMode: IdentityMode.TRUE_SELF,
        stakedPosition: VoteOption.YES,
        gratiumAmount: 50,
      }
    );

    expect(stake.confidenceLevel).toBe(ConfidenceLevel.LOW);
  });

  it('should assign MEDIUM confidence for stakes 100-999 Gratium', async () => {
    const stake = await stakeService.createStake(
      testUserId,
      IdentityMode.TRUE_SELF,
      testDid,
      {
        pollId: testPollId,
        identityMode: IdentityMode.TRUE_SELF,
        stakedPosition: VoteOption.YES,
        gratiumAmount: 500,
      }
    );

    expect(stake.confidenceLevel).toBe(ConfidenceLevel.MEDIUM);
  });

  it('should assign HIGH confidence for stakes 1000-9999 Gratium', async () => {
    const stake = await stakeService.createStake(
      testUserId,
      IdentityMode.TRUE_SELF,
      testDid,
      {
        pollId: testPollId,
        identityMode: IdentityMode.TRUE_SELF,
        stakedPosition: VoteOption.YES,
        gratiumAmount: 5000,
      }
    );

    expect(stake.confidenceLevel).toBe(ConfidenceLevel.HIGH);
  });

  it('should assign EXTREME confidence for stakes >= 10000 Gratium', async () => {
    const stake = await stakeService.createStake(
      testUserId,
      IdentityMode.TRUE_SELF,
      testDid,
      {
        pollId: testPollId,
        identityMode: IdentityMode.TRUE_SELF,
        stakedPosition: VoteOption.YES,
        gratiumAmount: 15000,
      }
    );

    expect(stake.confidenceLevel).toBe(ConfidenceLevel.EXTREME);
  });
});

// ============================================================================
// Stake Pool Tests
// ============================================================================

describe('Stake Pool Management', () => {
  it('should create stake pool when first stake is placed', async () => {
    await stakeService.createStake(testUserId, IdentityMode.TRUE_SELF, testDid, {
      pollId: testPollId,
      identityMode: IdentityMode.TRUE_SELF,
      stakedPosition: VoteOption.YES,
      gratiumAmount: 100,
    });

    const pool = await stakeService.getStakePool(testPollId);

    expect(pool).toBeDefined();
    expect(pool!.totalYesStake).toBe(100);
    expect(pool!.totalNoStake).toBe(0);
    expect(pool!.yesStakersCount).toBe(1);
    expect(pool!.poolStatus).toBe(PoolStatus.OPEN);
  });

  it('should update stake pool when additional stakes are placed', async () => {
    // First stake: 100 on YES
    await stakeService.createStake(testUserId, IdentityMode.TRUE_SELF, testDid, {
      pollId: testPollId,
      identityMode: IdentityMode.TRUE_SELF,
      stakedPosition: VoteOption.YES,
      gratiumAmount: 100,
    });

    // Create another user and stake on NO
    const user2Result = await query(
      `INSERT INTO users (id, email, username)
       VALUES (gen_random_uuid(), $1, $2)
       RETURNING id`,
      [`test2-${Date.now()}@example.com`, `testuser2-${Date.now()}`]
    );
    const user2Id = user2Result.rows[0].id;

    await stakeService.createStake(user2Id, IdentityMode.TRUE_SELF, `did:agoranet:${user2Id}`, {
      pollId: testPollId,
      identityMode: IdentityMode.TRUE_SELF,
      stakedPosition: VoteOption.NO,
      gratiumAmount: 200,
    });

    const pool = await stakeService.getStakePool(testPollId);

    expect(pool!.totalYesStake).toBe(100);
    expect(pool!.totalNoStake).toBe(200);
    expect(pool!.totalPoolSize).toBe(300);
    expect(pool!.yesStakersCount).toBe(1);
    expect(pool!.noStakersCount).toBe(1);
    expect(pool!.totalStakers).toBe(2);
  });

  it('should calculate pool metadata correctly', async () => {
    // Create multiple stakes
    await stakeService.createStake(testUserId, IdentityMode.TRUE_SELF, testDid, {
      pollId: testPollId,
      identityMode: IdentityMode.TRUE_SELF,
      stakedPosition: VoteOption.YES,
      gratiumAmount: 100,
    });

    const user2Result = await query(
      `INSERT INTO users (id, email, username)
       VALUES (gen_random_uuid(), $1, $2)
       RETURNING id`,
      [`test2-${Date.now()}@example.com`, `testuser2-${Date.now()}`]
    );
    const user2Id = user2Result.rows[0].id;

    await stakeService.createStake(user2Id, IdentityMode.TRUE_SELF, `did:agoranet:${user2Id}`, {
      pollId: testPollId,
      identityMode: IdentityMode.TRUE_SELF,
      stakedPosition: VoteOption.YES,
      gratiumAmount: 300,
    });

    const pool = await stakeService.getStakePool(testPollId);

    expect(pool!.averageYesStake).toBe(200); // (100 + 300) / 2
    expect(pool!.largestSingleStake).toBe(300);
  });
});

// ============================================================================
// Potential Reward Calculation Tests
// ============================================================================

describe('Potential Reward Calculation', () => {
  it('should calculate potential reward for first stake', async () => {
    const calculation = await stakeService.calculatePotentialReward(
      testPollId,
      VoteOption.YES,
      100
    );

    expect(calculation.currentPool.yes).toBe(0);
    expect(calculation.currentPool.no).toBe(0);
    expect(calculation.potentialReward).toBe(100); // No other stakes, gets own stake back
    expect(calculation.rewardMultiplier).toBe(1.0);
  });

  it('should calculate potential reward with existing pool', async () => {
    // Create initial stakes
    await stakeService.createStake(testUserId, IdentityMode.TRUE_SELF, testDid, {
      pollId: testPollId,
      identityMode: IdentityMode.TRUE_SELF,
      stakedPosition: VoteOption.YES,
      gratiumAmount: 100,
    });

    const user2Result = await query(
      `INSERT INTO users (id, email, username)
       VALUES (gen_random_uuid(), $1, $2)
       RETURNING id`,
      [`test2-${Date.now()}@example.com`, `testuser2-${Date.now()}`]
    );
    const user2Id = user2Result.rows[0].id;

    await stakeService.createStake(user2Id, IdentityMode.TRUE_SELF, `did:agoranet:${user2Id}`, {
      pollId: testPollId,
      identityMode: IdentityMode.TRUE_SELF,
      stakedPosition: VoteOption.NO,
      gratiumAmount: 200,
    });

    // Calculate potential reward for new 100 Gratium stake on YES
    const calculation = await stakeService.calculatePotentialReward(
      testPollId,
      VoteOption.YES,
      100
    );

    // Current pool: 100 YES, 200 NO
    expect(calculation.currentPool.yes).toBe(100);
    expect(calculation.currentPool.no).toBe(200);

    // After new stake: 200 YES, 200 NO = 400 total
    // New staker has 100/200 = 50% of YES pool
    // If YES wins, gets 50% of 400 = 200 Gratium
    expect(calculation.potentialReward).toBe(200);
    expect(calculation.rewardMultiplier).toBe(2.0); // 200/100 = 2x
  });

  it('should show higher multiplier when betting on underdog position', async () => {
    // Create lopsided pool: 1000 on YES, 100 on NO
    await stakeService.createStake(testUserId, IdentityMode.TRUE_SELF, testDid, {
      pollId: testPollId,
      identityMode: IdentityMode.TRUE_SELF,
      stakedPosition: VoteOption.YES,
      gratiumAmount: 1000,
    });

    const user2Result = await query(
      `INSERT INTO users (id, email, username)
       VALUES (gen_random_uuid(), $1, $2)
       RETURNING id`,
      [`test2-${Date.now()}@example.com`, `testuser2-${Date.now()}`]
    );
    const user2Id = user2Result.rows[0].id;

    await stakeService.createStake(user2Id, IdentityMode.TRUE_SELF, `did:agoranet:${user2Id}`, {
      pollId: testPollId,
      identityMode: IdentityMode.TRUE_SELF,
      stakedPosition: VoteOption.NO,
      gratiumAmount: 100,
    });

    // Calculate reward for betting on NO (underdog)
    const calculation = await stakeService.calculatePotentialReward(
      testPollId,
      VoteOption.NO,
      100
    );

    // After new stake: 1000 YES, 200 NO = 1200 total
    // New NO staker has 100/200 = 50% of NO pool
    // If NO wins (upset!), gets 50% of 1200 = 600 Gratium
    expect(calculation.potentialReward).toBe(600);
    expect(calculation.rewardMultiplier).toBe(6.0); // 600/100 = 6x (high risk, high reward!)
  });
});

// ============================================================================
// User Query Tests
// ============================================================================

describe('User Stake Queries', () => {
  it('should get user stakes for a poll', async () => {
    await stakeService.createStake(testUserId, IdentityMode.TRUE_SELF, testDid, {
      pollId: testPollId,
      identityMode: IdentityMode.TRUE_SELF,
      stakedPosition: VoteOption.YES,
      gratiumAmount: 100,
    });

    await stakeService.createStake(testUserId, IdentityMode.SHADOW, `${testDid}_shadow`, {
      pollId: testPollId,
      identityMode: IdentityMode.SHADOW,
      stakedPosition: VoteOption.NO,
      gratiumAmount: 200,
    });

    const stakes = await stakeService.getUserStakesForPoll(testUserId, testPollId);

    expect(stakes.trueSelf).toBeDefined();
    expect(stakes.trueSelf!.stakedPosition).toBe(VoteOption.YES);
    expect(stakes.trueSelf!.gratiumAmount).toBe(100);

    expect(stakes.shadow).toBeDefined();
    expect(stakes.shadow!.stakedPosition).toBe(VoteOption.NO);
    expect(stakes.shadow!.gratiumAmount).toBe(200);
  });

  it('should return null for identities with no stakes', async () => {
    const stakes = await stakeService.getUserStakesForPoll(testUserId, testPollId);

    expect(stakes.trueSelf).toBeUndefined();
    expect(stakes.shadow).toBeUndefined();
  });
});

// ============================================================================
// Validation Tests
// ============================================================================

describe('Stake Request Validation', () => {
  it('should validate valid stake request', () => {
    const validation = stakeService.validateStakeRequest({
      pollId: testPollId,
      identityMode: IdentityMode.TRUE_SELF,
      stakedPosition: VoteOption.YES,
      gratiumAmount: 100,
    });

    expect(validation.valid).toBe(true);
    expect(validation.error).toBeUndefined();
  });

  it('should reject stake below minimum', () => {
    const validation = stakeService.validateStakeRequest({
      pollId: testPollId,
      identityMode: IdentityMode.TRUE_SELF,
      stakedPosition: VoteOption.YES,
      gratiumAmount: 5,
    });

    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('Minimum stake is 10 Gratium');
  });

  it('should reject stake on ABSTAIN', () => {
    const validation = stakeService.validateStakeRequest({
      pollId: testPollId,
      identityMode: IdentityMode.TRUE_SELF,
      stakedPosition: VoteOption.ABSTAIN,
      gratiumAmount: 100,
    });

    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('Cannot stake on ABSTAIN');
  });

  it('should reject zero or negative stake', () => {
    const validation = stakeService.validateStakeRequest({
      pollId: testPollId,
      identityMode: IdentityMode.TRUE_SELF,
      stakedPosition: VoteOption.YES,
      gratiumAmount: 0,
    });

    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('must be positive');
  });
});
