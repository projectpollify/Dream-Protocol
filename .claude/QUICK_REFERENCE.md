# Module Development - Quick Reference

**Use this for quick lookups when building modules 05-22**

---

## 🎯 Before You Start

```bash
# 1. Read the standards
cat MODULE_STANDARDS.md

# 2. Use the checklist
open .claude/module-checklist.md

# 3. Reference existing modules
cd packages/03-user  # Best hybrid pattern example
cd packages/04-economy  # Best service structure example
```

---

## 📦 Package Name Pattern

```json
{
  "name": "@dream/module-name"  ← CORRECT
}
```

```json
{
  "name": "@dream-protocol/module-name"  ← WRONG
}
```

---

## 🗄️ Database.ts Pattern

```typescript
// ❌ WRONG - Class-based
class Database {
  async query() { ... }
}
export const db = new Database();

// ✅ CORRECT - Functional
export async function query<T>(text: string, params?: any[]): Promise<QueryResult<T>> {
  const result = await pool.query<T>(text, params);
  return result;
}

export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

---

## ⚙️ Service Export Pattern

```typescript
// ❌ WRONG - Named export
export const myService = new MyService();

// ✅ CORRECT - Default export
class MyService {
  async doSomething() { ... }
}

const myService = new MyService();
export default myService;
```

---

## 🔄 Service Import Pattern

```typescript
// ❌ WRONG - Named import
import { myService } from './services/my.service';

// ✅ CORRECT - Default import
import myService from './services/my.service';
```

---

## 📄 index.ts Structure (Hybrid Pattern)

```typescript
import express, { Express } from 'express';
import dotenv from 'dotenv';
import moduleRoutes from './routes/module.routes';
import { checkHealth } from './utils/database';

dotenv.config();

// ============================================================================
// EXPORTS - Services
// ============================================================================
export { default as myService } from './services/my.service';

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
export function initializeModuleModule(
  app: Express,
  basePath: string = '/api/v1/module'
): void {
  app.use(basePath, moduleRoutes);
  console.log(`✓ Module initialized at ${basePath}`);
}

export async function checkHealth(): Promise<boolean> {
  // Your health check logic
  return true;
}

// ============================================================================
// STANDALONE SERVER
// ============================================================================
export async function startStandaloneServer(port: number = 3005): Promise<void> {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // CORS (development only)
  app.use((_req, res, next) => {
    res.header('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (_req.method === 'OPTIONS') return res.sendStatus(200);
    next();
  });

  // Initialize module
  initializeModuleModule(app);

  // Root endpoint
  app.get('/', (_req, res) => {
    res.json({
      module: 'module-name',
      version: '1.0.0',
      status: 'running',
      endpoints: [
        // List your endpoints
      ],
    });
  });

  // Health check endpoint
  app.get('/health', async (_req, res) => {
    const healthy = await checkHealth();
    res.json({
      status: healthy ? 'ok' : 'error',
      module: 'module-name',
      timestamp: new Date().toISOString(),
    });
  });

  // Error handling middleware
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  });

  // Start server
  app.listen(port, () => {
    console.log(`\n🚀 Module running on port ${port}\n`);
  });

  // Graceful shutdown
  const shutdownHandler = async () => {
    console.log('\nShutting down gracefully...');
    process.exit(0);
  };

  process.on('SIGTERM', shutdownHandler);
  process.on('SIGINT', shutdownHandler);
}

// ============================================================================
// AUTO-RUN (if executed directly)
// ============================================================================
if (require.main === module) {
  const port = parseInt(process.env.API_PORT || process.env.PORT || '3005');
  startStandaloneServer(port).catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}
```

---

## 🔧 tsconfig.json Pattern

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true,       ← REQUIRED
    "declaration": true,     ← REQUIRED
    "declarationMap": true   ← REQUIRED
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

---

## 🗂️ Migration File Naming

```bash
# Check existing migrations first
ls database/migrations/

# Current max is 006, so next should be:
007_token_exchange.sql
008_governance.sql
009_content.sql
# etc.

# Format: XXX_module_name.sql (sequential numbers)
```

---

## ✅ Validation Commands

```bash
# Validate module structure
node scripts/validate-module.js XX-module-name

# Test standalone mode
cd packages/XX-module-name
pnpm dev

# Test build
pnpm build

# Run tests
pnpm test

# Test import from another module
cd packages/01-identity
# Add: import { myService } from '@dream/module-name';
# Should compile without errors
```

---

## 🎯 Port Assignments

- 3001: Module 01 (Identity)
- 3002: Module 02 (Bridge Legacy)
- 3003: Module 03 (User)
- 3004: Module 04 (Economy)
- 3005: Module 05 (Token Exchange) ← Next
- 3006: Module 06 (Governance)
- 3007: Module 07 (Content)
- etc.

---

## 📝 Commit Message Template

```
Complete Module XX: Name - Brief Description

## Database Schema (X Tables)
- table_name: description

## Services (X Files)
- service.service.ts: description

## API Endpoints (X Routes)
- GET /endpoint - description

## Features
- Feature 1
- Feature 2

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## 🚨 Red Flags Checklist

Before committing, verify NO red flags:

- [ ] ❌ Package name is `@dream-protocol/*`
- [ ] ❌ database.ts has `class Database`
- [ ] ❌ Services use `export const service = new Service()`
- [ ] ❌ index.ts missing `initializeModule()` function
- [ ] ❌ index.ts missing `startStandaloneServer()` function
- [ ] ❌ index.ts missing `if (require.main === module)` block
- [ ] ❌ tsconfig.json missing `composite: true`
- [ ] ❌ Migration file has duplicate number
- [ ] ❌ Can't run standalone: `pnpm dev` fails
- [ ] ❌ Can't import from other modules

If ANY red flag is present, STOP and fix before committing.

---

## 📚 Key Files to Reference

1. **MODULE_STANDARDS.md** - Full specification
2. **.claude/module-checklist.md** - Step-by-step guide
3. **packages/03-user/** - Best hybrid pattern example
4. **packages/04-economy/** - Best service structure example

---

## 🎉 Success Criteria

Module is COMPLETE when ALL are true:

✅ `node scripts/validate-module.js XX` passes with 0 errors
✅ `cd packages/XX && pnpm dev` starts server
✅ `pnpm build` creates dist/ with .d.ts files
✅ `pnpm test` passes
✅ Can import: `import { service } from '@dream/module'` works
✅ PROGRESS.md updated
✅ Committed and pushed to GitHub

---

**When in doubt, COPY Module 03 or 04 and ADAPT. Don't reinvent.**
