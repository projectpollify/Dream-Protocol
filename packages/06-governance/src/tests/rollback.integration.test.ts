/**
 * Module 06: Governance - Rollback Integration Tests
 * Dream Protocol - Complete Emergency Rollback Flows
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
let testUsers: Array<{ id: string; did: string }> = [];

beforeAll(async () => {
  const pool = getPool();
  await pool.query('SELECT NOW()');
});

afterAll(async () => {
  await closePool();
});

beforeEach(async () => {
  testUsers = [];

  // Create test founder
  const founderResult = await query(
    `INSERT INTO users (id, email, username)
     VALUES (gen_random_uuid(), $1, $2)
     RETURNING id`,
    [`founder-${Date.now()}@example.com`, `founder-${Date.now()}`]
  );
  testFounderId = founderResult.rows[0].id;

  // Create 150 test users for petition tests
  for (let i = 0; i < 150; i++) {
    const userResult = await query(
      `INSERT INTO users (id, email, username)
       VALUES (gen_random_uuid(), $1, $2)
       RETURNING id`,
      [`user${i}-${Date.now()}@example.com`, `user${i}-${Date.now()}`]
    );
    const userId = userResult.rows[0].id;

    // Create verified profile with PoH score 75
    await query(
      `INSERT INTO user_profiles (user_id, identity_mode, poh_score)
       VALUES ($1, $2, $3)`,
      [userId, 'true_self', 75]
    );

    testUsers.push({
      id: userId,
      did: `did:agoranet:user${i}`,
    });
  }
});

// ============================================================================
// Complete Founder Rollback Flow
// ============================================================================

describe('Complete Founder Rollback Flow', () => {
  it('should execute full founder rollback: initiate → vote → execute', async () => {
    // Step 1: Create parameter and action
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
        'governance_fee',
        'economic_accessibility',
        'integer',
        '1000',
        '5000', // Bad change!
        'PollCoin cost to create governance polls',
      ]
    );

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
        'governance_fee',
        '1000',
        '5000',
        ActionStatus.COMPLETED,
        new Date(),
      ]
    );

    // Step 2: Founder initiates rollback
    const rollback = await rollbackService.initiateFounderRollback(
      testFounderId,
      actionResult.rows[0].id,
      'Fee increase is too harsh for new users. Rolling back to preserve accessibility.'
    );

    expect(rollback.rollbackPollId).toBeDefined();
    expect(rollback.tokensRemaining).toBe(9); // Used 1 token

    // Step 3: Verify rollback poll created
    const pollResult = await query(
      `SELECT * FROM governance_polls WHERE id = $1`,
      [rollback.rollbackPollId]
    );

    const poll = pollResult.rows[0];
    expect(poll.poll_type).toBe(PollType.EMERGENCY_ROLLBACK);
    expect(poll.status).toBe(PollStatus.ACTIVE);
    expect(poll.approval_required_percentage).toBe(66); // Supermajority
    expect(poll.minimum_vote_quorum).toBe(500); // 50% of normal (1000)

    // Step 4: Simulate community voting and approval
    await query(
      `UPDATE governance_polls
       SET status = $1,
           final_yes_percentage = 75.0,
           quorum_met = TRUE
       WHERE id = $2`,
      [PollStatus.APPROVED, rollback.rollbackPollId]
    );

    // Step 5: Execute rollback
    await rollbackService.executeRollback(rollback.rollbackPollId);

    // Step 6: Verify parameter reverted
    const paramResult = await query(
      `SELECT current_value FROM parameter_whitelist
       WHERE parameter_name = $1`,
      ['governance_fee']
    );

    expect(paramResult.rows[0].current_value).toBe('1000'); // Reverted!

    // Step 7: Verify action marked as rolled back
    const actionStatusResult = await query(
      `SELECT status FROM governance_actions WHERE id = $1`,
      [actionResult.rows[0].id]
    );

    expect(actionStatusResult.rows[0].status).toBe(ActionStatus.ROLLED_BACK);

    // Step 8: Verify founder tokens decremented
    const authority = await rollbackService.checkFounderAuthority(testFounderId);
    expect(authority.tokensRemaining).toBeLessThan(10);
  });

  it('should reject rollback when community votes NO', async () => {
    // Create parameter and action
    await query(
      `INSERT INTO parameter_whitelist (
        parameter_name,
        parameter_category,
        value_type,
        default_value,
        current_value,
        description
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      ['test_param', 'system_parameters', 'integer', '10', '20', 'Test']
    );

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
        'test_param',
        '10',
        '20',
        ActionStatus.COMPLETED,
        new Date(),
      ]
    );

    // Founder initiates rollback
    const rollback = await rollbackService.initiateFounderRollback(
      testFounderId,
      actionResult.rows[0].id,
      'I think this was bad'
    );

    // Community votes NO (rejects rollback)
    await query(
      `UPDATE governance_polls
       SET status = $1,
           final_yes_percentage = 35.0, // Only 35% voted yes (< 66% needed)
           final_no_percentage = 65.0,
           quorum_met = TRUE
       WHERE id = $2`,
      [PollStatus.REJECTED, rollback.rollbackPollId]
    );

    // Attempt to execute should fail
    await expect(
      rollbackService.executeRollback(rollback.rollbackPollId)
    ).rejects.toThrow('Cannot execute rollback poll with status');

    // Parameter should NOT be reverted
    const paramResult = await query(
      `SELECT current_value FROM parameter_whitelist
       WHERE parameter_name = $1`,
      ['test_param']
    );

    expect(paramResult.rows[0].current_value).toBe('20'); // Stays at new value
  });
});

// ============================================================================
// Complete Petition Rollback Flow
// ============================================================================

describe('Complete Petition Rollback Flow', () => {
  it('should execute full petition rollback: 100+ users → vote → execute', async () => {
    // Step 1: Create harmful parameter change
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
        'light_score_threshold',
        'feature_access',
        'integer',
        '10',
        '80', // Very restrictive!
        'Minimum Light Score to vote',
      ]
    );

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
        'light_score_threshold',
        '10',
        '80',
        ActionStatus.COMPLETED,
        new Date(),
      ]
    );

    // Step 2: 120 users sign petition
    const petitionerIds = testUsers.slice(0, 120).map((u) => u.id);

    const petition = await rollbackService.createRollbackPetition(
      testUsers[0].id,
      actionResult.rows[0].id,
      'This threshold blocks 90% of users from voting. This is anti-democratic.',
      petitionerIds
    );

    expect(petition.petitionId).toBeDefined();
    expect(petition.requiresVote).toBe(true);

    // Step 3: Community votes YES (approve rollback)
    await query(
      `UPDATE governance_polls
       SET status = $1,
           final_yes_percentage = 82.0, // Strong support
           quorum_met = TRUE
       WHERE id = $2`,
      [PollStatus.APPROVED, petition.petitionId]
    );

    // Step 4: Execute rollback
    await rollbackService.executeRollback(petition.petitionId);

    // Step 5: Verify threshold reverted
    const paramResult = await query(
      `SELECT current_value FROM parameter_whitelist
       WHERE parameter_name = $1`,
      ['light_score_threshold']
    );

    expect(paramResult.rows[0].current_value).toBe('10'); // Reverted to 10!
  });

  it('should reject petition with insufficient verified users', async () => {
    // Create action
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
        'some_param',
        '10',
        '20',
        ActionStatus.COMPLETED,
        new Date(),
      ]
    );

    // Only 50 users sign (need 100)
    const petitionerIds = testUsers.slice(0, 50).map((u) => u.id);

    await expect(
      rollbackService.createRollbackPetition(
        testUsers[0].id,
        actionResult.rows[0].id,
        'Not enough signatures',
        petitionerIds
      )
    ).rejects.toThrow('Petition requires at least 100 verified users');
  });
});

// ============================================================================
// Automatic Trigger Rollback Flow
// ============================================================================

describe('Automatic Trigger Rollback Flow', () => {
  it('should detect and rollback when >20% users delete accounts', async () => {
    // Step 1: Create parameter change
    await query(
      `INSERT INTO parameter_whitelist (
        parameter_name,
        parameter_category,
        value_type,
        default_value,
        current_value,
        description
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      ['bad_param', 'system_parameters', 'integer', '10', '100', 'Harmful change']
    );

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
        'bad_param',
        '10',
        '100',
        ActionStatus.COMPLETED,
        new Date(),
      ]
    );

    // Step 2: Simulate 30% of users deleting accounts (exodus!)
    const totalUsers = testUsers.length;
    const deletedCount = Math.floor(totalUsers * 0.3);

    for (let i = 0; i < deletedCount; i++) {
      await query(
        `INSERT INTO user_account_status (user_id, status, updated_at)
         VALUES ($1, $2, $3)`,
        [testUsers[i].id, 'deleted', new Date()]
      );
    }

    // Mark remaining as active
    for (let i = deletedCount; i < totalUsers; i++) {
      await query(
        `INSERT INTO user_account_status (user_id, status, updated_at)
         VALUES ($1, $2, $3)`,
        [testUsers[i].id, 'active', new Date()]
      );
    }

    // Step 3: Check triggers
    const triggers = await rollbackService.checkAutomaticTriggers(
      actionResult.rows[0].id
    );

    expect(triggers.shouldRollback).toBe(true);
    expect(triggers.triggers.length).toBeGreaterThan(0);
    expect(triggers.triggers[0]).toContain('User exodus detected');

    // Step 4: Initiate automatic rollback
    const rollbackPollId = await rollbackService.initiateAutomaticRollback(
      actionResult.rows[0].id,
      triggers.triggers
    );

    expect(rollbackPollId).toBeDefined();

    // Step 5: Verify poll created with automatic trigger type
    const pollResult = await query(
      `SELECT * FROM governance_polls WHERE id = $1`,
      [rollbackPollId]
    );

    expect(pollResult.rows[0].poll_type).toBe(PollType.EMERGENCY_ROLLBACK);

    // Step 6: Approve and execute
    await query(
      `UPDATE governance_polls
       SET status = $1,
           final_yes_percentage = 85.0,
           quorum_met = TRUE
       WHERE id = $2`,
      [PollStatus.APPROVED, rollbackPollId]
    );

    await rollbackService.executeRollback(rollbackPollId);

    // Step 7: Verify parameter reverted
    const paramResult = await query(
      `SELECT current_value FROM parameter_whitelist
       WHERE parameter_name = $1`,
      ['bad_param']
    );

    expect(paramResult.rows[0].current_value).toBe('10'); // Reverted!
  });
});

// ============================================================================
// Parameter Freeze After Multiple Rollbacks
// ============================================================================

describe('Parameter Freeze Mechanism', () => {
  it('should freeze parameter after 3 rollbacks (90-day freeze)', async () => {
    // Create parameter
    await query(
      `INSERT INTO parameter_whitelist (
        parameter_name,
        parameter_category,
        value_type,
        default_value,
        current_value,
        description,
        is_voteable
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      ['volatile_param', 'system_parameters', 'integer', '50', '50', 'Test', true]
    );

    // Execute 3 rollbacks for this parameter
    for (let i = 0; i < 3; i++) {
      // Create action
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
          'volatile_param',
          '50',
          `${60 + i * 10}`,
          ActionStatus.COMPLETED,
          new Date(),
        ]
      );

      // Create and approve rollback poll
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
          `Rollback ${i + 1}`,
          'Rolling back volatile param',
          PollType.EMERGENCY_ROLLBACK,
          new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          2880,
          PollStatus.APPROVED,
          testFounderId,
          actionResult.rows[0].id,
        ]
      );

      // Execute rollback
      await rollbackService.executeRollback(pollResult.rows[0].id);
    }

    // After 3 rollbacks, parameter should be frozen
    const paramResult = await query(
      `SELECT is_voteable FROM parameter_whitelist
       WHERE parameter_name = $1`,
      ['volatile_param']
    );

    expect(paramResult.rows[0].is_voteable).toBe(false); // FROZEN!

    // Check rollback status
    const latestActionResult = await query(
      `SELECT id FROM governance_actions
       WHERE parameter_name = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      ['volatile_param']
    );

    const status = await rollbackService.getRollbackStatus(
      latestActionResult.rows[0].id
    );

    expect(status.rollbackCount).toBeGreaterThanOrEqual(3);
    expect(status.isParameterFrozen).toBe(true);
  });
});

// ============================================================================
// Rollback Window Expiration
// ============================================================================

describe('Rollback Window Time Limits', () => {
  it('should enforce 72-hour window for standard decisions', async () => {
    // Create action executed 80 hours ago (past 72-hour window)
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
        '10',
        '20',
        ActionStatus.COMPLETED,
        new Date(Date.now() - 80 * 60 * 60 * 1000), // 80 hours ago
      ]
    );

    // Check status - window should be expired
    const status = await rollbackService.getRollbackStatus(oldActionResult.rows[0].id);

    expect(status.canRollback).toBe(false);
    expect(status.hoursRemaining).toBe(0);

    // Attempt rollback should fail
    await expect(
      rollbackService.initiateFounderRollback(
        testFounderId,
        oldActionResult.rows[0].id,
        'Too late'
      )
    ).rejects.toThrow('Rollback window expired');
  });
});
