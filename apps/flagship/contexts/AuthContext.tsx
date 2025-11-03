'use client';

/**
 * Enhanced Authentication Context
 * Manages dual-identity authentication state for Dream Protocol
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { apiClient } from '@/lib/api/client';
import {
  User,
  IdentityMode,
  LoginRequest,
  RegisterRequest,
  IdentitySetupRequest,
} from '@/lib/api/types';
import { hasCompletedIdentitySetup } from '@/lib/utils/identity';

// ============================================
// Context Types
// ============================================

interface AuthContextType {
  // State
  user: User | null;
  loading: boolean;
  error: string | null;

  // Auth methods
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;

  // Identity methods
  switchMode: (mode: IdentityMode) => Promise<void>;
  setupIdentity: (data: IdentitySetupRequest) => Promise<void>;
  refreshUser: () => Promise<void>;

  // Utility methods
  isAuthenticated: () => boolean;
  isInShadowMode: () => boolean;
  needsIdentitySetup: () => boolean;
  clearError: () => void;
}

// ============================================
// Context Creation
// ============================================

const AuthContext = createContext<AuthContextType>({
  // Default values
  user: null,
  loading: true,
  error: null,

  // Default methods (no-ops)
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  switchMode: async () => {},
  setupIdentity: async () => {},
  refreshUser: async () => {},
  isAuthenticated: () => false,
  isInShadowMode: () => false,
  needsIdentitySetup: () => false,
  clearError: () => {},
});

// ============================================
// Custom Hook
// ============================================

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// ============================================
// Provider Component
// ============================================

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ============================================
  // Load User on Mount
  // ============================================

  useEffect(() => {
    loadUser();

    // Listen for auth events
    const handleUnauthorized = () => {
      setUser(null);
      setError('Your session has expired. Please log in again.');
    };

    const handleLogout = () => {
      setUser(null);
    };

    const handleModeChanged = () => {
      // Refresh user data when mode changes
      loadUser();
    };

    window.addEventListener('unauthorized', handleUnauthorized);
    window.addEventListener('logout', handleLogout);
    window.addEventListener('modeChanged', handleModeChanged);

    return () => {
      window.removeEventListener('unauthorized', handleUnauthorized);
      window.removeEventListener('logout', handleLogout);
      window.removeEventListener('modeChanged', handleModeChanged);
    };
  }, []);

  // ============================================
  // Core Methods
  // ============================================

  const loadUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = apiClient.getToken();
      if (!token) {
        setUser(null);
        return;
      }

      const response = await apiClient.getCurrentUser();

      if (response.success && response.data) {
        setUser(response.data);
      } else {
        setUser(null);
        setError(response.error || 'Failed to load user');
      }
    } catch (err) {
      console.error('Failed to load user:', err);
      setUser(null);
      setError('Failed to load user data');
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (data: LoginRequest) => {
    try {
      setError(null);
      const response = await apiClient.login(data);

      if (!response.success) {
        throw new Error(response.error || 'Login failed');
      }

      // Load user data after successful login
      await loadUser();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw new Error(message);
    }
  }, [loadUser]);

  const register = useCallback(async (data: RegisterRequest) => {
    try {
      setError(null);
      const response = await apiClient.register(data);

      if (!response.success) {
        throw new Error(response.error || 'Registration failed');
      }

      // Load user data after successful registration
      await loadUser();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setError(message);
      throw new Error(message);
    }
  }, [loadUser]);

  const logout = useCallback(async () => {
    try {
      setError(null);
      await apiClient.logout();
      setUser(null);
    } catch (err) {
      console.error('Logout error:', err);
      // Still clear user even if logout request fails
      setUser(null);
    }
  }, []);

  const switchMode = useCallback(async (mode: IdentityMode) => {
    try {
      setError(null);

      if (!user) {
        throw new Error('Not authenticated');
      }

      if (user.mode === mode) {
        throw new Error(`Already in ${mode} mode`);
      }

      const response = await apiClient.switchMode({ mode });

      if (!response.success) {
        throw new Error(response.error || 'Mode switch failed');
      }

      // Reload user data with new mode
      await loadUser();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Mode switch failed';
      setError(message);
      throw new Error(message);
    }
  }, [user, loadUser]);

  const setupIdentity = useCallback(async (data: IdentitySetupRequest) => {
    try {
      setError(null);

      const response = await apiClient.setupIdentity(data);

      if (!response.success) {
        throw new Error(response.error || 'Identity setup failed');
      }

      // Reload user data after setup
      await loadUser();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Identity setup failed';
      setError(message);
      throw new Error(message);
    }
  }, [loadUser]);

  const refreshUser = useCallback(async () => {
    await loadUser();
  }, [loadUser]);

  // ============================================
  // Utility Methods
  // ============================================

  const isAuthenticated = useCallback((): boolean => {
    return !!user && !!apiClient.getToken();
  }, [user]);

  const isInShadowMode = useCallback((): boolean => {
    return user?.mode === 'shadow';
  }, [user]);

  const needsIdentitySetup = useCallback((): boolean => {
    if (!user) return false;
    return !hasCompletedIdentitySetup(user);
  }, [user]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ============================================
  // Context Value
  // ============================================

  const contextValue: AuthContextType = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    switchMode,
    setupIdentity,
    refreshUser,
    isAuthenticated,
    isInShadowMode,
    needsIdentitySetup,
    clearError,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}