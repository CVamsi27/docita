# Phase 1 Runbook: Vercel + Railway API + Neon DB

## Scope

This runbook is the operational playbook for Phase 1 production launch:

- Frontend: Vercel (`apps/landing`, `apps/app`, `apps/admin`)
- Backend: Railway (`apps/api`)
- Database: Neon PostgreSQL (`DATABASE_URL`)
- Redis: deferred (optional)

## 1) Preconditions

- Domain routing in place:
  - `www.<domain>` / `<domain>` → landing
  - `app.<domain>` → app
  - `admin.<domain>` → admin
  - `api.<domain>` → Railway API
- `railway.json` exists at repo root and points to API startup command.
- Neon production project created in the same region family as Railway runtime.
- Required secrets generated:
  - `JWT_SECRET`
  - `ENCRYPTION_KEY` (64-hex for AES-256)

## 2) Production Environment Matrix

### API (Railway)

Required:

```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://...neon...
JWT_SECRET=<secret>
ENCRYPTION_KEY=<64-hex>
CORS_ORIGINS=https://app.<domain>,https://admin.<domain>
```

Recommended:

```env
LOG_LEVEL=info
SENTRY_DSN=<dsn>
SENTRY_ENVIRONMENT=production
APP_URL=https://app.<domain>
NEXT_PUBLIC_APP_URL=https://app.<domain>
NEXT_PUBLIC_API_URL=https://api.<domain>/api
```

Optional (feature dependent):

```env
REDIS_URL=redis://...
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
META_ACCESS_TOKEN=...
META_PHONE_NUMBER_ID=...
META_APP_SECRET=...
META_VERIFY_TOKEN=...
```

### Frontend (Vercel)

Landing (`apps/landing`):

```env
NEXT_PUBLIC_API_URL=https://api.<domain>/api
NEXT_PUBLIC_APP_URL=https://app.<domain>
```

App (`apps/app`):

```env
NEXT_PUBLIC_API_URL=https://api.<domain>/api
NEXT_PUBLIC_SOCKET_URL=https://api.<domain>
NEXT_PUBLIC_SENTRY_DSN=<dsn>
```

Admin (`apps/admin`):

```env
NEXT_PUBLIC_API_URL=https://api.<domain>/api
NEXT_PUBLIC_SENTRY_DSN=<dsn>
```

## 3) Deployment Steps

1. Configure Neon and copy production connection string to Railway `DATABASE_URL`.
2. Set all Railway variables.
3. Deploy API:

```bash
railway login
railway link
railway up
```

4. Run production migrations:

```bash
railway run pnpm db:migrate:deploy
```

5. Deploy all Vercel apps (or via connected Git flow).
6. Point DNS and verify SSL certificates.

## 4) Smoke Checks

- API health:

```bash
curl -sS https://api.<domain>/api/v1/health/live
curl -sS https://api.<domain>/api/v1/health/ready
```

- DB connectivity through API health endpoint:

```bash
curl -sS https://api.<domain>/api/v1/health/db
```

- Frontend→API contract: login, patient listing, appointment create flow.

## 5) Rollback

- API rollback: redeploy previous Railway release.
- DB rollback: use Neon point-in-time restore or restore from backup snapshot.
- Frontend rollback: promote previous Vercel deployment.

## 6) Exit Criteria

- All three frontends live and resolving correctly.
- API health endpoints stable for 30+ minutes.
- No migration errors; `db:migrate:deploy` completed.
- Error and request rate within expected launch baseline.
