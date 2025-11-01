/**
 * Module 08: Social - Feed Service
 * Handles personalized activity feeds and trending content
 */

import { query } from '../utils/database';
import { ActivityFeedItem, CreateActivityRequest } from '../types';

// ============================================================================
// Get Personalized Feed
// ============================================================================

export async function getPersonalizedFeed(
  userId: string,
  identityMode: string,
  limit: number = 20,
  offset: number = 0
): Promise<ActivityFeedItem[]> {
  // Get all users this user follows in this identity mode
  const followingResult = await query<{ followee_user_id: string }>(
    `SELECT followee_user_id FROM follows
     WHERE follower_user_id = $1 AND follower_identity_mode = $2 AND is_active = TRUE`,
    [userId, identityMode]
  );

  const followeeIds = followingResult.rows.map((row) => row.followee_user_id);

  if (followeeIds.length === 0) {
    // Return empty feed if not following anyone
    return [];
  }

  // Get activities from followed users
  const placeholders = followeeIds.map((_, i) => `$${i + 1}`).join(',');

  const result = await query<ActivityFeedItem>(
    `SELECT * FROM activity_feed
     WHERE user_id IN (${placeholders})
     ORDER BY created_at DESC
     LIMIT $${followeeIds.length + 1} OFFSET $${followeeIds.length + 2}`,
    [...followeeIds, limit, offset]
  );

  return result.rows;
}

// ============================================================================
// Get User Activities
// ============================================================================

export async function getUserActivities(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<ActivityFeedItem[]> {
  const result = await query<ActivityFeedItem>(
    `SELECT * FROM activity_feed
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  return result.rows;
}

// ============================================================================
// Log Activity
// ============================================================================

export async function logActivity(data: CreateActivityRequest): Promise<ActivityFeedItem> {
  if (!data.user_id) {
    throw new Error('User ID is required');
  }

  if (!data.identity_mode || !['true_self', 'shadow'].includes(data.identity_mode)) {
    throw new Error('Valid identity_mode is required');
  }

  if (!data.display_name) {
    throw new Error('Display name is required');
  }

  if (!data.activity_type) {
    throw new Error('Activity type is required');
  }

  const result = await query<ActivityFeedItem>(
    `INSERT INTO activity_feed (
      user_id, identity_mode, display_name, activity_type,
      post_id, comment_id, content_preview, content_type
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *`,
    [
      data.user_id,
      data.identity_mode,
      data.display_name,
      data.activity_type,
      data.post_id || null,
      data.comment_id || null,
      data.content_preview || null,
      data.content_type || null,
    ]
  );

  return result.rows[0];
}

// ============================================================================
// Get Trending Activities
// ============================================================================

export async function getTrendingActivities(
  timeframeHours: number = 24,
  limit: number = 20
): Promise<ActivityFeedItem[]> {
  const result = await query<ActivityFeedItem>(
    `SELECT * FROM activity_feed
     WHERE created_at > NOW() - INTERVAL '1 hour' * $1
     ORDER BY engagement_count DESC, created_at DESC
     LIMIT $2`,
    [timeframeHours, limit]
  );

  return result.rows;
}

// ============================================================================
// Update Activity Engagement Count
// ============================================================================

export async function updateEngagementCount(
  activityId: string,
  delta: number
): Promise<void> {
  await query(
    `UPDATE activity_feed
     SET engagement_count = GREATEST(0, engagement_count + $1)
     WHERE id = $2`,
    [delta, activityId]
  );
}

// ============================================================================
// Delete Activity
// ============================================================================

export async function deleteActivity(activityId: string, userId: string): Promise<void> {
  const result = await query(
    `DELETE FROM activity_feed
     WHERE id = $1 AND user_id = $2
     RETURNING id`,
    [activityId, userId]
  );

  if (result.rows.length === 0) {
    throw new Error('Activity not found or unauthorized');
  }
}

// ============================================================================
// Get Activity by Content
// ============================================================================

export async function getActivityByContent(
  postId?: string,
  commentId?: string
): Promise<ActivityFeedItem | null> {
  let queryText = 'SELECT * FROM activity_feed WHERE ';
  const params: any[] = [];

  if (postId) {
    queryText += 'post_id = $1';
    params.push(postId);
  } else if (commentId) {
    queryText += 'comment_id = $1';
    params.push(commentId);
  } else {
    return null;
  }

  queryText += ' LIMIT 1';

  const result = await query<ActivityFeedItem>(queryText, params);

  return result.rows.length > 0 ? result.rows[0] : null;
}

// ============================================================================
// Export
// ============================================================================

export default {
  getPersonalizedFeed,
  getUserActivities,
  logActivity,
  getTrendingActivities,
  updateEngagementCount,
  deleteActivity,
  getActivityByContent,
};
