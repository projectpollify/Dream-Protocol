# Dream Protocol - Module Development Standards

**Version**: 1.0
**Status**: REQUIRED for all new modules (05-22)
**Based on**: Module 03 (User) and Module 04 (Economy) patterns
**Last Updated**: October 30, 2025

---

## 🎯 Purpose

This document defines the **official standards** for building Dream Protocol modules. All future modules (05-22) **MUST** follow these patterns to ensure consistency, maintainability, and integration capability.

---

## 📦 Package Structure

### Required Directory Layout

```
packages/XX-module-name/
├── package.json          ← REQUIRED
├── tsconfig.json         ← REQUIRED (extends root)
├── README.md             ← Optional (but recommended)
└── src/
    ├── index.ts          ← REQUIRED (hybrid pattern)
    ├── routes/
    │   └── module.routes.ts
    ├── services/
    │   └── *.service.ts
    ├── types/
    │   └── module.types.ts
    ├── utils/
    │   └── database.ts   ← REQUIRED (standard pattern)
    └── tests/
        └── *.test.ts     ← REQUIRED
```

---

## 📝 package.json Standards

### Required Fields

```json
{
  "name": "@dream/module-name",
  "version": "1.0.0",
  "description": "Module XX: Brief description",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/index.ts",
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "lint": "eslint src --ext .ts",
    "format": "prettier --write \"src/**/*.ts\""
  },
  "keywords": ["dream-protocol", "module-name"],
  "author": "Dream Protocol Team",
  "license": "MIT",
  "dependencies": {
    "pg": "^8.11.3",
    "express": "^4.18.2",
    "dotenv": "^16.4.1",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/node": "^20.11.5",
    "@types/express": "^4.17.21",
    "@types/pg": "^8.11.0",
    "typescript": "^5.3.3",
    "tsx": "^4.7.0",
    "vitest": "^1.2.0",
    "eslint": "^8.56.0",
    "prettier": "^3.2.4"
  }
}
```

### Naming Convention

- **MUST** use `@dream/` namespace
- **MUST** use kebab-case for module name
- Examples:
  - ✅ `@dream/user`
  - ✅ `@dream/economy`
  - ✅ `@dream/governance`
  - ❌ `@dream-protocol/user` (wrong namespace)
  - ❌ `@dream/User` (wrong case)

---

## 🔧 tsconfig.json Standards

### Required Configuration

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true,
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

### Rules

- **MUST** extend root `tsconfig.json`
- **MUST** enable `composite` for monorepo project references
- **MUST** generate declaration files

---

## 📄 index.ts Standards - HYBRID PATTERN

### Required Pattern

The index.ts file **MUST** follow the hybrid pattern: exportable as a module AND runnable as a standalone server.

```typescript
/**
 * Module XX: Module Name - Main Entry Point
 *
 * Exports all services, types, and routes
 */

import express, { Express } from 'express';
import dotenv from 'dotenv';
import moduleRoutes from './routes/module.routes';
import { healthCheck } from './utils/database';

dotenv.config();

// ============================================================================
// EXPORTS - Services
// ============================================================================

export { default as serviceOne } from './services/service-one.service';
export { default as serviceTwo } from './services/service-two.service';

// ============================================================================
// EXPORTS - Types
// ============================================================================

export * from './types/module.types';

// ============================================================================
// EXPORTS - Database Utils
// ============================================================================

export * from './utils/database';

// ============================================================================
// EXPORTS - Routes
// ============================================================================

export { moduleRoutes };

// ============================================================================
// MODULE INITIALIZATION
// ============================================================================

/**
 * Initialize the Module
 * @param app Express application instance
 * @param basePath Base path for routes (default: /api/v1/module-name)
 */
export function initializeModuleNameModule(
  app: Express,
  basePath: string = '/api/v1/module-name'
): void {
  app.use(basePath, moduleRoutes);
  console.log(`✓ ModuleName module initialized at ${basePath}`);
}

/**
 * Check if module is healthy
 */
export async function checkHealth(): Promise<boolean> {
  return healthCheck();
}

// ============================================================================
// STANDALONE SERVER (for development/testing)
// ============================================================================

/**
 * Start standalone server for module testing
 */
export async function startStandaloneServer(port: number = 3005): Promise<void> {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // CORS (development only)
  app.use((_req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', '*');
    res.header('Access-Control-Allow-Methods', '*');
    next();
  });

  // Initialize module
  initializeModuleNameModule(app);

  // Root endpoint
  app.get('/', (_req, res) => {
    res.json({
      module: 'module-name',
      version: '1.0.0',
      status: 'running',
      endpoints: [
        // List your endpoints here
      ],
    });
  });

  // Health check
  const healthy = await checkHealth();
  if (!healthy) {
    console.error('❌ Database health check failed');
    process.exit(1);
  }

  // Start server
  app.listen(port, () => {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   🏛️  DREAM PROTOCOL - MODULE XX: MODULE NAME');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`   Status: Running`);
    console.log(`   Port: ${port}`);
    console.log(`   Base Path: /api/v1/module-name`);
    console.log(`   Database: Connected ✓`);
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
  });
}

// ============================================================================
// RUN STANDALONE SERVER (if executed directly)
// ============================================================================

if (require.main === module) {
  const port = parseInt(process.env.PORT || '3005');
  startStandaloneServer(port).catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}
```

