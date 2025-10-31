# Module Development Checklist

**Use this checklist when building ANY new module (05-22) to ensure compliance with MODULE_STANDARDS.md**

---

## ✅ Pre-Development (Before Writing Code)

- [ ] Read MODULE_STANDARDS.md in full
- [ ] Review existing modules (01-04) as reference examples
- [ ] Create module directory: `packages/XX-module-name/`
- [ ] Create `package.json` with:
  - [ ] Name: `@dream/module-name` (NOT `@dream-protocol/*`)
  - [ ] Version: `1.0.0`
  - [ ] Main: `dist/index.js`
  - [ ] Types: `dist/index.d.ts`
  - [ ] Required scripts: build, dev, test, test:coverage
- [ ] Create `tsconfig.json` with:
  - [ ] `extends: "../../tsconfig.json"`
  - [ ] `composite: true`
  - [ ] `declaration: true`
  - [ ] `declarationMap: true`

---

## ✅ Database Schema (If Module Needs Database)

- [ ] Create migration file with correct numbering:
  - [ ] Check existing migrations in `database/migrations/`
  - [ ] Use next sequential number (current max is 006)
  - [ ] Format: `XXX_module_name.sql`
- [ ] Migration includes:
  - [ ] Table creation with proper indexes
  - [ ] Foreign keys to users table where needed
  - [ ] Created_at and updated_at timestamps
  - [ ] Proper constraints and defaults
- [ ] Test migration with `node scripts/migrate.js`

---

## ✅ Database Utilities (`src/utils/database.ts`)

- [ ] Use FUNCTIONAL pattern (NO CLASSES)
- [ ] Export pool connection: `export const pool = new Pool(config);`
- [ ] Export `db` alias: `export const db = pool;`
- [ ] Implement core functions:
  - [ ] `query<T>(text: string, params?: any[]): Promise<QueryResult<T>>`
  - [ ] `getClient(): Promise<PoolClient>`
  - [ ] `transaction<T>(callback): Promise<T>`
  - [ ] `healthCheck(): Promise<boolean>`
- [ ] Implement helper functions:
  - [ ] `findOne<T>(table, conditions): Promise<T | null>`
  - [ ] `findMany<T>(table, conditions?, options?): Promise<T[]>`
  - [ ] `insert<T>(table, data): Promise<T>`
  - [ ] `update<T>(table, conditions, data): Promise<T | null>`
  - [ ] `deleteRecord(table, conditions): Promise<number>`
  - [ ] `count(table, conditions?): Promise<number>`
- [ ] Implement shutdown:
  - [ ] `closePool(): Promise<void>`
