# Dream Protocol API Gateway

Unified entry point for all Dream Protocol backend modules.

## Overview

The API Gateway serves as the single public interface (port 3001) for the entire Dream Protocol platform. It routes requests to the appropriate backend modules running on internal ports (3002-3010).

## Architecture

```
Frontend (port 3000)
        ↓
   API Gateway (port 3001) ← PUBLIC
        ↓
   ┌─────────────────────┬─────────────────────┬──────────────────┐
   ↓                     ↓                     ↓                  ↓
Identity (3001)   Bridge (3002)         User (3003)        Economy (3004)
   ↓                     ↓                     ↓                  ↓
All Modules (3001-3010) - INTERNAL ONLY
```

## Quick Start

### Development

```bash
# Install dependencies
pnpm install

# Start gateway (listens on port 3001)
pnpm dev

# In another terminal, start all modules
pnpm --filter '@dream/*' dev

# In another terminal, start frontend
cd apps/flagship
pnpm dev
```

Then visit: `http://localhost:3000`

### Production

```bash
# Build gateway
pnpm build

# Start gateway
pnpm start
```

## API Endpoints

### Health & Monitoring

- **GET /ping** - Simple health check
- **GET /health** - Detailed module health status
- **GET /info** - Gateway information and routes

### Module Routes

| Path | Module | Internal Port | Purpose |
|------|--------|---------------|---------|
| `/api/v1/identity` | Identity | 3001 | Dual-identity wallets & DIDs |
| `/api/v1/bridge` | Bridge Legacy | 3002 | MVP migration adapter |
| `/api/v1/users` | User | 3003 | User profiles & settings |
| `/api/v1/economy` | Economy | 3004 | Token systems & balances |
| `/api/v1/exchange` | Token Exchange | 3005 | Token exchange & trading |
| `/api/v1/governance` | Governance | 3006 | Governance & voting |
| `/api/v1/content` | Content | 3007 | Posts, discussions, comments |
| `/api/v1/social` | Social | 3008 | Reactions, follows, feeds |
| `/api/v1/verification` | Verification | 3009 | PoH, bonds, markets, epistemic |
| `/api/v1/analytics` | Analytics | 3010 | Analytics & insights |

## Configuration

### Environment Variables

```env
# Gateway port (default: 3001)
API_GATEWAY_PORT=3001

# Node environment (development, production, test)
NODE_ENV=development

# CORS origins (comma-separated)
CORS_ORIGIN=http://localhost:3000,http://localhost:5173

# Logging level (debug, info, warn, error)
LOG_LEVEL=info
```

### Module Port Mapping

Module ports are configured in `src/config.ts`:

```typescript
export const MODULE_CONFIG: ModuleConfig[] = [
  {
    name: 'identity',
    internalPort: 3001,
    basePath: '/api/v1/identity',
    description: 'Identity & Dual-identity wallets',
  },
  // ... more modules
];
```

## How It Works

1. **Request arrives at gateway** (port 3001)
2. **Gateway matches route** (e.g., `/api/v1/governance/polls`)
3. **Gateway forwards to module** (e.g., `localhost:3006/polls`)
4. **Module processes request** and returns response
5. **Gateway returns response** to client with module info header

## Features

### Request Forwarding
- Strips base path before forwarding to modules
- Preserves request body and headers
- Adds custom headers for debugging (`X-Forwarded-By`, `X-Module`)

### Error Handling
- Gracefully handles module unavailability
- Returns 503 if module is down
- Doesn't crash the gateway

### Health Monitoring
- Check individual module health
- Aggregate health status
- Response time tracking

### CORS
- Configured for local development and production
- Credentials support
- Configurable via environment variables

### Logging
- Request/response logging
- Module routing tracking
- Health check status

## Development Notes

### Adding a New Module

1. Update `src/config.ts`:
```typescript
{
  name: 'my-module',
  internalPort: 3011,
  basePath: '/api/v1/mymodule',
  description: 'My module description',
}
```

2. Start your module on port 3011
3. Access it at `http://localhost:3001/api/v1/mymodule`

### Testing Gateway Routes

```bash
# Check gateway health
curl http://localhost:3001/health

# Check gateway info
curl http://localhost:3001/info

# Test a module route
curl http://localhost:3001/api/v1/governance/polls
```

### Debugging

Set log level to debug:
```bash
LOG_LEVEL=debug pnpm dev
```

## Performance

- Gateway is lightweight and adds minimal latency
- Each module is independent and scalable
- CORS checks happen once at gateway
- Modules can be restarted without affecting gateway (if they come back online)

## Security Considerations

- CORS is configured per environment
- Gateway adds `X-Forwarded-By` header for tracing
- Modules should validate `X-Module` header matches expectations
- No authentication at gateway level (modules handle their own auth)
- Use HTTPS in production

## Troubleshooting

### Module returning 503
- Check if module is running on correct port
- Check `pnpm --filter '@dream/MODULE' dev`
- Check logs in `/logs/MODULE.log`

### CORS errors
- Check `CORS_ORIGIN` environment variable
- Ensure frontend origin is in allowed list

### Slow responses
- Check gateway logs with `LOG_LEVEL=debug`
- Check individual module performance
- Monitor network latency

## License

MIT
