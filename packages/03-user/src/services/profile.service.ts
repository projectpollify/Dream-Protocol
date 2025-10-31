/**
 * Module 03: User - Profile Service
 *
 * Handles user profile creation, retrieval, and updates for both
 * True Self and Shadow identities
 */

import {
  UserProfile,
  CreateProfileDTO,
  UpdateProfileDTO,
  GetProfileOptions,
  PublicUserProfile,
  ProfileNotFoundError,
  PrivacyViolationError,
  IdentityMode,
  ProfileVisibility,
  AvatarUrls,
} from '../types/user.types';
import * as db from '../utils/database';

// ============================================================================
// CREATE PROFILE
// ============================================================================

/**
 * Create a new user profile for a specific identity mode
 */
export async function createUserProfile(
  data: CreateProfileDTO
): Promise<UserProfile> {
  const { user_id, identity_mode, display_name, bio, theme, profile_visibility } = data;

  // Check if profile already exists for this identity mode
  const existing = await db.findOne<UserProfile>('user_profiles', {
    user_id,
    identity_mode,
  });

  if (existing) {
    throw new Error(
      `Profile already exists for user ${user_id} in ${identity_mode} mode`
    );
  }

  // Default display name based on mode
  const defaultDisplayName =
    identity_mode === IdentityMode.SHADOW
      ? `Shadow_${Math.random().toString(36).substring(2, 9)}`
      : null;

  // Default visibility based on mode
  const defaultVisibility =
    identity_mode === IdentityMode.SHADOW
      ? ProfileVisibility.PRIVATE
      : ProfileVisibility.PUBLIC;

  // Create profile
  const profile = await db.insertOne<UserProfile>('user_profiles', {
    user_id,
    identity_mode,
    display_name: display_name || defaultDisplayName,
    bio: bio || null,
    theme: theme || 'default',
    profile_visibility: profile_visibility || defaultVisibility,
    badges: JSON.stringify([]),
    follower_count: 0,
    following_count: 0,
    post_count: 0,
    poll_count: 0,
  });

  return profile;
}

// ============================================================================
// GET PROFILE
// ============================================================================

/**
 * Get user profile with privacy checks
 */
export async function getUserProfile(
  options: GetProfileOptions
): Promise<PublicUserProfile> {
  const { user_id, identity_mode, viewer_user_id } = options;

  // Build query filters
  const filters: any = { user_id };
  if (identity_mode) {
    filters.identity_mode = identity_mode;
  }

  // Get profile
  const profile = await db.findOne<UserProfile>('user_profiles', filters);

  if (!profile) {
    throw new ProfileNotFoundError(
      `Profile not found for user ${user_id}${identity_mode ? ` in ${identity_mode} mode` : ''}`
    );
  }

  // Check privacy settings
  const isOwnProfile = viewer_user_id === user_id;
  const canViewProfile = await checkProfileVisibility(
    profile,
    viewer_user_id,
    isOwnProfile
  );

  if (!canViewProfile) {
    throw new PrivacyViolationError('Cannot view private profile');
  }

  // Get account status
  const accountStatus = await db.findOne<any>('user_account_status', { user_id });

  // Get avatar
  const avatar = await db.findOne<any>('profile_avatars', {
    user_id,
    identity_mode: profile.identity_mode,
    is_current: true,
  });

  // Return sanitized public profile
  return {
    id: profile.id,
    display_name: profile.display_name,
    bio: profile.bio,
    avatar: avatar
      ? {
          thumbnail: avatar.thumbnail_url,
          medium: avatar.medium_url,
          large: avatar.large_url,
          original: avatar.original_url,
        }
      : null,
    banner_url: profile.banner_url,
    badges: Array.isArray(profile.badges) ? profile.badges : [],
    follower_count: profile.follower_count,
    following_count: profile.following_count,
    post_count: profile.post_count,
    poll_count: profile.poll_count,
    is_verified: accountStatus?.verified_account || false,
    account_status: accountStatus?.status || 'active',
    created_at: profile.created_at,
  };
}

/**
 * Check if viewer can see the profile based on privacy settings
 */
async function checkProfileVisibility(
  profile: UserProfile,
  viewer_user_id: string | undefined,
  isOwnProfile: boolean
): Promise<boolean> {
  // Own profile is always visible
  if (isOwnProfile) {
    return true;
  }

  // Public profiles are always visible
  if (profile.profile_visibility === ProfileVisibility.PUBLIC) {
    return true;
  }

  // Private profiles only visible to self
  if (profile.profile_visibility === ProfileVisibility.PRIVATE) {
    return false;
  }

  // Followers-only check (would need social module integration)
  if (profile.profile_visibility === ProfileVisibility.FOLLOWERS_ONLY) {
    if (!viewer_user_id) {
      return false;
    }

    // TODO: Check if viewer is following this user (requires social module)
    // For now, return false
    return false;
  }

  return false;
}

// ============================================================================
// UPDATE PROFILE
// ============================================================================

/**
 * Update user profile
 */
export async function updateUserProfile(
  user_id: string,
  identity_mode: IdentityMode,
  updates: UpdateProfileDTO
): Promise<UserProfile> {
  // Get existing profile
  const existing = await db.findOne<UserProfile>('user_profiles', {
    user_id,
    identity_mode,
  });

  if (!existing) {
    throw new ProfileNotFoundError();
  }

  // Prepare updates
  const updateData: any = {
    ...updates,
    last_profile_update: new Date(),
  };

  // Update profile
  const updated = await db.updateOne<UserProfile>(
    'user_profiles',
    { user_id, identity_mode },
    updateData
  );

  if (!updated) {
    throw new Error('Failed to update profile');
  }

  return updated;
}

