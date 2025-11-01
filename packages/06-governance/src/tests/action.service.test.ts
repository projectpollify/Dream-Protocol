/**
 * Module 06: Governance - Action Service Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import actionService from '../services/action.service';
import { GovernanceActionType, ActionStatus, PollStatus, PollType } from '../types';
import { query } from '../utils/database';

describe('Action Service', () => {
  let testPollId: string;

  beforeEach(async () => {
    // Create a test approved poll
    const pollResult = await query(
      `INSERT INTO governance_polls (
        title, description, poll_type, poll_start_at, poll_end_at,
        poll_duration_minutes, status, created_by_user_id,
        parameter_name, parameter_current_value, parameter_proposed_value
      ) VALUES ($1, $2, $3, NOW(), NOW() + INTERVAL '7 days', 10080, $4, $5, $6, $7, $8)
      RETURNING id`,
      [
        'Test Poll',
        'Test description',
        PollType.PARAMETER_VOTE,
        PollStatus.APPROVED,
        'test-user-id',
        'poll_creation_cost_general',
        '500',
        '1000'
      ]
    );

    testPollId = pollResult.rows[0].id;
  });

  describe('createAction', () => {
    it('should create action from approved poll', async () => {
      const action = await actionService.createAction({
        pollId: testPollId,
        actionType: GovernanceActionType.PARAMETER_UPDATE,
        parameterName: 'poll_creation_cost_general',
        oldValue: '500',
        newValue: '1000',
        executeImmediately: false,
      });

      expect(action).toBeDefined();
      expect(action.governancePollId).toBe(testPollId);
      expect(action.actionType).toBe(GovernanceActionType.PARAMETER_UPDATE);
      expect(action.status).toBe(ActionStatus.SCHEDULED);
      expect(action.parameterName).toBe('poll_creation_cost_general');
      expect(action.newValue).toBe('1000');
    });

    it('should set rollback window based on poll type', async () => {
      const action = await actionService.createAction({
        pollId: testPollId,
        actionType: GovernanceActionType.PARAMETER_UPDATE,
        parameterName: 'poll_creation_cost_general',
        oldValue: '500',
        newValue: '1000',
      });

      // Standard poll should have 72-hour rollback window
      expect(action.rollbackWindowHours).toBe(72);
    });

    it('should reject action for non-approved poll', async () => {
      // Create a pending poll
      const pendingPollResult = await query(
        `INSERT INTO governance_polls (
          title, description, poll_type, poll_start_at, poll_end_at,
          poll_duration_minutes, status, created_by_user_id
        ) VALUES ($1, $2, $3, NOW(), NOW() + INTERVAL '7 days', 10080, $4, $5)
        RETURNING id`,
        ['Pending Poll', 'Test', PollType.GENERAL_COMMUNITY, PollStatus.PENDING, 'test-user']
      );

      const pendingPollId = pendingPollResult.rows[0].id;

      await expect(
        actionService.createAction({
          pollId: pendingPollId,
          actionType: GovernanceActionType.PARAMETER_UPDATE,
        })
      ).rejects.toThrow('Cannot create action for poll with status: pending');
    });
  });

  describe('scheduleAction', () => {
    it('should schedule action for future execution', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
      const action = await actionService.scheduleAction(testPollId, futureDate);

      expect(action.status).toBe(ActionStatus.SCHEDULED);
      expect(action.scheduledAt).toBeDefined();
    });
  });

  describe('getActionById', () => {
    it('should retrieve action by ID', async () => {
      const createdAction = await actionService.createAction({
        pollId: testPollId,
        actionType: GovernanceActionType.PARAMETER_UPDATE,
        parameterName: 'test_param',
        newValue: '100',
      });

      const retrievedAction = await actionService.getActionById(createdAction.id);

      expect(retrievedAction).not.toBeNull();
      expect(retrievedAction?.id).toBe(createdAction.id);
    });

    it('should return null for non-existent action', async () => {
      const action = await actionService.getActionById('00000000-0000-0000-0000-000000000000');
      expect(action).toBeNull();
    });
  });

  describe('getPendingActions', () => {
    it('should return pending and scheduled actions', async () => {
      await actionService.createAction({
        pollId: testPollId,
        actionType: GovernanceActionType.PARAMETER_UPDATE,
        executeImmediately: false,
      });

      const pendingActions = await actionService.getPendingActions();

      expect(Array.isArray(pendingActions)).toBe(true);
      expect(pendingActions.length).toBeGreaterThan(0);
    });
  });

  describe('getActionsByPollId', () => {
    it('should retrieve all actions for a poll', async () => {
      await actionService.createAction({
        pollId: testPollId,
        actionType: GovernanceActionType.PARAMETER_UPDATE,
      });

      const actions = await actionService.getActionsByPollId(testPollId);

      expect(Array.isArray(actions)).toBe(true);
      expect(actions.length).toBeGreaterThan(0);
      expect(actions[0].governancePollId).toBe(testPollId);
    });

    it('should return empty array for poll with no actions', async () => {
      const actions = await actionService.getActionsByPollId('00000000-0000-0000-0000-000000000000');
      expect(Array.isArray(actions)).toBe(true);
      expect(actions).toHaveLength(0);
    });
  });

  describe('cancelAction', () => {
    it('should cancel scheduled action', async () => {
      const action = await actionService.createAction({
        pollId: testPollId,
        actionType: GovernanceActionType.PARAMETER_UPDATE,
        executeImmediately: false,
      });

      await actionService.cancelAction(action.id);

      const cancelledAction = await actionService.getActionById(action.id);
      expect(cancelledAction?.status).toBe(ActionStatus.FAILED);
    });
  });

  describe('processScheduledActions', () => {
    it('should process due scheduled actions', async () => {
      // Create action scheduled in the past
      const pastDate = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
      await actionService.scheduleAction(testPollId, pastDate);

      const result = await actionService.processScheduledActions();

      expect(result).toBeDefined();
      expect(typeof result.executed).toBe('number');
      expect(typeof result.failed).toBe('number');
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should not process future scheduled actions', async () => {
      // Create action scheduled in the future
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
      await actionService.scheduleAction(testPollId, futureDate);

      const result = await actionService.processScheduledActions();

      // Should not execute future actions
      expect(result.executed).toBe(0);
    });
  });
});