### Why This Pattern?

✅ **Can be imported** by other modules: `import { serviceOne } from '@dream/module-name'`
✅ **Can run standalone** for testing: `pnpm dev` in the module directory
✅ **Can be integrated** into main app via `initializeModuleNameModule(app)`
✅ **Consistent** across all modules

---

## 🗄️ database.ts Standards

### Required Pattern

```typescript
/**
 * Module XX: Database Utilities
 *
 * Standard database connection and query utilities
 */

import { Pool, PoolClient, QueryResult } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// ============================================================================
// Database Connection Pool
// ============================================================================

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'dreamprotocol_dev',
  user: process.env.DB_USER || 'dream_admin',
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// ============================================================================
// Core Query Functions
// ============================================================================

export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;

    if (process.env.NODE_ENV === 'development') {
      console.log('Executed query', { text, duration, rows: result.rowCount });
    }

    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

export async function getClient(): Promise<PoolClient> {
  return await pool.connect();
}

export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClient();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Transaction error:', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function healthCheck(): Promise<boolean> {
  try {
    await query('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

export async function closePool(): Promise<void> {
  await pool.end();
}

// ============================================================================
// Query Helpers
// ============================================================================

export async function findOne<T>(
  table: string,
  conditions: Record<string, any>
): Promise<T | null> {
  const keys = Object.keys(conditions);
  const values = Object.values(conditions);
  const whereClause = keys.map((key, i) => `${key} = $${i + 1}`).join(' AND ');

  const result = await query<T>(
    `SELECT * FROM ${table} WHERE ${whereClause} LIMIT 1`,
    values
  );

  return result.rows[0] || null;
}

export async function findMany<T>(
  table: string,
  conditions?: Record<string, any>,
  options?: {
    orderBy?: string;
    limit?: number;
    offset?: number;
  }
): Promise<T[]> {
  let sql = `SELECT * FROM ${table}`;
  const values: any[] = [];

  if (conditions && Object.keys(conditions).length > 0) {
    const keys = Object.keys(conditions);
    const condValues = Object.values(conditions);
    const whereClause = keys.map((key, i) => `${key} = $${i + 1}`).join(' AND ');
    sql += ` WHERE ${whereClause}`;
    values.push(...condValues);
  }

  if (options?.orderBy) {
    sql += ` ORDER BY ${options.orderBy}`;
  }

  if (options?.limit) {
    sql += ` LIMIT ${options.limit}`;
  }

  if (options?.offset) {
    sql += ` OFFSET ${options.offset}`;
  }

  const result = await query<T>(sql, values);
  return result.rows;
}

export async function insert<T>(
  table: string,
  data: Record<string, any>
): Promise<T> {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

  const result = await query<T>(
    `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`,
    values
  );

  return result.rows[0];
}

export async function update<T>(
  table: string,
  conditions: Record<string, any>,
  data: Record<string, any>
): Promise<T | null> {
  const dataKeys = Object.keys(data);
  const dataValues = Object.values(data);
  const conditionKeys = Object.keys(conditions);
  const conditionValues = Object.values(conditions);

  const setClause = dataKeys
    .map((key, i) => `${key} = $${i + 1}`)
    .join(', ');

  const whereClause = conditionKeys
    .map((key, i) => `${key} = $${i + 1 + dataKeys.length}`)
    .join(' AND ');

  const result = await query<T>(
    `UPDATE ${table} SET ${setClause}, updated_at = NOW() WHERE ${whereClause} RETURNING *`,
    [...dataValues, ...conditionValues]
  );

  return result.rows[0] || null;
}

export async function deleteRecord(
  table: string,
  conditions: Record<string, any>
): Promise<number> {
  const keys = Object.keys(conditions);
  const values = Object.values(conditions);
  const whereClause = keys.map((key, i) => `${key} = $${i + 1}`).join(' AND ');

  const result = await query(
    `DELETE FROM ${table} WHERE ${whereClause}`,
    values
  );

  return result.rowCount || 0;
}

export async function count(
  table: string,
  conditions?: Record<string, any>
): Promise<number> {
  let sql = `SELECT COUNT(*) as count FROM ${table}`;
  const values: any[] = [];

  if (conditions && Object.keys(conditions).length > 0) {
    const keys = Object.keys(conditions);
    const condValues = Object.values(conditions);
    const whereClause = keys.map((key, i) => `${key} = $${i + 1}`).join(' AND ');
    sql += ` WHERE ${whereClause}`;
    values.push(...condValues);
  }

  const result = await query<{ count: string }>(sql, values);
  return parseInt(result.rows[0].count);
}

export { pool };
```

