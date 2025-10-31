# New Module Development Prompt Template

**Use this prompt EVERY TIME you start building a new module (05-22)**

---

## Prompt to Give Claude

```
I need you to build Module XX: [MODULE_NAME] for Dream Protocol.

BEFORE YOU START:

1. Read and follow MODULE_STANDARDS.md completely
2. Use .claude/module-checklist.md as your step-by-step guide
3. Review Module 03 (User) and Module 04 (Economy) as reference examples

CRITICAL REQUIREMENTS:

✅ Package name MUST be: @dream/module-name (NOT @dream-protocol/*)
✅ Use FUNCTIONAL database pattern (NO CLASSES in database.ts)
✅ Services MUST use DEFAULT exports (NOT named exports)
✅ index.ts MUST follow hybrid pattern (exportable + standalone)
✅ tsconfig.json MUST include: composite, declaration, declarationMap
✅ Migration file numbering MUST be sequential (check existing files first)
✅ Test standalone mode before considering module complete

WORKFLOW:

1. Create package structure (package.json, tsconfig.json)
2. Create database migration (if needed)
3. Create database utilities (src/utils/database.ts) - FUNCTIONAL PATTERN
4. Create services with DEFAULT exports
5. Create routes importing services as default
6. Create types
7. Create main entry point (index.ts) - HYBRID PATTERN
8. Create tests
9. Verify module can be:
   - Imported: `import { service } from '@dream/module-name'`
   - Run standalone: `pnpm dev` in module directory
10. Update PROGRESS.md
11. Commit and push

REFERENCE FILES:
- MODULE_STANDARDS.md - The official standard
- .claude/module-checklist.md - Step-by-step checklist
- packages/03-user/ - Best example of hybrid pattern
- packages/04-economy/ - Best example of service structure

Do NOT proceed until you confirm you've read MODULE_STANDARDS.md.
```

---

## Expected Response from Claude

Claude should respond with something like:

```
I've read MODULE_STANDARDS.md and understand the requirements.

I will build Module XX: [NAME] following:
- @dream/* package naming
- Functional database pattern
- Default service exports
- Hybrid index.ts pattern
- Composite TypeScript configuration
- Sequential migration numbering

I'll use Module 03 and Module 04 as reference and follow the checklist in
.claude/module-checklist.md.

Let me start by creating the package structure...
```

If Claude doesn't mention these specifics, STOP and redirect them to MODULE_STANDARDS.md.

---

## What to Check During Development

As Claude builds the module, verify these checkpoints:

### Checkpoint 1: Package Structure
- [ ] package.json has `@dream/module-name`
- [ ] tsconfig.json has composite, declaration, declarationMap

### Checkpoint 2: Database
- [ ] Migration file has correct sequential number
- [ ] database.ts uses functional pattern (no classes)
- [ ] Functions exported: query, transaction, findOne, findMany, insert, update, deleteRecord, count

### Checkpoint 3: Services
- [ ] Each service file ends with:
  ```typescript
  const myService = new MyService();
  export default myService;
  ```
- [ ] NO named exports like: `export const myService = ...`

### Checkpoint 4: Routes
- [ ] Routes import services as default:
  ```typescript
  import myService from '../services/my.service';
  ```

### Checkpoint 5: Main Entry Point
- [ ] index.ts exports services with default imports:
  ```typescript
  export { default as myService } from './services/my.service';
  ```
- [ ] Includes initializeModule() function
- [ ] Includes startStandaloneServer() function
- [ ] Has auto-run block: `if (require.main === module) { ... }`

### Checkpoint 6: Integration
- [ ] Module can be imported by other modules
- [ ] `pnpm dev` in module directory starts standalone server
- [ ] All tests pass: `pnpm test`

---

## Red Flags to Watch For

🚩 **STOP if you see these patterns:**

- `@dream-protocol/*` package name → Should be `@dream/*`
- `class Database { ... }` in database.ts → Should be functional
- `export const myService = new MyService()` → Should be default export
- index.ts without `initializeModule()` function → Missing hybrid pattern
- index.ts without `startStandaloneServer()` function → Missing standalone mode
- tsconfig.json without `composite: true` → Missing project reference support
- Migration file with duplicate number → Check existing migrations first
- `import { myService } from './services/my.service'` → Should be default import

---

## Success Criteria

Module is COMPLETE when:

✅ Passes all items in .claude/module-checklist.md
✅ Can be imported: `import { myService } from '@dream/module-name'` works
✅ Can run standalone: `cd packages/XX-module && pnpm dev` starts server
✅ Tests pass: `pnpm test` shows green
✅ Build succeeds: `pnpm build` creates dist/ with .d.ts files
✅ PROGRESS.md updated with accomplishments
✅ Committed and pushed to GitHub

---

**Remember: When in doubt, copy Module 03 or Module 04 structure and adapt. Don't reinvent the wheel.**
