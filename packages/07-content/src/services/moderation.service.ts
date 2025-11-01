/**
 * Module 07: Content - Moderation Service
 * Handles content moderation, reports, and admin actions
 */

import { query, transaction } from '../utils/database';
import { ContentReport, ResolveReportRequest, ModerationAction } from '../types';

// ============================================================================
// Hide Content (soft moderation)
// ============================================================================

export async function hideContent(
  contentId: string,
  contentType: 'post' | 'comment',
  reason: string,
  moderatorId: string
): Promise<void> {
  if (!['post', 'comment'].includes(contentType)) {
    throw new Error('Invalid content type');
  }

  const table = contentType === 'post' ? 'posts' : 'comments';

  const result = await query(
    `UPDATE ${table}
    SET moderation_status = 'hidden',
        moderation_reason = $1,
        moderated_by_user_id = $2,
        updated_at = NOW()
    WHERE id = $3 AND is_deleted = FALSE
    RETURNING id`,
    [reason, moderatorId, contentId]
  );

  if (result.rows.length === 0) {
    throw new Error(`${contentType} not found or already deleted`);
  }
}

// ============================================================================
// Remove Content (hard moderation)
// ============================================================================

export async function removeContent(
  contentId: string,
  contentType: 'post' | 'comment',
  reason: string,
  moderatorId: string
): Promise<void> {
  if (!['post', 'comment'].includes(contentType)) {
    throw new Error('Invalid content type');
  }

  const table = contentType === 'post' ? 'posts' : 'comments';

  const result = await query(
    `UPDATE ${table}
    SET moderation_status = 'removed',
        moderation_reason = $1,
        moderated_by_user_id = $2,
        is_deleted = TRUE,
        deleted_at = NOW(),
        updated_at = NOW()
    WHERE id = $3
    RETURNING id`,
    [reason, moderatorId, contentId]
  );

  if (result.rows.length === 0) {
    throw new Error(`${contentType} not found`);
  }
}

// ============================================================================
// Approve Content
// ============================================================================

export async function approveContent(
  contentId: string,
  contentType: 'post' | 'comment',
  moderatorId: string
): Promise<void> {
  if (!['post', 'comment'].includes(contentType)) {
    throw new Error('Invalid content type');
  }

  const table = contentType === 'post' ? 'posts' : 'comments';

  const result = await query(
    `UPDATE ${table}
    SET moderation_status = 'approved',
        moderation_reason = NULL,
        moderated_by_user_id = $1,
        updated_at = NOW()
    WHERE id = $2
    RETURNING id`,
    [moderatorId, contentId]
  );

  if (result.rows.length === 0) {
    throw new Error(`${contentType} not found`);
  }
}

// ============================================================================
// Get Pending Reports
// ============================================================================

export async function getPendingReports(
  limit: number = 20,
  offset: number = 0
): Promise<{ reports: ContentReport[]; total: number }> {
  // Get total count
  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count
    FROM content_reports
    WHERE status IN ('pending', 'investigating')`
  );
  const total = parseInt(countResult.rows[0].count, 10);

  // Get reports
  const result = await query<ContentReport>(
    `SELECT * FROM content_reports
    WHERE status IN ('pending', 'investigating')
    ORDER BY created_at ASC
    LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  return {
    reports: result.rows,
    total,
  };
}

// ============================================================================
// Get Report by ID
// ============================================================================

