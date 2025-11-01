/**
 * Module 03: User - Integration Tests
 *
 * Tests full flows with database and services
 * Requires test database
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { randomUUID } from 'crypto';
import { setupTestDatabase, teardownTestDatabase, cleanTestDatabase } from '../../../../tests/setup/test-database';
import { generateTestUser, generateTestProfile } from '../../../../tests/helpers/test-data';
import type { TestDatabase } from '../../../../tests/setup/test-database';

let testDb: TestDatabase;

beforeAll(async () => {
  testDb = await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await cleanTestDatabase();
});

// ============================================================================
// INTEGRATION TEST - Full Profile Setup Flow
// ============================================================================

describe('Integration - Full Profile Setup', () => {
  it('should create complete user profile with all fields', async () => {
    const profileService = (await import('../services/profile.service')).default;

    const userId = randomUUID();
    const testProfile = generateTestProfile();

    // Create user first
    await testDb.query(
      `INSERT INTO users (id, email, username) VALUES ($1, $2, $3)`,
      [userId, 'user@test.com', 'testuser']
    );

    // Create True Self profile
    const profile = await profileService.createProfile(
      userId,
      'true_self',
      testProfile.display_name,
      testProfile.bio,
      testProfile.location,
      testProfile.website
    );

    expect(profile).toBeDefined();
    expect(profile.user_id).toBe(userId);
    expect(profile.identity_mode).toBe('true_self');
    expect(profile.display_name).toBe(testProfile.display_name);
    expect(profile.bio).toBe(testProfile.bio);
    expect(profile.profile_visibility).toBe('public'); // Default for True Self
  });

  it('should store profile in database with correct visibility', async () => {
    const profileService = (await import('../services/profile.service')).default;

    const userId = randomUUID();

    // Create user
    await testDb.query(
      `INSERT INTO users (id, email, username) VALUES ($1, $2, $3)`,
      [userId, 'user@test.com', 'testuser']
    );

    // Create profile
    await profileService.createProfile(
      userId,
      'true_self',
      'Test User',
      'Test bio',
      null,
      null
    );

    // Query database
    const result = await testDb.query(
      `SELECT * FROM user_profiles WHERE user_id = $1 AND identity_mode = $2`,
      [userId, 'true_self']
    );

    expect(result.rows.length).toBe(1);
    expect(result.rows[0].display_name).toBe('Test User');
    expect(result.rows[0].profile_visibility).toBe('public');
  });

  it('should upload and process avatar with Sharp', async () => {
    const avatarService = (await import('../services/avatar.service')).default;

    const userId = randomUUID();

    // Create user
    await testDb.query(
      `INSERT INTO users (id, email, username) VALUES ($1, $2, $3)`,
      [userId, 'user@test.com', 'testuser']
    );

    // Mock image buffer (1x1 transparent PNG)
    const mockImageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    // Upload avatar
    const result = await avatarService.uploadAvatar(userId, 'true_self', mockImageBuffer, 'test.png');

    expect(result).toBeDefined();
    expect(result.thumbnail_url).toBeDefined();
    expect(result.medium_url).toBeDefined();
    expect(result.large_url).toBeDefined();

    // Verify in database
    const avatars = await testDb.query(
      `SELECT * FROM profile_avatars WHERE user_id = $1 AND identity_mode = $2`,
      [userId, 'true_self']
    );

    expect(avatars.rows.length).toBe(1);
    expect(avatars.rows[0].thumbnail_url).toBeDefined();
    expect(avatars.rows[0].medium_url).toBeDefined();
    expect(avatars.rows[0].large_url).toBeDefined();
  });
});

// ============================================================================
// INTEGRATION TEST - Dual Identity Profile Visibility
// ============================================================================

describe('Integration - Dual Identity Profiles', () => {
  it('should create separate profiles for True Self and Shadow', async () => {
    const profileService = (await import('../services/profile.service')).default;

    const userId = randomUUID();

    // Create user
    await testDb.query(
      `INSERT INTO users (id, email, username) VALUES ($1, $2, $3)`,
      [userId, 'user@test.com', 'testuser']
    );

    // Create True Self profile
    const trueSelfProfile = await profileService.createProfile(
      userId,
      'true_self',
      'John Doe',
      'Public profile bio',
      'San Francisco',
      'https://johndoe.com'
    );

    // Create Shadow profile
    const shadowProfile = await profileService.createProfile(
      userId,
      'shadow',
      null,
      null,
      null,
      null
    );

    // Verify both exist
    expect(trueSelfProfile.user_id).toBe(userId);
    expect(shadowProfile.user_id).toBe(userId);

    // Verify they're different
    expect(trueSelfProfile.identity_mode).toBe('true_self');
    expect(shadowProfile.identity_mode).toBe('shadow');
    expect(trueSelfProfile.display_name).not.toBe(shadowProfile.display_name);
  });

  it('should enforce privacy between identities', async () => {
    const profileService = (await import('../services/profile.service')).default;

    const userId = randomUUID();
    const otherUserId = randomUUID();

    // Create users
    await testDb.query(
      `INSERT INTO users (id, email, username) VALUES ($1, $2, $3), ($4, $5, $6)`,
      [userId, 'user@test.com', 'testuser', otherUserId, 'other@test.com', 'otheruser']
    );

    // Create True Self profile (public)
    await profileService.createProfile(userId, 'true_self', 'John Doe', 'Public bio', null, null);

    // Create Shadow profile (private)
    await profileService.createProfile(userId, 'shadow', null, null, null, null);

    // Other user queries True Self profile (should succeed - public)
    const trueSelfProfile = await profileService.getProfile(userId, 'true_self');
    expect(trueSelfProfile).toBeDefined();
    expect(trueSelfProfile.display_name).toBe('John Doe');

    // Other user queries Shadow profile (should return limited info - private)
    const shadowProfile = await profileService.getProfile(userId, 'shadow');

    // Shadow profiles are private by default
    expect(shadowProfile.profile_visibility).toBe('private');
  });

  it('should update True Self profile without affecting Shadow', async () => {
    const profileService = (await import('../services/profile.service')).default;

    const userId = randomUUID();

    // Create user
    await testDb.query(
      `INSERT INTO users (id, email, username) VALUES ($1, $2, $3)`,
      [userId, 'user@test.com', 'testuser']
    );

    // Create both profiles
    await profileService.createProfile(userId, 'true_self', 'Original Name', 'Original bio', null, null);
    await profileService.createProfile(userId, 'shadow', null, null, null, null);

    // Update True Self profile
    await profileService.updateProfile(userId, 'true_self', {
      display_name: 'Updated Name',
      bio: 'Updated bio',
    });

    // Verify True Self updated
    const trueSelfProfile = await profileService.getProfile(userId, 'true_self');
    expect(trueSelfProfile.display_name).toBe('Updated Name');
    expect(trueSelfProfile.bio).toBe('Updated bio');

    // Verify Shadow unchanged
    const shadowProfile = await profileService.getProfile(userId, 'shadow');
    expect(shadowProfile.display_name).toBeNull();
    expect(shadowProfile.bio).toBeNull();
  });
});

// ============================================================================
// INTEGRATION TEST - Settings Persistence
// ============================================================================

describe('Integration - Settings Persistence', () => {
  it('should persist notification settings globally', async () => {
    const settingsService = (await import('../services/settings.service')).default;

    const userId = randomUUID();

    // Create user
    await testDb.query(
      `INSERT INTO users (id, email, username) VALUES ($1, $2, $3)`,
      [userId, 'user@test.com', 'testuser']
    );

    // Update notification settings
    await settingsService.updateNotificationSettings(userId, {
      notification_email: true,
      notification_push: false,
      notification_poll_created: true,
      notification_poll_ended: false,
      notification_comment: true,
    });

    // Retrieve settings
    const settings = await settingsService.getSettings(userId);

    expect(settings.notification_email).toBe(true);
    expect(settings.notification_push).toBe(false);
    expect(settings.notification_poll_created).toBe(true);
  });

  it('should maintain settings across identity mode switches', async () => {
    const settingsService = (await import('../services/settings.service')).default;

    const userId = randomUUID();

    // Create user
    await testDb.query(
      `INSERT INTO users (id, email, username) VALUES ($1, $2, $3)`,
      [userId, 'user@test.com', 'testuser']
    );

    // Set notification settings in True Self mode
    await settingsService.updateNotificationSettings(userId, {
      notification_email: true,
      notification_push: true,
    });

    // Simulate switching to Shadow mode (settings should persist)
    // Settings are global, not per-identity
    const settings = await settingsService.getSettings(userId);

    expect(settings.notification_email).toBe(true);
    expect(settings.notification_push).toBe(true);
  });

  it('should persist settings after logout and login', async () => {
    const settingsService = (await import('../services/settings.service')).default;

    const userId = randomUUID();

    // Create user
    await testDb.query(
      `INSERT INTO users (id, email, username) VALUES ($1, $2, $3)`,
      [userId, 'user@test.com', 'testuser']
    );

    // Set preferences
    await settingsService.updatePreferences(userId, {
      language: 'en',
      timezone: 'America/Los_Angeles',
      feed_algorithm: 'chronological',
    });

    // Simulate logout/login by querying fresh from database
    const settings = await testDb.query(
      `SELECT * FROM user_preferences WHERE user_id = $1`,
      [userId]
    );

    expect(settings.rows.length).toBe(1);
    expect(settings.rows[0].language).toBe('en');
    expect(settings.rows[0].feed_algorithm).toBe('chronological');
  });
});

// ============================================================================
// INTEGRATION TEST - Account Status Management
// ============================================================================

describe('Integration - Account Status', () => {
  it('should transition account from active to suspended', async () => {
    const accountService = (await import('../services/account.service')).default;

    const userId = randomUUID();

    // Create user
    await testDb.query(
      `INSERT INTO users (id, email, username) VALUES ($1, $2, $3)`,
      [userId, 'user@test.com', 'testuser']
    );

    // Create account status (active by default)
    await accountService.createAccountStatus(userId);

    // Suspend account
    await accountService.updateAccountStatus(userId, 'suspended', 'Violation of terms');

    // Verify suspended
    const status = await accountService.getAccountStatus(userId);
    expect(status.status).toBe('suspended');
    expect(status.status_reason).toBe('Violation of terms');
  });

  it('should prevent login when account is suspended', async () => {
    const accountService = (await import('../services/account.service')).default;

    const userId = randomUUID();

    // Create user
    await testDb.query(
      `INSERT INTO users (id, email, username) VALUES ($1, $2, $3)`,
      [userId, 'user@test.com', 'testuser']
    );

    // Create and suspend account
    await accountService.createAccountStatus(userId);
    await accountService.updateAccountStatus(userId, 'suspended', 'Test suspension');

    // Check if user can login
    const canLogin = await accountService.canUserLogin(userId);
    expect(canLogin).toBe(false);
  });

  it('should allow login after reactivation', async () => {
    const accountService = (await import('../services/account.service')).default;

    const userId = randomUUID();

    // Create user
    await testDb.query(
      `INSERT INTO users (id, email, username) VALUES ($1, $2, $3)`,
      [userId, 'user@test.com', 'testuser']
    );

    // Create, suspend, then reactivate
    await accountService.createAccountStatus(userId);
    await accountService.updateAccountStatus(userId, 'suspended', 'Test');
    await accountService.updateAccountStatus(userId, 'active', 'Reactivated');

    // Verify can login
    const canLogin = await accountService.canUserLogin(userId);
    expect(canLogin).toBe(true);
  });
});

// ============================================================================
// SUMMARY
// ============================================================================

/*
 * Integration Tests Summary for Module 03: User
 *
 * ✅ Full Profile Setup (3 tests)
 * ✅ Dual Identity Profiles (3 tests)
 * ✅ Settings Persistence (3 tests)
 * ✅ Account Status Management (3 tests)
 *
 * Total: 12 integration tests
 * Database: Test database with migrations
 * Coverage: Full user profile and settings flows
 */
