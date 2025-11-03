# Dream Protocol Backend Audit

## Current Module Structure

| Module | Port | Purpose | Status |
|--------|------|---------|--------|
| 01-identity | 3001 | Dual-identity system, Cardano wallets, DIDs | ✅ Complete |
| 02-bridge-legacy | 3002 | MVP migration adapter, feature flags | ✅ Complete |
| 03-user | 3003 | User profiles, settings, account management | ✅ Complete |
| 04-economy | 3004 | Token systems (PollCoin, Gratium, Light Score) | ✅ Complete |
| 05-token-exchange | 3005 | On-platform purchases, DEX monitoring | ✅ Complete |
| 06-governance | 3006 | Polls, voting, Shadow Consensus, staking, constitution | ✅ Complete |
| 07-content | 3007 | Posts, discussions, comments, moderation | ✅ Complete |
| 08-social | 3008 | Reactions, follows, notifications, feeds, blocks | ✅ Complete |
| 09-verification | 3009 | PoH, Veracity Bonds, Prediction Markets, Epistemic Funnel | ✅ Complete |
| 10-analytics | 3010 | Shadow Consensus trends, heat scores, platform health | ✅ Complete |

## Issues

1. **Scattered Ports**: Each module listens on a different port (3001-3010)
   - Makes deployment complex
   - Difficult for frontend to communicate (needs 10 different endpoints)
   - Hard to manage in production

2. **Frontend Hardcoded URLs**:
   - Currently hardcoded to `localhost:3005` (governance only)
   - Needs to call 10 different services
   - No environment configuration

3. **Database Sharing**:
   - All modules share the same PostgreSQL database
   - No coordination issues currently (each has its own tables)
   - Need proper transaction handling through gateway

## Solution: API Gateway Pattern

### Architecture
```
Frontend (port 3000)
        ↓
   API Gateway (port 3001)
        ↓
   ┌─────────────────────┬─────────────────────┐
   ↓                     ↓                     ↓
Module Servers        Shared Database      External Services
(3001-3010 internal)   PostgreSQL
```

### Route Mapping

```
/api/v1/identity/*       → Identity Module (3001)
/api/v1/bridge/*         → Bridge Legacy Module (3002)
/api/v1/users/*          → User Module (3003)
/api/v1/economy/*        → Economy Module (3004)
/api/v1/exchange/*       → Token Exchange Module (3005)
/api/v1/governance/*     → Governance Module (3006)
/api/v1/content/*        → Content Module (3007)
/api/v1/social/*         → Social Module (3008)
/api/v1/verification/*   → Verification Module (3009)
/api/v1/analytics/*      → Analytics Module (3010)

/health                  → Gateway health check (all services)
```

### Implementation Steps

1. **Create API Gateway** (new module at 00-api-gateway)
   - Express server on port 3001
   - HTTP Proxy to route requests to module ports
   - Health check endpoint

2. **Environment Configuration**
   - Create `.env.development` for local development
   - Create `.env.production` for deployed systems
   - Use `API_GATEWAY_URL` in frontend instead of hardcoded URLs

3. **Start Servers in Order**
   - Start gateway on 3001
   - Let modules run on their internal ports (3001-3010)
   - Gateway proxies public traffic (3001) to internal modules

4. **Update Frontend**
   - Change from `localhost:3005/api/v1/governance`
   - To `localhost:3001/api/v1/governance`
   - Use environment variable for API base URL

## Development Setup

```bash
# In separate terminals:

# Terminal 1: Start all modules
pnpm --filter '@dream/*' dev

# Terminal 2: Start API Gateway
pnpm --filter '@dream/api-gateway' dev

# Terminal 3: Start Frontend
pnpm dev

# Then visit: http://localhost:3000
```

## Next Actions

1. ✅ Audit complete
2. Build API Gateway
3. Define environment configuration
4. Update frontend to use gateway
5. Test everything together