// ============================================================================
// DELETE PROFILE
// ============================================================================

/**
 * Delete user profile (soft delete by setting visibility to private)
 */
export async function deleteUserProfile(
  user_id: string,
  identity_mode: IdentityMode
): Promise<boolean> {
  // Instead of hard delete, set visibility to private
  const updated = await db.updateOne<UserProfile>(
    'user_profiles',
    { user_id, identity_mode },
    {
      profile_visibility: ProfileVisibility.PRIVATE,
      bio: null,
      website_url: null,
      twitter_handle: null,
      github_handle: null,
      linkedin_url: null,
    }
  );

  return updated !== null;
}

// ============================================================================
// PROFILE STATS
// ============================================================================

/**
 * Update profile stats (follower count, post count, etc.)
 */
export async function updateProfileStats(
  user_id: string,
  identity_mode: IdentityMode,
  stats: {
    follower_count?: number;
    following_count?: number;
    post_count?: number;
    poll_count?: number;
  }
): Promise<UserProfile> {
  const updated = await db.updateOne<UserProfile>(
    'user_profiles',
    { user_id, identity_mode },
    stats
  );

  if (!updated) {
    throw new ProfileNotFoundError();
  }

  return updated;
}

/**
 * Increment profile stat (e.g., post_count++)
 */
export async function incrementProfileStat(
  user_id: string,
  identity_mode: IdentityMode,
  stat: 'follower_count' | 'following_count' | 'post_count' | 'poll_count',
  amount: number = 1
): Promise<void> {
  await db.query(
    `UPDATE user_profiles
     SET ${stat} = ${stat} + $1
     WHERE user_id = $2 AND identity_mode = $3`,
    [amount, user_id, identity_mode]
  );
}

// ============================================================================
// BADGES
// ============================================================================

/**
 * Add badge to user profile
 */
export async function addBadge(
  user_id: string,
  identity_mode: IdentityMode,
  badge_id: string,
  display_name?: string,
  icon_url?: string
): Promise<UserProfile> {
  const profile = await db.findOne<UserProfile>('user_profiles', {
    user_id,
    identity_mode,
  });

  if (!profile) {
    throw new ProfileNotFoundError();
  }

  const badges = Array.isArray(profile.badges) ? profile.badges : [];
  const badgeExists = badges.some((b: any) => b.badge_id === badge_id);

  if (badgeExists) {
    throw new Error(`Badge ${badge_id} already exists on profile`);
  }

  badges.push({
    badge_id,
    earned_at: new Date().toISOString(),
    display_name,
    icon_url,
  });

  const updated = await db.updateOne<UserProfile>(
    'user_profiles',
    { user_id, identity_mode },
    { badges: JSON.stringify(badges) }
  );

  if (!updated) {
    throw new Error('Failed to add badge');
  }

  return updated;
}

/**
 * Remove badge from user profile
 */
export async function removeBadge(
  user_id: string,
  identity_mode: IdentityMode,
  badge_id: string
): Promise<UserProfile> {
  const profile = await db.findOne<UserProfile>('user_profiles', {
    user_id,
    identity_mode,
  });

  if (!profile) {
    throw new ProfileNotFoundError();
  }

  const badges = Array.isArray(profile.badges) ? profile.badges : [];
  const filteredBadges = badges.filter((b: any) => b.badge_id !== badge_id);

  const updated = await db.updateOne<UserProfile>(
    'user_profiles',
    { user_id, identity_mode },
    { badges: JSON.stringify(filteredBadges) }
  );

  if (!updated) {
    throw new Error('Failed to remove badge');
  }

  return updated;
}

// ============================================================================
// SEARCH PROFILES
// ============================================================================

/**
 * Search profiles by display name
 */
export async function searchProfiles(
  searchQuery: string,
  limit: number = 20
): Promise<PublicUserProfile[]> {
  const result = await db.query<UserProfile>(
    `SELECT p.*, a.verified_account, s.status
     FROM user_profiles p
     LEFT JOIN user_account_status a ON p.user_id = a.user_id
     LEFT JOIN user_settings s ON p.user_id = s.user_id
     WHERE p.display_name ILIKE $1
       AND p.profile_visibility = 'public'
       AND a.status = 'active'
     ORDER BY p.follower_count DESC
     LIMIT $2`,
    [`%${searchQuery}%`, limit]
  );

  return result.rows.map((row: any) => ({
    id: row.id,
    display_name: row.display_name,
    bio: row.bio,
    avatar: null, // Would need to join with profile_avatars
    banner_url: row.banner_url,
    badges: Array.isArray(row.badges) ? row.badges : [],
    follower_count: row.follower_count,
    following_count: row.following_count,
    post_count: row.post_count,
    poll_count: row.poll_count,
    is_verified: row.verified_account || false,
    account_status: row.status || 'active',
    created_at: row.created_at,
  }));
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  createUserProfile,
  getUserProfile,
  updateUserProfile,
  deleteUserProfile,
  updateProfileStats,
  incrementProfileStat,
  addBadge,
  removeBadge,
  searchProfiles,
};