### Rules

- **MUST** use functional exports (not class-based)
- **MUST** include transaction support
- **MUST** include query helpers (findOne, findMany, insert, update, delete, count)
- **MUST** include healthCheck function
- **SHOULD** log queries in development mode

---

## 🧪 Testing Standards

### Required Tests

Every module **MUST** have:

1. **Unit tests** for services
2. **Integration tests** for API endpoints
3. **Type tests** for TypeScript definitions

### Test File Structure

```typescript
// src/tests/module.test.ts

import { describe, it, expect } from 'vitest';

describe('Module Services', () => {
  it('should export services correctly', async () => {
    const { default: service } = await import('../services/main.service');
    expect(service).toBeDefined();
  });
});

describe('API Integration', () => {
  // Integration tests here
});
```

---

## 📊 Database Migration Standards

### File Naming

```
XXX_module_name.sql

Examples:
001_create_users_table.sql
002_create_dual_wallets.sql
003_create_identity_tables.sql
```

### Migration Content

```sql
-- ============================================================================
-- Module XX: Module Name - Database Schema
-- ============================================================================
-- Description of what this migration does
-- ============================================================================

-- Create tables
CREATE TABLE IF NOT EXISTS table_name (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- columns here
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_table_field ON table_name(field);

-- Add comments
COMMENT ON TABLE table_name IS 'Description';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Module XX: Module Name - Schema created successfully';
END $$;
```

---

## 🔗 Cross-Module Imports

### Using Shared Types

```typescript
// Import from other modules
import { IdentityMode } from '@dream/shared';
import { userService } from '@dream/user';

// Use in your module
async function validateUser(userId: string, mode: IdentityMode) {
  // ...
}
```

---

## ✅ Compliance Checklist

Before submitting a new module, verify:

- [ ] Package name is `@dream/module-name`
- [ ] tsconfig.json extends root
- [ ] index.ts follows hybrid pattern
- [ ] database.ts uses standard functional pattern
- [ ] Exports: services, types, routes, database utils
- [ ] Functions: `initializeXModule()`, `checkHealth()`, `startStandaloneServer()`
- [ ] Tests exist and pass
- [ ] Migration file numbered correctly
- [ ] All services have default exports
- [ ] API routes documented in root GET endpoint
- [ ] README.md exists (recommended)

---

## 📚 Reference Examples

**Perfect implementations**:
- ✅ Module 03: User (`packages/03-user/`)
- ✅ Module 04: Economy (`packages/04-economy/`)

**Use these as templates for new modules!**

---

## 🚨 Non-Compliant Patterns (Do NOT Copy)

**Avoid these patterns from Modules 01-02**:
- ❌ Class-based database utilities
- ❌ Standalone-only exports (no module exports)
- ❌ Different package namespace
- ❌ Custom TypeScript config (not extending root)

**These will be refactored later.**

---

## 📞 Questions?

If unclear about any pattern, refer to:
1. Module 03 (`packages/03-user/`) - User module
2. Module 04 (`packages/04-economy/`) - Economy module
3. This document

**Last Updated**: October 30, 2025
