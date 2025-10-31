/**
 * Module 03: User - Account Service
 *
 * Handles account status, verification, trust scores, and moderation
 */

import {
  UserAccountStatus,
  UpdateAccountStatusDTO,
  UpdateTrustScoreDTO,
  AccountStatus,
  VerificationType,
} from '../types/user.types';
import * as db from '../utils/database';

// ============================================================================
// CREATE ACCOUNT STATUS
// ============================================================================

/**
 * Create default account status for a new user
 */
export async function createAccountStatus(user_id: string): Promise<UserAccountStatus> {
  const accountStatus = await db.insertOne<UserAccountStatus>('user_account_status', {
    user_id,
    status: AccountStatus.ACTIVE,
    verified_account: false,
    trust_score: 50.0, // Start at neutral 50
    spam_score: 0.0,
    bot_probability: 0.0,
    warning_count: 0,
    strike_count: 0,
    total_sessions: 0,
  });

  return accountStatus;
}

// ============================================================================
// GET ACCOUNT STATUS
// ============================================================================

/**
 * Get user account status
 */
export async function getAccountStatus(user_id: string): Promise<UserAccountStatus> {
  const status = await db.findOne<UserAccountStatus>('user_account_status', {
    user_id,
  });

  if (!status) {
    throw new Error('Account status not found');
  }

  return status;
}

// ============================================================================
// UPDATE ACCOUNT STATUS
// ============================================================================

/**
 * Update account status (admin action)
 */
export async function updateAccountStatus(
  data: UpdateAccountStatusDTO
): Promise<UserAccountStatus> {
  const { user_id, status, reason, admin_user_id, expires_at } = data;

  // Get current status
  const current = await getAccountStatus(user_id);

  // Update status
  const updated = await db.updateOne<UserAccountStatus>(
    'user_account_status',
    { user_id },
    {
      status,
      status_reason: reason,
      status_changed_at: new Date(),
      status_changed_by: admin_user_id,
      status_expires_at: expires_at || null,
    }
  );

  if (!updated) {
    throw new Error('Failed to update account status');
  }

  // Log the change (would integrate with Module 21: Admin)
  await logAccountStatusChange(user_id, admin_user_id, current.status, status, reason);

  // Send notification to user
  await sendAccountStatusNotification(user_id, status, reason);

  return updated;
}

/**
 * Suspend account temporarily
 */
export async function suspendAccount(
  user_id: string,
  admin_user_id: string,
  reason: string,
  duration_days: number
): Promise<UserAccountStatus> {
  const expires_at = new Date();
  expires_at.setDate(expires_at.getDate() + duration_days);

  return updateAccountStatus({
    user_id,
    status: AccountStatus.SUSPENDED,
    reason,
    admin_user_id,
    expires_at,
  });
}

/**
 * Ban account permanently
 */
export async function banAccount(
  user_id: string,
  admin_user_id: string,
  reason: string
): Promise<UserAccountStatus> {
  return updateAccountStatus({
    user_id,
    status: AccountStatus.BANNED,
    reason,
    admin_user_id,
  });
}

/**
 * Reactivate account
 */
export async function reactivateAccount(
  user_id: string,
  admin_user_id: string
): Promise<UserAccountStatus> {
  // Clear strikes and warnings
  const updated = await updateAccountStatus({
    user_id,
    status: AccountStatus.ACTIVE,
    admin_user_id,
  });

  // Reset warnings/strikes
  await db.updateOne<UserAccountStatus>(
    'user_account_status',
    { user_id },
    {
      warning_count: 0,
      strike_count: 0,
      last_warning_at: null,
    }
  );

  return updated;
}

// ============================================================================
// VERIFICATION
// ============================================================================

/**
 * Verify user account
 */
