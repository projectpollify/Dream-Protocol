/**
 * API Gateway Configuration
 * Centralized configuration for all module ports and routing
 */

export interface ModuleConfig {
  name: string;
  internalPort: number;
  basePath: string;
  description: string;
}

export interface GatewayConfig {
  gatewayPort: number;
  nodeEnv: 'development' | 'production' | 'test';
  corsOrigin: string[];
  modules: ModuleConfig[];
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Module Routing Configuration
 * Maps API paths to internal module ports
 */
export const MODULE_CONFIG: ModuleConfig[] = [
  {
    name: 'identity',
    internalPort: 3001,
    basePath: '/api/v1/identity',
    description: 'Identity & Dual-identity wallets',
  },
  {
    name: 'bridge-legacy',
    internalPort: 3002,
    basePath: '/api/v1/bridge',
    description: 'Legacy MVP bridge & migration',
  },
  {
    name: 'user',
    internalPort: 3003,
    basePath: '/api/v1/users',
    description: 'User profiles & settings',
  },
  {
    name: 'economy',
    internalPort: 3004,
    basePath: '/api/v1/economy',
    description: 'Token systems & balances',
  },
  {
    name: 'token-exchange',
    internalPort: 3005,
    basePath: '/api/v1/exchange',
    description: 'Token exchange & trading',
  },
  {
    name: 'governance',
    internalPort: 3006,
    basePath: '/api/v1/governance',
    description: 'Governance & voting system',
  },
  {
    name: 'content',
    internalPort: 3007,
    basePath: '/api/v1/content',
    description: 'Posts, discussions, comments',
  },
  {
    name: 'social',
    internalPort: 3008,
    basePath: '/api/v1/social',
    description: 'Social interactions & feeds',
  },
  {
    name: 'verification',
    internalPort: 3009,
    basePath: '/api/v1/verification',
    description: 'Verification & truth systems',
  },
  {
    name: 'analytics',
    internalPort: 3010,
    basePath: '/api/v1/analytics',
    description: 'Analytics & insights',
  },
];

/**
 * Load and validate gateway configuration
 */
export function loadConfig(): GatewayConfig {
  const nodeEnv = (process.env.NODE_ENV || 'development') as
    | 'development'
    | 'production'
    | 'test';

  const gatewayPort = parseInt(process.env.API_GATEWAY_PORT || '3011');
  const corsOrigin = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : nodeEnv === 'production'
      ? ['https://dreamprotocol.io']
      : ['http://localhost:3000', 'http://localhost:5173'];

  const logLevel = (process.env.LOG_LEVEL || 'info') as
    | 'debug'
    | 'info'
    | 'warn'
    | 'error';

  return {
    gatewayPort,
    nodeEnv,
    corsOrigin,
    modules: MODULE_CONFIG,
    logLevel,
  };
}
