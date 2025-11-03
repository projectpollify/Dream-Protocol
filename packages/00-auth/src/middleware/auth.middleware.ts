/**
 * JWT Authentication Middleware
 * Verifies JWT tokens and attaches user info to request
 */

import { Request, Response, NextFunction } from 'express';
import authService from '../services/auth.service';

/**
 * Require authentication - blocks request if no valid token
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const decoded = authService.verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
    }

    // Attach user info to request
    req.user = decoded;
    req.userId = decoded.userId;
    req.currentMode = decoded.currentMode;

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Authentication failed',
    });
  }
}

/**
 * Optional authentication - continues even if no token
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (token) {
      const decoded = authService.verifyToken(token);
      if (decoded) {
        req.user = decoded;
        req.userId = decoded.userId;
        req.currentMode = decoded.currentMode;
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
}
