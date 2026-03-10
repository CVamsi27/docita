# Development Server Troubleshooting Guide

## Common Issues & Solutions

### 1. 500 Error on POST `http://localhost:3000/api/v1/auth/check-email`

**Cause:** API server is not running on `localhost:3001`

**Solution:** Start the API server first:
```bash
# Terminal 1: Start API server
pnpm --filter @docita/api run start:dev

# Terminal 2: Start frontend app
pnpm --filter @docita/app run dev
```

Or use the unified dev script that manages both:
```bash
bash scripts/dev-setup.sh
```

**Why this happens:**
- Next.js proxies `/api/*` requests to the backend via `rewrites()` in `next.config.ts`
- If the API server (port 3001) isn't running, the proxy fails with ECONNREFUSED
- This error manifests as a 500 response to the client

### 2. `ECONNREFUSED` - Failed to proxy to localhost:3001

**Cause:** API backend not listening on port 3001

**Solution:** Ensure API is running:
```bash
pnpm --filter @docita/api run start:dev
```

**Debugging:**
```bash
# Check if port 3001 is listening
lsof -i :3001

# Kill any lingering processes
pnpm exec node scripts/kill-ports.js
```

### 3. Deprecation Warning: `util._extend` API

**Source:** External dependency (not our code)

**Why it appears:** Some transitive dependencies still use deprecated Node.js APIs

**Not blocking:** This warning doesn't affect functionality and doesn't prevent dev mode from working

**Suppression (optional):**
```bash
# Run with deprecation warnings suppressed
NODE_NO_WARNINGS=1 pnpm dev
```

## Proper Development Startup Order

### Option 1: Separate Terminals (Recommended)

**Terminal 1 - API Server:**
```bash
cd /path/to/docita
pnpm --filter @docita/api run start:dev
```
Wait until you see: `Server running at http://localhost:3001`

**Terminal 2 - Frontend:**
```bash
cd /path/to/docita
pnpm --filter @docita/app run dev
```
Wait until you see: `ready - started server on 0.0.0.0:3000`

Then access: http://localhost:3000

### Option 2: Unified Script

```bash
bash scripts/dev-setup.sh
```

This script:
1. Cleans up any lingering processes
2. Generates Prisma Client  
3. Starts API server
4. Waits for API readiness
5. Starts frontend apps

### Option 3: Combined pnpm Command

```bash
# Start both in parallel (simpler but no guaranteed startup order)
pnpm dev
```

## API Response Codes During Development

| Code | Meaning | Typical Cause |
|------|---------|---------------|
| 500  | Internal Server Error | API server crashed or not responding |
| 502  | Bad Gateway | API server not listening |
| 503  | Service Unavailable | API server starting up |
| ECONNREFUSED | Connection Refused | API port not open or process died |

## Environment Variables for Dev

Create `.env.local` in the app directory:

```env
# For local development (defaults to localhost:3001)
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1

# Disable Sentry in dev
NEXT_PUBLIC_SENTRY_DSN=
```

## Port Configuration

- **API**: 3001 (NestJS)
- **App**: 3000 (Next.js)
- **Admin**: 3002 (Next.js)
- **Landing**: 3003 (Next.js)

If you need different ports:
```bash
# Set custom API port
API_PORT=4000 pnpm --filter @docita/api run start:dev

# Set custom app port
PORT=8000 pnpm --filter @docita/app run dev
```

## Quick Health Checks

```bash
# Check if API is responding
curl http://localhost:3001/api/health

# Check if app is running
curl http://localhost:3000/

# Check port usage
lsof -i :3000
lsof -i :3001
```

## Force Restart (Nuclear Option)

Sometimes caches get corrupted. This performs a clean reset:

```bash
# Kill all lingering processes
pnpm exec node scripts/kill-ports.js

# Remove all caches
rm -rf .next .turbo .turbopack apps/*/.next apps/*/.turbo

# Reinstall everything
pnpm install --frozen-lockfile

# Regenerate Prisma
pnpm db:generate

# Start fresh
bash scripts/dev-setup.sh
```