- [ ] Add logging in development mode
- [ ] Copy from Module 03/04 and adapt (DON'T reinvent)

---

## ✅ Service Files (`src/services/*.service.ts`)

- [ ] Each service is a CLASS with methods
- [ ] Export DEFAULT (NOT named export):
  ```typescript
  class MyService { ... }
  const myService = new MyService();
  export default myService;
  ```
- [ ] Services use functional database utils:
  - [ ] Import: `import { query, transaction, findOne } from '../utils/database';`
  - [ ] NOT: `import { db } from '../utils/database'; await db.query(...)`
- [ ] Include error handling with try/catch
- [ ] Add console.log for development debugging
- [ ] Include TypeScript types for all parameters and returns

---

## ✅ Routes (`src/routes/module.routes.ts`)

- [ ] Use Express Router
- [ ] Import services as DEFAULT:
  ```typescript
  import myService from '../services/my.service';
  ```
- [ ] All endpoints return consistent JSON:
  ```typescript
  { success: true, data: ... }
  { success: false, error: ... }
  ```
- [ ] Include try/catch error handling
- [ ] Export as default: `export default router;`
- [ ] Include health check endpoint

---

## ✅ Types (`src/types/module.types.ts`)

- [ ] Define all TypeScript interfaces/types
- [ ] Export all types: `export interface MyType { ... }`
- [ ] Include request/response types
- [ ] Include database entity types
- [ ] Use consistent naming (e.g., `CreateUserRequest`, `UserResponse`)

---

## ✅ Main Entry Point (`src/index.ts`)

**CRITICAL: This MUST follow the hybrid pattern exactly**

- [ ] Import Express and dotenv at top
- [ ] Load environment: `dotenv.config();`
- [ ] Export services section:
  ```typescript
  // EXPORTS - Services
  export { default as myService } from './services/my.service';
  ```
- [ ] Export types section:
  ```typescript
  // EXPORTS - Types
  export * from './types/module.types';
  ```
- [ ] Export database utils section:
  ```typescript
  // EXPORTS - Database Utils
  export * from './utils/database';
  ```
- [ ] Export routes section:
  ```typescript
  // EXPORTS - Routes
  export { moduleRoutes };
  ```
- [ ] Include `initializeModuleModule(app, basePath)` function
- [ ] Include `checkHealth()` function
- [ ] Include `startStandaloneServer(port)` function with:
  - [ ] Express middleware setup
  - [ ] CORS headers for development
  - [ ] Module initialization
  - [ ] Root endpoint listing all routes
  - [ ] Health check endpoint
  - [ ] Error handling middleware
  - [ ] Database health check before starting
  - [ ] Graceful shutdown handlers (SIGTERM, SIGINT)
- [ ] Include auto-run block:
  ```typescript
  if (require.main === module) {
    const port = parseInt(process.env.API_PORT || process.env.PORT || 'XXXX');
    startStandaloneServer(port).catch(error => {
      console.error('Failed to start server:', error);
      process.exit(1);
    });
  }
  ```
- [ ] Use unique port for standalone (3001=identity, 3002=bridge, 3003=user, 3004=economy, etc.)

**REFER TO MODULE_STANDARDS.md SECTION 4 FOR FULL TEMPLATE**

---

## ✅ Tests (`src/tests/*.test.ts`)

- [ ] Use Vitest framework
- [ ] Test all service methods
- [ ] Test database utility functions
- [ ] Test API endpoints (integration tests)
- [ ] Include setup/teardown for test database
- [ ] Aim for 70%+ code coverage
- [ ] Run with `pnpm test`

---

## ✅ Integration & Testing

- [ ] Module can be imported:
  ```typescript
  import { myService } from '@dream/module-name';
  ```
- [ ] Module can run standalone:
  ```bash
  cd packages/XX-module-name
  pnpm dev
  ```
- [ ] Test all API endpoints with curl/Postman
- [ ] Verify database connections work
- [ ] Check migrations run without errors
- [ ] Run test suite: `pnpm test`
- [ ] Build succeeds: `pnpm build`

---

## ✅ Documentation

- [ ] Update PROGRESS.md:
  - [ ] Mark module as complete
  - [ ] Add to Recent Accomplishments with details
  - [ ] Update module count (X/22)
  - [ ] Update percentage complete
- [ ] Create technical plan document if needed:
  - [ ] Save in `doc files/MODULE_XX_NAME_TECHNICAL_PLAN.md`
- [ ] Add inline code comments for complex logic
- [ ] Document all public API endpoints

---

## ✅ Git Workflow

- [ ] Stage all changes: `git add -A`
- [ ] Verify staged files: `git diff --cached --stat`
- [ ] Create descriptive commit message following this pattern:
  ```
  Complete Module XX: Name - Brief Description

  ## Database Schema (X Tables)
  - table1: description
  - table2: description

  ## Services (X Files)
  - service1.service.ts: description
  - service2.service.ts: description

  ## API Endpoints (X Routes)
  - GET /endpoint1 - description
  - POST /endpoint2 - description

  ## Features
  - Feature 1
  - Feature 2

  🤖 Generated with [Claude Code](https://claude.com/claude-code)

  Co-Authored-By: Claude <noreply@anthropic.com>
  ```
- [ ] Commit: `git commit -m "..."`
- [ ] Push to GitHub: `git push`

---

## ✅ Cross-Reference

**Before marking module complete, verify it matches these reference modules:**

- **Module 03 (User)**: Best example of hybrid pattern
- **Module 04 (Economy)**: Best example of service structure
- **MODULE_STANDARDS.md**: Official standard specification

---

## 🚫 Common Mistakes to AVOID

- ❌ Using `@dream-protocol/*` instead of `@dream/*` for package name
- ❌ Class-based database utilities (use functional pattern)
- ❌ Named exports for services (use default exports)
- ❌ Forgetting `composite: true` in tsconfig.json
- ❌ Not implementing hybrid pattern in index.ts
- ❌ Duplicate migration file numbers
- ❌ Importing services without default: `import { myService }` instead of `import myService`
- ❌ Not testing standalone server mode
- ❌ Not updating PROGRESS.md

---

## 📋 Quick Validation Commands

```bash
# Verify package name
cat packages/XX-module-name/package.json | grep '"name"'
# Should show: "@dream/module-name"

# Verify tsconfig has composite
cat packages/XX-module-name/tsconfig.json | grep "composite"
# Should show: "composite": true

# Test standalone server
cd packages/XX-module-name
pnpm dev
# Should start server without errors

# Test build
pnpm build
# Should create dist/ directory with .d.ts files

# Test from another module
cd packages/01-identity
# Add to index.ts:
# import { myService } from '@dream/module-name';
# Should have no TypeScript errors
```

---

**When in doubt, copy Module 03 or Module 04 structure and adapt it. Don't reinvent the wheel.**
