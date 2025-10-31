/**
 * Feature Flag Service
 * Controls gradual rollout of new features from MVP to Dream Protocol
 */

import { db } from '../utils/database';
import NodeCache from 'node-cache';
import {
  FeatureFlag,
  RolloutStatus,
  RolloutStrategy,
} from '../types/bridge.types';

// Cache feature flags for 30 seconds to reduce database hits
const flagCache = new NodeCache({ stdTTL: 30 });

class FeatureFlagService {
  /**
   * Check if a user should use the new system for a feature
   * This is THE central routing decision
   */
  async isFeatureEnabledForUser(
    userId: string,
    featureName: string
  ): Promise<boolean> {
    try {
      // Step 1: Check explicit user assignment (admin override)
      const userAssignment = await db.query(
        `SELECT enabled FROM feature_flag_assignments
         WHERE user_id = $1 AND flag_id = (
           SELECT id FROM feature_flags WHERE flag_name = $2
         ) AND (expires_at IS NULL OR expires_at > NOW())`,
        [userId, featureName]
      );

      if (userAssignment.rows.length > 0) {
        return userAssignment.rows[0].enabled;
      }

      // Step 2: Check global flag status (with caching)
      const cacheKey = `flag:${featureName}`;
      let flag = flagCache.get<FeatureFlag>(cacheKey);

      if (!flag) {
        const flagResult = await db.query(
          `SELECT
             id,
             flag_name,
             enabled,
             rollout_percentage,
             rollout_strategy,
             status
           FROM feature_flags
           WHERE flag_name = $1 AND status = 'active'`,
          [featureName]
        );

        if (flagResult.rows.length === 0) {
          // Feature doesn't exist, default to disabled (use legacy)
          return false;
        }

        flag = flagResult.rows[0];
        flagCache.set(cacheKey, flag);
      }

      // Step 3: Global flag disabled? Return false
      if (!flag!.enabled) {
        return false;
      }

      // Step 4: Apply rollout strategy
      if (flag!.rollout_strategy === 'percentage') {
        return this.shouldEnableByPercentage(userId, flag!.rollout_percentage);
      } else if (flag!.rollout_strategy === 'whitelist') {
        return await this.isUserWhitelisted(userId, featureName);
      } else if (flag!.rollout_strategy === 'time-based') {
        return await this.isTimeBasedEnabledNow(featureName);
      }

      return false;
    } catch (error) {
      console.error('Error checking feature flag:', error);
      // On error, use legacy system (safer)
      return false;
    }
  }

  /**
   * Determine if user is in rollout percentage
   * Uses deterministic hashing so same user always gets same result
   */
  private shouldEnableByPercentage(userId: string, percentage: number): boolean {
    if (percentage === 0) return false;
    if (percentage === 100) return true;

    // Hash user ID to get consistent result
    const hash = this.hashUserId(userId);
    const bucket = hash % 100;

    return bucket < percentage;
  }

  /**
   * Hash user ID to get stable bucket assignment
   * Same user always hashes to same bucket
   */
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Check if user is on whitelist
   * Used for beta testers, internal team
   */
  private async isUserWhitelisted(
    userId: string,
    featureName: string
  ): Promise<boolean> {
    const result = await db.query(
      `SELECT 1 FROM feature_flag_assignments
       WHERE user_id = $1
       AND flag_id = (SELECT id FROM feature_flags WHERE flag_name = $2)
       AND enabled = true`,
      [userId, featureName]
    );
    return result.rows.length > 0;
  }

  /**
   * Check if feature is enabled at current time
   * Used for scheduled rollouts
   */
  private async isTimeBasedEnabledNow(featureName: string): Promise<boolean> {
    const result = await db.query(
      `SELECT 1 FROM feature_rollout_schedule
       WHERE flag_id = (SELECT id FROM feature_flags WHERE flag_name = $1)
       AND scheduled_for <= NOW()
       AND status = 'in_progress'`,
      [featureName]
    );
    return result.rows.length > 0;
  }

  /**
   * Update rollout percentage (admin action)
   */
  async updateRolloutPercentage(
    featureName: string,
    newPercentage: number
  ): Promise<void> {
    if (newPercentage < 0 || newPercentage > 100) {
      throw new Error('Percentage must be between 0 and 100');
    }

    await db.query(
      `UPDATE feature_flags
       SET rollout_percentage = $1, updated_at = NOW()
       WHERE flag_name = $2`,
      [newPercentage, featureName]
    );

    // Clear cache
    flagCache.del(`flag:${featureName}`);

    // Log the change
    await db.query(
      `INSERT INTO migration_logs (entity_type, action, success, details)
       VALUES ($1, $2, $3, $4)`,
      [
        'feature_flag',
        'rollout_percentage_updated',
        true,
        JSON.stringify({
          featureName,
          newPercentage,
          timestamp: new Date().toISOString(),
        }),
      ]
    );

    console.log(
      `[FeatureFlag] Updated ${featureName} rollout to ${newPercentage}%`
    );
  }

