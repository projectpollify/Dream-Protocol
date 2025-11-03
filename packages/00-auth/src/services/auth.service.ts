/**
 * Authentication Service
 * Handles user registration, login, and JWT generation
 * Based on pollifypro1 enhanced auth system
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import db from '../utils/database';
import {
  RegisterRequest,
  LoginRequest,
  LoginResponse,
  User,
  UserRow,
  JWTPayload,
  IdentityMode,
} from '../types/auth.types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const SALT_ROUNDS = 10;

class AuthService {
  /**
   * Generate shadow hash for anonymous identity
   */
  private generateShadowHash(userId: string): string {
    const salt = process.env.SHADOW_SALT || 'dream-protocol-shadow-salt';
    return crypto
      .createHash('sha256')
      .update(`${userId}:${salt}`)
      .digest('hex');
  }

  /**
   * Generate JWT token
   */
  private generateJWT(user: UserRow, mode: IdentityMode = 'true_self'): string {
    const payload: JWTPayload = {
      userId: user.id,
      username: user.username,
      email: user.email,
      currentMode: mode,
      shadowHash: user.shadow_hash,
      activeIdentity: {
        id: mode === 'true_self' ? user.id : user.shadow_hash,
        mode,
        displayName: mode === 'true_self' ? user.username : `Shadow_${user.shadow_hash.substring(0, 8)}`,
      },
    };

    // Use type assertion to handle jwt.sign typing issues
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    } as jwt.SignOptions) as string;
  }

  /**
   * Register new user
   */
  async register(data: RegisterRequest): Promise<LoginResponse> {
    try {
      // Validate input
      if (!data.username || !data.email || !data.password) {
        throw new Error('Username, email, and password are required');
      }

      // Check if username or email already exists
      const existingUser = await db.query(
        'SELECT id FROM users WHERE username = $1 OR email = $2',
        [data.username, data.email]
      );

      if (existingUser.rows.length > 0) {
        throw new Error('Username or email already exists');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

      // Generate temporary shadow hash (before user ID is known)
      const tempId = crypto.randomBytes(16).toString('hex');
      const tempShadowHash = this.generateShadowHash(tempId);

      // Create user
      const result = await db.query(
        `INSERT INTO users (username, email, password_hash, shadow_hash, current_mode)
         VALUES ($1, $2, $3, $4, 'true_self')
         RETURNING *`,
        [data.username, data.email, passwordHash, tempShadowHash]
      );

      const user = result.rows[0] as UserRow;

      // Regenerate shadow hash with actual user ID
      const shadowHash = this.generateShadowHash(user.id);
      await db.query(
        'UPDATE users SET shadow_hash = $1 WHERE id = $2',
        [shadowHash, user.id]
      );

      user.shadow_hash = shadowHash;

      // Log initial mode
      await db.query(
        `INSERT INTO user_mode_history (user_id, from_mode, to_mode, reason)
         VALUES ($1, NULL, 'true_self', 'Initial registration')`,
        [user.id]
      );

      // Generate JWT
      const token = this.generateJWT(user, 'true_self');

      // Return response
      return {
        success: true,
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            mode: 'true_self',
            shadowHash: user.shadow_hash,
            createdAt: user.created_at,
            updatedAt: user.updated_at,
          },
          token,
          profiles: {
            trueSelf: {
              displayName: user.username,
              reputation: 0,
            },
            shadow: {
              displayName: `Shadow_${shadowHash.substring(0, 8)}`,
              reputation: 0,
            },
          },
          onboardingRequired: true,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Registration failed',
      };
    }
  }

  /**
   * Login user
   */
  async login(data: LoginRequest): Promise<LoginResponse> {
    try {
      // Find user by username
      const result = await db.query(
        'SELECT * FROM users WHERE username = $1',
        [data.username]
      );

      if (result.rows.length === 0) {
        throw new Error('Invalid username or password');
      }

      const user = result.rows[0] as UserRow;

      // Verify password
      const isValidPassword = await bcrypt.compare(data.password, user.password_hash);
      if (!isValidPassword) {
        throw new Error('Invalid username or password');
      }

      // Generate JWT with current mode
      const token = this.generateJWT(user, user.current_mode);

      // Return response
      return {
        success: true,
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            mode: user.current_mode,
            shadowHash: user.shadow_hash,
            createdAt: user.created_at,
            updatedAt: user.updated_at,
          },
          token,
          profiles: {
            trueSelf: {
              displayName: user.username,
              reputation: 0,
            },
            shadow: {
              displayName: `Shadow_${user.shadow_hash.substring(0, 8)}`,
              reputation: 0,
            },
          },
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Login failed',
      };
    }
  }

  /**
   * Get current user from token
   */
  async getCurrentUser(userId: string): Promise<User | null> {
    try {
      const result = await db.query(
        'SELECT * FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const user = result.rows[0] as UserRow;

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        mode: user.current_mode,
        shadowHash: user.shadow_hash,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      };
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): JWTPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch (error) {
      return null;
    }
  }
}

export default new AuthService();
