# Dream Protocol - Quick Start (TL;DR)

## Prerequisites
- PostgreSQL running: `pg_isready` should show "accepting connections"
- Dependencies installed: `pnpm install` ✓
- All modules built: `pnpm build` ✓

## 3-Step Startup

### Step 1: API Gateway Terminal
```bash
pnpm --filter @dream/api-gateway dev
```
⏳ Wait for: `🚀 Dream Protocol API Gateway started`
📍 Running on: http://localhost:3001

### Step 2: Backend Modules Terminal
```bash
pnpm --filter '@dream/!(api-gateway)' dev
```
⏳ Wait for: All 10 modules to start
🔧 Modules: :3001-:3010 (internal, proxied through :3001)

### Step 3: Frontend Terminal
```bash
pnpm dev
```
⏳ Wait for: `✓ Ready in XXXms`
🌐 Running on: http://localhost:3000

## Verify It Works

### Quick Checks
```bash
# Gateway responsive?
curl http://localhost:3001/ping

# All modules healthy?
curl http://localhost:3001/health

# Frontend loads?
open http://localhost:3000
```

## What You Have Now

- **Frontend**: http://localhost:3000
- **API Gateway**: http://localhost:3001 (routes to 10 modules)
- **10 Backend Modules**: Running internally on :3001-:3010
- **Shared Database**: PostgreSQL on :5432

## Stop Services

Press `Ctrl+C` in each terminal.

## Troubleshooting (1 Minute)

| Problem | Solution |
|---------|----------|
| "PostgreSQL not running" | `brew services start postgresql@15` |
| "Port 3001 in use" | `lsof -ti:3001 \| xargs kill -9` |
| "Module returns 503" | Check module is running in Terminal 2 |
| "CORS error" | Restart gateway (already configured correctly) |
| "Can't connect to DB" | Check PostgreSQL is running |

## That's It! 🎉

You now have:
- ✅ API Gateway on port 3001
- ✅ 10 Backend modules running internally
- ✅ Frontend on port 3000
- ✅ All modules connected through unified gateway

Visit http://localhost:3000 to see the application.

---

For detailed docs, see: **STARTUP_GUIDE.md**