export async function verifyAccount(
  user_id: string,
  verification_type: VerificationType
): Promise<UserAccountStatus> {
  const updated = await db.updateOne<UserAccountStatus>(
    'user_account_status',
    { user_id },
    {
      verified_account: true,
      verification_type,
      verified_at: new Date(),
    }
  );

  if (!updated) {
    throw new Error('Failed to verify account');
  }

  return updated;
}

/**
 * Revoke account verification
 */
export async function revokeVerification(user_id: string): Promise<UserAccountStatus> {
  const updated = await db.updateOne<UserAccountStatus>(
    'user_account_status',
    { user_id },
    {
      verified_account: false,
      verification_type: null,
      verified_at: null,
    }
  );

  if (!updated) {
    throw new Error('Failed to revoke verification');
  }

  return updated;
}

// ============================================================================
// TRUST SCORES
// ============================================================================

/**
 * Update trust scores
 */
export async function updateTrustScore(
  data: UpdateTrustScoreDTO
): Promise<UserAccountStatus> {
  const { user_id, trust_score, spam_score, bot_probability } = data;

  const updates: any = {};

  if (trust_score !== undefined) {
    // Clamp between 0-100
    updates.trust_score = Math.max(0, Math.min(100, trust_score));
  }

  if (spam_score !== undefined) {
    // Clamp between 0-100
    updates.spam_score = Math.max(0, Math.min(100, spam_score));
  }

  if (bot_probability !== undefined) {
    // Clamp between 0-100
    updates.bot_probability = Math.max(0, Math.min(100, bot_probability));
  }

  const updated = await db.updateOne<UserAccountStatus>(
    'user_account_status',
    { user_id },
    updates
  );

  if (!updated) {
    throw new Error('Failed to update trust score');
  }

  // Auto-moderate if scores cross thresholds
  await checkAutoModeration(updated);

  return updated;
}

/**
 * Increase trust score (reward good behavior)
 */
export async function increaseTrustScore(
  user_id: string,
  amount: number = 1
): Promise<void> {
  const current = await getAccountStatus(user_id);
  const new_score = Math.min(100, current.trust_score + amount);

  await updateTrustScore({
    user_id,
    trust_score: new_score,
  });
}

/**
 * Decrease trust score (penalize bad behavior)
 */
export async function decreaseTrustScore(
  user_id: string,
  amount: number = 5
): Promise<void> {
  const current = await getAccountStatus(user_id);
  const new_score = Math.max(0, current.trust_score - amount);

  await updateTrustScore({
    user_id,
    trust_score: new_score,
  });
}

// ============================================================================
// WARNINGS & STRIKES
// ============================================================================

/**
 * Issue warning to user
 */
export async function issueWarning(
  user_id: string,
  reason: string,
  admin_user_id: string
): Promise<UserAccountStatus> {
  const current = await getAccountStatus(user_id);

  const updated = await db.updateOne<UserAccountStatus>(
    'user_account_status',
    { user_id },
    {
      warning_count: current.warning_count + 1,
      last_warning_at: new Date(),
    }
  );

  if (!updated) {
    throw new Error('Failed to issue warning');
  }

  // Log warning
  await logWarning(user_id, admin_user_id, reason);

  // Send notification
  await sendWarningNotification(user_id, reason);

  // Check if warnings should convert to strike
  if (updated.warning_count >= 3) {
    await issueStrike(user_id, 'Multiple warnings', admin_user_id);
  }

  return updated;
}

/**
 * Issue strike to user (more serious than warning)
 */
export async function issueStrike(
  user_id: string,
  reason: string,
  admin_user_id: string
): Promise<UserAccountStatus> {
  const current = await getAccountStatus(user_id);

  const updated = await db.updateOne<UserAccountStatus>(
    'user_account_status',
    { user_id },
    {
      strike_count: current.strike_count + 1,
    }
  );

  if (!updated) {
    throw new Error('Failed to issue strike');
  }

  // Log strike
  await logStrike(user_id, admin_user_id, reason);

  // Send notification
  await sendStrikeNotification(user_id, reason);

  // Auto-action based on strike count
  if (updated.strike_count >= 3) {
    // 3 strikes = suspension
    await suspendAccount(user_id, admin_user_id, 'Three strikes', 7);
  }

  if (updated.strike_count >= 5) {
    // 5 strikes = ban
    await banAccount(user_id, admin_user_id, 'Five strikes - permanent ban');
  }

  return updated;
}