export async function getReport(reportId: string): Promise<ContentReport | null> {
  const result = await query<ContentReport>(
    'SELECT * FROM content_reports WHERE id = $1',
    [reportId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

// ============================================================================
// Resolve Report
// ============================================================================

export async function resolveReport(
  reportId: string,
  resolution: ResolveReportRequest
): Promise<void> {
  if (!['resolved', 'dismissed'].includes(resolution.status)) {
    throw new Error('Invalid resolution status');
  }

  if (!resolution.resolution) {
    throw new Error('Resolution text is required');
  }

  if (!resolution.resolved_by_user_id) {
    throw new Error('Resolver user ID is required');
  }

  const result = await query(
    `UPDATE content_reports
    SET status = $1,
        resolution = $2,
        resolved_by_user_id = $3,
        resolved_at = NOW()
    WHERE id = $4
    RETURNING *`,
    [resolution.status, resolution.resolution, resolution.resolved_by_user_id, reportId]
  );

  if (result.rows.length === 0) {
    throw new Error('Report not found');
  }
}

// ============================================================================
// Flag Content for Review
// ============================================================================

export async function flagContentForReview(
  contentId: string,
  contentType: 'post' | 'comment'
): Promise<void> {
  if (!['post', 'comment'].includes(contentType)) {
    throw new Error('Invalid content type');
  }

  const table = contentType === 'post' ? 'posts' : 'comments';

  await query(
    `UPDATE ${table}
    SET moderation_status = 'flagged',
        updated_at = NOW()
    WHERE id = $1 AND moderation_status = 'approved'`,
    [contentId]
  );
}

// ============================================================================
// Get Flagged Content
// ============================================== ==============================

export async function getFlaggedContent(
  contentType: 'post' | 'comment',
  limit: number = 20,
  offset: number = 0
): Promise<{ content: any[]; total: number }> {
  if (!['post', 'comment'].includes(contentType)) {
    throw new Error('Invalid content type');
  }

  const table = contentType === 'post' ? 'posts' : 'comments';

  // Get total count
  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count
    FROM ${table}
    WHERE moderation_status = 'flagged'`
  );
  const total = parseInt(countResult.rows[0].count, 10);

  // Get flagged content
  const result = await query(
    `SELECT * FROM ${table}
    WHERE moderation_status = 'flagged'
    ORDER BY updated_at DESC
    LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  return {
    content: result.rows,
    total,
  };
}

// ============================================================================
// Auto-flag content with multiple reports
// ============================================================================

export async function checkAndAutoFlag(
  contentId: string,
  contentType: 'post' | 'comment'
): Promise<void> {
  if (!['post', 'comment'].includes(contentType)) {
    throw new Error('Invalid content type');
  }

  const field = contentType === 'post' ? 'post_id' : 'comment_id';

  // Count pending reports for this content
  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count
    FROM content_reports
    WHERE ${field} = $1 AND status = 'pending'`,
    [contentId]
  );

  const reportCount = parseInt(countResult.rows[0].count, 10);

  // Auto-flag if 3+ reports
  if (reportCount >= 3) {
    await flagContentForReview(contentId, contentType);
  }
}

// ============================================================================
// Get Reports for Content
// ============================================================================

export async function getContentReports(
  contentId: string,
  contentType: 'post' | 'comment'
): Promise<ContentReport[]> {
  if (!['post', 'comment'].includes(contentType)) {
    throw new Error('Invalid content type');
  }

  const field = contentType === 'post' ? 'post_id' : 'comment_id';

  const result = await query<ContentReport>(
    `SELECT * FROM content_reports
    WHERE ${field} = $1
    ORDER BY created_at DESC`,
    [contentId]
  );

  return result.rows;
}

// ============================================================================
// Moderation Stats
// ============================================================================

export async function getModerationStats(): Promise<{
  pending_reports: number;
  flagged_posts: number;
  flagged_comments: number;
  resolved_today: number;
}> {
  const pendingReports = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM content_reports WHERE status = 'pending'`
  );

  const flaggedPosts = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM posts WHERE moderation_status = 'flagged'`
  );

  const flaggedComments = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM comments WHERE moderation_status = 'flagged'`
  );

  const resolvedToday = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM content_reports
    WHERE status IN ('resolved', 'dismissed')
    AND resolved_at >= CURRENT_DATE`
  );

  return {
    pending_reports: parseInt(pendingReports.rows[0].count, 10),
    flagged_posts: parseInt(flaggedPosts.rows[0].count, 10),
    flagged_comments: parseInt(flaggedComments.rows[0].count, 10),
    resolved_today: parseInt(resolvedToday.rows[0].count, 10),
  };
}

// ============================================================================
// Export
// ============================================================================

export default {
  hideContent,
  removeContent,
  approveContent,
  getPendingReports,
  getReport,
  resolveReport,
  flagContentForReview,
  getFlaggedContent,
  checkAndAutoFlag,
  getContentReports,
  getModerationStats,
};
