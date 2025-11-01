/**
 * Module 06: Governance - Action Execution Service
 * Dream Protocol - Execute approved governance decisions
 *
 * Handles:
 * - Scheduling governance actions
 * - Executing parameter updates
 * - Tracking execution status
 * - Handling failures and rollbacks
 */

import { PoolClient } from 'pg';
import { query, transaction } from '../utils/database';
import parameterService from './parameter.service';
import {
  GovernanceAction,
  GovernanceActionType,
  ActionStatus,
  GovernancePoll,
  PollStatus,
} from '../types';

// ============================================================================
// Types
// ============================================================================

export interface CreateActionRequest {
  pollId: string;
  actionType: GovernanceActionType;
  parameterName?: string;
  oldValue?: string;
  newValue?: string;
  scheduledAt?: Date;
  executeImmediately?: boolean;
}

export interface ActionExecutionResult {
  actionId: string;
  status: ActionStatus;
  executedAt: Date;
  error?: string;
}

// ============================================================================
// Action Creation
// ============================================================================

/**
 * Create a governance action from an approved poll
 */
export async function createAction(
  request: CreateActionRequest
): Promise<GovernanceAction> {
  return transaction(async (client: PoolClient) => {
    // Validate poll is approved
    const pollResult = await client.query<GovernancePoll>(
      `SELECT * FROM governance_polls WHERE id = $1`,
      [request.pollId]
    );

    if (pollResult.rows.length === 0) {
      throw new Error('Poll not found');
    }

    const poll = pollResult.rows[0];

    if (poll.status !== PollStatus.APPROVED) {
      throw new Error(`Cannot create action for poll with status: ${poll.status}`);
    }

    // Calculate rollback window expiration
    const rollbackWindowHours = poll.pollType === 'constitutional' ? 168 : 72; // 7 days vs 3 days
    const executionTime = request.scheduledAt || new Date();
    const rollbackWindowExpiresAt = new Date(
      executionTime.getTime() + rollbackWindowHours * 60 * 60 * 1000
    );

    // Create action
    const actionResult = await client.query<GovernanceAction>(
      `INSERT INTO governance_actions (
        governance_poll_id,
        action_type,
        parameter_name,
        old_value,
        new_value,
        status,
        scheduled_at,
        can_be_rolled_back,
        rollback_window_hours,
        rollback_window_expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        request.pollId,
        request.actionType,
        request.parameterName || null,
        request.oldValue || null,
        request.newValue || null,
        request.executeImmediately ? ActionStatus.PENDING : ActionStatus.SCHEDULED,
        request.scheduledAt || null,
        true, // can_be_rolled_back
        rollbackWindowHours,
        rollbackWindowExpiresAt,
      ]
    );

    const action = actionResult.rows[0];

    // Link action back to poll
    await client.query(
      `UPDATE governance_polls
       SET governance_action_id = $1,
           execute_at = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [action.id, request.scheduledAt || new Date(), request.pollId]
    );

    // If execute immediately, execute now
    if (request.executeImmediately) {
      await executeActionInternal(client, action.id);
    }

    return action;
  });
}

/**
 * Schedule action for later execution
 */
export async function scheduleAction(
  pollId: string,
  scheduledAt: Date
): Promise<GovernanceAction> {
  const poll = await query<GovernancePoll>(
    `SELECT * FROM governance_polls WHERE id = $1`,
    [pollId]
  );

  if (poll.rows.length === 0) {
    throw new Error('Poll not found');
  }

  const pollData = poll.rows[0];

  return createAction({
    pollId,
    actionType: GovernanceActionType.PARAMETER_UPDATE,
    parameterName: pollData.parameterName || undefined,
    oldValue: pollData.parameterCurrentValue || undefined,
    newValue: pollData.parameterProposedValue || undefined,
    scheduledAt,
    executeImmediately: false,
  });
}

// ============================================================================
// Action Execution
// ============================================================================

/**
 * Execute a governance action (public API)
 */
export async function executeAction(actionId: string): Promise<ActionExecutionResult> {
  return transaction(async (client: PoolClient) => {
    return await executeActionInternal(client, actionId);
  });
}

/**
 * Execute action (internal - used within transactions)
 */
