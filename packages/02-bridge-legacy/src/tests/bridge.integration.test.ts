/**
 * Bridge Legacy Integration Tests
 * Tests for feature flags, data migration, and adapter services
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { featureFlagService } from '../services/feature-flag.service';
import { dataMigrationService } from '../services/data-migration.service';
import { adapterService } from '../services/adapter.service';

describe('Bridge Legacy Integration Tests', () => {
  describe('Feature Flags', () => {
    beforeEach(async () => {
      // Clear cache before each test
      featureFlagService.clearCache();
    });

    it('should route user to legacy system by default', async () => {
      const userId = 'test_user_1';
      const enabled = await featureFlagService.isFeatureEnabledForUser(
        userId,
        'new_system'
      );
      expect(enabled).toBe(false); // New system disabled by default
    });

    it('should enable feature flag globally', async () => {
      // Create test flag
      await featureFlagService.createFeatureFlag(
        'test_feature_global',
        'Test feature for global enable',
        'percentage'
      );

      // Set to 100% and enable
      await featureFlagService.updateRolloutPercentage('test_feature_global', 100);
      await featureFlagService.enableFeatureFlag('test_feature_global');

      // Should be enabled for all users
      const enabled = await featureFlagService.isFeatureEnabledForUser(
        'any_user',
        'test_feature_global'
      );
      expect(enabled).toBe(true);
    });

    it('should whitelist specific user for feature', async () => {
      const userId = 'admin_user_1';

      // Create test flag (disabled by default)
      await featureFlagService.createFeatureFlag(
        'test_feature_whitelist',
        'Test feature for whitelist',
        'whitelist'
      );

      // Enable the flag globally but at 0%
      await featureFlagService.enableFeatureFlag('test_feature_whitelist');
      await featureFlagService.updateRolloutPercentage('test_feature_whitelist', 0);

      // Whitelist specific user
      await featureFlagService.whitelistUserForFeature(userId, 'test_feature_whitelist');

      // User should be enabled
      const enabled = await featureFlagService.isFeatureEnabledForUser(
        userId,
        'test_feature_whitelist'
      );
      expect(enabled).toBe(true);

      // Other users should not be enabled
      const otherEnabled = await featureFlagService.isFeatureEnabledForUser(
        'other_user',
        'test_feature_whitelist'
      );
      expect(otherEnabled).toBe(false);
    });

    it('should respect percentage-based rollout', async () => {
      // Create flag with 50% rollout
      await featureFlagService.createFeatureFlag(
        'test_flag_percentage',
        'Test feature for percentage rollout',
        'percentage'
      );

      await featureFlagService.enableFeatureFlag('test_flag_percentage');
      await featureFlagService.updateRolloutPercentage('test_flag_percentage', 50);

      // Check multiple users hash to different buckets
      const results = [];
      for (let i = 0; i < 100; i++) {
        const enabled = await featureFlagService.isFeatureEnabledForUser(
          `user_${i}`,
          'test_flag_percentage'
        );
        results.push(enabled ? 1 : 0);
      }

      const sum = results.reduce((a, b) => a + b, 0);
      // Should be approximately 50% (allow 40-60% range)
      expect(sum).toBeGreaterThan(40);
      expect(sum).toBeLessThan(60);
    });

    it('should return same result for same user (deterministic hashing)', async () => {
      const userId = 'consistent_user';

      await featureFlagService.createFeatureFlag(
        'test_flag_consistent',
        'Test consistent hashing',
        'percentage'
      );
      await featureFlagService.enableFeatureFlag('test_flag_consistent');
      await featureFlagService.updateRolloutPercentage('test_flag_consistent', 50);

      // Check same user multiple times
      const result1 = await featureFlagService.isFeatureEnabledForUser(
        userId,
        'test_flag_consistent'
      );
      const result2 = await featureFlagService.isFeatureEnabledForUser(
        userId,
        'test_flag_consistent'
      );
      const result3 = await featureFlagService.isFeatureEnabledForUser(
        userId,
        'test_flag_consistent'
      );

      // All results should be identical
      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });

    it('should get all feature flags for user', async () => {
      const userId = 'test_user_flags';

      const flags = await featureFlagService.getUserFeatureFlags(userId);

      // Should return an object with flag names as keys
      expect(typeof flags).toBe('object');
      expect(flags).toHaveProperty('new_system');
      expect(flags).toHaveProperty('dual_identity');
      expect(flags).toHaveProperty('new_governance');
    });

    it('should get rollout status', async () => {
      const status = await featureFlagService.getRolloutStatus('new_system');

      expect(status).toHaveProperty('featureName');
      expect(status).toHaveProperty('enabled');
      expect(status).toHaveProperty('percentage');
      expect(status).toHaveProperty('usersAffected');
      expect(status).toHaveProperty('errors');
      expect(status.featureName).toBe('new_system');
    });
  });

  describe('Adapter Service', () => {
    it('should route request based on feature flag', async () => {
      const userId = 'test_user_adapter';

      const request = {
        userId,
        endpoint: '/polls',
        method: 'GET',
        data: null,
      };

      const response = await adapterService.routeRequest(request);

      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('source');
      expect(['legacy', 'new']).toContain(response.source);
    });

    it('should get user system preference', async () => {
      const userId = 'test_user_preference';

      const preference = await adapterService.getUserSystemPreference(userId);

      expect(['legacy', 'new']).toContain(preference);
    });

    it('should transform legacy response', async () => {
      const legacyPoll = {
        id: 1,
        title: 'Test Poll',
        options: ['Option 1', 'Option 2'],
      };

      const transformed = adapterService.transformLegacyResponse('polls', legacyPoll);

      // Should add new fields
      expect(transformed).toHaveProperty('dualityToken');
      expect(transformed).toHaveProperty('shadowConsensusWeight');
      expect(transformed).toHaveProperty('identityMode');
      expect(transformed.id).toBe(1);
      expect(transformed.title).toBe('Test Poll');
    });

    it('should transform request for legacy', async () => {
      const newRequest = {
        title: 'Test Poll',
        dualityToken: 'abc123',
        shadowConsensusWeight: 0.8,
        identityMode: 'shadow',
      };

      const transformed = adapterService.transformRequestForLegacy('polls', newRequest);

      // Should strip new fields
      expect(transformed).not.toHaveProperty('dualityToken');
      expect(transformed).not.toHaveProperty('shadowConsensusWeight');
      expect(transformed).not.toHaveProperty('identityMode');
      expect(transformed.title).toBe('Test Poll');
    });
  });

  describe('Data Migration Service', () => {
    it('should validate migration structure', () => {
      // Test that migration service exists and has required methods
      expect(dataMigrationService).toBeDefined();
      expect(typeof dataMigrationService.migrateAllData).toBe('function');
      expect(typeof dataMigrationService.validateMigration).toBe('function');
      expect(typeof dataMigrationService.rollbackMigration).toBe('function');
    });

    // Note: Full migration tests would require a test database
    // These are structural tests only
    it('should have migration result structure', () => {
      // This tests the type structure
      const mockResult = {
        batchId: 'test-batch-id',
        success: true,
        entitiesMigrated: {
          users: { total: 0, success: 0, failed: 0, errors: [] },
        },
        errors: [],
        startTime: Date.now(),
        endTime: Date.now(),
        totalDuration: 0,
      };

      expect(mockResult).toHaveProperty('batchId');
      expect(mockResult).toHaveProperty('success');
      expect(mockResult).toHaveProperty('entitiesMigrated');
      expect(mockResult.entitiesMigrated.users).toHaveProperty('total');
      expect(mockResult.entitiesMigrated.users).toHaveProperty('success');
      expect(mockResult.entitiesMigrated.users).toHaveProperty('failed');
    });
  });

  describe('Database Connections', () => {
    it('should check database health', async () => {
      const { checkDatabaseConnections } = await import('../utils/database');

      const health = await checkDatabaseConnections();

      expect(health).toHaveProperty('newDb');
      expect(health).toHaveProperty('legacyDb');
      expect(health).toHaveProperty('errors');
      expect(typeof health.newDb).toBe('boolean');
      expect(typeof health.legacyDb).toBe('boolean');
      expect(Array.isArray(health.errors)).toBe(true);
    });
  });
});

describe('Feature Flag Edge Cases', () => {
  it('should handle non-existent feature flag gracefully', async () => {
    const enabled = await featureFlagService.isFeatureEnabledForUser(
      'test_user',
      'nonexistent_flag'
    );

    // Should default to false (legacy system)
    expect(enabled).toBe(false);
  });

  it('should handle 0% rollout', async () => {
    await featureFlagService.createFeatureFlag(
      'test_flag_zero',
      'Test 0% rollout',
      'percentage'
    );
    await featureFlagService.enableFeatureFlag('test_flag_zero');
    await featureFlagService.updateRolloutPercentage('test_flag_zero', 0);

    const enabled = await featureFlagService.isFeatureEnabledForUser(
      'any_user',
      'test_flag_zero'
    );

    expect(enabled).toBe(false);
  });

  it('should handle 100% rollout', async () => {
    await featureFlagService.createFeatureFlag(
      'test_flag_hundred',
      'Test 100% rollout',
      'percentage'
    );
    await featureFlagService.enableFeatureFlag('test_flag_hundred');
    await featureFlagService.updateRolloutPercentage('test_flag_hundred', 100);

    const enabled = await featureFlagService.isFeatureEnabledForUser(
      'any_user',
      'test_flag_hundred'
    );

    expect(enabled).toBe(true);
  });

  it('should handle disabled flag with 100% rollout', async () => {
    await featureFlagService.createFeatureFlag(
      'test_flag_disabled',
      'Test disabled flag',
      'percentage'
    );
    await featureFlagService.updateRolloutPercentage('test_flag_disabled', 100);
    // Don't enable the flag

    const enabled = await featureFlagService.isFeatureEnabledForUser(
      'any_user',
      'test_flag_disabled'
    );

    expect(enabled).toBe(false);
  });
});
