/**
 * Module 07: Content - TypeScript Types
 */

export type IdentityMode = 'true_self' | 'shadow';
export type ContentType = 'post' | 'article' | 'question' | 'announcement';
export type ModerationStatus =
  | 'approved'
  | 'pending_review'
  | 'flagged'
  | 'hidden'
  | 'removed'
  | 'archived';

export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'hate_speech'
  | 'misinformation'
  | 'nsfw'
  | 'violence'
  | 'copyright'
  | 'other';

export type ReportStatus = 'pending' | 'investigating' | 'resolved' | 'dismissed';

// ============================================
// Post Types
// ============================================

export interface Post {
  id: string;
  user_id: string;
  identity_mode: IdentityMode;
  author_display_name: string;
  title: string;
  content: string;
  content_type: ContentType;
  category?: string;
  tags: string[];
  is_pinned: boolean;
  is_locked: boolean;
  comment_count: number;
  view_count: number;
  moderation_status: ModerationStatus;
  moderation_reason?: string;
  moderated_by_user_id?: string;
  is_deleted: boolean;
  deleted_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreatePostRequest {
  user_id: string;
  identity_mode: IdentityMode;
  author_display_name: string;
  title: string;
  content: string;
  content_type?: ContentType;
  category?: string;
  tags?: string[];
}

export interface UpdatePostRequest {
  title?: string;
  content?: string;
  content_type?: ContentType;
  category?: string;
  tags?: string[];
  is_pinned?: boolean;
  is_locked?: boolean;
}

export interface ListPostsOptions {
  limit?: number;
  offset?: number;
  category?: string;
  identity_mode?: IdentityMode;
  content_type?: ContentType;
  user_id?: string;
  sort_by?: 'created_at' | 'view_count' | 'comment_count';
  order?: 'asc' | 'desc';
  include_deleted?: boolean;
}

// ============================================
// Discussion Types
// ============================================

export interface Discussion {
  id: string;
  user_id: string;
  identity_mode: IdentityMode;
  creator_display_name: string;
  title: string;
  description?: string;
  topic?: string;
  is_open: boolean;
  requires_approval: boolean;
  participant_count: number;
  comment_count: number;
  moderation_status: ModerationStatus;
  is_deleted: boolean;
  archived_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreateDiscussionRequest {
  user_id: string;
  identity_mode: IdentityMode;
  creator_display_name: string;
  title: string;
  description?: string;
  topic?: string;
  requires_approval?: boolean;
}

export interface ListDiscussionsOptions {
  limit?: number;
  offset?: number;
  topic?: string;
  is_open?: boolean;
  user_id?: string;
  sort_by?: 'created_at' | 'participant_count' | 'comment_count';
  order?: 'asc' | 'desc';
}

// ============================================
// Comment Types
// ============================================

export interface Comment {
  id: string;
  user_id: string;
  identity_mode: IdentityMode;
  author_display_name: string;
  parent_post_id?: string;
  parent_discussion_id?: string;
  parent_comment_id?: string;
  content: string;
  depth: number;
  reply_count: number;
  moderation_status: ModerationStatus;
  moderation_reason?: string;
  moderated_by_user_id?: string;
  is_deleted: boolean;
  deleted_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreateCommentRequest {
  user_id: string;
  identity_mode: IdentityMode;
  author_display_name: string;
  content: string;
  parent_post_id?: string;
  parent_discussion_id?: string;
  parent_comment_id?: string;
}

export interface CommentWithReplies extends Comment {
  replies: CommentWithReplies[];
}

export interface ListCommentsOptions {
  limit?: number;
  offset?: number;
  parent_post_id?: string;
  parent_discussion_id?: string;
  parent_comment_id?: string;
  user_id?: string;
  include_deleted?: boolean;
}

// ============================================
// Media Types
// ============================================

export interface ContentMedia {
  id: string;
  user_id: string;
  post_id?: string;
  comment_id?: string;
  file_name: string;
  file_type: string;
  mime_type: string;
  file_size_bytes: number;
  storage_url: string;
  thumbnail_url?: string;
  width?: number;
  height?: number;
  duration_seconds?: number;
  alt_text?: string;
  is_deleted: boolean;
  created_at: Date;
}

// ============================================
// Mention Types
// ============================================

export interface ContentMention {
  id: string;
  mentioned_user_id: string;
  mentioned_by_user_id: string;
  post_id?: string;
  comment_id?: string;
  is_read: boolean;
  created_at: Date;
}

// ============================================
// Report Types
// ============================================

export interface ContentReport {
  id: string;
  reported_by_user_id: string;
  post_id?: string;
  comment_id?: string;
  reason: ReportReason;
  description?: string;
  status: ReportStatus;
  resolution?: string;
  resolved_by_user_id?: string;
  created_at: Date;
  resolved_at?: Date;
}

export interface CreateReportRequest {
  reported_by_user_id: string;
  post_id?: string;
  comment_id?: string;
  reason: ReportReason;
  description?: string;
}

export interface ResolveReportRequest {
  resolution: string;
  status: 'resolved' | 'dismissed';
  resolved_by_user_id: string;
}

// ============================================
// Edit History Types
// ============================================

export interface ContentEditHistory {
  id: string;
  post_id?: string;
  comment_id?: string;
  old_content: string;
  new_content: string;
  edited_by_user_id: string;
  edit_reason?: string;
  edited_at: Date;
}

// ============================================
// Moderation Types
// ============================================

export interface ModerationAction {
  content_id: string;
  content_type: 'post' | 'comment';
  action: 'hide' | 'remove' | 'approve';
  reason: string;
  moderator_id: string;
}