  /**
   * Whitelist a user for a feature (override)
   * Used for VIP testing, support testing, etc.
   */
  async whitelistUserForFeature(
    userId: string,
    featureName: string,
    expiresAt?: Date
  ): Promise<void> {
    const flagResult = await db.query(
      `SELECT id FROM feature_flags WHERE flag_name = $1`,
      [featureName]
    );

    if (flagResult.rows.length === 0) {
      throw new Error(`Feature flag "${featureName}" not found`);
    }

    const flagId = flagResult.rows[0].id;

    await db.query(
      `INSERT INTO feature_flag_assignments (user_id, flag_id, enabled, override, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, flag_id)
       DO UPDATE SET enabled = true, override = true, expires_at = $5`,
      [userId, flagId, true, true, expiresAt]
    );

    console.log(`[FeatureFlag] Whitelisted user ${userId} for ${featureName}`);
  }

  /**
   * Remove user from whitelist
   */
  async removeUserFromFeature(
    userId: string,
    featureName: string
  ): Promise<void> {
    await db.query(
      `DELETE FROM feature_flag_assignments
       WHERE user_id = $1 AND flag_id = (
         SELECT id FROM feature_flags WHERE flag_name = $2
       )`,
      [userId, featureName]
    );

    console.log(`[FeatureFlag] Removed user ${userId} from ${featureName}`);
  }

  /**
   * Get all flags for a user
   */
  async getUserFeatureFlags(userId: string): Promise<Record<string, boolean>> {
    const result = await db.query(
      `SELECT
         f.flag_name,
         f.enabled,
         f.rollout_percentage,
         f.rollout_strategy
       FROM feature_flags f
       WHERE f.status = 'active'`
    );

    const flags: Record<string, boolean> = {};
    for (const row of result.rows) {
      flags[row.flag_name] = await this.isFeatureEnabledForUser(
        userId,
        row.flag_name
      );
    }

    return flags;
  }

  /**
   * Create a new feature flag
   */
  async createFeatureFlag(
    flagName: string,
    description: string,
    rolloutStrategy: RolloutStrategy = 'percentage'
  ): Promise<string> {
    const result = await db.query(
      `INSERT INTO feature_flags (flag_name, description, rollout_strategy, enabled)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [flagName, description, rolloutStrategy, false] // Start disabled
    );

    console.log(`[FeatureFlag] Created flag: ${flagName}`);
    return result.rows[0].id;
  }

  /**
   * Enable a feature flag globally
   */
  async enableFeatureFlag(featureName: string): Promise<void> {
    await db.query(
      `UPDATE feature_flags
       SET enabled = true, activated_at = NOW(), updated_at = NOW()
       WHERE flag_name = $1`,
      [featureName]
    );

    // Clear cache
    flagCache.del(`flag:${featureName}`);

    console.log(`[FeatureFlag] Enabled flag: ${featureName}`);
  }

  /**
   * Disable a feature flag globally
   */
  async disableFeatureFlag(featureName: string): Promise<void> {
    await db.query(
      `UPDATE feature_flags
       SET enabled = false, deactivated_at = NOW(), updated_at = NOW()
       WHERE flag_name = $1`,
      [featureName]
    );

    // Clear cache
    flagCache.del(`flag:${featureName}`);

    console.log(`[FeatureFlag] Disabled flag: ${featureName}`);
  }

  /**
   * Get rollout status for monitoring dashboard
   */
  async getRolloutStatus(featureName: string): Promise<RolloutStatus> {
    const flagResult = await db.query(
      `SELECT
         flag_name,
         enabled,
         rollout_percentage
       FROM feature_flags
       WHERE flag_name = $1`,
      [featureName]
    );

    if (flagResult.rows.length === 0) {
      throw new Error(`Feature flag "${featureName}" not found`);
    }

    const flag = flagResult.rows[0];

    // Get user counts
    const userCountResult = await db.query(
      `SELECT COUNT(DISTINCT user_id) as count
       FROM feature_flag_assignments
       WHERE flag_id = (SELECT id FROM feature_flags WHERE flag_name = $1)
       AND enabled = true`,
      [featureName]
    );

    // Get error counts
    const errorCountResult = await db.query(
      `SELECT COUNT(*) as count
       FROM migration_logs
       WHERE details->>'featureName' = $1
       AND success = false
       AND created_at > NOW() - INTERVAL '24 hours'`,
      [featureName]
    );

    return {
      featureName,
      enabled: flag.enabled,
      percentage: flag.rollout_percentage,
      usersAffected: parseInt(userCountResult.rows[0]?.count || '0'),
      errors: parseInt(errorCountResult.rows[0]?.count || '0'),
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Get all active feature flags (for admin dashboard)
   */
  async getAllFeatureFlags(): Promise<FeatureFlag[]> {
    const result = await db.query(
      `SELECT * FROM feature_flags
       WHERE status = 'active'
       ORDER BY created_at DESC`
    );

    return result.rows;
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache(): void {
    flagCache.flushAll();
  }
}

export const featureFlagService = new FeatureFlagService();
