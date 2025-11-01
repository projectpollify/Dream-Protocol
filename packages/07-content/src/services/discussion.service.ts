/**
 * Module 07: Content - Discussion Service
 * Handles all discussion-related operations
 */

import { query } from '../utils/database';
import { Discussion, CreateDiscussionRequest, ListDiscussionsOptions } from '../types';

// ============================================================================
// Create Discussion
// ============================================================================

export async function createDiscussion(data: CreateDiscussionRequest): Promise<Discussion> {
  // Validate input
  if (!data.title || data.title.length > 300) {
    throw new Error('Title is required and must be max 300 characters');
  }

  if (!data.user_id) {
    throw new Error('User ID is required');
  }

  if (!data.identity_mode || !['true_self', 'shadow'].includes(data.identity_mode)) {
    throw new Error('Valid identity_mode is required');
  }

  if (!data.creator_display_name) {
    throw new Error('Creator display name is required');
  }

  const result = await query<Discussion>(
    `INSERT INTO discussions (
      user_id, identity_mode, creator_display_name,
      title, description, topic, requires_approval
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *`,
    [
      data.user_id,
      data.identity_mode,
      data.creator_display_name,
      data.title,
      data.description || null,
      data.topic || null,
      data.requires_approval || false,
    ]
  );

  return result.rows[0];
}

// ============================================================================
// Get Discussion
// ============================================================================

export async function getDiscussion(discussionId: string): Promise<Discussion | null> {
  const result = await query<Discussion>(
    'SELECT * FROM discussions WHERE id = $1 AND is_deleted = FALSE',
    [discussionId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

// ============================================================================
// List Discussions (with pagination and filters)
// ============================================================================

export async function listDiscussions(options: ListDiscussionsOptions = {}): Promise<{
  discussions: Discussion[];
  total: number;
  limit: number;
  offset: number;
}> {
  const {
    limit = 20,
    offset = 0,
    topic,
    is_open,
    user_id,
    sort_by = 'created_at',
    order = 'desc',
  } = options;

  // Build WHERE clause
  const conditions: string[] = ['is_deleted = FALSE'];
  const values: any[] = [];
  let paramIndex = 1;

  if (topic) {
    conditions.push(`topic = $${paramIndex++}`);
    values.push(topic);
  }

  if (is_open !== undefined) {
    conditions.push(`is_open = $${paramIndex++}`);
    values.push(is_open);
  }

  if (user_id) {
    conditions.push(`user_id = $${paramIndex++}`);
    values.push(user_id);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  // Validate sort_by and order
  const validSortFields = ['created_at', 'participant_count', 'comment_count'];
  const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
  const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

  // Get total count
  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM discussions ${whereClause}`,
    values
  );
  const total = parseInt(countResult.rows[0].count, 10);

  // Get discussions
  const discussionsResult = await query<Discussion>(
    `SELECT * FROM discussions
    ${whereClause}
    ORDER BY ${sortField} ${sortOrder}
    LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...values, limit, offset]
  );

  return {
    discussions: discussionsResult.rows,
    total,
    limit,
    offset,
  };
}

// ============================================================================
// Update Discussion
// ============================================================================

export async function updateDiscussion(
  discussionId: string,
  userId: string,
  updates: {
    title?: string;
    description?: string;
    topic?: string;
    is_open?: boolean;
    requires_approval?: boolean;
  }
): Promise<Discussion> {
  // Verify ownership
  const ownerCheck = await query<{ user_id: string }>(
    'SELECT user_id FROM discussions WHERE id = $1 AND is_deleted = FALSE',
    [discussionId]
  );

  if (ownerCheck.rows.length === 0) {
    throw new Error('Discussion not found');
  }

  if (ownerCheck.rows[0].user_id !== userId) {
    throw new Error('Unauthorized: You can only edit your own discussions');
  }

  // Build dynamic update query
  const updateFields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.title !== undefined) {
    if (updates.title.length > 300) {
      throw new Error('Title must be max 300 characters');
    }
    updateFields.push(`title = $${paramIndex++}`);
    values.push(updates.title);
  }

  if (updates.description !== undefined) {
    updateFields.push(`description = $${paramIndex++}`);
    values.push(updates.description);
  }

  if (updates.topic !== undefined) {
    updateFields.push(`topic = $${paramIndex++}`);
    values.push(updates.topic);
  }

  if (updates.is_open !== undefined) {
    updateFields.push(`is_open = $${paramIndex++}`);
    values.push(updates.is_open);
  }

  if (updates.requires_approval !== undefined) {
    updateFields.push(`requires_approval = $${paramIndex++}`);
    values.push(updates.requires_approval);
  }

  if (updateFields.length === 0) {
    throw new Error('No valid update fields provided');
  }

  updateFields.push('updated_at = NOW()');
  values.push(discussionId);

  const updateQuery = `
    UPDATE discussions
    SET ${updateFields.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  const result = await query<Discussion>(updateQuery, values);
  return result.rows[0];
}

// ============================================================================
// Archive Discussion
// ============================================================================

export async function archiveDiscussion(
  discussionId: string,
  userId: string
): Promise<void> {
  const result = await query(
    `UPDATE discussions
    SET moderation_status = 'archived',
        archived_at = NOW(),
        updated_at = NOW()
    WHERE id = $1 AND user_id = $2 AND is_deleted = FALSE
    RETURNING id`,
    [discussionId, userId]
  );

  if (result.rows.length === 0) {
    throw new Error('Discussion not found or you do not have permission to archive it');
  }
}

// ============================================================================
// Delete Discussion (soft delete)
// ============================================================================

export async function deleteDiscussion(
  discussionId: string,
  userId: string
): Promise<void> {
  const result = await query(
    `UPDATE discussions
    SET is_deleted = TRUE,
        updated_at = NOW()
    WHERE id = $1 AND user_id = $2 AND is_deleted = FALSE
    RETURNING id`,
    [discussionId, userId]
  );

  if (result.rows.length === 0) {
    throw new Error('Discussion not found or you do not have permission to delete it');
  }
}

// ============================================================================
// Export
// ============================================================================

export default {
  createDiscussion,
  getDiscussion,
  listDiscussions,
  updateDiscussion,
  archiveDiscussion,
  deleteDiscussion,
};
