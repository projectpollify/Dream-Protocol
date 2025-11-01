/**
 * Module 08: Social - TypeScript Types
 */

export type IdentityMode = 'true_self' | 'shadow';

export type ReactionType = 'upvote' | 'downvote' | 'helpful' | 'insightful' | 'inspiring' | 'funny';

export type NotificationType =
  | 'mention'
  | 'follow'
  | 'reaction'
  | 'reply'
  | 'comment'
  | 'governance_update'
  | 'verification_status'
  | 'moderation_action'
  | 'system';

export type ActivityType =
  | 'post_created'
  | 'comment_created'
  | 'reaction_added'
  | 'discussion_created'
  | 'poll_created'
  | 'poll_voted';

export type EmailDigestFrequency = 'instant' | 'daily' | 'weekly' | 'never';

// ============================================
// Reaction Types
// ============================================

export interface Reaction {
  id: string;
  user_id: string;
  identity_mode: IdentityMode;
  post_id?: string;
  comment_id?: string;
  reaction_type: ReactionType;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateReactionRequest {
  user_id: string;
  identity_mode: IdentityMode;
  post_id?: string;
  comment_id?: string;
  reaction_type: ReactionType;
}

export interface ReactionCounts {
  upvote?: number;
  downvote?: number;
  helpful?: number;
  insightful?: number;
  inspiring?: number;
  funny?: number;
}

// ============================================
// Follow Types
// ============================================

export interface Follow {
  id: string;
  follower_user_id: string;
  follower_identity_mode: IdentityMode;
  followee_user_id: string;
  followee_identity_mode: IdentityMode;
  is_active: boolean;
  created_at: Date;
  unfollowed_at?: Date;
}

export interface CreateFollowRequest {
  follower_user_id: string;
  follower_identity_mode: IdentityMode;
  followee_user_id: string;
  followee_identity_mode: IdentityMode;
}

// ============================================
// Block Types
// ============================================

export interface Block {
  id: string;
  blocker_user_id: string;
  blocker_identity_mode: IdentityMode;
  blocked_user_id: string;
  reason?: string;
  is_active: boolean;
  created_at: Date;
  unblocked_at?: Date;
}

export interface CreateBlockRequest {
  blocker_user_id: string;
  blocker_identity_mode: IdentityMode;
  blocked_user_id: string;
  reason?: string;
}

// ============================================
// Notification Types
// ============================================

export interface Notification {
  id: string;
  recipient_user_id: string;
  actor_user_id?: string;
  actor_identity_mode?: IdentityMode;
  actor_display_name?: string;
  notification_type: NotificationType;
  post_id?: string;
  comment_id?: string;
  title?: string;
  message?: string;
  action_url?: string;
  is_read: boolean;
  read_at?: Date;
  delivery_channels: string[];
  email_sent: boolean;
  push_sent: boolean;
  created_at: Date;
}

export interface CreateNotificationRequest {
  recipient_user_id: string;
  actor_user_id?: string;
  actor_identity_mode?: IdentityMode;
  actor_display_name?: string;
  notification_type: NotificationType;
  post_id?: string;
  comment_id?: string;
  title?: string;
  message: string;
  action_url?: string;
  delivery_channels?: string[];
}

// ============================================
// Activity Feed Types
// ============================================

export interface ActivityFeedItem {
  id: string;
  user_id: string;
  identity_mode: IdentityMode;
  display_name: string;
  activity_type: ActivityType;
  post_id?: string;
  comment_id?: string;
  content_preview?: string;
  content_type?: string;
  engagement_count: number;
  created_at: Date;
}

export interface CreateActivityRequest {
  user_id: string;
  identity_mode: IdentityMode;
  display_name: string;
  activity_type: ActivityType;
  post_id?: string;
  comment_id?: string;
  content_preview?: string;
  content_type?: string;
}

// ============================================
// Notification Preferences Types
// ============================================

export interface NotificationPreferences {
  id: string;
  user_id: string;
  mention_notifications: boolean;
  follow_notifications: boolean;
  reaction_notifications: boolean;
  reply_notifications: boolean;
  comment_notifications: boolean;
  governance_notifications: boolean;
  verification_notifications: boolean;
  system_notifications: boolean;
  email_on_mention: boolean;
  email_on_follow: boolean;
  email_on_reaction: boolean;
  email_on_reply: boolean;
  email_on_comment: boolean;
  push_on_mention: boolean;
  push_on_follow: boolean;
  push_on_reaction: boolean;
  push_on_reply: boolean;
  email_digest_frequency: EmailDigestFrequency;
  muted_users: string[];
  muted_keywords: string[];
  created_at: Date;
  updated_at: Date;
}

export interface UpdatePreferencesRequest {
  mention_notifications?: boolean;
  follow_notifications?: boolean;
  reaction_notifications?: boolean;
  reply_notifications?: boolean;
  comment_notifications?: boolean;
  governance_notifications?: boolean;
  verification_notifications?: boolean;
  system_notifications?: boolean;
  email_on_mention?: boolean;
  email_on_follow?: boolean;
  email_on_reaction?: boolean;
  email_on_reply?: boolean;
  email_on_comment?: boolean;
  push_on_mention?: boolean;
  push_on_follow?: boolean;
  push_on_reaction?: boolean;
  push_on_reply?: boolean;
  email_digest_frequency?: EmailDigestFrequency;
}

// ============================================
// Social Stats Types
// ============================================

export interface SocialStats {
  id: string;
  user_id: string;
  identity_mode: IdentityMode;
  follower_count: number;
  following_count: number;
  post_count: number;
  comment_count: number;
  reaction_count: number;
  total_engagements: number;
  engagement_rate: number;
  created_at: Date;
  updated_at: Date;
}
