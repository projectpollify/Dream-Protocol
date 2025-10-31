/**
 * Module 03: User - Settings Service
 *
 * Handles user settings and preferences management
 */

import bcrypt from 'bcrypt';
import {
  UserSettings,
  UpdateSettingsDTO,
  SettingsNotFoundError,
  NotificationPreferences,
  AllowLevel,
  ContentFilterLevel,
  IdentityMode,
} from '../types/user.types';
import * as db from '../utils/database';

// ============================================================================
// CREATE USER SETTINGS
// ============================================================================

/**
 * Create default settings for a new user
 */
export async function createUserSettings(
  user_id: string,
  email: string,
  password: string
): Promise<UserSettings> {
  // Hash password
  const password_hash = await bcrypt.hash(password, 10);

  // Create settings with defaults
  const settings = await db.insertOne<UserSettings>('user_settings', {
    user_id,
    email,
    password_hash,
    email_verified: false,
    two_factor_enabled: false,
    max_concurrent_sessions: 3,
    session_timeout_minutes: 1440, // 24 hours
    email_notifications: JSON.stringify({
      poll_results: true,
      new_followers: true,
      mentions: true,
      replies: true,
      governance_updates: true,
      weekly_digest: true,
    }),
    in_app_notifications: JSON.stringify({
      poll_results: true,
      new_followers: true,
      mentions: true,
      replies: true,
      reactions: true,
    }),
    push_notifications: JSON.stringify({
      mentions: true,
      replies: true,
      governance_urgent: true,
    }),
    show_online_status: true,
    allow_direct_messages: AllowLevel.EVERYONE,
    allow_tagging: AllowLevel.EVERYONE,
    default_identity_mode: IdentityMode.TRUE_SELF,
    content_filter_level: ContentFilterLevel.MODERATE,
    show_nsfw_content: false,
    language: 'en',
    timezone: 'UTC',
    date_format: 'YYYY-MM-DD',
  });

  return settings;
}

// ============================================================================
// GET USER SETTINGS
// ============================================================================

/**
 * Get user settings (sanitized - no password hash)
 */
export async function getUserSettings(
  user_id: string
): Promise<Omit<UserSettings, 'password_hash' | 'two_factor_secret' | 'backup_codes'>> {
  const settings = await db.findOne<UserSettings>('user_settings', { user_id });

  if (!settings) {
    throw new SettingsNotFoundError();
  }

  // Remove sensitive fields
  const { password_hash, two_factor_secret, backup_codes, ...sanitized } = settings;

  return sanitized;
}

// ============================================================================
// UPDATE USER SETTINGS
// ============================================================================

/**
 * Update user settings
 */
export async function updateUserSettings(
  data: UpdateSettingsDTO
): Promise<Omit<UserSettings, 'password_hash' | 'two_factor_secret' | 'backup_codes'>> {
  const { user_id, ...updates } = data;

  // Get current settings
  const currentSettings = await db.findOne<UserSettings>('user_settings', { user_id });

  if (!currentSettings) {
    throw new SettingsNotFoundError();
  }

  // Prepare update data
  const updateData: any = {};

  // Notification preferences
  if (updates.email_notifications) {
    const current = parseJSON(currentSettings.email_notifications);
    updateData.email_notifications = JSON.stringify({
      ...current,
      ...updates.email_notifications,
    });
  }

  if (updates.in_app_notifications) {
    const current = parseJSON(currentSettings.in_app_notifications);
    updateData.in_app_notifications = JSON.stringify({
      ...current,
      ...updates.in_app_notifications,
    });
  }

  if (updates.push_notifications) {
    const current = parseJSON(currentSettings.push_notifications);
    updateData.push_notifications = JSON.stringify({
      ...current,
      ...updates.push_notifications,
    });
  }

  // Privacy settings
  if (updates.privacy_settings) {
    if (updates.privacy_settings.show_online_status !== undefined) {
      updateData.show_online_status = updates.privacy_settings.show_online_status;
    }
    if (updates.privacy_settings.allow_direct_messages !== undefined) {
      updateData.allow_direct_messages = updates.privacy_settings.allow_direct_messages;
    }
    if (updates.privacy_settings.allow_tagging !== undefined) {
      updateData.allow_tagging = updates.privacy_settings.allow_tagging;
    }
  }

  // Content preferences
  if (updates.content_preferences) {
    if (updates.content_preferences.default_identity_mode !== undefined) {
      updateData.default_identity_mode =
        updates.content_preferences.default_identity_mode;
    }
    if (updates.content_preferences.content_filter_level !== undefined) {
      updateData.content_filter_level =
        updates.content_preferences.content_filter_level;
    }
    if (updates.content_preferences.show_nsfw_content !== undefined) {
      updateData.show_nsfw_content = updates.content_preferences.show_nsfw_content;
    }
  }

  // Platform preferences
  if (updates.platform_preferences) {
    if (updates.platform_preferences.language !== undefined) {
      updateData.language = updates.platform_preferences.language;
    }
    if (updates.platform_preferences.timezone !== undefined) {
      updateData.timezone = updates.platform_preferences.timezone;
    }
    if (updates.platform_preferences.date_format !== undefined) {
      updateData.date_format = updates.platform_preferences.date_format;
    }
  }

  // Update settings
  const updated = await db.updateOne<UserSettings>(
    'user_settings',
    { user_id },
    updateData
  );

  if (!updated) {
    throw new Error('Failed to update settings');
  }

  // Return sanitized settings
  const { password_hash, two_factor_secret, backup_codes, ...sanitized } = updated;
  return sanitized;
}

