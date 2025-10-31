/**
 * Module 03: User - TypeScript Types & Interfaces
 *
 * This file contains all type definitions for the User module including:
 * - User profiles (True Self + Shadow)
 * - User settings and preferences
 * - Account status and verification
 * - Profile avatars
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum IdentityMode {
  TRUE_SELF = 'true_self',
  SHADOW = 'shadow'
}

export enum ProfileVisibility {
  PUBLIC = 'public',
  FOLLOWERS_ONLY = 'followers_only',
  PRIVATE = 'private'
}

export enum AccountStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  BANNED = 'banned',
  DELETED = 'deleted',
  LOCKED = 'locked'
}

export enum VerificationType {
  MANUAL = 'manual',
  IDENTITY_VERIFIED = 'identity_verified',
  FOUNDING_MEMBER = 'founding_member'
}

export enum ContentFilterLevel {
  OFF = 'off',
  LOW = 'low',
  MODERATE = 'moderate',
  STRICT = 'strict'
}

export enum FeedAlgorithm {
  CHRONOLOGICAL = 'chronological',
  RELEVANCE = 'relevance',
  MIXED = 'mixed'
}

export enum FontSize {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  X_LARGE = 'x-large'
}

export enum AllowLevel {
  EVERYONE = 'everyone',
  FOLLOWERS = 'followers',
  NONE = 'none'
}

// ============================================================================
// USER PROFILE
// ============================================================================

export interface UserProfile {
  id: string;
  user_id: string;
  identity_mode: IdentityMode;

  // Basic Info
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;

  // Social Links
  website_url: string | null;
  twitter_handle: string | null;
  github_handle: string | null;
  linkedin_url: string | null;

  // Profile Customization
  theme: string;
  accent_color: string | null;
  profile_visibility: ProfileVisibility;

  // Badges & Achievements
  badges: Badge[];

  // Stats
  follower_count: number;
  following_count: number;
  post_count: number;
  poll_count: number;

  // Metadata
  created_at: Date;
  updated_at: Date;
  last_profile_update: Date | null;
}

export interface Badge {
  badge_id: string;
  earned_at: string;
  display_name?: string;
  icon_url?: string;
}

export interface CreateProfileDTO {
  user_id: string;
  identity_mode: IdentityMode;
  display_name?: string;
  bio?: string;
  avatar_file?: Express.Multer.File;
  theme?: string;
  profile_visibility?: ProfileVisibility;
}

export interface UpdateProfileDTO {
  display_name?: string;
  bio?: string;
  website_url?: string;
  twitter_handle?: string;
  github_handle?: string;
  linkedin_url?: string;
  theme?: string;
  accent_color?: string;
  profile_visibility?: ProfileVisibility;
}

// ============================================================================
// USER SETTINGS
// ============================================================================

export interface UserSettings {
  id: string;
  user_id: string;

  // Account Security
  email: string;
  email_verified: boolean;
  email_verification_token: string | null;
  email_verified_at: Date | null;

  two_factor_enabled: boolean;
  two_factor_secret: string | null;
  backup_codes: string[] | null;

  // Password Management
  password_hash: string;
  password_last_changed: Date;
  password_reset_token: string | null;
  password_reset_expires: Date | null;

  // Session Management
  max_concurrent_sessions: number;
  session_timeout_minutes: number;

  // Notification Preferences
  email_notifications: NotificationPreferences;
  in_app_notifications: NotificationPreferences;
  push_notifications: NotificationPreferences;

  // Privacy Settings
  show_online_status: boolean;
  allow_direct_messages: AllowLevel;
  allow_tagging: AllowLevel;

  // Content Preferences
  default_identity_mode: IdentityMode;
  content_filter_level: ContentFilterLevel;
  show_nsfw_content: boolean;

  // Platform Preferences
  language: string;
  timezone: string;
  date_format: string;

  // Metadata
  created_at: Date;
  updated_at: Date;
}

export interface NotificationPreferences {
  poll_results?: boolean;
  new_followers?: boolean;
  mentions?: boolean;
  replies?: boolean;
  governance_updates?: boolean;
  weekly_digest?: boolean;
  reactions?: boolean;
  governance_urgent?: boolean;
}

export interface UpdateSettingsDTO {
  user_id: string;
  email_notifications?: Partial<NotificationPreferences>;
  in_app_notifications?: Partial<NotificationPreferences>;
  push_notifications?: Partial<NotificationPreferences>;
  privacy_settings?: {
    show_online_status?: boolean;
    allow_direct_messages?: AllowLevel;
    allow_tagging?: AllowLevel;
  };
  content_preferences?: {
    default_identity_mode?: IdentityMode;
    content_filter_level?: ContentFilterLevel;
    show_nsfw_content?: boolean;
  };
  platform_preferences?: {
    language?: string;
    timezone?: string;
    date_format?: string;
  };
}

// ============================================================================
// USER PREFERENCES
// ============================================================================

export interface UserPreferences {
  id: string;
  user_id: string;

  // Display Preferences
  posts_per_page: number;
  auto_play_videos: boolean;
  show_preview_cards: boolean;
  compact_view: boolean;

  // Feed Preferences
  feed_algorithm: FeedAlgorithm;
  show_replies_in_feed: boolean;
  show_reposts: boolean;

  // Interaction Preferences
  auto_expand_threads: boolean;
  show_vote_counts: boolean;
  show_reaction_counts: boolean;

  // Accessibility
  reduce_motion: boolean;
  high_contrast: boolean;
  font_size: FontSize;

  // Chamber Preferences
  favorite_chambers: string[];
  hidden_chambers: string[];

  // Advanced
  show_experimental_features: boolean;
  developer_mode: boolean;

  // Metadata
  created_at: Date;
  updated_at: Date;
}

export interface UpdatePreferencesDTO {
  display_preferences?: {
    posts_per_page?: number;
    auto_play_videos?: boolean;
    show_preview_cards?: boolean;
    compact_view?: boolean;
  };
  feed_preferences?: {
    feed_algorithm?: FeedAlgorithm;
    show_replies_in_feed?: boolean;
    show_reposts?: boolean;
  };
  interaction_preferences?: {
    auto_expand_threads?: boolean;
    show_vote_counts?: boolean;
    show_reaction_counts?: boolean;
  };
  accessibility?: {
    reduce_motion?: boolean;
    high_contrast?: boolean;
    font_size?: FontSize;
  };
  chamber_preferences?: {
    favorite_chambers?: string[];
    hidden_chambers?: string[];
  };
  advanced?: {
    show_experimental_features?: boolean;
    developer_mode?: boolean;
  };
}

// ============================================================================
// USER ACCOUNT STATUS
// ============================================================================

export interface UserAccountStatus {
  id: string;
  user_id: string;

  // Account Status
  status: AccountStatus;
  status_reason: string | null;
  status_changed_at: Date;
  status_changed_by: string | null;
  status_expires_at: Date | null;

  // Verification
  verified_account: boolean;
  verification_type: VerificationType | null;
  verified_at: Date | null;

  // Trust Metrics
  trust_score: number;
  spam_score: number;
  bot_probability: number;

  // Account Age & Activity
  last_active_at: Date;
  total_sessions: number;

  // Warnings & Strikes
  warning_count: number;
  strike_count: number;
  last_warning_at: Date | null;

  // Metadata
  created_at: Date;
  updated_at: Date;
}

export interface UpdateAccountStatusDTO {
  user_id: string;
  status: AccountStatus;
  reason?: string;
  admin_user_id: string;
  expires_at?: Date;
}

export interface UpdateTrustScoreDTO {
  user_id: string;
  trust_score?: number;
  spam_score?: number;
  bot_probability?: number;
}

// ============================================================================
// PROFILE AVATARS
// ============================================================================

export interface ProfileAvatar {
  id: string;
  user_id: string;
  identity_mode: IdentityMode;

  // Image Data
  original_url: string;
  thumbnail_url: string | null;
  medium_url: string | null;
  large_url: string | null;

  // Metadata
  file_size_bytes: number | null;
  mime_type: string | null;
  width: number | null;
  height: number | null;

  // Status
  is_current: boolean;
  uploaded_at: Date;
}

export interface AvatarUrls {
  original: string;
  thumbnail: string;
  medium: string;
  large: string;
}

export interface UploadAvatarDTO {
  user_id: string;
  identity_mode: IdentityMode;
  file: Express.Multer.File;
}

// ============================================================================
// COMBINED USER DATA (for API responses)
// ============================================================================

export interface CompleteUserProfile {
  profile: UserProfile;
  settings: Omit<UserSettings, 'password_hash' | 'two_factor_secret' | 'backup_codes'>;
  preferences: UserPreferences;
  account_status: UserAccountStatus;
  avatar: AvatarUrls | null;
}

export interface PublicUserProfile {
  id: string;
  display_name: string | null;
  bio: string | null;
  avatar: AvatarUrls | null;
  banner_url: string | null;
  badges: Badge[];
  follower_count: number;
  following_count: number;
  post_count: number;
  poll_count: number;
  is_verified: boolean;
  account_status: AccountStatus;
  created_at: Date;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface GetProfileResponse {
  profile: PublicUserProfile;
}

export interface GetSettingsResponse {
  settings: Omit<UserSettings, 'password_hash' | 'two_factor_secret' | 'backup_codes'>;
}

export interface GetPreferencesResponse {
  preferences: UserPreferences;
}

export interface UploadAvatarResponse {
  success: boolean;
  avatar: AvatarUrls;
}

// ============================================================================
// DATABASE QUERY OPTIONS
// ============================================================================

export interface GetProfileOptions {
  user_id: string;
  identity_mode?: IdentityMode;
  viewer_user_id?: string; // Who is viewing (for privacy checks)
}

export interface ProfileQueryFilters {
  user_id?: string;
  identity_mode?: IdentityMode;
  profile_visibility?: ProfileVisibility;
  display_name?: string;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class UserModuleError extends Error {
  constructor(message: string, public code: string, public statusCode: number = 400) {
    super(message);
    this.name = 'UserModuleError';
  }
}

export class ProfileNotFoundError extends UserModuleError {
  constructor(message: string = 'Profile not found') {
    super(message, 'PROFILE_NOT_FOUND', 404);
  }
}

export class SettingsNotFoundError extends UserModuleError {
  constructor(message: string = 'User settings not found') {
    super(message, 'SETTINGS_NOT_FOUND', 404);
  }
}

export class UnauthorizedError extends UserModuleError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

export class PrivacyViolationError extends UserModuleError {
  constructor(message: string = 'Cannot view private profile') {
    super(message, 'PRIVACY_VIOLATION', 403);
  }
}
