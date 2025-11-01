/**
 * Module 06: Governance - Staking Integration Tests
 * Dream Protocol - Complete Staking Flow with Reward Distribution
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
} from '../types';

// ============================================================================
// Test Setup
// ============================================================================

let testUsers: Array<{ id: string; did: string }> = [];
let testPollId: string;

beforeAll(async () => {
  const pool = getPool();
  await pool.query('SELECT NOW()');
});

afterAll(async () => {
  await closePool();
});

beforeEach(async () => {
  testUsers = [];

  // Create 5 test users
  for (let i = 0; i < 5; i++) {
    const userResult = await query(
      `INSERT INTO users (id, email, username)
       VALUES (gen_random_uuid(), $1, $2)
       RETURNING id`,
      [`test${i}-${Date.now()}@example.com`, `testuser${i}-${Date.now()}`]
    );
    const userId = userResult.rows[0].id;
    testUsers.push({
      id: userId,
      did: `did:agoranet:test_${userId.slice(0, 8)}`,
    });
  }

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
      'Integration Test Poll',
      'Testing complete staking flow',
      PollType.GENERAL_COMMUNITY,
      new Date(),
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      10080,
      PollStatus.ACTIVE,
      testUsers[0].id,
    ]
  );
  testPollId = pollResult.rows[0].id;
});

// ============================================================================
// Complete Staking Flow
// ============================================================================

describe('Complete Staking Flow', () => {
  it('should handle full stake → poll close → reward distribution flow', async () => {
    // Step 1: Multiple users stake on different positions
    // User 0: 1000 on YES
    const stake1 = await stakeService.createStake(
      testUsers[0].id,
      IdentityMode.TRUE_SELF,
      testUsers[0].did,
      {
        pollId: testPollId,
        identityMode: IdentityMode.TRUE_SELF,
        stakedPosition: VoteOption.YES,
        gratiumAmount: 1000,
      }
    );

    // User 1: 500 on YES
    const stake2 = await stakeService.createStake(
      testUsers[1].id,
      IdentityMode.TRUE_SELF,
      testUsers[1].did,
      {
        pollId: testPollId,
        identityMode: IdentityMode.TRUE_SELF,
        stakedPosition: VoteOption.YES,
        gratiumAmount: 500,
      }
    );

    // User 2: 800 on NO
    const stake3 = await stakeService.createStake(
      testUsers[2].id,
      IdentityMode.TRUE_SELF,
      testUsers[2].did,
      {
        pollId: testPollId,
        identityMode: IdentityMode.TRUE_SELF,
        stakedPosition: VoteOption.NO,
        gratiumAmount: 800,
      }
    );

    // User 3: 200 on NO
    const stake4 = await stakeService.createStake(
      testUsers[3].id,
      IdentityMode.TRUE_SELF,
      testUsers[3].did,
      {
        pollId: testPollId,
        identityMode: IdentityMode.TRUE_SELF,
        stakedPosition: VoteOption.NO,
        gratiumAmount: 200,
      }
    );

    // Step 2: Verify pool state before distribution
    const poolBefore = await stakeService.getStakePool(testPollId);
    expect(poolBefore!.totalYesStake).toBe(1500); // 1000 + 500
    expect(poolBefore!.totalNoStake).toBe(1000); // 800 + 200
    expect(poolBefore!.totalPoolSize).toBe(2500);
    expect(poolBefore!.yesStakersCount).toBe(2);
    expect(poolBefore!.noStakersCount).toBe(2);
    expect(poolBefore!.poolStatus).toBe(PoolStatus.OPEN);

    // Step 3: Simulate poll closing with YES winning
    await stakeService.distributeStakeRewards(testPollId, VoteOption.YES);

    // Step 4: Verify pool state after distribution
    const poolAfter = await stakeService.getStakePool(testPollId);
    expect(poolAfter!.poolStatus).toBe(PoolStatus.DISTRIBUTED);
    expect(poolAfter!.winningPosition).toBe(VoteOption.YES);
    expect(poolAfter!.totalRewardsDistributed).toBeGreaterThan(0);

    // Step 5: Verify winner rewards
    // Total pool: 2500
    // YES pool: 1500 (winners)
    // User 0 has 1000/1500 = 66.67% of YES pool → gets 66.67% of 2500 = 1666.67
    // User 1 has 500/1500 = 33.33% of YES pool → gets 33.33% of 2500 = 833.33

    const stakes = await stakeService.getPollStakes(testPollId);

    const winner1 = stakes.find((s) => s.userId === testUsers[0].id);
    const winner2 = stakes.find((s) => s.userId === testUsers[1].id);
    const loser1 = stakes.find((s) => s.userId === testUsers[2].id);
    const loser2 = stakes.find((s) => s.userId === testUsers[3].id);

    // Winners
    expect(winner1!.status).toBe(StakeStatus.WON);
    expect(winner1!.gratiumReward).toBe(1666); // Floor(1666.67)
    expect(winner1!.rewardPaidAt).toBeDefined();

    expect(winner2!.status).toBe(StakeStatus.WON);
    expect(winner2!.gratiumReward).toBe(833); // Floor(833.33)
    expect(winner2!.rewardPaidAt).toBeDefined();

    // Losers
    expect(loser1!.status).toBe(StakeStatus.LOST);
    expect(loser1!.gratiumReward).toBe(0);

    expect(loser2!.status).toBe(StakeStatus.LOST);
    expect(loser2!.gratiumReward).toBe(0);
  });

  it('should handle NO winning scenario', async () => {
    // User 0: 500 on YES
    await stakeService.createStake(testUsers[0].id, IdentityMode.TRUE_SELF, testUsers[0].did, {
      pollId: testPollId,
      identityMode: IdentityMode.TRUE_SELF,
      stakedPosition: VoteOption.YES,
      gratiumAmount: 500,
    });

    // User 1: 1000 on NO (winner)
    await stakeService.createStake(testUsers[1].id, IdentityMode.TRUE_SELF, testUsers[1].did, {
      pollId: testPollId,
      identityMode: IdentityMode.TRUE_SELF,
      stakedPosition: VoteOption.NO,
      gratiumAmount: 1000,
    });

    // Distribute with NO winning
    await stakeService.distributeStakeRewards(testPollId, VoteOption.NO);

    const stakes = await stakeService.getPollStakes(testPollId);

    const loser = stakes.find((s) => s.userId === testUsers[0].id);
    const winner = stakes.find((s) => s.userId === testUsers[1].id);

    expect(loser!.status).toBe(StakeStatus.LOST);
    expect(loser!.gratiumReward).toBe(0);

    expect(winner!.status).toBe(StakeStatus.WON);
    expect(winner!.gratiumReward).toBe(1500); // Gets entire pool (500 + 1000)
  });

  it('should handle proportional distribution with multiple winners', async () => {
    // 3 users stake on YES (winners)
    await stakeService.createStake(testUsers[0].id, IdentityMode.TRUE_SELF, testUsers[0].did, {
      pollId: testPollId,
      identityMode: IdentityMode.TRUE_SELF,
      stakedPosition: VoteOption.YES,
      gratiumAmount: 600, // 30% of YES pool
    });

    await stakeService.createStake(testUsers[1].id, IdentityMode.TRUE_SELF, testUsers[1].did, {
      pollId: testPollId,
      identityMode: IdentityMode.TRUE_SELF,
      stakedPosition: VoteOption.YES,
      gratiumAmount: 800, // 40% of YES pool
    });

    await stakeService.createStake(testUsers[2].id, IdentityMode.TRUE_SELF, testUsers[2].did, {
      pollId: testPollId,
      identityMode: IdentityMode.TRUE_SELF,
      stakedPosition: VoteOption.YES,
      gratiumAmount: 600, // 30% of YES pool
    });

    // 1 user stakes on NO (loser)
    await stakeService.createStake(testUsers[3].id, IdentityMode.TRUE_SELF, testUsers[3].did, {
      pollId: testPollId,
      identityMode: IdentityMode.TRUE_SELF,
      stakedPosition: VoteOption.NO,
      gratiumAmount: 1000,
    });

    // Total pool: 3000 (2000 YES + 1000 NO)
    await stakeService.distributeStakeRewards(testPollId, VoteOption.YES);

    const stakes = await stakeService.getPollStakes(testPollId);

    const winner1 = stakes.find((s) => s.userId === testUsers[0].id);
    const winner2 = stakes.find((s) => s.userId === testUsers[1].id);
    const winner3 = stakes.find((s) => s.userId === testUsers[2].id);

    // User 0: 600/2000 = 30% of pool = 900
    expect(winner1!.gratiumReward).toBe(900);

    // User 1: 800/2000 = 40% of pool = 1200
    expect(winner2!.gratiumReward).toBe(1200);

    // User 2: 600/2000 = 30% of pool = 900
    expect(winner3!.gratiumReward).toBe(900);

    // Total distributed should equal total pool
    const totalDistributed = winner1!.gratiumReward + winner2!.gratiumReward + winner3!.gratiumReward;
    expect(totalDistributed).toBe(3000);
  });
});

// ============================================================================
// Edge Case Tests
// ============================================================================

describe('Edge Cases', () => {
  it('should refund all stakes when poll is cancelled (ABSTAIN result)', async () => {
    await stakeService.createStake(testUsers[0].id, IdentityMode.TRUE_SELF, testUsers[0].did, {
      pollId: testPollId,
      identityMode: IdentityMode.TRUE_SELF,
      stakedPosition: VoteOption.YES,
      gratiumAmount: 500,
    });

    await stakeService.createStake(testUsers[1].id, IdentityMode.TRUE_SELF, testUsers[1].did, {
      pollId: testPollId,
      identityMode: IdentityMode.TRUE_SELF,
      stakedPosition: VoteOption.NO,
      gratiumAmount: 300,
    });

    // Distribute with ABSTAIN (poll cancelled/invalid)
    await stakeService.distributeStakeRewards(testPollId, VoteOption.ABSTAIN);

    const stakes = await stakeService.getPollStakes(testPollId);

    // All stakes should be refunded
    expect(stakes[0].status).toBe(StakeStatus.REFUNDED);
    expect(stakes[0].gratiumReward).toBe(stakes[0].gratiumAmount); // Gets original stake back

    expect(stakes[1].status).toBe(StakeStatus.REFUNDED);
    expect(stakes[1].gratiumReward).toBe(stakes[1].gratiumAmount);

    const pool = await stakeService.getStakePool(testPollId);
    expect(pool!.poolStatus).toBe(PoolStatus.REFUNDED);
  });

  it('should handle poll with no stakes', async () => {
    // Don't create any stakes
    await stakeService.distributeStakeRewards(testPollId, VoteOption.YES);

    const pool = await stakeService.getStakePool(testPollId);
    expect(pool).toBeNull(); // No pool created
  });

  it('should handle poll with only winners (no losers)', async () => {
    // Everyone stakes on YES
    await stakeService.createStake(testUsers[0].id, IdentityMode.TRUE_SELF, testUsers[0].did, {
      pollId: testPollId,
      identityMode: IdentityMode.TRUE_SELF,
      stakedPosition: VoteOption.YES,
      gratiumAmount: 500,
    });

    await stakeService.createStake(testUsers[1].id, IdentityMode.TRUE_SELF, testUsers[1].did, {
      pollId: testPollId,
      identityMode: IdentityMode.TRUE_SELF,
      stakedPosition: VoteOption.YES,
      gratiumAmount: 500,
    });

    // YES wins (everyone wins!)
    await stakeService.distributeStakeRewards(testPollId, VoteOption.YES);

    const stakes = await stakeService.getPollStakes(testPollId);

    // Each winner gets their stake back (no losers to take from)
    expect(stakes[0].status).toBe(StakeStatus.WON);
    expect(stakes[0].gratiumReward).toBe(500); // Gets own stake back

    expect(stakes[1].status).toBe(StakeStatus.WON);
    expect(stakes[1].gratiumReward).toBe(500);
  });
});

// ============================================================================
// Dual Identity Staking Tests
// ============================================================================

describe('Dual Identity Staking', () => {
  it('should allow user to hedge bets with True Self and Shadow', async () => {
    // User stakes True Self on YES, Shadow on NO (hedging strategy)
    const trueSelfStake = await stakeService.createStake(
      testUsers[0].id,
      IdentityMode.TRUE_SELF,
      testUsers[0].did,
      {
        pollId: testPollId,
        identityMode: IdentityMode.TRUE_SELF,
        stakedPosition: VoteOption.YES,
        gratiumAmount: 500,
      }
    );

    const shadowStake = await stakeService.createStake(
      testUsers[0].id,
      IdentityMode.SHADOW,
      `${testUsers[0].did}_shadow`,
      {
        pollId: testPollId,
        identityMode: IdentityMode.SHADOW,
        stakedPosition: VoteOption.NO,
        gratiumAmount: 500,
      }
    );

    expect(trueSelfStake.stakedPosition).toBe(VoteOption.YES);
    expect(shadowStake.stakedPosition).toBe(VoteOption.NO);

    const pool = await stakeService.getStakePool(testPollId);
    expect(pool!.totalYesStake).toBe(500);
    expect(pool!.totalNoStake).toBe(500);
    expect(pool!.totalStakers).toBe(2); // Counted as 2 separate stakers
  });

  it('should distribute rewards independently for True Self and Shadow', async () => {
    // User hedges: True Self on YES, Shadow on NO
    await stakeService.createStake(testUsers[0].id, IdentityMode.TRUE_SELF, testUsers[0].did, {
      pollId: testPollId,
      identityMode: IdentityMode.TRUE_SELF,
      stakedPosition: VoteOption.YES,
      gratiumAmount: 600,
    });

    await stakeService.createStake(testUsers[0].id, IdentityMode.SHADOW, `${testUsers[0].did}_shadow`, {
      pollId: testPollId,
      identityMode: IdentityMode.SHADOW,
      stakedPosition: VoteOption.NO,
      gratiumAmount: 400,
    });

    // YES wins
    await stakeService.distributeStakeRewards(testPollId, VoteOption.YES);

    const stakes = await stakeService.getUserStakesForPoll(testUsers[0].id, testPollId);

    // True Self wins (gets entire pool since only YES staker)
    expect(stakes.trueSelf!.status).toBe(StakeStatus.WON);
    expect(stakes.trueSelf!.gratiumReward).toBe(1000); // Gets 600 + 400

    // Shadow loses
    expect(stakes.shadow!.status).toBe(StakeStatus.LOST);
    expect(stakes.shadow!.gratiumReward).toBe(0);

    // Net result: User breaks even (600 win - 400 loss = +200, but paid 1000 total)
    // Actually gets 1000 back from 1000 staked = break even with hedging
  });
});

// ============================================================================
// Large Pool Simulation
// ============================================================================

describe('Large Pool Simulation', () => {
  it('should handle large pool with many stakers', async () => {
    // Create 4 YES stakers with varying amounts
    const yesStakes = [1000, 500, 750, 250]; // Total: 2500
    for (let i = 0; i < 4; i++) {
      await stakeService.createStake(testUsers[i].id, IdentityMode.TRUE_SELF, testUsers[i].did, {
        pollId: testPollId,
        identityMode: IdentityMode.TRUE_SELF,
        stakedPosition: VoteOption.YES,
        gratiumAmount: yesStakes[i],
      });
    }

    // Create 1 NO staker
    await stakeService.createStake(testUsers[4].id, IdentityMode.TRUE_SELF, testUsers[4].did, {
      pollId: testPollId,
      identityMode: IdentityMode.TRUE_SELF,
      stakedPosition: VoteOption.NO,
      gratiumAmount: 500,
    });

    const pool = await stakeService.getStakePool(testPollId);
    expect(pool!.totalPoolSize).toBe(3000); // 2500 + 500

    // YES wins
    await stakeService.distributeStakeRewards(testPollId, VoteOption.YES);

    const stakes = await stakeService.getPollStakes(testPollId);
    const winners = stakes.filter((s) => s.status === StakeStatus.WON);
    const losers = stakes.filter((s) => s.status === StakeStatus.LOST);

    expect(winners.length).toBe(4);
    expect(losers.length).toBe(1);

    // Verify total distributed equals total pool
    const totalDistributed = winners.reduce((sum, s) => sum + s.gratiumReward, 0);
    expect(totalDistributed).toBe(3000);

    // Verify proportional distribution
    // User 0: 1000/2500 = 40% → 1200
    // User 1: 500/2500 = 20% → 600
    // User 2: 750/2500 = 30% → 900
    // User 3: 250/2500 = 10% → 300
    const user0Reward = winners.find((s) => s.userId === testUsers[0].id)!.gratiumReward;
    const user1Reward = winners.find((s) => s.userId === testUsers[1].id)!.gratiumReward;
    const user2Reward = winners.find((s) => s.userId === testUsers[2].id)!.gratiumReward;
    const user3Reward = winners.find((s) => s.userId === testUsers[3].id)!.gratiumReward;

    expect(user0Reward).toBe(1200);
    expect(user1Reward).toBe(600);
    expect(user2Reward).toBe(900);
    expect(user3Reward).toBe(300);
  });
});
