# Architecture Fix Plan - Dream Protocol

## Current Problem Assessment

### What's Fucked Up:
1. **Each module runs on its own port** (3001-3010) - This is WRONG!
2. **Module 01 (Identity) conflicts with API Gateway** - Both trying to use port 3001
3. **No clear backend entry point** - Multiple servers running independently
4. **Frontend (Next.js) runs on default port** (probably 3000)
5. **Modules are acting like microservices** instead of being libraries

### Current Port Chaos:
```
Frontend (Next.js):     Port 3000 (default)
API Gateway:           Port 3001 (supposed to be main backend)
Module 01 Identity:    Port 3001 (CONFLICT!)
Module 02 Bridge:      Port 3002
Module 03 User:        Port 3003
Module 04 Economy:     Port 3004
Module 05 Exchange:    Port 3005
Module 06 Governance:  Port 3006
Module 07 Content:     Port 3007
Module 08 Social:      Port 3008
Module 09 Verification: Port 3009
Module 10 Analytics:   Port 3010
```

## The Correct Architecture

### How It Should Be:
```
Frontend (Next.js):  Port 3000 - The ONLY frontend server
API Gateway:         Port 3001 - The ONLY backend server
All Modules:         LIBRARIES - No servers, just exported routers
```

### Proper Structure:
```
User Request → Frontend (3000) → API Gateway (3001) → Module Logic
                                          ↓
                                    Routes to:
                                    /api/identity/*    → Identity Module
                                    /api/user/*        → User Module
                                    /api/economy/*     → Economy Module
                                    /api/governance/*  → Governance Module
                                    etc.
```

## Fix Implementation Plan

### Step 1: Fix Module Structure
Each module should export Express routers, not run servers:

**WRONG (Current):**
```typescript
// packages/03-user/src/index.ts
export async function startStandaloneServer(port: number = 3003) {
  const app = express();
  // ... routes ...
  app.listen(port);
}
```

**RIGHT (Fixed):**
```typescript
// packages/03-user/src/index.ts
import { Router } from 'express';

export function createUserRouter(): Router {
  const router = Router();

  router.get('/profile/:id', getProfile);
  router.post('/profile', updateProfile);
  // ... other routes ...

  return router;
}
```

### Step 2: Fix API Gateway
The API Gateway should mount all module routers:

```typescript
// packages/00-api-gateway/src/index.ts
import express from 'express';
import { createIdentityRouter } from '@dream/identity';
import { createUserRouter } from '@dream/user';
import { createEconomyRouter } from '@dream/economy';
// ... other imports

const app = express();

// Mount module routers
app.use('/api/identity', createIdentityRouter());
app.use('/api/user', createUserRouter());
app.use('/api/economy', createEconomyRouter());
app.use('/api/governance', createGovernanceRouter());
// ... etc

const PORT = process.env.PORT || 3001;
app.listen(PORT);
```

### Step 3: Module Conversion Checklist
For each module (01-10):

- [ ] Remove `startStandaloneServer` function
- [ ] Remove all Express app creation
- [ ] Remove all `app.listen()` calls
- [ ] Convert to Router export
- [ ] Export `create[Module]Router()` function
- [ ] Remove port configuration
- [ ] Update package.json scripts (remove "dev" server scripts)
- [ ] Test router integration with API Gateway

### Step 4: Clean Up Port Configuration

**Delete:**
- `.env.modules` file (no longer needed)
- All `PORT` environment variables for modules
- All standalone server startup scripts

**Keep:**
- Frontend port 3000 configuration
- API Gateway port 3001 configuration

### Step 5: Update Startup Scripts

**Current (WRONG):**
- Starts 11 separate servers
- Each module runs independently
- Complex orchestration needed

**New (RIGHT):**
```bash
#!/bin/bash
# start-dev.sh

# Start database
docker-compose up -d postgres

# Start API Gateway (port 3001)
pnpm --filter @dream/api-gateway dev &

# Start Frontend (port 3000)
pnpm --filter flagship dev &

wait
```

## Module Priority for Fixing

1. **Fix API Gateway First** - It's the orchestrator
2. **Fix Module 01 (Identity)** - Currently conflicts with gateway
3. **Fix Modules 03-04** - Reference modules (User, Economy)
4. **Fix remaining modules** - 02, 05-10

## Benefits After Fix

1. **Simpler Architecture** - Only 2 servers (frontend + backend)
2. **Better Performance** - No inter-service HTTP calls
3. **Easier Development** - Single backend to debug
4. **Proper Monorepo** - Modules as libraries, not services
5. **Standard Pattern** - Follows Next.js + Express best practices

## Testing Plan

After each module conversion:
1. Start API Gateway
2. Test module routes via gateway
3. Verify no standalone servers running
4. Check database connections work
5. Test cross-module communication

## Success Criteria

- [ ] Only 2 processes running: Frontend (3000) + API Gateway (3001)
- [ ] All module functionality accessible via `/api/*` routes
- [ ] No port conflicts
- [ ] No standalone module servers
- [ ] Clean, simple startup process