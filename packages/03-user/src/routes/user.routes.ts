/**
 * Module 03: User - API Routes
 *
 * RESTful API endpoints for user profiles, settings, and account management
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import profileService from '../services/profile.service';
import settingsService from '../services/settings.service';
import accountService from '../services/account.service';
import avatarService from '../services/avatar.service';
import {
  CreateProfileDTO,
  UpdateProfileDTO,
  UpdateSettingsDTO,
  IdentityMode,
  ApiResponse,
} from '../types/user.types';

// ============================================================================
// ROUTER SETUP
// ============================================================================

const router: Router = Router();

// Multer configuration for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

// ============================================================================
// PROFILE ENDPOINTS
// ============================================================================

/**
 * POST /api/v1/users/profile/create
 * Create a new user profile
 */
router.post('/profile/create', async (req: Request, res: Response) => {
  try {
    const data: CreateProfileDTO = req.body;

    // Validate required fields
    if (!data.user_id || !data.identity_mode) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: user_id, identity_mode',
      });
    }

    const profile = await profileService.createUserProfile(data);

    res.status(201).json({
      success: true,
      data: { profile },
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/users/profile/:userId
 * Get user profile
 */
router.get('/profile/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const identity_mode = req.query.mode as IdentityMode | undefined;
    const viewer_user_id = req.query.viewer_id as string | undefined;

    const profile = await profileService.getUserProfile({
      user_id: userId,
      identity_mode,
      viewer_user_id,
    });

    res.json({
      success: true,
      data: { profile },
    });
  } catch (error: any) {
    const statusCode = error.statusCode || 404;
    res.status(statusCode).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * PATCH /api/v1/users/profile/:userId
 * Update user profile
 */
router.patch('/profile/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const identity_mode = (req.query.mode as IdentityMode) || IdentityMode.TRUE_SELF;
    const updates: UpdateProfileDTO = req.body;

    const profile = await profileService.updateUserProfile(
      userId,
      identity_mode,
      updates
    );

    res.json({
      success: true,
      data: { profile },
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/users/profile/search
 * Search profiles by display name
 */
router.get('/profile/search', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 20;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query required',
      });
    }

    const profiles = await profileService.searchProfiles(query, limit);

    res.json({
      success: true,
      data: { profiles },
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// SETTINGS ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/users/settings
 * Get user settings
 */
router.get('/settings', async (req: Request, res: Response) => {
  try {
    const user_id = req.query.user_id as string;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: 'user_id required',
      });
    }

    const settings = await settingsService.getUserSettings(user_id);

    res.json({
      success: true,
      data: { settings },
    });
  } catch (error: any) {
    res.status(404).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * PATCH /api/v1/users/settings
 * Update user settings
 */
router.patch('/settings', async (req: Request, res: Response) => {
  try {
    const data: UpdateSettingsDTO = req.body;

    if (!data.user_id) {
      return res.status(400).json({
        success: false,
        error: 'user_id required',
      });
    }

    const settings = await settingsService.updateUserSettings(data);

    res.json({
      success: true,
      data: { settings },
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/users/settings/password/change
 * Change user password
 */
router.post('/settings/password/change', async (req: Request, res: Response) => {
  try {
    const { user_id, old_password, new_password } = req.body;

    if (!user_id || !old_password || !new_password) {
      return res.status(400).json({
        success: false,
        error: 'user_id, old_password, and new_password required',
      });
    }

    await settingsService.changePassword(user_id, old_password, new_password);

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/users/settings/email/verify
 * Verify email with token
 */
router.post('/settings/email/verify', async (req: Request, res: Response) => {
  try {
    const { user_id, token } = req.body;

    if (!user_id || !token) {
      return res.status(400).json({
        success: false,
        error: 'user_id and token required',
      });
    }

    const verified = await settingsService.verifyEmail(user_id, token);

    if (!verified) {
      return res.status(400).json({
        success: false,
        error: 'Invalid verification token',
      });
    }

    res.json({
      success: true,
      message: 'Email verified successfully',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// AVATAR ENDPOINTS
// ============================================================================

/**
 * POST /api/v1/users/avatar/upload
 * Upload profile avatar
 */
router.post(
  '/avatar/upload',
  upload.single('avatar'),
  async (req: Request, res: Response) => {
    try {
      const { user_id, identity_mode } = req.body;

      if (!user_id || !identity_mode) {
        return res.status(400).json({
          success: false,
          error: 'user_id and identity_mode required',
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded',
        });
      }

      const avatar = await avatarService.uploadAvatar({
        user_id,
        identity_mode,
        file: req.file,
      });

      res.json({
        success: true,
        data: { avatar },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/v1/users/avatar/:userId
 * Get current avatar
 */
router.get('/avatar/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const identity_mode =
      (req.query.mode as IdentityMode) || IdentityMode.TRUE_SELF;

    const avatar = await avatarService.getCurrentAvatar(userId, identity_mode);

    if (!avatar) {
      // Return default avatar URL
      const defaultAvatar = avatarService.getDefaultAvatarUrl(
        userId,
        identity_mode
      );
      return res.json({
        success: true,
        data: {
          avatar: {
            original: defaultAvatar,
            thumbnail: defaultAvatar,
            medium: defaultAvatar,
            large: defaultAvatar,
          },
        },
      });
    }

    res.json({
      success: true,
      data: { avatar },
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /api/v1/users/avatar/:avatarId
 * Delete avatar
 */
router.delete('/avatar/:avatarId', async (req: Request, res: Response) => {
  try {
    const { avatarId } = req.params;
    const { user_id, identity_mode } = req.query;

    if (!user_id || !identity_mode) {
      return res.status(400).json({
        success: false,
        error: 'user_id and identity_mode required',
      });
    }

    const deleted = await avatarService.deleteAvatar(
      user_id as string,
      identity_mode as IdentityMode,
      avatarId
    );

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Avatar not found',
      });
    }

    res.json({
      success: true,
      message: 'Avatar deleted successfully',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// ACCOUNT STATUS ENDPOINTS (Admin only)
// ============================================================================

/**
 * GET /api/v1/users/account/status/:userId
 * Get account status
 */
router.get('/account/status/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const status = await accountService.getAccountStatus(userId);

    res.json({
      success: true,
      data: { status },
    });
  } catch (error: any) {
    res.status(404).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * PATCH /api/v1/users/account/status
 * Update account status (admin only)
 */
router.patch('/account/status', async (req: Request, res: Response) => {
  try {
    const { user_id, status, reason, admin_user_id, expires_at } = req.body;

    if (!user_id || !status || !admin_user_id) {
      return res.status(400).json({
        success: false,
        error: 'user_id, status, and admin_user_id required',
      });
    }

    // TODO: Add admin authentication check

    const updated = await accountService.updateAccountStatus({
      user_id,
      status,
      reason,
      admin_user_id,
      expires_at: expires_at ? new Date(expires_at) : undefined,
    });

    res.json({
      success: true,
      data: { status: updated },
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/users/account/verify
 * Verify user account (admin only)
 */
router.post('/account/verify', async (req: Request, res: Response) => {
  try {
    const { user_id, verification_type } = req.body;

    if (!user_id || !verification_type) {
      return res.status(400).json({
        success: false,
        error: 'user_id and verification_type required',
      });
    }

    // TODO: Add admin authentication check

    const status = await accountService.verifyAccount(user_id, verification_type);

    res.json({
      success: true,
      data: { status },
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * GET /api/v1/users/health
 * Health check endpoint
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    module: 'user',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// ERROR HANDLER
// ============================================================================

router.use((error: Error, _req: Request, res: Response, _next: any) => {
  console.error('User module error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

// ============================================================================
// EXPORTS
// ============================================================================

export default router;
