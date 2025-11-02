/**
 * Bridge Legacy API Routes
 * Admin endpoints for managing migrations and feature flags
 */

import express, { Request, Response, Router } from 'express';
import featureFlagService from '../services/feature-flag.service';
import dataMigrationService from '../services/data-migration.service';
import adapterService from '../services/adapter.service';

const router: Router = express.Router();

// ========== Feature Flag Routes ==========

/**
 * GET /api/v1/bridge/feature-flags
 * Get all feature flags for current user
 */
router.get('/feature-flags', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId || req.query.userId as string;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId required',
      });
    }

    const flags = await featureFlagService.getUserFeatureFlags(userId);

    return res.status(200).json({
      success: true,
      data: flags,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/bridge/feature-flags/:flagName
 * Check if specific flag is enabled for user
 */
router.get('/feature-flags/:flagName', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId || req.query.userId as string;
    const { flagName } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId required',
      });
    }

    const enabled = await featureFlagService.isFeatureEnabledForUser(
      userId,
      flagName
    );

    return res.status(200).json({
      success: true,
      data: { flag: flagName, enabled },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/bridge/feature-flags/all/admin
 * Get all feature flags (admin only)
 */
router.get('/feature-flags/all/admin', async (req: Request, res: Response) => {
  try {
    const flags = await featureFlagService.getAllFeatureFlags();

    return res.status(200).json({
      success: true,
      data: flags,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ========== Migration Routes (Admin Only) ==========

/**
 * POST /api/v1/bridge/migration/start
 * Start data migration from MVP
 */
router.post('/migration/start', async (req: Request, res: Response) => {
  try {
    console.log('[Bridge API] Starting migration...');
    const result = await dataMigrationService.migrateAllData();

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('[Bridge API] Migration failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/bridge/migration/validate
 * Validate migration completed successfully
 */
router.post('/migration/validate', async (req: Request, res: Response) => {
  try {
    const { batchId } = req.body;

    if (!batchId) {
      return res.status(400).json({
        success: false,
        error: 'batchId required',
      });
    }

    const validation = await dataMigrationService.validateMigration(batchId);

    return res.status(200).json({
      success: true,
      data: validation,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/bridge/migration/rollback
 * Rollback migration (emergency only)
 */
router.post('/migration/rollback', async (req: Request, res: Response) => {
  try {
    const { batchId } = req.body;

    if (!batchId) {
      return res.status(400).json({
        success: false,
        error: 'batchId required',
      });
    }

    await dataMigrationService.rollbackMigration(batchId);

    return res.status(200).json({
      success: true,
      message: 'Migration rolled back successfully',
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ========== Admin Feature Flag Management ==========

/**
 * POST /api/v1/bridge/feature-flags
 * Create new feature flag
 */
router.post('/feature-flags', async (req: Request, res: Response) => {
  try {
    const { flagName, description, strategy } = req.body;

    if (!flagName || !description) {
      return res.status(400).json({
        success: false,
        error: 'flagName and description required',
      });
    }

    const flagId = await featureFlagService.createFeatureFlag(
      flagName,
      description,
      strategy || 'percentage'
    );

    return res.status(201).json({
      success: true,
      data: { flagId },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * PATCH /api/v1/bridge/feature-flags/:flagName/percentage
 * Update rollout percentage
 */
router.patch(
  '/feature-flags/:flagName/percentage',
  async (req: Request, res: Response) => {
    try {
      const { flagName } = req.params;
      const { percentage } = req.body;

      if (percentage === undefined || percentage < 0 || percentage > 100) {
        return res.status(400).json({
          success: false,
          error: 'Percentage must be between 0-100',
        });
      }

      await featureFlagService.updateRolloutPercentage(flagName, percentage);

      return res.status(200).json({
        success: true,
        message: `${flagName} rollout set to ${percentage}%`,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * POST /api/v1/bridge/feature-flags/:flagName/enable
 * Enable a feature flag globally
 */
router.post(
  '/feature-flags/:flagName/enable',
  async (req: Request, res: Response) => {
    try {
      const { flagName } = req.params;
      await featureFlagService.enableFeatureFlag(flagName);

      return res.status(200).json({
        success: true,
        message: `${flagName} enabled`,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * POST /api/v1/bridge/feature-flags/:flagName/disable
 * Disable a feature flag globally
 */
router.post(
  '/feature-flags/:flagName/disable',
  async (req: Request, res: Response) => {
    try {
      const { flagName } = req.params;
      await featureFlagService.disableFeatureFlag(flagName);

      return res.status(200).json({
        success: true,
        message: `${flagName} disabled`,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * POST /api/v1/bridge/feature-flags/:flagName/whitelist
 * Whitelist user for feature
 */
router.post(
  '/feature-flags/:flagName/whitelist',
  async (req: Request, res: Response) => {
    try {
      const { flagName } = req.params;
      const { userId, expiresAt } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'userId required',
        });
      }

      await featureFlagService.whitelistUserForFeature(
        userId,
        flagName,
        expiresAt ? new Date(expiresAt) : undefined
      );

      return res.status(200).json({
        success: true,
        message: `User ${userId} whitelisted for ${flagName}`,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * DELETE /api/v1/bridge/feature-flags/:flagName/whitelist/:userId
 * Remove user from whitelist
 */
router.delete(
  '/feature-flags/:flagName/whitelist/:userId',
  async (req: Request, res: Response) => {
    try {
      const { flagName, userId } = req.params;

      await featureFlagService.removeUserFromFeature(userId, flagName);

      return res.status(200).json({
        success: true,
        message: `User ${userId} removed from ${flagName}`,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/v1/bridge/rollout-status
 * Get status of all rollouts
 */
router.get('/rollout-status', async (req: Request, res: Response) => {
  try {
    // Get status for all features
    const features = ['new_system', 'dual_identity', 'new_governance'];
    const statuses = [];

    for (const feature of features) {
      try {
        const status = await featureFlagService.getRolloutStatus(feature);
        statuses.push(status);
      } catch (e) {
        // Feature might not exist yet
        console.warn(`[Bridge API] Feature ${feature} not found`);
      }
    }

    return res.status(200).json({
      success: true,
      data: statuses,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/bridge/rollout-status/:flagName
 * Get status of specific rollout
 */
router.get('/rollout-status/:flagName', async (req: Request, res: Response) => {
  try {
    const { flagName } = req.params;
    const status = await featureFlagService.getRolloutStatus(flagName);

    return res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ========== System Health ==========

/**
 * GET /api/v1/bridge/health
 * Check bridge module health
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const { checkDatabaseConnections } = await import('../utils/database');
    const health = await checkDatabaseConnections();

    return res.status(200).json({
      success: true,
      data: {
        module: 'bridge-legacy',
        status: health.newDb && health.legacyDb ? 'healthy' : 'degraded',
        databases: {
          new: health.newDb,
          legacy: health.legacyDb,
        },
        errors: health.errors,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
