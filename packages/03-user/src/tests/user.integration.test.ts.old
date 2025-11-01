/**
 * Module 03: User - Integration Tests
 *
 * Tests for user profile, settings, and account management
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import profileService from '../services/profile.service';
import settingsService from '../services/settings.service';
import accountService from '../services/account.service';
import { IdentityMode, ProfileVisibility, AccountStatus } from '../types/user.types';
import * as db from '../utils/database';

// ============================================================================
// TEST SETUP
// ============================================================================

const TEST_USER_ID = '00000000-0000-0000-0000-000000000999';
const TEST_EMAIL = 'test@dreamprotocol.com';
const TEST_PASSWORD = 'TestPassword123!';

beforeAll(async () => {
  // Ensure database is connected
  const healthy = await db.healthCheck();
  if (!healthy) {
    throw new Error('Database not available for testing');
  }

  // Clean up any existing test data
  await cleanupTestData();
});

afterAll(async () => {
  // Clean up test data
  await cleanupTestData();

  // Close database connection
  await db.closePool();
});

async function cleanupTestData() {
  try {
    await db.query('DELETE FROM user_profiles WHERE user_id = $1', [TEST_USER_ID]);
    await db.query('DELETE FROM user_settings WHERE user_id = $1', [TEST_USER_ID]);
    await db.query('DELETE FROM user_account_status WHERE user_id = $1', [TEST_USER_ID]);
    await db.query('DELETE FROM user_preferences WHERE user_id = $1', [TEST_USER_ID]);
    await db.query('DELETE FROM profile_avatars WHERE user_id = $1', [TEST_USER_ID]);
  } catch (error) {
    // Ignore errors during cleanup
  }
}

// ============================================================================
// PROFILE SERVICE TESTS
// ============================================================================

describe('Profile Service', () => {
  it('should create True Self profile', async () => {
    const profile = await profileService.createUserProfile({
      user_id: TEST_USER_ID,
      identity_mode: IdentityMode.TRUE_SELF,
      display_name: 'Test User',
      bio: 'This is a test profile',
    });

    expect(profile).toBeDefined();
    expect(profile.user_id).toBe(TEST_USER_ID);
    expect(profile.identity_mode).toBe(IdentityMode.TRUE_SELF);
    expect(profile.display_name).toBe('Test User');
    expect(profile.bio).toBe('This is a test profile');
    expect(profile.profile_visibility).toBe(ProfileVisibility.PUBLIC);
  });

  it('should create Shadow profile with private visibility', async () => {
    const profile = await profileService.createUserProfile({
      user_id: TEST_USER_ID,
      identity_mode: IdentityMode.SHADOW,
      bio: 'Shadow profile',
    });

    expect(profile).toBeDefined();
    expect(profile.identity_mode).toBe(IdentityMode.SHADOW);
    expect(profile.profile_visibility).toBe(ProfileVisibility.PRIVATE);
    expect(profile.display_name).toMatch(/^Shadow_/);
  });

  it('should get user profile', async () => {
    const profile = await profileService.getUserProfile({
      user_id: TEST_USER_ID,
      identity_mode: IdentityMode.TRUE_SELF,
      viewer_user_id: TEST_USER_ID,
    });

    expect(profile).toBeDefined();
    expect(profile.display_name).toBe('Test User');
  });

  it('should update profile', async () => {
    const updated = await profileService.updateUserProfile(
      TEST_USER_ID,
      IdentityMode.TRUE_SELF,
      {
        display_name: 'Updated User',
        bio: 'Updated bio',
        website_url: 'https://example.com',
      }
    );

    expect(updated.display_name).toBe('Updated User');
    expect(updated.bio).toBe('Updated bio');
    expect(updated.website_url).toBe('https://example.com');
  });

  it('should add badge to profile', async () => {
    const updated = await profileService.addBadge(
      TEST_USER_ID,
      IdentityMode.TRUE_SELF,
      'founding_member',
      'Founding Member',
      'https://example.com/badge.png'
    );

    expect(updated.badges).toHaveLength(1);
    expect(updated.badges[0].badge_id).toBe('founding_member');
  });

  it('should search profiles', async () => {
    const results = await profileService.searchProfiles('Updated', 10);
    expect(results).toBeInstanceOf(Array);
  });
});

// ============================================================================
// SETTINGS SERVICE TESTS
// ============================================================================

describe('Settings Service', () => {
  it('should create user settings', async () => {
    const settings = await settingsService.createUserSettings(
      TEST_USER_ID,
      TEST_EMAIL,
      TEST_PASSWORD
    );

    expect(settings).toBeDefined();
    expect(settings.user_id).toBe(TEST_USER_ID);
    expect(settings.email).toBe(TEST_EMAIL);
    expect(settings.email_verified).toBe(false);
    expect(settings.password_hash).toBeDefined();
  });

  it('should get user settings', async () => {
    const settings = await settingsService.getUserSettings(TEST_USER_ID);

    expect(settings).toBeDefined();
    expect(settings.email).toBe(TEST_EMAIL);
    expect(settings).not.toHaveProperty('password_hash'); // Should be sanitized
  });

  it('should update settings', async () => {
    const updated = await settingsService.updateUserSettings({
      user_id: TEST_USER_ID,
      email_notifications: {
        poll_results: false,
        mentions: true,
      },
      privacy_settings: {
        show_online_status: false,
        allow_direct_messages: 'followers',
      },
    });

    expect(updated).toBeDefined();
    const emailNotifs = JSON.parse(updated.email_notifications as any);
    expect(emailNotifs.poll_results).toBe(false);
    expect(updated.show_online_status).toBe(false);
  });

  it('should verify password', async () => {
    const isValid = await settingsService.verifyPassword(
      TEST_USER_ID,
      TEST_PASSWORD
    );
    expect(isValid).toBe(true);

    const isInvalid = await settingsService.verifyPassword(
      TEST_USER_ID,
      'WrongPassword'
    );
    expect(isInvalid).toBe(false);
  });

  it('should change password', async () => {
    const newPassword = 'NewPassword456!';

    await settingsService.changePassword(
      TEST_USER_ID,
      TEST_PASSWORD,
      newPassword
    );

    // Verify new password works
    const isValid = await settingsService.verifyPassword(TEST_USER_ID, newPassword);
    expect(isValid).toBe(true);

    // Change back to original
    await settingsService.changePassword(
      TEST_USER_ID,
      newPassword,
      TEST_PASSWORD
    );
  });
});

// ============================================================================
// ACCOUNT SERVICE TESTS
// ============================================================================

describe('Account Service', () => {
  it('should create account status', async () => {
    const status = await accountService.createAccountStatus(TEST_USER_ID);

    expect(status).toBeDefined();
    expect(status.user_id).toBe(TEST_USER_ID);
    expect(status.status).toBe(AccountStatus.ACTIVE);
    expect(status.verified_account).toBe(false);
    expect(status.trust_score).toBe(50.0);
  });

  it('should get account status', async () => {
    const status = await accountService.getAccountStatus(TEST_USER_ID);

    expect(status).toBeDefined();
    expect(status.status).toBe(AccountStatus.ACTIVE);
  });

  it('should verify account', async () => {
    const status = await accountService.verifyAccount(TEST_USER_ID, 'manual');

    expect(status.verified_account).toBe(true);
    expect(status.verification_type).toBe('manual');
    expect(status.verified_at).toBeDefined();
  });

  it('should update trust score', async () => {
    const updated = await accountService.updateTrustScore({
      user_id: TEST_USER_ID,
      trust_score: 75.0,
      spam_score: 5.0,
      bot_probability: 2.0,
    });

    expect(updated.trust_score).toBe(75.0);
    expect(updated.spam_score).toBe(5.0);
    expect(updated.bot_probability).toBe(2.0);
  });

  it('should increase trust score', async () => {
    const before = await accountService.getAccountStatus(TEST_USER_ID);

    await accountService.increaseTrustScore(TEST_USER_ID, 5);

    const after = await accountService.getAccountStatus(TEST_USER_ID);
    expect(after.trust_score).toBe(before.trust_score + 5);
  });

  it('should issue warning', async () => {
    const status = await accountService.issueWarning(
      TEST_USER_ID,
      'Test warning',
      'admin_user_id'
    );

    expect(status.warning_count).toBeGreaterThan(0);
    expect(status.last_warning_at).toBeDefined();
  });

  it('should suspend account', async () => {
    const status = await accountService.suspendAccount(
      TEST_USER_ID,
      'admin_user_id',
      'Test suspension',
      7
    );

    expect(status.status).toBe(AccountStatus.SUSPENDED);
    expect(status.status_reason).toBe('Test suspension');
    expect(status.status_expires_at).toBeDefined();
  });

  it('should reactivate account', async () => {
    const status = await accountService.reactivateAccount(
      TEST_USER_ID,
      'admin_user_id'
    );

    expect(status.status).toBe(AccountStatus.ACTIVE);
  });

  it('should update last active', async () => {
    await accountService.updateLastActive(TEST_USER_ID);

    const status = await accountService.getAccountStatus(TEST_USER_ID);
    const now = new Date();
    const diff = now.getTime() - new Date(status.last_active_at).getTime();

    // Should be within 5 seconds
    expect(diff).toBeLessThan(5000);
  });
});

// ============================================================================
// DATABASE UTILITY TESTS
// ============================================================================

describe('Database Utilities', () => {
  it('should check if record exists', async () => {
    const exists = await db.exists('user_profiles', {
      user_id: TEST_USER_ID,
    });

    expect(exists).toBe(true);
  });

  it('should count records', async () => {
    const count = await db.count('user_profiles', {
      user_id: TEST_USER_ID,
    });

    expect(count).toBeGreaterThan(0);
  });

  it('should build WHERE clause', async () => {
    const { clause, values } = db.buildWhereClause({
      user_id: TEST_USER_ID,
      identity_mode: IdentityMode.TRUE_SELF,
    });

    expect(clause).toContain('WHERE');
    expect(clause).toContain('user_id = $1');
    expect(clause).toContain('identity_mode = $2');
    expect(values).toEqual([TEST_USER_ID, IdentityMode.TRUE_SELF]);
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Integration - Complete User Flow', () => {
  it('should create complete user with all components', async () => {
    const newUserId = '00000000-0000-0000-0000-000000001000';

    try {
      // 1. Create account status
      const accountStatus = await accountService.createAccountStatus(newUserId);
      expect(accountStatus.status).toBe(AccountStatus.ACTIVE);

      // 2. Create settings
      const settings = await settingsService.createUserSettings(
        newUserId,
        'newuser@test.com',
        'Password123!'
      );
      expect(settings.email).toBe('newuser@test.com');

      // 3. Create profiles (both identities)
      const trueSelfProfile = await profileService.createUserProfile({
        user_id: newUserId,
        identity_mode: IdentityMode.TRUE_SELF,
        display_name: 'New User',
      });
      expect(trueSelfProfile.identity_mode).toBe(IdentityMode.TRUE_SELF);

      const shadowProfile = await profileService.createUserProfile({
        user_id: newUserId,
        identity_mode: IdentityMode.SHADOW,
      });
      expect(shadowProfile.identity_mode).toBe(IdentityMode.SHADOW);

      // 4. Verify account
      await accountService.verifyAccount(newUserId, 'identity_verified');

      // 5. Update settings
      await settingsService.updateUserSettings({
        user_id: newUserId,
        privacy_settings: {
          show_online_status: false,
        },
      });

      // 6. Add badge
      await profileService.addBadge(
        newUserId,
        IdentityMode.TRUE_SELF,
        'early_adopter'
      );

      // Verify everything is set up correctly
      const finalStatus = await accountService.getAccountStatus(newUserId);
      expect(finalStatus.verified_account).toBe(true);

      const finalProfile = await profileService.getUserProfile({
        user_id: newUserId,
        identity_mode: IdentityMode.TRUE_SELF,
        viewer_user_id: newUserId,
      });
      expect(finalProfile.is_verified).toBe(true);
      expect(finalProfile.badges).toHaveLength(1);

      // Cleanup
      await db.query('DELETE FROM user_profiles WHERE user_id = $1', [newUserId]);
      await db.query('DELETE FROM user_settings WHERE user_id = $1', [newUserId]);
      await db.query('DELETE FROM user_account_status WHERE user_id = $1', [newUserId]);
    } catch (error) {
      // Cleanup on error
      await db.query('DELETE FROM user_profiles WHERE user_id = $1', [newUserId]);
      await db.query('DELETE FROM user_settings WHERE user_id = $1', [newUserId]);
      await db.query('DELETE FROM user_account_status WHERE user_id = $1', [newUserId]);
      throw error;
    }
  });
});
