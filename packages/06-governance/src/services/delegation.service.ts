/**
 * Module 06: Governance - Delegation Service
 * Vote delegation with chain prevention
 */

import { query, transaction } from '../utils/database';
import {
  GovernanceDelegation,
  CreateDelegationRequest,
  DelegationType,
  DelegationStatus,
  IdentityMode,
} from '../types';

// ============================================================================
// Create Delegation
// ============================================================================

/**
 * Creates a vote delegation
 *
 * Validations:
 * 1. Cannot delegate to self
 * 2. Cannot create delegation chain (A→B→C blocked)
 * 3. Warn if delegating both identities to same person (privacy leak)
 * 4. Validate target user exists and is verified
 *
 * @throws Error if validation fails
 */
export async function createDelegation(
  userId: string,
  request: CreateDelegationRequest
): Promise<GovernanceDelegation> {
  return await transaction(async (client) => {
    // Validation 1: Cannot delegate to self
    if (userId === request.delegatedToUserId) {
      throw new Error('Cannot delegate voting power to yourself');
    }

    // Validation 2: Check if target user exists and is verified
    const targetUserResult = await client.query(
      `SELECT id, is_verified_human FROM users WHERE id = $1`,
      [request.delegatedToUserId]
    );

    if (targetUserResult.rows.length === 0) {
      throw new Error('Target user not found');
    }

    if (!targetUserResult.rows[0].is_verified_human) {
      throw new Error('Can only delegate to verified users (Proof of Humanity required)');
    }

    // Validation 3: Check for delegation chains (A→B→C not allowed)
    const chainCheckResult = await client.query(
      `SELECT id FROM governance_delegations
       WHERE delegating_user_id = $1
         AND status = 'active'
         AND (active_until IS NULL OR active_until > NOW())`,
      [request.delegatedToUserId]
    );

    if (chainCheckResult.rows.length > 0) {
      throw new Error(
        'Cannot delegate to this user - they have already delegated their voting power to someone else. ' +
          'Delegation chains (A→B→C) are not allowed to prevent power concentration.'
      );
    }

    // Validation 4: Check if user already has active delegation for this identity mode
    const existingDelegationResult = await client.query(
      `SELECT id FROM governance_delegations
       WHERE delegating_user_id = $1
         AND delegating_identity_mode = $2
         AND status = 'active'
         AND (delegation_type = 'all_governance' OR delegation_type = 'parameter_votes_only')
         AND (active_until IS NULL OR active_until > NOW())`,
      [userId, request.delegatingIdentityMode]
    );

    if (existingDelegationResult.rows.length > 0) {
      throw new Error(
        `You already have an active delegation for ${request.delegatingIdentityMode}. ` +
          'Revoke the existing delegation first.'
      );
    }

    // Warning: Check if delegating both identities to same person (privacy risk)
    const dualDelegationCheck = await client.query(
      `SELECT delegating_identity_mode
       FROM governance_delegations
       WHERE delegating_user_id = $1
         AND delegated_to_user_id = $2
         AND status = 'active'
         AND (active_until IS NULL OR active_until > NOW())`,
      [userId, request.delegatedToUserId]
    );

    if (dualDelegationCheck.rows.length > 0) {
      // This is allowed but warned in UI
      console.warn(
        `[Privacy Risk] User ${userId} is delegating both identities to ${request.delegatedToUserId}`
      );
    }

    // Determine delegated_to_identity_mode (same as delegating for simplicity)
    const delegatedToIdentityMode = request.delegatingIdentityMode;

    // Insert delegation
    const delegationResult = await client.query<GovernanceDelegation>(
      `INSERT INTO governance_delegations (
        delegating_user_id,
        delegating_identity_mode,
        delegated_to_user_id,
        delegated_to_identity_mode,
        delegation_type,
        target_poll_id,
        active_from,
        active_until,
        status,
        reason_text,
        is_revocable
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8, $9, $10)
      RETURNING *`,
      [
        userId,
        request.delegatingIdentityMode,
        request.delegatedToUserId,
        delegatedToIdentityMode,
        request.delegationType,
        null, // target_poll_id (not implemented in MVP)
        request.activeUntil || null,
        DelegationStatus.ACTIVE,
        request.reason || null,
        true, // Always revocable in MVP
      ]
    );

    return delegationResult.rows[0];
  });
}

// ============================================================================
// Revoke Delegation
// ============================================================================

/**
 * Revokes an active delegation
 */
export async function revokeDelegation(
  userId: string,
  delegationId: string
): Promise<void> {
  await transaction(async (client) => {
    // Check delegation exists and belongs to user
    const delegationResult = await client.query(
      `SELECT * FROM governance_delegations
       WHERE id = $1 AND delegating_user_id = $2`,
      [delegationId, userId]
    );

    if (delegationResult.rows.length === 0) {
      throw new Error('Delegation not found or does not belong to you');
    }

    const delegation = delegationResult.rows[0];

    if (delegation.status !== DelegationStatus.ACTIVE) {
      throw new Error(`Delegation is already ${delegation.status}`);
    }

    if (!delegation.is_revocable) {
      throw new Error('This delegation is not revocable');
    }

    // Revoke delegation
    await client.query(
      `UPDATE governance_delegations
       SET status = $1,
           revoked_at = NOW(),
           updated_at = NOW()
       WHERE id = $2`,
      [DelegationStatus.REVOKED, delegationId]
    );
  });
}

