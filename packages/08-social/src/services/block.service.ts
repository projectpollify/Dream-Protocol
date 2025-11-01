/**
 * Module 08: Social - Block Service
 * Handles user blocking and unblocking
 */

import { query, transaction } from '../utils/database';
import { Block, CreateBlockRequest } from '../types';

// ============================================================================
// Block User
// ============================================================================

export async function blockUser(data: CreateBlockRequest): Promise<Block> {
  if (!data.blocker_user_id || !data.blocked_user_id) {
    throw new Error('Blocker and blocked user IDs are required');
  }

  if (data.blocker_user_id === data.blocked_user_id) {
    throw new Error('Cannot block yourself');
  }

  if (!['true_self', 'shadow'].includes(data.blocker_identity_mode)) {
    throw new Error('Valid blocker identity_mode is required');
  }

  return await transaction(async (client) => {
    // Check if already blocked
    const existing = await client.query<{ id: string; is_active: boolean }>(
      `SELECT id, is_active FROM blocks
       WHERE blocker_user_id = $1 AND blocker_identity_mode = $2
       AND blocked_user_id = $3`,
      [data.blocker_user_id, data.blocker_identity_mode, data.blocked_user_id]
    );

    if (existing.rows.length > 0) {
      if (existing.rows[0].is_active) {
        throw new Error('User is already blocked');
      }

      // Reactivate block
      const reactivated = await client.query<Block>(
        `UPDATE blocks SET is_active = TRUE, unblocked_at = NULL
         WHERE id = $1
         RETURNING *`,
        [existing.rows[0].id]
      );

      // Remove any follow relationships
      await removeFollowRelationships(client, data.blocker_user_id, data.blocked_user_id);

      return reactivated.rows[0];
    }

    // Create new block
    const result = await client.query<Block>(
      `INSERT INTO blocks (
        blocker_user_id, blocker_identity_mode, blocked_user_id, reason
      ) VALUES ($1, $2, $3, $4)
      RETURNING *`,
      [data.blocker_user_id, data.blocker_identity_mode, data.blocked_user_id, data.reason || null]
    );

    // Remove any follow relationships
    await removeFollowRelationships(client, data.blocker_user_id, data.blocked_user_id);

    return result.rows[0];
  });
}

// ============================================================================
// Unblock User
// ============================================================================

export async function unblockUser(
  blockerUserId: string,
  blockerIdentityMode: string,
  blockedUserId: string
): Promise<void> {
  const result = await query(
    `UPDATE blocks SET is_active = FALSE, unblocked_at = NOW()
     WHERE blocker_user_id = $1 AND blocker_identity_mode = $2
     AND blocked_user_id = $3 AND is_active = TRUE
     RETURNING *`,
    [blockerUserId, blockerIdentityMode, blockedUserId]
  );

  if (result.rows.length === 0) {
    throw new Error('Block relationship not found');
  }
}

// ============================================================================
// Check if User is Blocked
// ============================================================================

export async function isUserBlocked(
  blockerUserId: string,
  blockerIdentityMode: string,
  blockedUserId: string
): Promise<boolean> {
  const result = await query(
    `SELECT id FROM blocks
     WHERE blocker_user_id = $1 AND blocker_identity_mode = $2
     AND blocked_user_id = $3 AND is_active = TRUE`,
    [blockerUserId, blockerIdentityMode, blockedUserId]
  );

  return result.rows.length > 0;
}

// ============================================================================
// Get Blocked Users
// ============================================================================

export async function getBlockedUsers(
  userId: string,
  identityMode: string,
  limit: number = 50,
  offset: number = 0
): Promise<any[]> {
  const result = await query(
    `SELECT
       b.id,
       b.blocked_user_id,
       b.reason,
       b.created_at,
       u.username,
       u.email
     FROM blocks b
     LEFT JOIN users u ON b.blocked_user_id = u.id
     WHERE b.blocker_user_id = $1 AND b.blocker_identity_mode = $2 AND b.is_active = TRUE
     ORDER BY b.created_at DESC
     LIMIT $3 OFFSET $4`,
    [userId, identityMode, limit, offset]
  );

  return result.rows;
}

// ============================================================================
// Helper: Remove Follow Relationships
// ============================================================================

async function removeFollowRelationships(
  client: any,
  blockerUserId: string,
  blockedUserId: string
): Promise<void> {
  // Remove all follow relationships between these users (both directions)
  await client.query(
    `UPDATE follows SET is_active = FALSE, unfollowed_at = NOW()
     WHERE (follower_user_id = $1 AND followee_user_id = $2)
     OR (follower_user_id = $2 AND followee_user_id = $1)`,
    [blockerUserId, blockedUserId]
  );
}

// ============================================================================
// Export
// ============================================================================

export default {
  blockUser,
  unblockUser,
  isUserBlocked,
  getBlockedUsers,
};
