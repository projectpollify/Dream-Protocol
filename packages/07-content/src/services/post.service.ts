/**
 * Module 07: Content - Post Service
 * Handles all post-related operations with dual-identity support
 */

import { query, transaction } from '../utils/database';
import {
  Post,
  CreatePostRequest,
  UpdatePostRequest,
  ListPostsOptions,
  CreateReportRequest,
} from '../types';

// ============================================================================
// Create Post
// ============================================================================

export async function createPost(data: CreatePostRequest): Promise<Post> {
  // Validate input
  if (!data.title || data.title.length > 300) {
    throw new Error('Title is required and must be max 300 characters');
  }

  if (!data.content || data.content.length > 50000) {
    throw new Error('Content is required and must be max 50,000 characters');
  }

  if (!data.user_id) {
    throw new Error('User ID is required');
  }

  if (!data.identity_mode || !['true_self', 'shadow'].includes(data.identity_mode)) {
    throw new Error('Valid identity_mode is required');
  }

  if (!data.author_display_name) {
    throw new Error('Author display name is required');
  }

  const result = await query<Post>(
    `INSERT INTO posts (
      user_id, identity_mode, author_display_name,
      title, content, content_type, category, tags
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *`,
    [
      data.user_id,
      data.identity_mode,
      data.author_display_name,
      data.title,
      data.content,
      data.content_type || 'post',
      data.category || null,
      JSON.stringify(data.tags || []),
    ]
  );

  return result.rows[0];
}

// ============================================================================
// Get Post (increments view count)
// ============================================================================

export async function getPost(postId: string, viewerUserId?: string): Promise<Post | null> {
  // Increment view count
  const result = await query<Post>(
    `UPDATE posts
    SET view_count = view_count + 1,
        updated_at = NOW()
    WHERE id = $1 AND is_deleted = FALSE
    RETURNING *`,
    [postId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

// ============================================================================
// Update Post
// ============================================================================

export async function updatePost(
  postId: string,
  userId: string,
  updates: UpdatePostRequest
): Promise<Post> {
  return await transaction(async (client) => {
    // Verify ownership
    const ownerCheck = await client.query<{ user_id: string; content: string }>(
      'SELECT user_id, content FROM posts WHERE id = $1 AND is_deleted = FALSE',
      [postId]
    );

    if (ownerCheck.rows.length === 0) {
      throw new Error('Post not found');
    }

    if (ownerCheck.rows[0].user_id !== userId) {
      throw new Error('Unauthorized: You can only edit your own posts');
    }

    const oldContent = ownerCheck.rows[0].content;

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

    if (updates.content !== undefined) {
      if (updates.content.length > 50000) {
        throw new Error('Content must be max 50,000 characters');
      }
      updateFields.push(`content = $${paramIndex++}`);
      values.push(updates.content);
    }

    if (updates.content_type !== undefined) {
      updateFields.push(`content_type = $${paramIndex++}`);
      values.push(updates.content_type);
    }

    if (updates.category !== undefined) {
      updateFields.push(`category = $${paramIndex++}`);
      values.push(updates.category);
    }

    if (updates.tags !== undefined) {
      updateFields.push(`tags = $${paramIndex++}`);
      values.push(JSON.stringify(updates.tags));
    }

    if (updates.is_pinned !== undefined) {
      updateFields.push(`is_pinned = $${paramIndex++}`);
      values.push(updates.is_pinned);
    }

    if (updates.is_locked !== undefined) {
      updateFields.push(`is_locked = $${paramIndex++}`);
      values.push(updates.is_locked);
    }

    if (updateFields.length === 0) {
      throw new Error('No valid update fields provided');
    }

    updateFields.push('updated_at = NOW()');
    values.push(postId);

    const updateQuery = `
      UPDATE posts
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await client.query<Post>(updateQuery, values);

    // Record edit history if content changed
    if (updates.content !== undefined && updates.content !== oldContent) {
      await client.query(
        `INSERT INTO content_edit_history (
          post_id, old_content, new_content, edited_by_user_id
        ) VALUES ($1, $2, $3, $4)`,
        [postId, oldContent, updates.content, userId]
      );
    }

    return result.rows[0];
  });
}

// ============================================================================
// Delete Post (soft delete)
// ============================================================================

export async function deletePost(postId: string, userId: string): Promise<void> {
  const result = await query(
    `UPDATE posts
    SET is_deleted = TRUE,
        deleted_at = NOW(),
        updated_at = NOW()
    WHERE id = $1 AND user_id = $2 AND is_deleted = FALSE
    RETURNING id`,
    [postId, userId]
  );

  if (result.rows.length === 0) {
    throw new Error('Post not found or you do not have permission to delete it');
  }
}

// ============================================================================
// List Posts (with pagination and filters)
// ============================================================================

export async function listPosts(options: ListPostsOptions = {}): Promise<{
  posts: Post[];
  total: number;
  limit: number;
  offset: number;
}> {
  const {
    limit = 20,
    offset = 0,
    category,
    identity_mode,
    content_type,
    user_id,
    sort_by = 'created_at',
    order = 'desc',
    include_deleted = false,
  } = options;

  // Build WHERE clause
  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (!include_deleted) {
    conditions.push('is_deleted = FALSE');
  }

  if (category) {
    conditions.push(`category = $${paramIndex++}`);
    values.push(category);
  }

  if (identity_mode) {
    conditions.push(`identity_mode = $${paramIndex++}`);
    values.push(identity_mode);
  }

  if (content_type) {
    conditions.push(`content_type = $${paramIndex++}`);
    values.push(content_type);
  }

  if (user_id) {
    conditions.push(`user_id = $${paramIndex++}`);
    values.push(user_id);
  }

  conditions.push(`moderation_status IN ('approved', 'pending_review')`);

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Validate sort_by and order
  const validSortFields = ['created_at', 'view_count', 'comment_count'];
  const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
  const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

  // Get total count
  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM posts ${whereClause}`,
    values
  );
  const total = parseInt(countResult.rows[0].count, 10);

  // Get posts
  const postsResult = await query<Post>(
    `SELECT * FROM posts
    ${whereClause}
    ORDER BY ${sortField} ${sortOrder}
    LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...values, limit, offset]
  );

  return {
    posts: postsResult.rows,
    total,
    limit,
    offset,
  };
}

// ============================================================================
// Flag Post (create report)
// ============================================================================

export async function flagPost(data: CreateReportRequest): Promise<void> {
  if (!data.post_id) {
    throw new Error('Post ID is required');
  }

  if (!data.reported_by_user_id) {
    throw new Error('Reporter user ID is required');
  }

  if (!data.reason) {
    throw new Error('Report reason is required');
  }

  await query(
    `INSERT INTO content_reports (
      reported_by_user_id, post_id, reason, description, status
    ) VALUES ($1, $2, $3, $4, 'pending')`,
    [data.reported_by_user_id, data.post_id, data.reason, data.description || null]
  );
}

// ============================================================================
// Get Post Edit History
// ============================================================================

export async function getPostEditHistory(postId: string): Promise<any[]> {
  const result = await query(
    `SELECT * FROM content_edit_history
    WHERE post_id = $1
    ORDER BY edited_at DESC`,
    [postId]
  );

  return result.rows;
}

// ============================================================================
// Export
// ============================================================================

export default {
  createPost,
  getPost,
  updatePost,
  deletePost,
  listPosts,
  flagPost,
  getPostEditHistory,
};
