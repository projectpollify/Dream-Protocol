/**
 * Module 07: Content - Comment Service
 * Handles all comment-related operations with nested reply support
 */

import { query, transaction } from '../utils/database';
import { Comment, CreateCommentRequest, CommentWithReplies, ListCommentsOptions } from '../types';

const MAX_COMMENT_DEPTH = 5;
const MAX_COMMENT_LENGTH = 5000;

// ============================================================================
// Create Comment
// ============================================================================

export async function createComment(data: CreateCommentRequest): Promise<Comment> {
  // Validate input
  if (!data.content || data.content.length > MAX_COMMENT_LENGTH) {
    throw new Error(`Content is required and must be max ${MAX_COMMENT_LENGTH} characters`);
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

  // Must have exactly one parent (post, discussion, or comment)
  const parentCount =
    (data.parent_post_id ? 1 : 0) +
    (data.parent_discussion_id ? 1 : 0) +
    (data.parent_comment_id ? 1 : 0);

  if (parentCount !== 1) {
    throw new Error('Comment must have exactly one parent (post, discussion, or comment)');
  }

  return await transaction(async (client) => {
    let depth = 1;

    // If replying to a comment, calculate depth and enforce limit
    if (data.parent_comment_id) {
      const parentResult = await client.query<{ depth: number }>(
        'SELECT depth FROM comments WHERE id = $1 AND is_deleted = FALSE',
        [data.parent_comment_id]
      );

      if (parentResult.rows.length === 0) {
        throw new Error('Parent comment not found');
      }

      depth = parentResult.rows[0].depth + 1;

      if (depth > MAX_COMMENT_DEPTH) {
        throw new Error(`Maximum nesting depth of ${MAX_COMMENT_DEPTH} exceeded`);
      }

      // Update parent comment reply count
      await client.query(
        `UPDATE comments
        SET reply_count = reply_count + 1,
            updated_at = NOW()
        WHERE id = $1`,
        [data.parent_comment_id]
      );
    }

    // If commenting on a post, update post comment count
    if (data.parent_post_id) {
      const postResult = await client.query(
        'SELECT id FROM posts WHERE id = $1 AND is_deleted = FALSE',
        [data.parent_post_id]
      );

      if (postResult.rows.length === 0) {
        throw new Error('Parent post not found');
      }

      await client.query(
        `UPDATE posts
        SET comment_count = comment_count + 1,
            updated_at = NOW()
        WHERE id = $1`,
        [data.parent_post_id]
      );
    }

    // If commenting on a discussion, update discussion comment count
    if (data.parent_discussion_id) {
      const discussionResult = await client.query(
        'SELECT id FROM discussions WHERE id = $1 AND is_deleted = FALSE',
        [data.parent_discussion_id]
      );

      if (discussionResult.rows.length === 0) {
        throw new Error('Parent discussion not found');
      }

      await client.query(
        `UPDATE discussions
        SET comment_count = comment_count + 1,
            updated_at = NOW()
        WHERE id = $1`,
        [data.parent_discussion_id]
      );
    }

    // Create the comment
    const result = await client.query<Comment>(
      `INSERT INTO comments (
        user_id, identity_mode, author_display_name,
        parent_post_id, parent_discussion_id, parent_comment_id,
        content, depth
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        data.user_id,
        data.identity_mode,
        data.author_display_name,
        data.parent_post_id || null,
        data.parent_discussion_id || null,
        data.parent_comment_id || null,
        data.content,
        depth,
      ]
    );

    return result.rows[0];
  });
}

// ============================================================================
// Get Comment Thread (recursive retrieval of all replies)
// ============================================================================

export async function getCommentThread(commentId: string): Promise<CommentWithReplies | null> {
  const result = await query<Comment>(
    'SELECT * FROM comments WHERE id = $1 AND is_deleted = FALSE',
    [commentId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const comment = result.rows[0];

  // Get all direct replies
  const repliesResult = await query<Comment>(
    `SELECT * FROM comments
    WHERE parent_comment_id = $1 AND is_deleted = FALSE
    ORDER BY created_at ASC`,
    [commentId]
  );

  // Recursively get replies for each reply
  const repliesWithSubReplies: CommentWithReplies[] = await Promise.all(
    repliesResult.rows.map(async (reply) => {
      const subThread = await getCommentThread(reply.id);
      return subThread!;
    })
  );

  return {
    ...comment,
    replies: repliesWithSubReplies,
  };
}

// ============================================================================
// Delete Comment (soft delete)
// ============================================================================

export async function deleteComment(commentId: string, userId: string): Promise<void> {
  return await transaction(async (client) => {
    // Verify ownership
    const ownerCheck = await client.query<{
      user_id: string;
      parent_post_id: string | null;
      parent_discussion_id: string | null;
      parent_comment_id: string | null;
    }>(
      `SELECT user_id, parent_post_id, parent_discussion_id, parent_comment_id
      FROM comments
      WHERE id = $1 AND is_deleted = FALSE`,
      [commentId]
    );

    if (ownerCheck.rows.length === 0) {
      throw new Error('Comment not found');
    }

    if (ownerCheck.rows[0].user_id !== userId) {
      throw new Error('Unauthorized: You can only delete your own comments');
    }

    const { parent_post_id, parent_discussion_id, parent_comment_id } = ownerCheck.rows[0];

    // Soft delete the comment
    await client.query(
      `UPDATE comments
      SET is_deleted = TRUE,
          deleted_at = NOW(),
          updated_at = NOW()
      WHERE id = $1`,
      [commentId]
    );

    // Update parent counts
    if (parent_post_id) {
      await client.query(
        `UPDATE posts
        SET comment_count = GREATEST(0, comment_count - 1),
            updated_at = NOW()
        WHERE id = $1`,
        [parent_post_id]
      );
    }

    if (parent_discussion_id) {
      await client.query(
        `UPDATE discussions
        SET comment_count = GREATEST(0, comment_count - 1),
            updated_at = NOW()
        WHERE id = $1`,
        [parent_discussion_id]
      );
    }

    if (parent_comment_id) {
      await client.query(
        `UPDATE comments
        SET reply_count = GREATEST(0, reply_count - 1),
            updated_at = NOW()
        WHERE id = $1`,
        [parent_comment_id]
      );
    }
  });
}

// ============================================================================
// Get Post Comments (top-level only, paginated)
// ============================================================================

export async function getPostComments(
  postId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<{ comments: Comment[]; total: number }> {
  const { limit = 20, offset = 0 } = options;

  // Get total count
  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count
    FROM comments
    WHERE parent_post_id = $1 AND is_deleted = FALSE`,
    [postId]
  );
  const total = parseInt(countResult.rows[0].count, 10);

  // Get top-level comments
  const result = await query<Comment>(
    `SELECT * FROM comments
    WHERE parent_post_id = $1 AND is_deleted = FALSE
    ORDER BY created_at ASC
    LIMIT $2 OFFSET $3`,
    [postId, limit, offset]
  );

  return {
    comments: result.rows,
    total,
  };
}

// ============================================================================
// Get Discussion Comments
// ============================================================================

export async function getDiscussionComments(
  discussionId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<{ comments: Comment[]; total: number }> {
  const { limit = 20, offset = 0 } = options;

  // Get total count
  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count
    FROM comments
    WHERE parent_discussion_id = $1 AND is_deleted = FALSE`,
    [discussionId]
  );
  const total = parseInt(countResult.rows[0].count, 10);

  // Get top-level comments
  const result = await query<Comment>(
    `SELECT * FROM comments
    WHERE parent_discussion_id = $1 AND is_deleted = FALSE
    ORDER BY created_at ASC
    LIMIT $2 OFFSET $3`,
    [discussionId, limit, offset]
  );

  return {
    comments: result.rows,
    total,
  };
}

// ============================================================================
// List Comments (with filters)
// ============================================================================

export async function listComments(options: ListCommentsOptions = {}): Promise<Comment[]> {
  const { limit = 20, offset = 0, user_id, include_deleted = false } = options;

  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (!include_deleted) {
    conditions.push('is_deleted = FALSE');
  }

  if (user_id) {
    conditions.push(`user_id = $${paramIndex++}`);
    values.push(user_id);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await query<Comment>(
    `SELECT * FROM comments
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...values, limit, offset]
  );

  return result.rows;
}

// ============================================================================
// Export
// ============================================================================

export default {
  createComment,
  getCommentThread,
  deleteComment,
  getPostComments,
  getDiscussionComments,
  listComments,
};