// ============================================================================
// Get User Delegations
// ============================================================================

/**
 * Gets all delegations where user is the delegator
 */
export async function getUserDelegations(userId: string): Promise<GovernanceDelegation[]> {
  const result = await query<GovernanceDelegation>(
    `SELECT * FROM governance_delegations
     WHERE delegating_user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );

  return result.rows;
}

/**
 * Gets active delegations for a specific identity mode
 */
export async function getActiveDelegation(
  userId: string,
  identityMode: IdentityMode
): Promise<GovernanceDelegation | null> {
  const result = await query<GovernanceDelegation>(
    `SELECT * FROM governance_delegations
     WHERE delegating_user_id = $1
       AND delegating_identity_mode = $2
       AND status = $3
       AND (delegation_type = $4 OR delegation_type = $5)
       AND (active_until IS NULL OR active_until > NOW())
     LIMIT 1`,
    [
      userId,
      identityMode,
      DelegationStatus.ACTIVE,
      DelegationType.ALL_GOVERNANCE,
      DelegationType.PARAMETER_VOTES_ONLY,
    ]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

/**
 * Gets all users who have delegated to a specific user
 */
export async function getDelegatedToUser(userId: string): Promise<GovernanceDelegation[]> {
  const result = await query<GovernanceDelegation>(
    `SELECT * FROM governance_delegations
     WHERE delegated_to_user_id = $1
       AND status = $2
       AND (active_until IS NULL OR active_until > NOW())
     ORDER BY created_at DESC`,
    [userId, DelegationStatus.ACTIVE]
  );

  return result.rows;
}

// ============================================================================
// Check Delegation for Poll
// ============================================================================

/**
 * Checks if user has an active delegation for a specific poll
 */
export async function hasDelegationForPoll(
  userId: string,
  identityMode: IdentityMode,
  pollId: string
): Promise<boolean> {
  const result = await query(
    `SELECT id FROM governance_delegations
     WHERE delegating_user_id = $1
       AND delegating_identity_mode = $2
       AND status = $3
       AND (
         delegation_type = $4
         OR delegation_type = $5
         OR (delegation_type = $6 AND target_poll_id = $7)
       )
       AND (active_until IS NULL OR active_until > NOW())`,
    [
      userId,
      identityMode,
      DelegationStatus.ACTIVE,
      DelegationType.ALL_GOVERNANCE,
      DelegationType.PARAMETER_VOTES_ONLY,
      DelegationType.SPECIFIC_POLL,
      pollId,
    ]
  );

  return result.rows.length > 0;
}

// ============================================================================
// Delegation Statistics
// ============================================================================

/**
 * Gets delegation statistics for analytics
 */
export async function getDelegationStatistics() {
  const result = await query(`
    SELECT
      COUNT(*) as total_delegations,
      COUNT(CASE WHEN status = 'active' THEN 1 END) as active_delegations,
      COUNT(CASE WHEN delegation_type = 'all_governance' THEN 1 END) as all_governance_count,
      COUNT(CASE WHEN delegation_type = 'parameter_votes_only' THEN 1 END) as parameter_only_count,
      COUNT(DISTINCT delegating_user_id) as unique_delegators,
      COUNT(DISTINCT delegated_to_user_id) as unique_delegates
    FROM governance_delegations
  `);

  return result.rows[0];
}

/**
 * Gets most trusted delegates (users with most delegations)
 */
export async function getMostTrustedDelegates(limit: number = 10) {
  const result = await query(
    `SELECT
       delegated_to_user_id,
       COUNT(*) as delegation_count
     FROM governance_delegations
     WHERE status = $1
       AND (active_until IS NULL OR active_until > NOW())
     GROUP BY delegated_to_user_id
     ORDER BY delegation_count DESC
     LIMIT $2`,
    [DelegationStatus.ACTIVE, limit]
  );

  return result.rows;
}

// ============================================================================
// Expire Delegations (Cron Job)
// ============================================================================

/**
 * Expires delegations that have passed their active_until date
 * Should be run periodically (e.g., every hour)
 */
export async function expireDelegations(): Promise<number> {
  const result = await query(
    `UPDATE governance_delegations
     SET status = $1,
         updated_at = NOW()
     WHERE status = $2
       AND active_until IS NOT NULL
       AND active_until < NOW()`,
    [DelegationStatus.EXPIRED, DelegationStatus.ACTIVE]
  );

  return result.rowCount || 0;
}

// ============================================================================
// Export
// ============================================================================

export default {
  createDelegation,
  revokeDelegation,
  getUserDelegations,
  getActiveDelegation,
  getDelegatedToUser,
  hasDelegationForPoll,
  getDelegationStatistics,
  getMostTrustedDelegates,
  expireDelegations,
};
