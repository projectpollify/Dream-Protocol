/**
 * Adapter Service
 * Routes requests between legacy MVP and new Dream Protocol systems
 * Handles API translation and response normalization
 */

import featureFlagService from './feature-flag.service';
import { AdapterRequest, AdapterResponse } from '../types/bridge.types';

class AdapterService {
  /**
   * Route request based on feature flags
   * THE central routing logic
   */
  async routeRequest(request: AdapterRequest): Promise<AdapterResponse> {
    const { userId, endpoint, method, data } = request;

    try {
      // Determine which system to use
      const useNewSystem = await featureFlagService.isFeatureEnabledForUser(
        userId,
        'new_system'
      );

      if (useNewSystem) {
        // Use new Dream Protocol system
        console.log(`[Adapter] Routing ${method} ${endpoint} to NEW system for user ${userId}`);
        return await this.callNewSystem(endpoint, method, data);
      } else {
        // Use legacy MVP system
        console.log(`[Adapter] Routing ${method} ${endpoint} to LEGACY system for user ${userId}`);
        return await this.callLegacySystem(endpoint, method, data);
      }
    } catch (error: any) {
      console.error('[Adapter] Routing error:', error);
      return {
        success: false,
        error: error.message,
        source: 'legacy', // Fallback to legacy on error
      };
    }
  }

  /**
   * Call new Dream Protocol system
   */
  private async callNewSystem(
    endpoint: string,
    method: string,
    data?: any
  ): Promise<AdapterResponse> {
    try {
      // Map endpoint to new system format
      const mappedEndpoint = this.mapEndpoint(endpoint, 'new');

      // In production, this would make an actual HTTP request
      // For now, we'll simulate the response structure
      const response = {
        success: true,
        data: {
          message: `New system response for ${endpoint}`,
          endpoint: mappedEndpoint,
          method,
          data,
        },
        source: 'new' as const,
      };

      return response;
    } catch (error: any) {
      console.error('[Adapter] New system call failed:', error);
      return {
        success: false,
        error: error.message,
        source: 'new',
      };
    }
  }

  /**
   * Call legacy MVP system
   */
  private async callLegacySystem(
    endpoint: string,
    method: string,
    data?: any
  ): Promise<AdapterResponse> {
    try {
      // Transform data if needed for legacy compatibility
      const transformedData = this.transformRequestForLegacy(endpoint, data);

      // In production, this would make an actual HTTP request to MVP
      // For now, we'll simulate the response structure
      const response = {
        success: true,
        data: {
          message: `Legacy system response for ${endpoint}`,
          method,
          data: transformedData,
        },
        source: 'legacy' as const,
      };

      return response;
    } catch (error: any) {
      console.error('[Adapter] Legacy system call failed:', error);
      return {
        success: false,
        error: error.message,
        source: 'legacy',
      };
    }
  }

  /**
   * Map endpoints from old API to new API
   * Example: /api/polls → /api/v1/governance/polls
   */
  private mapEndpoint(endpoint: string, system: 'old' | 'new'): string {
    const mappings: Record<string, { old: string; new: string }> = {
      polls: {
        old: '/polls',
        new: '/api/v1/governance/polls',
      },
      chambers: {
        old: '/chambers',
        new: '/api/v1/governance/chambers',
      },
      'users/profile': {
        old: '/users/profile',
        new: '/api/v1/user/profile',
      },
      posts: {
        old: '/posts',
        new: '/api/v1/content/posts',
      },
      votes: {
        old: '/votes',
        new: '/api/v1/governance/votes',
      },
    };

    // Find matching key
    for (const [key, paths] of Object.entries(mappings)) {
      if (endpoint.includes(key)) {
        return system === 'new' ? paths.new : paths.old;
      }
    }

    // No mapping found, return as-is
    return endpoint;
  }

  /**
   * Transform response from legacy system to new format
   * Handles differences in response structure
   */
  transformLegacyResponse(endpoint: string, legacyResponse: any): any {
    // Example: Transform legacy poll response to new format
    if (endpoint.includes('polls')) {
      return {
        ...legacyResponse,
        // Add any new fields that new system expects
        dualityToken: null,
        shadowConsensusWeight: 0,
        identityMode: 'true_self',
      };
    }

    // Example: Transform legacy user response
    if (endpoint.includes('users')) {
      return {
        ...legacyResponse,
        // Add dual identity fields
        has_dual_identity: false,
        current_identity_mode: 'true_self',
        shadow_wallet: null,
      };
    }

    // Example: Transform legacy vote response
    if (endpoint.includes('votes')) {
      return {
        ...legacyResponse,
        // Add identity mode field
        identity_mode: 'true_self',
        conviction_score: legacyResponse.weight || 1.0,
      };
    }

    return legacyResponse;
  }

  /**
   * Transform request from new system to legacy format
   * Handles backward compatibility
   */
  transformRequestForLegacy(endpoint: string, newRequest: any): any {
    if (!newRequest) return newRequest;

    // Example: Strip out fields legacy doesn't understand
    if (endpoint.includes('polls')) {
      const {
        dualityToken,
        shadowConsensusWeight,
        identityMode,
        ...legacyRequest
      } = newRequest;
      return legacyRequest;
    }

    // Example: Strip dual identity fields from user requests
    if (endpoint.includes('users')) {
      const {
        has_dual_identity,
        current_identity_mode,
        shadow_wallet,
        ...legacyRequest
      } = newRequest;
      return legacyRequest;
    }

    // Example: Convert new vote format to legacy
    if (endpoint.includes('votes')) {
      const { identity_mode, conviction_score, ...legacyRequest } = newRequest;
      return {
        ...legacyRequest,
        weight: conviction_score || 1.0,
      };
    }

    return newRequest;
  }

  /**
   * Determine which system a user should be on
   * Useful for middleware and routing logic
   */
  async getUserSystemPreference(userId: string): Promise<'legacy' | 'new'> {
    const useNewSystem = await featureFlagService.isFeatureEnabledForUser(
      userId,
      'new_system'
    );
    return useNewSystem ? 'new' : 'legacy';
  }

  /**
   * Check if specific feature is enabled for user
   */
  async isFeatureEnabled(userId: string, featureName: string): Promise<boolean> {
    return await featureFlagService.isFeatureEnabledForUser(userId, featureName);
  }

  /**
   * Get all enabled features for a user
   */
  async getUserFeatures(userId: string): Promise<Record<string, boolean>> {
    return await featureFlagService.getUserFeatureFlags(userId);
  }
}

const adapterService = new AdapterService();

export default adapterService;