// ============================================================================
// ACTIVITY TRACKING
// ============================================================================

/**
 * Update last active timestamp
 */
export async function updateLastActive(user_id: string): Promise<void> {
  await db.updateOne<UserAccountStatus>(
    'user_account_status',
    { user_id },
    {
      last_active_at: new Date(),
    }
  );
}

/**
 * Increment session count
 */
export async function incrementSessionCount(user_id: string): Promise<void> {
  await db.query(
    `UPDATE user_account_status
     SET total_sessions = total_sessions + 1
     WHERE user_id = $1`,
    [user_id]
  );
}

/**
 * Get account age in days
 */
export async function getAccountAgeDays(user_id: string): Promise<number> {
  const result = await db.query<{ age_days: number }>(
    `SELECT get_account_age_days($1) as age_days`,
    [user_id]
  );

  return result.rows[0]?.age_days || 0;
}

// ============================================================================
// AUTO-MODERATION
// ============================================================================

/**
 * Check if account should be auto-moderated based on trust scores
 */
async function checkAutoModeration(status: UserAccountStatus): Promise<void> {
  const { user_id, trust_score, spam_score, bot_probability } = status;

  // Auto-lock if bot probability > 90%
  if (bot_probability > 90) {
    await updateAccountStatus({
      user_id,
      status: AccountStatus.LOCKED,
      reason: 'Automatic: High bot probability detected',
      admin_user_id: 'system',
    });
  }

  // Auto-suspend if spam score > 80%
  if (spam_score > 80) {
    await suspendAccount(user_id, 'system', 'Automatic: High spam score', 3);
  }

  // Issue warning if trust score < 20
  if (trust_score < 20) {
    await issueWarning(user_id, 'Low trust score', 'system');
  }
}

// ============================================================================
// HELPER FUNCTIONS (stubs for now - would integrate with other modules)
// ============================================================================

async function logAccountStatusChange(
  user_id: string,
  admin_user_id: string,
  old_status: AccountStatus,
  new_status: AccountStatus,
  reason: string | undefined
): Promise<void> {
  // TODO: Integrate with Module 21 (Admin) for logging
  console.log('Account status changed:', {
    user_id,
    admin_user_id,
    old_status,
    new_status,
    reason,
  });
}

async function sendAccountStatusNotification(
  user_id: string,
  status: AccountStatus,
  reason: string | undefined
): Promise<void> {
  // TODO: Send notification to user (email, in-app, etc.)
  console.log('Notification:', { user_id, status, reason });
}

async function logWarning(
  user_id: string,
  admin_user_id: string,
  reason: string
): Promise<void> {
  console.log('Warning issued:', { user_id, admin_user_id, reason });
}

async function sendWarningNotification(
  user_id: string,
  reason: string
): Promise<void> {
  console.log('Warning notification:', { user_id, reason });
}

async function logStrike(
  user_id: string,
  admin_user_id: string,
  reason: string
): Promise<void> {
  console.log('Strike issued:', { user_id, admin_user_id, reason });
}

async function sendStrikeNotification(user_id: string, reason: string): Promise<void> {
  console.log('Strike notification:', { user_id, reason });
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  createAccountStatus,
  getAccountStatus,
  updateAccountStatus,
  suspendAccount,
  banAccount,
  reactivateAccount,
  verifyAccount,
  revokeVerification,
  updateTrustScore,
  increaseTrustScore,
  decreaseTrustScore,
  issueWarning,
  issueStrike,
  updateLastActive,
  incrementSessionCount,
  getAccountAgeDays,
};
