/**
 * Authentication Module Types
 * Based on pollifypro1 enhanced auth system adapted for Dream Protocol
 */

export type IdentityMode = 'true_self' | 'shadow';

// ============================================
// Request/Response Types
// ============================================

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  data?: {
    user: User;
    token: string;
    profiles: {
      trueSelf: UserProfile;
      shadow: UserProfile;
    };
    onboardingRequired?: boolean;
  };
  error?: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  mode: IdentityMode;
  shadowHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  reputation: number;
}

// ============================================
// JWT Payload
// ============================================

export interface JWTPayload {
  userId: string;
  username: string;
  email: string;
  currentMode: IdentityMode;
  shadowHash: string;
  activeIdentity: {
    id: string;                    // userId for true_self, shadowHash for shadow
    mode: IdentityMode;
    displayName: string;
  };
  iat?: number;
  exp?: number;
}

// ============================================
// Database Types
// ============================================

export interface UserRow {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  shadow_hash: string;
  current_mode: IdentityMode;
  created_at: Date;
  updated_at: Date;
}

// ============================================
// Express Request Extensions
// ============================================

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
      userId?: string;
      currentMode?: IdentityMode;
    }
  }
}