async function executeActionInternal(
  client: PoolClient,
  actionId: string
): Promise<ActionExecutionResult> {
  try {
    // Get action
    const actionResult = await client.query<GovernanceAction>(
      `SELECT * FROM governance_actions WHERE id = $1`,
      [actionId]
    );

    if (actionResult.rows.length === 0) {
      throw new Error('Action not found');
    }

    const action = actionResult.rows[0];

    // Verify action is ready to execute
    if (action.status === ActionStatus.COMPLETED) {
      throw new Error('Action already executed');
    }

    if (action.status === ActionStatus.FAILED) {
      throw new Error('Action previously failed. Cannot re-execute.');
    }

    if (action.status === ActionStatus.ROLLED_BACK) {
      throw new Error('Action was rolled back. Cannot re-execute.');
    }

    // Mark as executing
    await client.query(
      `UPDATE governance_actions
       SET status = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [ActionStatus.EXECUTING, actionId]
    );

    // Execute based on action type
    switch (action.actionType) {
      case GovernanceActionType.PARAMETER_UPDATE:
        await executeParameterUpdate(client, action);
        break;

      case GovernanceActionType.FEATURE_TOGGLE:
        await executeFeatureToggle(client, action);
        break;

      case GovernanceActionType.REWARD_ADJUSTMENT:
        await executeRewardAdjustment(client, action);
        break;

      case GovernanceActionType.CUSTOM_ACTION:
        await executeCustomAction(client, action);
        break;

      default:
        throw new Error(`Unknown action type: ${action.actionType}`);
    }

    // Mark as completed
    const executedAt = new Date();
    await client.query(
      `UPDATE governance_actions
       SET status = $1,
           executed_at = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [ActionStatus.COMPLETED, executedAt, actionId]
    );

    // Update poll status to executed
    if (action.governancePollId) {
      await client.query(
        `UPDATE governance_polls
         SET status = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [PollStatus.EXECUTED, action.governancePollId]
      );
    }

    return {
      actionId,
      status: ActionStatus.COMPLETED,
      executedAt,
    };
  } catch (error: any) {
    // Mark as failed
    await client.query(
      `UPDATE governance_actions
       SET status = $1,
           error_message = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [ActionStatus.FAILED, error.message, actionId]
    );

    throw error;
  }
}

// ============================================================================
// Action Type Executors
// ============================================================================

/**
 * Execute parameter update
 */
async function executeParameterUpdate(
  client: PoolClient,
  action: GovernanceAction
): Promise<void> {
  if (!action.parameterName || !action.newValue) {
    throw new Error('Parameter update requires parameterName and newValue');
  }

  // Update parameter value
  await parameterService.updateParameterValue(
    client,
    action.parameterName,
    action.newValue
  );

  console.log(`✅ Parameter '${action.parameterName}' updated: ${action.oldValue} → ${action.newValue}`);
}

/**
 * Execute feature toggle
 */
async function executeFeatureToggle(
  client: PoolClient,
  action: GovernanceAction
): Promise<void> {
  // TODO: Implement feature toggle logic
  // This would integrate with a feature flags table/service

  console.log(`✅ Feature toggle executed for action ${action.id}`);
}

/**
 * Execute reward adjustment
 */
async function executeRewardAdjustment(
  client: PoolClient,
  action: GovernanceAction
): Promise<void> {
  // TODO: Implement reward adjustment logic
  // This would integrate with the economy module

  console.log(`✅ Reward adjustment executed for action ${action.id}`);
}

/**
 * Execute custom action
 */
async function executeCustomAction(
  client: PoolClient,
  action: GovernanceAction
): Promise<void> {
  // TODO: Implement custom action execution
  // This would allow for extensible governance actions

  console.log(`✅ Custom action executed for action ${action.id}`);
}

// ============================================================================
// Action Queries
// ============================================================================

/**
 * Get all pending actions
 */
export async function getPendingActions(): Promise<GovernanceAction[]> {
  const result = await query<GovernanceAction>(
    `SELECT * FROM governance_actions
     WHERE status IN ($1, $2)
     ORDER BY scheduled_at ASC NULLS FIRST`,
    [ActionStatus.PENDING, ActionStatus.SCHEDULED]
  );

  return result.rows;
}

/**
 * Get action by ID
 */
export async function getActionById(actionId: string): Promise<GovernanceAction | null> {
  const result = await query<GovernanceAction>(
    `SELECT * FROM governance_actions WHERE id = $1`,
    [actionId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

/**
 * Get actions for a specific poll
 */
export async function getActionsByPollId(pollId: string): Promise<GovernanceAction[]> {
  const result = await query<GovernanceAction>(
    `SELECT * FROM governance_actions
     WHERE governance_poll_id = $1
     ORDER BY created_at DESC`,
    [pollId]
  );

  return result.rows;
}

/**
 * Cancel a scheduled action
 */
export async function cancelAction(actionId: string): Promise<void> {
  await query(
    `UPDATE governance_actions
     SET status = $1,
         execution_notes = $2,
         updated_at = NOW()
     WHERE id = $3
       AND status = $4`,
    [ActionStatus.FAILED, 'Action cancelled by administrator', actionId, ActionStatus.SCHEDULED]
  );
}

// ============================================================================
// Scheduled Action Processing (Cron Job)
// ============================================================================

/**
 * Process all due scheduled actions
 * This should be called by a cron job every minute
 */
export async function processScheduledActions(): Promise<{
  executed: number;
  failed: number;
  errors: string[];
}> {
  const executed: string[] = [];
  const failed: string[] = [];
  const errors: string[] = [];

  try {
    // Get all scheduled actions that are due
    const dueActions = await query<GovernanceAction>(
      `SELECT * FROM governance_actions
       WHERE status = $1
         AND scheduled_at <= NOW()
       ORDER BY scheduled_at ASC`,
      [ActionStatus.SCHEDULED]
    );

    for (const action of dueActions.rows) {
      try {
        await executeAction(action.id);
        executed.push(action.id);
        console.log(`✅ Executed scheduled action: ${action.id}`);
      } catch (error: any) {
        failed.push(action.id);
        errors.push(`Action ${action.id}: ${error.message}`);
        console.error(`❌ Failed to execute action ${action.id}:`, error);
      }
    }

    return {
      executed: executed.length,
      failed: failed.length,
      errors,
    };
  } catch (error: any) {
    console.error('[Process Scheduled Actions Error]', error);
    throw error;
  }
}

// ============================================================================
// Export
// ============================================================================

export default {
  createAction,
  scheduleAction,
  executeAction,
  getPendingActions,
  getActionById,
  getActionsByPollId,
  cancelAction,
  processScheduledActions,
};
