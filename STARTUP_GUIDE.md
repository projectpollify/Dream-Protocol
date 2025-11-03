# Dream Protocol - Startup Guide

## Prerequisites

- Node.js 18+ and pnpm installed
- PostgreSQL running on localhost:5432
- All dependencies installed (`pnpm install`)

## Quick Start (3 Terminals)

### Terminal 1: API Gateway (Port 3001)

```bash
cd /Users/shawn/Desktop/dreamprotocol
pnpm --filter @dream/api-gateway dev
```

Expected output:
```
🚀 Dream Protocol API Gateway started
📍 Listening on http://localhost:3001
🔧 Environment: development
📦 Routing to 10 backend modules
```

### Terminal 2: Backend Modules (Ports 3001-3010, internal only)

```bash
cd /Users/shawn/Desktop/dreamprotocol
pnpm --filter '@dream/!(api-gateway)' dev
```

This starts all 10 modules in parallel:
- Module 01: Identity (internal :3001)
- Module 02: Bridge Legacy (internal :3002)
- Module 03: User (internal :3003)
- Module 04: Economy (internal :3004)
- Module 05: Token Exchange (internal :3005)
- Module 06: Governance (internal :3006)
- Module 07: Content (internal :3007)
- Module 08: Social (internal :3008)
- Module 09: Verification (internal :3009)
- Module 10: Analytics (internal :3010)

**Note**: These ports are internal only. All access goes through the gateway on port 3001.

### Terminal 3: Frontend (Port 3000)

```bash
cd /Users/shawn/Desktop/dreamprotocol
pnpm dev
```

Expected output:
```
 ▲ Next.js 16.0.0
 - Local:        http://localhost:3000
```

## Verify Everything is Working

### Check Gateway Health

```bash
# Simple ping
curl http://localhost:3001/ping

# Detailed health (checks all modules)
curl http://localhost:3001/health | jq .

# Gateway info
curl http://localhost:3001/info | jq .
```

### Test a Module Route

```bash
# Test Governance module through gateway
curl http://localhost:3001/api/v1/governance/polls | jq .

# Test Economy module through gateway
curl http://localhost:3001/api/v1/economy/accounts | jq .
```

### Open Frontend

Visit: **http://localhost:3000**

The frontend will automatically connect to the API Gateway on port 3001.

## Architecture Diagram

```
Frontend
  ↓ (http://localhost:3000)
Next.js App
  ↓ (makes API calls to NEXT_PUBLIC_API_URL)
  ↓ (http://localhost:3001)
  ↓
API Gateway
  ├─→ /api/v1/identity      (routes to :3001)
  ├─→ /api/v1/bridge        (routes to :3002)
  ├─→ /api/v1/users         (routes to :3003)
  ├─→ /api/v1/economy       (routes to :3004)
  ├─→ /api/v1/exchange      (routes to :3005)
  ├─→ /api/v1/governance    (routes to :3006)
  ├─→ /api/v1/content       (routes to :3007)
  ├─→ /api/v1/social        (routes to :3008)
  ├─→ /api/v1/verification  (routes to :3009)
  └─→ /api/v1/analytics     (routes to :3010)
       ↓
   All modules share same PostgreSQL database
```

## Troubleshooting

### "PostgreSQL is not running"

```bash
# Start PostgreSQL (macOS)
brew services start postgresql@15

# Check status
pg_isready -h localhost
```

### "Port 3001 already in use"

```bash
# Kill the process using port 3001
lsof -ti:3001 | xargs kill -9

# Start gateway again
pnpm --filter @dream/api-gateway dev
```

### "Module X returns 503"

1. Check if the module is running in Terminal 2
2. Check the module logs in `/logs/XX-module.log`
3. Restart the module

### "Frontend shows CORS error"

1. Check CORS_ORIGIN in `/packages/00-api-gateway/.env`
2. Should include `http://localhost:3000`
3. Restart the gateway

### "Can't connect to database"

1. Check PostgreSQL is running: `pg_isready`
2. Check database credentials in module `.env` files
3. Verify database `dreamprotocol_dev` exists

## Environment Variables

### API Gateway (.env)

```env
API_GATEWAY_PORT=3001              # Public entry point
NODE_ENV=development               # development|production|test
CORS_ORIGIN=http://localhost:3000  # Comma-separated origins
LOG_LEVEL=info                     # debug|info|warn|error
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Common Tasks

### View Gateway Logs

```bash
# Terminal where gateway is running
# Logs are printed to console in real-time
```

### View Module Logs

```bash
# Terminal where modules are running
# All modules log to console in parallel
```

### Rebuild Everything

```bash
pnpm build
```

### Run Tests

```bash
# All tests
pnpm test

# Watch mode
pnpm test:watch

# Specific module
pnpm --filter @dream/governance test
```

## Port Summary

| Service | Port | Type | Access |
|---------|------|------|--------|
| Frontend | 3000 | Public | http://localhost:3000 |
| API Gateway | 3001 | Public | http://localhost:3001 |
| Identity Module | 3001 | Internal | Via gateway only |
| Bridge Legacy Module | 3002 | Internal | Via gateway only |
| User Module | 3003 | Internal | Via gateway only |
| Economy Module | 3004 | Internal | Via gateway only |
| Token Exchange Module | 3005 | Internal | Via gateway only |
| Governance Module | 3006 | Internal | Via gateway only |
| Content Module | 3007 | Internal | Via gateway only |
| Social Module | 3008 | Internal | Via gateway only |
| Verification Module | 3009 | Internal | Via gateway only |
| Analytics Module | 3010 | Internal | Via gateway only |
| PostgreSQL | 5432 | Internal | Localhost only |

## Next Steps

After verifying everything works:

1. Review gateway health: `curl http://localhost:3001/health`
2. Check frontend loads: Open http://localhost:3000
3. Test a governance poll: Visit governance section in frontend
4. Monitor gateway logs for any errors

## Architecture Notes

- **Single Entry Point**: All API calls go through port 3001 (gateway)
- **Unified Configuration**: Environment variables control all routing
- **Easy Scaling**: New modules just add a route to config.ts
- **Production Ready**: Same architecture works in production
- **Health Monitoring**: Built-in health checks for all modules

## Support

For issues or questions, check:
- `/packages/00-api-gateway/README.md` - Gateway documentation
- `/BACKEND_AUDIT.md` - Architecture audit
- Module-specific READMEs in `/packages/*/README.md`
