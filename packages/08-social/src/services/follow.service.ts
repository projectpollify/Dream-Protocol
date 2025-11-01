/**
 * Module 08: Social - Follow Service
 * Handles follow/unfollow operations and follower lists
 */

import { query, transaction } from '../utils/database';
import { Follow, CreateFollowRequest } from '../types';

// ============================================================================
// Follow User
// ============================================================================

export async function followUser(data: CreateFollowRequest): Promise<Follow> {
  // Validate
  if (!data.follower_user_id || !data.followee_user_id) {
    throw new Error('Follower and followee user IDs are required');
  }

  if (data.follower_user_id === data.followee_user_id) {
    throw new Error('Cannot follow yourself');
  }

  if (!['true_self', 'shadow'].includes(data.follower_identity_mode)) {
    throw new Error('Valid follower identity_mode is required');
  }

  if (!['true_self', 'shadow'].includes(data.followee_identity_mode)) {
    throw new Error('Valid followee identity_mode is required');
  }

  return await transaction(async (client) => {
    // Check if already following
    const existing = await client.query<{ id: string; is_active: boolean }>(
      `SELECT id, is_active FROM follows
       WHERE follower_user_id = $1 AND follower_identity_mode = $2
       AND followee_user_id = $3 AND followee_identity_mode = $4`,
      [
        data.follower_user_id,
        data.follower_identity_mode,
        data.followee_user_id,
        data.followee_identity_mode,
      ]
    );

    if (existing.rows.length > 0) {
      if (existing.rows[0].is_active) {
        throw new Error('Already following this user');
      }

      // Reactivate follow
      const reactivated = await client.query<Follow>(
        `UPDATE follows SET is_active = TRUE, unfollowed_at = NULL
         WHERE id = $1
         RETURNING *`,
        [existing.rows[0].id]
      );

      // Update stats
      await updateFollowerStats(client, data.followee_user_id, data.followee_identity_mode, 1);
      await updateFollowingStats(client, data.follower_user_id, data.follower_identity_mode, 1);

      return reactivated.rows[0];
    }

    // Create new follow
    const result = await client.query<Follow>(
      `INSERT INTO follows (
        follower_user_id, follower_identity_mode, followee_user_id, followee_identity_mode
      ) VALUES ($1, $2, $3, $4)
      RETURNING *`,
      [
        data.follower_user_id,
        data.follower_identity_mode,
        data.followee_user_id,
        data.followee_identity_mode,
      ]
    );

    // Update stats
    await updateFollowerStats(client, data.followee_user_id, data.followee_identity_mode, 1);
    await updateFollowingStats(client, data.follower_user_id, data.follower_identity_mode, 1);

    // Initialize stats if not exists
    await ensureStatsExist(client, data.followee_user_id, data.followee_identity_mode);
    await ensureStatsExist(client, data.follower_user_id, data.follower_identity_mode);

    return result.rows[0];
  });
}

// ============================================================================
// Unfollow User
// ============================================================================

export async function unfollowUser(data: CreateFollowRequest): Promise<void> {
  await transaction(async (client) => {
    const result = await client.query(
      `UPDATE follows SET is_active = FALSE, unfollowed_at = NOW()
       WHERE follower_user_id = $1 AND follower_identity_mode = $2
       AND followee_user_id = $3 AND followee_identity_mode = $4
       AND is_active = TRUE
       RETURNING *`,
      [
        data.follower_user_id,
        data.follower_identity_mode,
        data.followee_user_id,
        data.followee_identity_mode,
      ]
    );

    if (result.rows.length === 0) {
      throw new Error('Not following this user');
    }

    // Update stats
    await updateFollowerStats(client, data.followee_user_id, data.followee_identity_mode, -1);
    await updateFollowingStats(client, data.follower_user_id, data.follower_identity_mode, -1);
  });
}

// ============================================================================
// Get Followers
// ============================================================================

export async function getFollowers(
  userId: string,
  identityMode: string,
  limit: number = 50,
  offset: number = 0
): Promise<any[]> {
  const result = await query(
    `SELECT
       f.id,
       f.follower_user_id,
       f.follower_identity_mode,
       f.created_at,
       u.username,
       u.email
     FROM follows f
     LEFT JOIN users u ON f.follower_user_id = u.id
     WHERE f.followee_user_id = $1 AND f.followee_identity_mode = $2 AND f.is_active = TRUE
     ORDER BY f.created_at DESC
     LIMIT $3 OFFSET $4`,
    [userId, identityMode, limit, offset]
  );

  return result.rows;
}

// ============================================================================
// Get Following
// ============================================================================

export async function getFollowing(
  userId: string,
  identityMode: string,
  limit: number = 50,
  offset: number = 0
): Promise<any[]> {
  const result = await query(
    `SELECT
       f.id,
       f.followee_user_id,
       f.followee_identity_mode,
       f.created_at,
       u.username,
       u.email
     FROM follows f
     LEFT JOIN users u ON f.followee_user_id = u.id
     WHERE f.follower_user_id = $1 AND f.follower_identity_mode = $2 AND f.is_active = TRUE
     ORDER BY f.created_at DESC
     LIMIT $3 OFFSET $4`,
    [userId, identityMode, limit, offset]
  );

  return result.rows;
}

// ============================================================================
// Check if Following
// ============================================================================

export async function isFollowing(
  followerUserId: string,
  followerIdentityMode: string,
  followeeUserId: string,
  followeeIdentityMode: string
): Promise<boolean> {
  const result = await query(
    `SELECT id FROM follows
     WHERE follower_user_id = $1 AND follower_identity_mode = $2
     AND followee_user_id = $3 AND followee_identity_mode = $4
     AND is_active = TRUE`,
    [followerUserId, followerIdentityMode, followeeUserId, followeeIdentityMode]
  );

  return result.rows.length > 0;
}

// ============================================================================
// Get Follower/Following Counts
// ============================================================================

export async function getFollowCounts(userId: string, identityMode: string): Promise<{
  follower_count: number;
  following_count: number;
}> {
  const followerResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM follows
     WHERE followee_user_id = $1 AND followee_identity_mode = $2 AND is_active = TRUE`,
    [userId, identityMode]
  );

  const followingResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM follows
     WHERE follower_user_id = $1 AND follower_identity_mode = $2 AND is_active = TRUE`,
    [userId, identityMode]
  );

  return {
    follower_count: parseInt(followerResult.rows[0].count, 10),
    following_count: parseInt(followingResult.rows[0].count, 10),
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

async function updateFollowerStats(
  client: any,
  userId: string,
  identityMode: string,
  delta: number
): Promise<void> {
  await client.query(
    `UPDATE social_stats
     SET follower_count = GREATEST(0, follower_count + $1),
         updated_at = NOW()
     WHERE user_id = $2 AND identity_mode = $3`,
    [delta, userId, identityMode]
  );
}

async function updateFollowingStats(
  client: any,
  userId: string,
  identityMode: string,
  delta: number
): Promise<void> {
  await client.query(
    `UPDATE social_stats
     SET following_count = GREATEST(0, following_count + $1),
         updated_at = NOW()
     WHERE user_id = $2 AND identity_mode = $3`,
    [delta, userId, identityMode]
  );
}

async function ensureStatsExist(
  client: any,
  userId: string,
  identityMode: string
): Promise<void> {
  await client.query(
    `INSERT INTO social_stats (user_id, identity_mode)
     VALUES ($1, $2)
     ON CONFLICT (user_id, identity_mode) DO NOTHING`,
    [userId, identityMode]
  );
}

// ============================================================================
// Export
// ============================================================================

export default {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  isFollowing,
  getFollowCounts,
};
