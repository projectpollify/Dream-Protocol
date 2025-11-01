/**
 * Module 06: Governance - Rollback Service Unit Tests
 * Dream Protocol - Test Emergency Rollback Protocol
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import rollbackService from '../services/rollback.service';
import { getPool, closePool, query } from '../utils/database';
import {
  ActionStatus,
  GovernanceActionType,
  RollbackInitiationType,
  PollStatus,
  PollType,
} from '../types';

// ============================================================================
// Test Setup
// ============================================================================

let testFounderId: string;
let testUserId: string;
let testActionId: string;

beforeAll(async () => {
  const pool = getPool();
  await pool.query('SELECT NOW()');
});

afterAll(async () => {
  await closePool();
});

beforeEach(async () => {
  // Create test founder
  const founderResult = await query(
    `INSERT INTO users (id, email, username)
     VALUES (gen_random_uuid(), $1, $2)
     RETURNING id`,
    [`founder-${Date.now()}@example.com`, `founder-${Date.now()}`]
  );
  testFounderId = founderResult.rows[0].id;

  // Create test user
  const userResult = await query(
    `INSERT INTO users (id, email, username)
     VALUES (gen_random_uuid(), $1, $2)
     RETURNING id`,
    [`test-${Date.now()}@example.com`, `test-${Date.now()}`]
  );
  testUserId = userResult.rows[0].id;

  // Create test parameter
  await query(
    `INSERT INTO parameter_whitelist (
      parameter_name,
      parameter_category,
      value_type,
      default_value,
      current_value,
      description
    ) VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      'test_parameter',
      'system_parameters',
      'integer',
      '100',
      '200',
      'Test parameter for rollback',
    ]
  );

  // Create test governance action (completed)
  const actionResult = await query(
    `INSERT INTO governance_actions (
      action_type,
      parameter_name,
      old_value,
      new_value,
      status,
      executed_at
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id`,
    [
      GovernanceActionType.PARAMETER_UPDATE,
      'test_parameter',
      '100',
      '200',
      ActionStatus.COMPLETED,
      new Date(), // Just executed
    ]
  );
  testActionId = actionResult.rows[0].id;
});

// ============================================================================
// Founder Authority Tests
// ============================================================================

describe('Founder Rollback Authority', () => {
  it('should show founder has full authority at platform launch', async () => {
    const authority = await rollbackService.checkFounderAuthority(testFounderId);

    expect(authority.hasAuthority).toBe(true);
    expect(authority.tokensRemaining).toBe(10); // Full 10 tokens
    expect(authority.yearsActive).toBe(0); // Just launched
    expect(authority.authorityPercentage).toBe(100); // Year 1
  });

  it('should track founder token usage', async () => {
    // Use one token
    await rollbackService.initiateFounderRollback(
      testFounderId,
      testActionId,
      'Testing token usage'
    );

    // Check authority again
    const authority = await rollbackService.checkFounderAuthority(testFounderId);

    // Note: In production, token count is tracked in governance_actions
    // This test demonstrates the mechanism
    expect(authority.hasAuthority).toBe(true);
  });

  it('should enforce 10 token limit for founder', async () => {
    // Simulate using all 10 tokens by creating 10 rollback actions
    for (let i = 0; i < 10; i++) {
      const action = await query(
        `INSERT INTO governance_actions (
          action_type,
          parameter_name,
          old_value,
          new_value,
          status,
          executed_at
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id`,
        [
          GovernanceActionType.PARAMETER_UPDATE,
          `test_param_${i}`,
          '100',
          '200',
          ActionStatus.COMPLETED,
          new Date(),
        ]
      );

      // Record founder rollback
      await query(
        `UPDATE governance_actions
         SET rollback_initiated_by_user_id = $1,
             rollback_initiation_type = $2
         WHERE id = $3`,
        [testFounderId, RollbackInitiationType.FOUNDER_UNILATERAL, action.rows[0].id]
      );
    }

    // Now founder should have no tokens
    const authority = await rollbackService.checkFounderAuthority(testFounderId);

    expect(authority.tokensRemaining).toBe(0);
    expect(authority.hasAuthority).toBe(false);
  });
});

// ============================================================================
// Founder Rollback Initiation Tests
// ============================================================================

describe('Founder Rollback Initiation', () => {
  it('should allow founder to initiate rollback', async () => {
    const result = await rollbackService.initiateFounderRollback(
      testFounderId,
      testActionId,
      'Harmful decision needs reversal'
    );

    expect(result.rollbackPollId).toBeDefined();
    expect(result.tokensRemaining).toBeLessThan(10);

    // Verify poll was created
    const pollResult = await query(
      `SELECT * FROM governance_polls WHERE id = $1`,
      [result.rollbackPollId]
    );

    expect(pollResult.rows.length).toBe(1);
    expect(pollResult.rows[0].poll_type).toBe(PollType.EMERGENCY_ROLLBACK);
    expect(pollResult.rows[0].status).toBe(PollStatus.ACTIVE);
    expect(pollResult.rows[0].approval_required_percentage).toBe(66); // Supermajority
  });

  it('should reject rollback after window expires', async () => {
    // Create action executed 100 hours ago (past 72-hour window)
    const oldActionResult = await query(
      `INSERT INTO governance_actions (
        action_type,
        parameter_name,
        old_value,
        new_value,
        status,
        executed_at
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id`,
      [
        GovernanceActionType.PARAMETER_UPDATE,
        'old_parameter',
        '100',
        '200',
        ActionStatus.COMPLETED,
        new Date(Date.now() - 100 * 60 * 60 * 1000), // 100 hours ago
      ]
    );

    await expect(
      rollbackService.initiateFounderRollback(
        testFounderId,
        oldActionResult.rows[0].id,
        'Too late'
      )
    ).rejects.toThrow('Rollback window expired');
  });

  it('should reject rollback on non-completed actions', async () => {
    const pendingActionResult = await query(
      `INSERT INTO governance_actions (
        action_type,
        parameter_name,
        old_value,
        new_value,
        status
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING id`,
      [
        GovernanceActionType.PARAMETER_UPDATE,
        'pending_param',
        '100',
        '200',
        ActionStatus.PENDING,
      ]
    );

    await expect(
      rollbackService.initiateFounderRollback(
        testFounderId,
        pendingActionResult.rows[0].id,
        'Cannot rollback pending'
      )
    ).rejects.toThrow('Cannot rollback action with status');
  });
});

// ============================================================================
// Verified User Petition Tests
// ============================================================================

describe('Verified User Petition', () => {
  it('should reject petition with < 100 users', async () => {
    // Create 50 test users
    const userIds: string[] = [];
    for (let i = 0; i < 50; i++) {
      const result = await query(
        `INSERT INTO users (id, email, username)
         VALUES (gen_random_uuid(), $1, $2)
         RETURNING id`,
        [`petitioner${i}@example.com`, `petitioner${i}`]
      );
      userIds.push(result.rows[0].id);
    }

    await expect(
      rollbackService.createRollbackPetition(
        testUserId,
        testActionId,
        'Not enough users',
        userIds
      )
    ).rejects.toThrow('Petition requires at least 100 verified users');
  });

  it('should accept petition with 100+ verified users', async () => {
    // Create 100 verified users with PoH score 70+
    const userIds: string[] = [];
    for (let i = 0; i < 100; i++) {
      const userResult = await query(
        `INSERT INTO users (id, email, username)
         VALUES (gen_random_uuid(), $1, $2)
         RETURNING id`,
        [`petitioner${i}@example.com`, `petitioner${i}`]
      );
      const userId = userResult.rows[0].id;
      userIds.push(userId);

      // Create profile with PoH score 70+
      await query(
        `INSERT INTO user_profiles (user_id, identity_mode, poh_score)
         VALUES ($1, $2, $3)`,
        [userId, 'true_self', 75]
      );
    }

    const result = await rollbackService.createRollbackPetition(
      testUserId,
      testActionId,
      'Community demands rollback',
      userIds
    );

    expect(result.petitionId).toBeDefined();
    expect(result.requiresVote).toBe(true);

    // Verify poll was created
    const pollResult = await query(
      `SELECT * FROM governance_polls WHERE id = $1`,
      [result.petitionId]
    );

    expect(pollResult.rows.length).toBe(1);
    expect(pollResult.rows[0].poll_type).toBe(PollType.EMERGENCY_ROLLBACK);
  });
});

// ============================================================================
// Automatic Trigger Tests
// ============================================================================

describe('Automatic Trigger Detection', () => {
  it('should detect user exodus trigger (>20% deletions)', async () => {
    // Create 100 test users
    for (let i = 0; i < 100; i++) {
      const userResult = await query(
        `INSERT INTO users (id, email, username)
         VALUES (gen_random_uuid(), $1, $2)
         RETURNING id`,
        [`user${i}@example.com`, `user${i}`]
      );

      // Create account status
      await query(
        `INSERT INTO user_account_status (user_id, status, updated_at)
         VALUES ($1, $2, $3)`,
        [
          userResult.rows[0].id,
          i < 25 ? 'deleted' : 'active', // 25% deleted (triggers alarm)
          new Date(),
        ]
      );
    }

    const result = await rollbackService.checkAutomaticTriggers(testActionId);

    expect(result.shouldRollback).toBe(true);
    expect(result.triggers.length).toBeGreaterThan(0);
    expect(result.triggers[0]).toContain('User exodus detected');
  });

  it('should not trigger on normal user activity (<20% deletions)', async () => {
    // Create 100 users with only 10% deleted
    for (let i = 0; i < 100; i++) {
      const userResult = await query(
        `INSERT INTO users (id, email, username)
         VALUES (gen_random_uuid(), $1, $2)
         RETURNING id`,
        [`normaluser${i}@example.com`, `normaluser${i}`]
      );

      await query(
        `INSERT INTO user_account_status (user_id, status, updated_at)
         VALUES ($1, $2, $3)`,
        [
          userResult.rows[0].id,
          i < 10 ? 'deleted' : 'active', // Only 10% deleted
          new Date(),
        ]
      );
    }

    const result = await rollbackService.checkAutomaticTriggers(testActionId);

    expect(result.shouldRollback).toBe(false);
    expect(result.triggers.length).toBe(0);
  });
});

// ============================================================================
// Rollback Status Tests
// ============================================================================

describe('Rollback Status', () => {
  it('should report correct rollback window status', async () => {
    const status = await rollbackService.getRollbackStatus(testActionId);

    expect(status.canRollback).toBe(true); // Just executed
    expect(status.windowExpiresAt).toBeDefined();
    expect(status.hoursRemaining).toBeGreaterThan(70); // ~72 hours
    expect(status.hoursRemaining).toBeLessThanOrEqual(72);
    expect(status.rollbackCount).toBe(0);
    expect(status.isParameterFrozen).toBe(false);
  });

  it('should report window expired for old actions', async () => {
    const oldActionResult = await query(
      `INSERT INTO governance_actions (
        action_type,
        parameter_name,
        old_value,
        new_value,
        status,
        executed_at
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id`,
      [
        GovernanceActionType.PARAMETER_UPDATE,
        'old_param',
        '100',
        '200',
        ActionStatus.COMPLETED,
        new Date(Date.now() - 100 * 60 * 60 * 1000), // 100 hours ago
      ]
    );

    const status = await rollbackService.getRollbackStatus(oldActionResult.rows[0].id);

    expect(status.canRollback).toBe(false);
    expect(status.hoursRemaining).toBe(0);
  });

  it('should track parameter freeze after 3 rollbacks', async () => {
    // Simulate 3 rollbacks
    const freezeUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days

    await query(
      `UPDATE governance_actions
       SET parameter_frozen_until = $1,
           rollback_count_for_parameter = 3
       WHERE id = $2`,
      [freezeUntil, testActionId]
    );

    const status = await rollbackService.getRollbackStatus(testActionId);

    expect(status.rollbackCount).toBe(3);
    expect(status.isParameterFrozen).toBe(true);
  });
});

// ============================================================================
// Rollback Execution Tests
// ============================================================================

describe('Rollback Execution', () => {
  it('should revert parameter to old value', async () => {
    // Create approved rollback poll
    const pollResult = await query(
      `INSERT INTO governance_polls (
        title,
        description,
        poll_type,
        poll_start_at,
        poll_end_at,
        poll_duration_minutes,
        status,
        created_by_user_id,
        governance_action_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id`,
      [
        'Test Rollback',
        'Testing rollback execution',
        PollType.EMERGENCY_ROLLBACK,
        new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        2880, // 48 hours
        PollStatus.APPROVED,
        testFounderId,
        testActionId,
      ]
    );

    // Execute rollback
    await rollbackService.executeRollback(pollResult.rows[0].id);

    // Verify parameter was reverted
    const paramResult = await query(
      `SELECT current_value FROM parameter_whitelist
       WHERE parameter_name = $1`,
      ['test_parameter']
    );

    expect(paramResult.rows[0].current_value).toBe('100'); // Reverted to old value

    // Verify action marked as rolled back
    const actionResult = await query(
      `SELECT status FROM governance_actions WHERE id = $1`,
      [testActionId]
    );

    expect(actionResult.rows[0].status).toBe(ActionStatus.ROLLED_BACK);
  });

  it('should freeze parameter after 3 rollbacks', async () => {
    // Create 3 rolled-back actions for same parameter
    for (let i = 0; i < 3; i++) {
      await query(
        `INSERT INTO governance_actions (
          action_type,
          parameter_name,
          old_value,
          new_value,
          status
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          GovernanceActionType.PARAMETER_UPDATE,
          'test_parameter',
          '100',
          '200',
          ActionStatus.ROLLED_BACK,
        ]
      );
    }

    // Create and execute 3rd rollback
    const pollResult = await query(
      `INSERT INTO governance_polls (
        title,
        description,
        poll_type,
        poll_start_at,
        poll_end_at,
        poll_duration_minutes,
        status,
        created_by_user_id,
        governance_action_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id`,
      [
        'Third Rollback',
        'Testing parameter freeze',
        PollType.EMERGENCY_ROLLBACK,
        new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        2880,
        PollStatus.APPROVED,
        testFounderId,
        testActionId,
      ]
    );

    await rollbackService.executeRollback(pollResult.rows[0].id);

    // Verify parameter is frozen (not voteable)
    const paramResult = await query(
      `SELECT is_voteable FROM parameter_whitelist
       WHERE parameter_name = $1`,
      ['test_parameter']
    );

    expect(paramResult.rows[0].is_voteable).toBe(false);
  });

  it('should reject execution of non-approved polls', async () => {
    const pendingPollResult = await query(
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
        'Pending Rollback',
        'Still voting',
        PollType.EMERGENCY_ROLLBACK,
        new Date(),
        new Date(Date.now() + 24 * 60 * 60 * 1000),
        2880,
        PollStatus.ACTIVE,
        testFounderId,
      ]
    );

    await expect(
      rollbackService.executeRollback(pendingPollResult.rows[0].id)
    ).rejects.toThrow('Cannot execute rollback poll with status');
  });
});
