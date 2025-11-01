/**
 * Module 08: Social - Notification Service
 * Handles notification creation, reading, and preferences
 */

import { query } from '../utils/database';
import { Notification, CreateNotificationRequest, NotificationPreferences, UpdatePreferencesRequest } from '../types';

// ============================================================================
// Create Notification
// ============================================================================

export async function createNotification(data: CreateNotificationRequest): Promise<Notification> {
  if (!data.recipient_user_id) {
    throw new Error('Recipient user ID is required');
  }

  if (!data.notification_type) {
    throw new Error('Notification type is required');
  }

  if (!data.message) {
    throw new Error('Message is required');
  }

  const result = await query<Notification>(
    `INSERT INTO notifications (
      recipient_user_id, actor_user_id, actor_identity_mode, actor_display_name,
      notification_type, post_id, comment_id, title, message, action_url, delivery_channels
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *`,
    [
      data.recipient_user_id,
      data.actor_user_id || null,
      data.actor_identity_mode || null,
      data.actor_display_name || null,
      data.notification_type,
      data.post_id || null,
      data.comment_id || null,
      data.title || null,
      data.message,
      data.action_url || null,
      JSON.stringify(data.delivery_channels || ['in_app']),
    ]
  );

  return result.rows[0];
}

// ============================================================================
// Mark as Read
// ============================================================================

export async function markAsRead(notificationId: string, userId: string): Promise<Notification> {
  const result = await query<Notification>(
    `UPDATE notifications
     SET is_read = TRUE, read_at = NOW()
     WHERE id = $1 AND recipient_user_id = $2
     RETURNING *`,
    [notificationId, userId]
  );

  if (result.rows.length === 0) {
    throw new Error('Notification not found or unauthorized');
  }

  return result.rows[0];
}

// ============================================================================
// Mark All as Read
// ============================================================================

export async function markAllAsRead(userId: string): Promise<number> {
  const result = await query(
    `UPDATE notifications
     SET is_read = TRUE, read_at = NOW()
     WHERE recipient_user_id = $1 AND is_read = FALSE
     RETURNING id`,
    [userId]
  );

  return result.rows.length;
}

// ============================================================================
// Get Unread Notifications
// ============================================================================

export async function getUnreadNotifications(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<Notification[]> {
  const result = await query<Notification>(
    `SELECT * FROM notifications
     WHERE recipient_user_id = $1 AND is_read = FALSE
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  return result.rows;
}

// ============================================================================
// Get Unread Count
// ============================================================================

export async function getUnreadCount(userId: string): Promise<number> {
  const result = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM notifications
     WHERE recipient_user_id = $1 AND is_read = FALSE`,
    [userId]
  );

  return parseInt(result.rows[0].count, 10);
}

// ============================================================================
// Get All Notifications
// ============================================================================

export async function getNotifications(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<Notification[]> {
  const result = await query<Notification>(
    `SELECT * FROM notifications
     WHERE recipient_user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  return result.rows;
}

// ============================================================================
// Get Notification Preferences
// ============================================================================

export async function getPreferences(userId: string): Promise<NotificationPreferences> {
  const result = await query<NotificationPreferences>(
    `SELECT * FROM notification_preferences WHERE user_id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    // Create default preferences
    return await createDefaultPreferences(userId);
  }

  return result.rows[0];
}

// ============================================================================
// Update Notification Preferences
// ============================================================================

export async function updatePreferences(
  userId: string,
  updates: UpdatePreferencesRequest
): Promise<NotificationPreferences> {
  // Build dynamic update query
  const updateFields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined) {
      updateFields.push(`${key} = $${paramIndex++}`);
      values.push(value);
    }
  });

  if (updateFields.length === 0) {
    throw new Error('No update fields provided');
  }

  updateFields.push('updated_at = NOW()');
  values.push(userId);

  const updateQuery = `
    UPDATE notification_preferences
    SET ${updateFields.join(', ')}
    WHERE user_id = $${paramIndex}
    RETURNING *
  `;

  const result = await query<NotificationPreferences>(updateQuery, values);

  if (result.rows.length === 0) {
    // Create preferences if they don't exist
    await createDefaultPreferences(userId);
    return await updatePreferences(userId, updates);
  }

  return result.rows[0];
}

// ============================================================================
// Helper: Create Default Preferences
// ============================================================================

async function createDefaultPreferences(userId: string): Promise<NotificationPreferences> {
  const result = await query<NotificationPreferences>(
    `INSERT INTO notification_preferences (user_id)
     VALUES ($1)
     RETURNING *`,
    [userId]
  );

  return result.rows[0];
}

// ============================================================================
// Delete Notification
// ============================================================================

export async function deleteNotification(notificationId: string, userId: string): Promise<void> {
  const result = await query(
    `DELETE FROM notifications
     WHERE id = $1 AND recipient_user_id = $2
     RETURNING id`,
    [notificationId, userId]
  );

  if (result.rows.length === 0) {
    throw new Error('Notification not found or unauthorized');
  }
}

// ============================================================================
// Export
// ============================================================================

export default {
  createNotification,
  markAsRead,
  markAllAsRead,
  getUnreadNotifications,
  getUnreadCount,
  getNotifications,
  getPreferences,
  updatePreferences,
  deleteNotification,
};
