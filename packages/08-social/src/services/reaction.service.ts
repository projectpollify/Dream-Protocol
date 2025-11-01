/**
 * Module 08: Social - Reaction Service
 * Handles all reaction operations (upvote, downvote, helpful, insightful, inspiring, funny)
 */

import { query } from '../utils/database';
import { Reaction, CreateReactionRequest, ReactionCounts, ReactionType } from '../types';

const VALID_REACTION_TYPES: ReactionType[] = [
  'upvote',
  'downvote',
  'helpful',
  'insightful',
  'inspiring',
  'funny',
];

// ============================================================================
// Add Reaction
// ============================================================================

export async function addReaction(data: CreateReactionRequest): Promise<Reaction> {
  // Validate reaction type
  if (!VALID_REACTION_TYPES.includes(data.reaction_type)) {
    throw new Error('Invalid reaction type');
  }

  // Validate user ID
  if (!data.user_id) {
    throw new Error('User ID is required');
  }

  // Validate identity mode
  if (!data.identity_mode || !['true_self', 'shadow'].includes(data.identity_mode)) {
    throw new Error('Valid identity_mode is required');
  }

  // Must have exactly one content reference (post or comment)
  const hasPost = !!data.post_id;
  const hasComment = !!data.comment_id;

  if ((hasPost && hasComment) || (!hasPost && !hasComment)) {
    throw new Error('Reaction must target exactly one content (post or comment)');
  }

  // Verify content exists
  if (data.post_id) {
    const postCheck = await query(
      'SELECT id FROM posts WHERE id = $1 AND is_deleted = FALSE',
      [data.post_id]
    );
    if (postCheck.rows.length === 0) {
      throw new Error('Post not found');
    }
  }

  if (data.comment_id) {
    const commentCheck = await query(
      'SELECT id FROM comments WHERE id = $1 AND is_deleted = FALSE',
      [data.comment_id]
    );
    if (commentCheck.rows.length === 0) {
      throw new Error('Comment not found');
    }
  }

  // Check if reaction already exists
  let existing = null;
  if (data.post_id) {
    const existingResult = await query<Reaction>(
      `SELECT * FROM reactions
       WHERE user_id = $1 AND post_id = $2 AND reaction_type = $3`,
      [data.user_id, data.post_id, data.reaction_type]
    );
    existing = existingResult.rows.length > 0 ? existingResult.rows[0] : null;
  } else if (data.comment_id) {
    const existingResult = await query<Reaction>(
      `SELECT * FROM reactions
       WHERE user_id = $1 AND comment_id = $2 AND reaction_type = $3`,
      [data.user_id, data.comment_id, data.reaction_type]
    );
    existing = existingResult.rows.length > 0 ? existingResult.rows[0] : null;
  }

  // If exists, reactivate it
  if (existing) {
    const result = await query<Reaction>(
      `UPDATE reactions SET is_active = TRUE, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [existing.id]
    );
    return result.rows[0];
  }

  // Insert new reaction
  const result = await query<Reaction>(
    `INSERT INTO reactions (user_id, identity_mode, post_id, comment_id, reaction_type)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [data.user_id, data.identity_mode, data.post_id || null, data.comment_id || null, data.reaction_type]
  );

  return result.rows[0];
}

// ============================================================================
// Remove Reaction
// ============================================================================

export async function removeReaction(reactionId: string, userId: string): Promise<void> {
  // Verify ownership
  const ownerCheck = await query<{ user_id: string }>(
    'SELECT user_id FROM reactions WHERE id = $1',
    [reactionId]
  );

  if (ownerCheck.rows.length === 0) {
    throw new Error('Reaction not found');
  }

  if (ownerCheck.rows[0].user_id !== userId) {
    throw new Error('Unauthorized: You can only remove your own reactions');
  }

  // Mark as inactive (soft delete)
  await query(
    'UPDATE reactions SET is_active = FALSE, updated_at = NOW() WHERE id = $1',
    [reactionId]
  );
}

// ============================================================================
// Get Reactions for Content
// ============================================================================

export async function getReactionsForContent(
  postId?: string,
  commentId?: string
): Promise<ReactionCounts> {
  if (!postId && !commentId) {
    throw new Error('Must specify post_id or comment_id');
  }

  let queryText = `
    SELECT reaction_type, COUNT(*) as count
    FROM reactions
    WHERE is_active = TRUE
  `;

  const params: any[] = [];

  if (postId) {
    queryText += ` AND post_id = $1`;
    params.push(postId);
  } else if (commentId) {
    queryText += ` AND comment_id = $1`;
    params.push(commentId);
  }

  queryText += ` GROUP BY reaction_type`;

  const result = await query<{ reaction_type: ReactionType; count: string }>(queryText, params);

  // Convert to ReactionCounts object
  const counts: ReactionCounts = {};
  result.rows.forEach((row) => {
    counts[row.reaction_type] = parseInt(row.count, 10);
  });

  return counts;
}

// ============================================================================
// Get User's Reaction to Content
// ============================================================================

export async function getUserReaction(
  userId: string,
  postId?: string,
  commentId?: string
): Promise<ReactionType | null> {
  if (!postId && !commentId) {
    throw new Error('Must specify post_id or comment_id');
  }

  let queryText = `
    SELECT reaction_type FROM reactions
    WHERE user_id = $1 AND is_active = TRUE
  `;

  const params: any[] = [userId];

  if (postId) {
    queryText += ` AND post_id = $2`;
    params.push(postId);
  } else if (commentId) {
    queryText += ` AND comment_id = $2`;
    params.push(commentId);
  }

  const result = await query<{ reaction_type: ReactionType }>(queryText, params);

  return result.rows.length > 0 ? result.rows[0].reaction_type : null;
}

// ============================================================================
// Get All Reactions by User
// ============================================================================

export async function getUserReactions(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<Reaction[]> {
  const result = await query<Reaction>(
    `SELECT * FROM reactions
     WHERE user_id = $1 AND is_active = TRUE
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  return result.rows;
}

// ============================================================================
// Export
// ============================================================================

export default {
  addReaction,
  removeReaction,
  getReactionsForContent,
  getUserReaction,
  getUserReactions,
};
