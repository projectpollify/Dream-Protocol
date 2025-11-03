/**
 * Health Check Endpoints
 * Monitor gateway and all backend modules
 */

import { Request, Response } from 'express';
import { ModuleConfig } from './config';
import { Logger } from './logger';

const logger = new Logger({ level: 'info', prefix: 'Health' });

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  gateway: {
    port: number;
    uptime: number;
  };
  modules: Record<
    string,
    {
      name: string;
      port: number;
      status: 'up' | 'down';
      responseTime?: number;
    }
  >;
  timestamp: string;
}

const startTime = Date.now();

/**
 * Check if a module is accessible
 */
async function checkModuleHealth(module: ModuleConfig): Promise<{
  status: 'up' | 'down';
  responseTime?: number;
}> {
  const url = `http://localhost:${module.internalPort}/health`;
  const checkStart = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const responseTime = Date.now() - checkStart;
      return { status: 'up', responseTime };
    }
    return { status: 'down' };
  } catch (error) {
    logger.warn(`Module ${module.name} health check failed`, error);
    return { status: 'down' };
  }
}

/**
 * Gateway health endpoint
 */
export async function handleGatewayHealth(
  req: Request,
  res: Response,
  modules: ModuleConfig[],
  gatewayPort: number
): Promise<void> {
  // Check all modules in parallel
  const moduleChecks = await Promise.all(
    modules.map(async (module) => {
      const health = await checkModuleHealth(module);
      return {
        [module.name]: {
          name: module.name,
          port: module.internalPort,
          status: health.status,
          responseTime: health.responseTime,
        },
      };
    })
  );

  // Combine results
  const modulesStatus = Object.assign({}, ...moduleChecks);
  const healthyCount = Object.values(modulesStatus).filter(
    (m: any) => m.status === 'up'
  ).length;
  const totalCount = modules.length;

  const overallStatus =
    healthyCount === totalCount
      ? 'healthy'
      : healthyCount > 0
        ? 'degraded'
        : 'unhealthy';

  const health: HealthStatus = {
    status: overallStatus,
    gateway: {
      port: gatewayPort,
      uptime: Math.floor((Date.now() - startTime) / 1000),
    },
    modules: modulesStatus as any,
    timestamp: new Date().toISOString(),
  };

  const statusCode = overallStatus === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
}

/**
 * Simple ping endpoint
 */
export function handlePing(req: Request, res: Response): void {
  res.json({
    success: true,
    message: 'Dream Protocol API Gateway is running',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Gateway info endpoint
 */
export function handleInfo(
  req: Request,
  res: Response,
  modules: ModuleConfig[],
  gatewayPort: number
): void {
  res.json({
    gateway: {
      name: 'Dream Protocol API Gateway',
      version: '0.1.0',
      port: gatewayPort,
      environment: process.env.NODE_ENV || 'development',
    },
    modules: modules.map((m) => ({
      name: m.name,
      basePath: m.basePath,
      internalPort: m.internalPort,
      description: m.description,
    })),
    timestamp: new Date().toISOString(),
  });
}
