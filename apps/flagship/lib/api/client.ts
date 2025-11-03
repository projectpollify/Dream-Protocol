/**
 * Dream Protocol API Client
 * Enhanced client with dual-identity support adapted from pollifypro1
 */

import {
  ApiResponse,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  SwitchModeRequest,
  SwitchModeResponse,
  User,
  IdentityMode,
  IdentitySetupRequest,
  IdentitySetupResponse,
} from './types';

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_VERSION = '/api/v1';

class EnhancedApiClient {
  private token: string | null = null;
  private currentMode: IdentityMode | null = null;

  constructor() {
    // Load token from localStorage on initialization
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
      this.currentMode = (localStorage.getItem('identity_mode') as IdentityMode) || null;
    }
  }

  // ============================================
  // Token Management
  // ============================================

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('auth_token', token);
      } else {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('identity_mode');
        this.currentMode = null;
      }
    }
  }

  getToken(): string | null {
    if (typeof window !== 'undefined' && !this.token) {
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }

  setCurrentMode(mode: IdentityMode | null) {
    this.currentMode = mode;
    if (typeof window !== 'undefined') {
      if (mode) {
        localStorage.setItem('identity_mode', mode);
      } else {
        localStorage.removeItem('identity_mode');
      }
    }
  }

  getCurrentMode(): IdentityMode | null {
    if (typeof window !== 'undefined' && !this.currentMode) {
      this.currentMode = (localStorage.getItem('identity_mode') as IdentityMode) || null;
    }
    return this.currentMode;
  }

  // ============================================
  // HTTP Methods
  // ============================================

  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = this.getToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add authorization header if token exists
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Add current mode header for context
    const mode = this.getCurrentMode();
    if (mode) {
      headers['X-Identity-Mode'] = mode;
    }

    const url = `${API_BASE_URL}${API_VERSION}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include', // Important for CORS
      });

      // Handle 401 Unauthorized
      if (response.status === 401) {
        this.handleUnauthorized();
        return {
          success: false,
          error: 'Authentication required',
        };
      }

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `Request failed with status ${response.status}`,
        };
      }

      return data;
    } catch (error) {
      console.error('[API Client] Request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  async get<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async patch<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // ============================================
  // Authentication Endpoints
  // ============================================

  async login(data: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    const response = await this.post<LoginResponse>('/auth/login', data);

    if (response.success && response.data) {
      this.setToken(response.data.token);
      this.setCurrentMode(response.data.user.mode);
    }

    return response;
  }

  async register(data: RegisterRequest): Promise<ApiResponse<LoginResponse>> {
    const response = await this.post<LoginResponse>('/auth/register', data);

    if (response.success && response.data) {
      this.setToken(response.data.token);
      this.setCurrentMode('true_self'); // Always start in true_self mode
    }

    return response;
  }

  async logout(): Promise<void> {
    // Optional: Call backend logout endpoint if needed
    await this.post('/auth/logout').catch(() => {
      // Ignore errors on logout
    });

    // Clear local storage
    this.setToken(null);
    this.setCurrentMode(null);

    // Dispatch logout event for other components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('logout'));
    }
  }

  // ============================================
  // User Endpoints
  // ============================================

  async getCurrentUser(): Promise<ApiResponse<User>> {
    return this.get<User>('/auth/me');
  }

  async switchMode(data: SwitchModeRequest): Promise<ApiResponse<SwitchModeResponse>> {
    const response = await this.post<SwitchModeResponse>('/users/switch-mode', data);

    if (response.success && response.data) {
      // Update token and mode with new values
      this.setToken(response.data.token);
      this.setCurrentMode(response.data.mode);

      // Dispatch mode change event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('modeChanged', {
          detail: { mode: response.data.mode }
        }));
      }
    }

    return response;
  }

  async setupIdentity(data: IdentitySetupRequest): Promise<ApiResponse<IdentitySetupResponse>> {
    return this.post<IdentitySetupResponse>('/users/setup-identity', data);
  }

  async getUserProfile(userId: string): Promise<ApiResponse<User>> {
    return this.get<User>(`/users/${userId}/profile`);
  }

  // ============================================
  // Poll Endpoints
  // ============================================

  async getPolls(params?: {
    status?: 'active' | 'closed' | 'all';
    category?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }

    const queryString = queryParams.toString();
    return this.get(`/polls${queryString ? `?${queryString}` : ''}`);
  }

  async getPoll(pollId: string): Promise<ApiResponse<any>> {
    return this.get(`/polls/${pollId}`);
  }

  async votePoll(pollId: string, data: {
    choice: 'yes' | 'no' | 'abstain';
    reasoning?: string;
  }): Promise<ApiResponse<any>> {
    return this.post(`/polls/${pollId}/vote`, data);
  }

  // ============================================
  // Utility Methods
  // ============================================

  private handleUnauthorized() {
    // Clear auth state
    this.setToken(null);
    this.setCurrentMode(null);

    // Dispatch unauthorized event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('unauthorized'));

      // Redirect to login if not already there
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // Get identity display text
  getIdentityDisplay(): string {
    const mode = this.getCurrentMode();
    if (!mode) return 'Not logged in';
    return mode === 'true_self' ? 'True Self' : 'Shadow';
  }
}

// Export singleton instance
export const apiClient = new EnhancedApiClient();

// Export for type usage
export type { EnhancedApiClient };