// ============================================================================
// EMAIL MANAGEMENT
// ============================================================================

/**
 * Update user email
 */
export async function updateEmail(
  user_id: string,
  new_email: string
): Promise<void> {
  // Check if email is already taken
  const existing = await db.findOne<UserSettings>('user_settings', {
    email: new_email,
  });

  if (existing && existing.user_id !== user_id) {
    throw new Error('Email already in use');
  }

  // Generate verification token
  const email_verification_token = generateVerificationToken();

  // Update email and mark as unverified
  await db.updateOne<UserSettings>(
    'user_settings',
    { user_id },
    {
      email: new_email,
      email_verified: false,
      email_verification_token,
    }
  );

  // TODO: Send verification email
}

/**
 * Verify email with token
 */
export async function verifyEmail(
  user_id: string,
  token: string
): Promise<boolean> {
  const settings = await db.findOne<UserSettings>('user_settings', { user_id });

  if (!settings) {
    throw new SettingsNotFoundError();
  }

  if (settings.email_verification_token !== token) {
    return false;
  }

  // Mark email as verified
  await db.updateOne<UserSettings>(
    'user_settings',
    { user_id },
    {
      email_verified: true,
      email_verified_at: new Date(),
      email_verification_token: null,
    }
  );

  return true;
}

// ============================================================================
// PASSWORD MANAGEMENT
// ============================================================================

/**
 * Change user password
 */
export async function changePassword(
  user_id: string,
  old_password: string,
  new_password: string
): Promise<void> {
  const settings = await db.findOne<UserSettings>('user_settings', { user_id });

  if (!settings) {
    throw new SettingsNotFoundError();
  }

  // Verify old password
  const isValid = await bcrypt.compare(old_password, settings.password_hash);
  if (!isValid) {
    throw new Error('Invalid current password');
  }

  // Hash new password
  const password_hash = await bcrypt.hash(new_password, 10);

  // Update password
  await db.updateOne<UserSettings>(
    'user_settings',
    { user_id },
    {
      password_hash,
      password_last_changed: new Date(),
    }
  );
}

/**
 * Request password reset
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const settings = await db.findOne<UserSettings>('user_settings', { email });

  if (!settings) {
    // Don't reveal if email exists (security)
    return;
  }

  // Generate reset token (expires in 1 hour)
  const password_reset_token = generateVerificationToken();
  const password_reset_expires = new Date(Date.now() + 60 * 60 * 1000);

  await db.updateOne<UserSettings>(
    'user_settings',
    { user_id: settings.user_id },
    {
      password_reset_token,
      password_reset_expires,
    }
  );

  // TODO: Send password reset email
}

/**
 * Reset password with token
 */
export async function resetPassword(
  token: string,
  new_password: string
): Promise<boolean> {
  const settings = await db.query<UserSettings>(
    `SELECT * FROM user_settings
     WHERE password_reset_token = $1
       AND password_reset_expires > NOW()
     LIMIT 1`,
    [token]
  );

  if (settings.rows.length === 0) {
    return false;
  }

  const user_settings = settings.rows[0];

  // Hash new password
  const password_hash = await bcrypt.hash(new_password, 10);

  // Update password and clear reset token
  await db.updateOne<UserSettings>(
    'user_settings',
    { user_id: user_settings.user_id },
    {
      password_hash,
      password_last_changed: new Date(),
      password_reset_token: null,
      password_reset_expires: null,
    }
  );

  return true;
}

/**
 * Verify password
 */
export async function verifyPassword(
  user_id: string,
  password: string
): Promise<boolean> {
  const settings = await db.findOne<UserSettings>('user_settings', { user_id });

  if (!settings) {
    return false;
  }

  return bcrypt.compare(password, settings.password_hash);
}

// ============================================================================
// TWO-FACTOR AUTHENTICATION
// ============================================================================

/**
 * Enable 2FA
 */
export async function enable2FA(
  user_id: string,
  secret: string,
  backup_codes: string[]
): Promise<void> {
  // Encrypt secret and backup codes (in production, use proper encryption)
  // For now, we'll store them directly (NOT SECURE - TODO: encrypt)

  await db.updateOne<UserSettings>(
    'user_settings',
    { user_id },
    {
      two_factor_enabled: true,
      two_factor_secret: secret,
      backup_codes,
    }
  );
}

/**
 * Disable 2FA
 */
export async function disable2FA(user_id: string): Promise<void> {
  await db.updateOne<UserSettings>(
    'user_settings',
    { user_id },
    {
      two_factor_enabled: false,
      two_factor_secret: null,
      backup_codes: null,
    }
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate random verification token
 */
function generateVerificationToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Safely parse JSON field
 */
function parseJSON(value: any): any {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  return value || {};
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  createUserSettings,
  getUserSettings,
  updateUserSettings,
  updateEmail,
  verifyEmail,
  changePassword,
  requestPasswordReset,
  resetPassword,
  verifyPassword,
  enable2FA,
  disable2FA,
};
