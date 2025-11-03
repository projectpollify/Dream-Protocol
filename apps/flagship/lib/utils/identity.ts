/**
 * Identity Utility Functions
 * Helper functions for dual-identity system
 */

import { IdentityMode, User } from '../api/types';

/**
 * Check if content belongs to the current user
 * Handles both true_self and shadow modes
 */
export function isOwnContent(
  contentCreatorId: string,
  contentCreatorMode: IdentityMode,
  currentUser: User | null
): boolean {
  if (!currentUser) return false;

  // If content was created by the same user ID
  if (contentCreatorId === currentUser.id) {
    // Must also be in the same mode to be "own content"
    return contentCreatorMode === currentUser.mode;
  }

  // Check if content creator identity matches current identity
  return contentCreatorId === currentUser.identity;
}

/**
 * Check if user can access content based on mode-locking rules
 * Same user in different mode = NO ACCESS
 */
export function canAccessContent(
  contentCreatorId: string,
  contentCreatorMode: IdentityMode,
  currentUser: User | null
): boolean {
  if (!currentUser) return false;

  // If same user, modes must match
  if (contentCreatorId === currentUser.id) {
    return contentCreatorMode === currentUser.mode;
  }

  // Different users can see each other's content
  return true;
}

/**
 * Sanitize user data based on current mode
 * Remove sensitive information in shadow mode
 */
export function sanitizeUserData(user: User, mode: IdentityMode): Partial<User> {
  if (mode === 'shadow') {
    // In shadow mode, exclude sensitive information
    const { username, email, ...shadowData } = user;
    return shadowData;
  }

  // In true_self mode, return all data
  return user;
}

/**
 * Generate a shadow display name from hash
 */
export function generateShadowName(shadowHash: string): string {
  const adjectives = [
    'Anonymous', 'Hidden', 'Veiled', 'Masked', 'Secret',
    'Private', 'Unknown', 'Mysterious', 'Concealed', 'Shrouded'
  ];

  const nouns = [
    'Voice', 'Speaker', 'Thinker', 'Observer', 'Participant',
    'Citizen', 'Member', 'Contributor', 'Voter', 'Soul'
  ];

  // Use hash to deterministically select adjective and noun
  const hashNum = parseInt(shadowHash.substring(0, 8), 16);
  const adjIndex = hashNum % adjectives.length;
  const nounIndex = (hashNum >> 8) % nouns.length;

  return `${adjectives[adjIndex]} ${nouns[nounIndex]}`;
}

/**
 * Format identity display for UI
 */
export function formatIdentityDisplay(user: User | null): string {
  if (!user) return 'Not logged in';

  if (user.mode === 'true_self') {
    return user.username || 'True Self';
  } else {
    return user.profile?.displayName || generateShadowName(user.identity);
  }
}

/**
 * Get identity badge color based on mode
 */
export function getIdentityColor(mode: IdentityMode): string {
  return mode === 'true_self' ? 'blue' : 'purple';
}

/**
 * Get identity icon based on mode
 */
export function getIdentityIcon(mode: IdentityMode): string {
  return mode === 'true_self' ? '👤' : '🎭';
}

/**
 * Check if user has completed identity setup
 */
export function hasCompletedIdentitySetup(user: User | null): boolean {
  if (!user) return false;

  // Check if user has both wallets (indicates setup complete)
  return !!(user.wallets?.trueSelf && user.wallets?.shadow);
}

/**
 * Check if user is verified human (PoH score >= 50)
 */
export function isVerifiedHuman(user: User | null): boolean {
  return user?.verifiedHuman === true || (user?.verificationScore ?? 0) >= 50;
}

/**
 * Get user's Light Score display
 */
export function getLightScoreDisplay(score?: number): {
  value: number;
  label: string;
  color: string;
} {
  const value = score ?? 0;

  if (value >= 80) {
    return { value, label: 'Luminary', color: 'gold' };
  } else if (value >= 60) {
    return { value, label: 'Bright', color: 'yellow' };
  } else if (value >= 40) {
    return { value, label: 'Glowing', color: 'orange' };
  } else if (value >= 20) {
    return { value, label: 'Flickering', color: 'gray' };
  } else {
    return { value, label: 'Dim', color: 'dark' };
  }
}

/**
 * Check if content should be anonymized based on creator mode
 */
export function shouldAnonymizeContent(creatorMode: IdentityMode): boolean {
  return creatorMode === 'shadow';
}

/**
 * Get display name for content creator
 */
export function getCreatorDisplayName(
  creatorName: string,
  creatorMode: IdentityMode,
  creatorIdentity: string
): string {
  if (creatorMode === 'shadow') {
    return generateShadowName(creatorIdentity);
  }
  return creatorName;
}

/**
 * Check if user can switch to a specific mode
 * (Could add business logic here, e.g., verification requirements)
 */
export function canSwitchToMode(
  user: User | null,
  targetMode: IdentityMode
): { allowed: boolean; reason?: string } {
  if (!user) {
    return { allowed: false, reason: 'Not authenticated' };
  }

  // Can't switch to current mode
  if (user.mode === targetMode) {
    return { allowed: false, reason: 'Already in this mode' };
  }

  // Check if identity setup is complete
  if (!hasCompletedIdentitySetup(user)) {
    return { allowed: false, reason: 'Complete identity setup first' };
  }

  // Could add more checks here (e.g., cooldown period, verification requirements)

  return { allowed: true };
}

/**
 * Format timestamp based on identity mode
 * Shadow mode shows relative time only
 */
export function formatTimestamp(
  timestamp: string | Date,
  mode: IdentityMode
): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (mode === 'shadow') {
    // Shadow mode: relative time only
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    if (diffMins < 10080) return `${Math.floor(diffMins / 1440)}d ago`;
    return 'long ago';
  } else {
    // True self mode: full timestamp
    return date.toLocaleString();
  }
}