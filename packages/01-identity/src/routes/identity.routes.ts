import { Router, Request, Response } from 'express';
import { identityService } from '../services/identity.service';
import { IdentityMode, IdentityError } from '../types/identity.types';

const router = Router();

/**
 * POST /api/v1/identity/create-dual
 * Create dual identities for new user
 */
router.post('/create-dual', async (req: Request, res: Response) => {
  try {
    const { userId, password } = req.body;

    if (!userId || !password) {
      return res.status(400).json({
        success: false,
        error: 'userId and password are required'
      });
    }

    if (password.length < 12) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 12 characters'
      });
    }

    const ipAddress = req.ip;
    const dualIdentity = await identityService.createDualIdentity(userId, password, ipAddress);

    return res.status(201).json({
      success: true,
      data: {
        message: 'Dual identity created successfully',
        identities: {
          true_self: dualIdentity.trueIdentity,
          shadow: dualIdentity.shadowIdentity
        },
        createdAt: dualIdentity.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating dual identity:', error);

    if (error instanceof IdentityError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
        code: error.code
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to create dual identity'
    });
  }
});

/**
 * POST /api/v1/identity/switch-mode
 * Switch active identity mode
 */
router.post('/switch-mode', async (req: Request, res: Response) => {
  try {
    const { userId, mode, sessionId } = req.body;

    if (!userId || !mode || !sessionId) {
      return res.status(400).json({
        success: false,
        error: 'userId, mode, and sessionId are required'
      });
    }

    if (!['true_self', 'shadow'].includes(mode)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid mode. Must be "true_self" or "shadow"'
      });
    }

    await identityService.switchIdentityMode(userId, mode as IdentityMode, sessionId);

    const currentIdentity = await identityService.getCurrentIdentity(userId);

    return res.status(200).json({
      success: true,
      data: {
        message: `Switched to ${mode}`,
        currentIdentity,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error switching identity mode:', error);

    if (error instanceof IdentityError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
        code: error.code
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to switch identity mode'
    });
  }
});

/**
 * GET /api/v1/identity/current
 * Get current active identity
 */
router.get('/current/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    const identity = await identityService.getCurrentIdentity(userId);

    return res.status(200).json({
      success: true,
      data: identity
    });
  } catch (error) {
    console.error('Error getting current identity:', error);

    if (error instanceof IdentityError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
        code: error.code
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to get current identity'
    });
  }
});

/**
 * POST /api/v1/identity/session/create
 * Create identity session
 */
router.post('/session/create', async (req: Request, res: Response) => {
  try {
    const { userId, mode } = req.body;

    if (!userId || !mode) {
      return res.status(400).json({
        success: false,
        error: 'userId and mode are required'
      });
    }

    if (!['true_self', 'shadow'].includes(mode)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid mode. Must be "true_self" or "shadow"'
      });
    }

    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];

    const session = await identityService.createIdentitySession(
      userId,
      mode as IdentityMode,
      ipAddress,
      userAgent
    );

    return res.status(201).json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error('Error creating session:', error);

    if (error instanceof IdentityError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
        code: error.code
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to create session'
    });
  }
});

export default router;
