/**
 * Authentication Routes
 * Endpoints for registration, login, and user info
 */

import { Router, Request, Response } from 'express';
import authService from '../services/auth.service';
import { requireAuth } from '../middleware/auth.middleware';
import { RegisterRequest, LoginRequest } from '../types/auth.types';

const router: Router = Router();

/**
 * POST /api/v1/auth/register
 * Register a new user
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const data: RegisterRequest = req.body;

    // Validate input
    if (!data.username || !data.email || !data.password) {
      return res.status(400).json({
        success: false,
        error: 'Username, email, and password are required',
      });
    }

    // Validate username format
    if (!/^[a-zA-Z0-9_]{3,50}$/.test(data.username)) {
      return res.status(400).json({
        success: false,
        error: 'Username must be 3-50 characters and contain only letters, numbers, and underscores',
      });
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
      });
    }

    // Validate password length
    if (data.password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters',
      });
    }

    const result = await authService.register(data);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Registration failed',
    });
  }
});

/**
 * POST /api/v1/auth/login
 * Login user
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const data: LoginRequest = req.body;

    if (!data.username || !data.password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required',
      });
    }

    const result = await authService.login(data);

    if (!result.success) {
      return res.status(401).json(result);
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Login failed',
    });
  }
});

/**
 * GET /api/v1/auth/me
 * Get current user (requires authentication)
 */
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
    }

    const user = await authService.getCurrentUser(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get user',
    });
  }
});

/**
 * POST /api/v1/auth/logout
 * Logout user (client-side token removal)
 */
router.post('/logout', (req: Request, res: Response) => {
  // JWT logout is handled client-side by removing the token
  // This endpoint exists for consistency
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

/**
 * GET /api/v1/auth/health
 * Health check
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Auth module is healthy',
    timestamp: new Date().toISOString(),
  });
});

export default router;
