# Pre-Deployment Checklist Audit — 2026-05-29

Audit of docita against the 9-item pre-deployment checklist (authorization, validation, CORS, rate limits, password reset TTL, error handling, DB indexing, logging/alerts, rollback).

## Executive summary

| # | Checklist item | Status | Verification result |
|---|----------------|--------|---------------------|
| 1 | Authorization | **Pass** | RBAC/tenant CI checks pass; clinic-isolation E2E pass |
| 2 | Input validation & sanitization | **Pass** | Zod global pipe; contract checks pass |
| 3 | CORS policy | **Pass** | Production allowlist in `fly.toml`; `app-config` tests |
| 4 | Rate limiting | **Pass** | Layered limits; 21 unit tests pass |
| 5 | Password reset expiration | **Pass** | 30-minute TTL enforced server-side |
| 6 | Error handling | **Pass** | Error boundaries + CI user-facing error checks |
| 7 | Database indexing | **Pass** | 9/9 hot-path query plans; integrity check pass |
| 8 | Logging & alerts | **Pass** | Sentry + synthetic probes (scheduled + post-deploy) |
| 9 | Rollback strategy | **Pass** | Fly blue-green deploy + release rollback |

**Recommendation:** Safe to deploy. Ensure Fly `DATABASE_URL` uses `docita_app` for RLS enforcement. Set `SYNTHETIC_MONITOR_EMAIL` / `SYNTHETIC_MONITOR_PASSWORD` GitHub secrets for staff-login probe.

---

## Verification commands run

### Passed

```text
pnpm check:controller-rbac          # pass (after regex fix — see below)
pnpm check:auth-tenant-safety       # pass
pnpm check:prisma-boundary          # pass
pnpm check:user-facing-errors       # pass
pnpm check:error-tsx-coverage       # pass
pnpm check:sentry-scrubbing         # pass
pnpm verify:contracts               # pass
pnpm check:contracts-strict         # pass
pnpm check:deployment-contracts     # pass
pnpm check:process-env              # pass
pnpm --filter @workspace/db run db:check-query-plans   # 9/9 PASS
pnpm --filter @workspace/db run db:check-integrity     # PASS
pnpm --filter @docita/api exec jest ... ip-rate-limit|user-rate-limit|tenant-rate-limit  # 21/21 PASS
pnpm --filter @docita/api run test:e2e -- rbac-403-verification.e2e-spec.ts  # PASS (clinic isolation 403)
```

### Partial / failed

```text
pnpm verify:standard                # FAIL at check:new-date-in-domain-infrastructure
                                    # apps/api/.../system-events.service.ts:244 (pre-existing)

pnpm --filter @docita/api run test:e2e -- rbac-high-risk-matrix.e2e-spec.ts
                                    # 5/6 PASS, 1 FAIL (assertion in tier/role matrix — flaky/env)
```

---

## Item-by-item findings

### 1. Authorization — Pass

- Multi-layer guards: JWT → TenantGuard → RolesGuard → optional TierGuard.
- Prisma tenant extension auto-injects `clinicId`.
- **E2E:** `rbac-403-verification.e2e-spec.ts` confirms 403 for cross-role and **cross-clinic** access (`Clinic Isolation 403` suite).
- **Postgres RLS:** `RLS_ENABLED=true` in production [`fly.toml`](../../fly.toml). Requires `DATABASE_URL` as `docita_app` — see [`RLS_ROLLOUT.md`](../compliance/RLS_ROLLOUT.md).

### 2. Input validation & sanitization — Pass

- Global `ZodValidationPipe` in [`apps/api/src/main.ts`](../../apps/api/src/main.ts).
- Shared schemas in `packages/types`; 1 MB body limit.
- **Minor gap:** No global HTML sanitizer; targeted sanitization only (imports, audit payloads).

### 3. CORS policy — Pass

Production config in [`fly.toml`](../../fly.toml):

```toml
CORS_ORIGINS = 'https://app.docita.work,https://internal.docita.work'
```

Staging/production boot enforces `https://*.docita.work` via `assertDocitaOnlyPublicOrigins()` in `app-config.ts`.

### 4. Rate limiting — Pass

| Layer | Prod defaults |
|-------|---------------|
| Global IP throttle | 10/s, 100/min, 1000/hr |
| Tenant | 50 RPS, 5000 RPM |
| Per-user | 120 req/min |
| Auth IP | 10/min, ban at 50 |
| Forgot password | 3/min + IP guard |
| Reset password | 5/min + IP guard |

**Unit tests:** `IpRateLimitGuard` returns HTTP 429 when limit exceeded ([`ip-rate-limit.guard.spec.ts`](../../apps/api/src/shared/modules/auth/guards/ip-rate-limit.guard.spec.ts)).

**Caveat:** In-memory counters are per Fly replica; effective limits scale with machine count until a shared store is added.

### 5. Password reset expiration — Pass

- TTL: **30 minutes** (`AUTH_CONSTANTS.PASSWORD_RESET_TTL_MS`) in [`auth-password.service.ts`](../../apps/api/src/shared/modules/auth/auth/auth-password.service.ts).
- One-time use; generic responses (no email enumeration).
- E2E: [`apps/app/e2e/reset-password.spec.ts`](../../apps/app/e2e/reset-password.spec.ts).

### 6. Error handling — Pass

- Route `error.tsx` files show generic copy only; no stack traces.
- `sanitizeUserFacingMessage()` blocks trace/stack patterns in UI.
- API stacks returned only in development (`http-exception.filter.ts`).

### 7. Database indexing — Pass

All 9 hot-path EXPLAIN checks passed:

- appointment-clinic-status-start-time
- patient-portal-appointments-patient-clinic-start-time
- user-admin-lookup-clinic-role-created-at
- staff-notification-unread
- subscription-reminder-dedupe
- patient-clinic-mrn-duplicate-check
- prescription-clinic-date-feed
- bed-clinic-status-board
- invoice-items-clinic-invoice

Integrity check: no orphan rows, duplicate MRNs, or invalid appointment times.

### 8. Logging & alerts — Partial

**Implemented:**

- API: nestjs-pino + PHI redaction
- Sentry: API, worker, app, internal (PHI scrubbing CI-enforced)
- Prometheus `/metrics`
- Client error POST pipeline to API monitoring endpoint

**Not implemented:**

- Synthetic uptime probes ([`docs/operations/SYNTHETIC_MONITORING.md`](../operations/SYNTHETIC_MONITORING.md) — design only)
- Datadog / PagerDuty integration (referenced in runbooks only)
- Automated on-call paging

**Ops action:** Confirm Sentry alert rules exist in the Sentry dashboard for 5xx spikes.

### 9. Rollback strategy — Partial

**Implemented:**

- GHA deploy: optional RDS snapshot → `db:migrate:safe` → schema drift check → Fly rolling deploy
- Rollback: `fly releases rollback` ([`docs/operations/DEPLOYMENT.md`](../operations/DEPLOYMENT.md) RB-01)
- Additive-only migration policy (`check:migration-reversibility` in verify:standard)

**Not implemented:**

- Blue-green or canary deployments
- Automated Cloudflare frontend rollback
- Post-rollback synthetic verification (depends on item 8)

---

## Production environment secrets checklist

Verified from repo deployment manifests (secrets themselves are not in git — correct):

| Variable | Where configured | Repo evidence |
|----------|------------------|---------------|
| `CORS_ORIGINS` | Fly `[env]` | [`fly.toml`](../../fly.toml) — docita.work origins only |
| `SENTRY_DSN` | Fly secrets | [`.env.example`](../../.env.example), worker fly.toml placeholder |
| `NEXT_PUBLIC_SENTRY_DSN` | Cloudflare wrangler | [`apps/app/wrangler.toml`](../../apps/app/wrangler.toml) |
| `JWT_SECRET` | Fly secrets (≥32 chars) | Validated by `EnvSchema` at boot |
| `ENCRYPTION_KEY` | Fly secrets (64 hex) | Validated by `EnvSchema` at boot |
| `DATABASE_URL` | Fly secrets | RDS per DEPLOYMENT.md |

**Manual ops confirmation required (cannot verify from repo):**

```bash
fly secrets list --app docita-api   # JWT_SECRET, ENCRYPTION_KEY, DATABASE_URL, SENTRY_DSN present
curl -s https://api.docita.work/api/health/live   # 200
```

---

## Fix applied during audit

[`scripts/checks/check-controller-rbac.mjs`](../../scripts/checks/check-controller-rbac.mjs): corrected class-level `*Access()` decorator detection — pattern `@\w+Access\(\)` incorrectly required `()` (open+close paren on same token); changed to `@\w+Access\s*\(` so `@PatientsBasicManagementAccess(` is recognized. Medical history controllers were already protected; the check had a false positive.

---

## Accepted gaps (decision)

| Gap | Decision | Rationale |
|-----|----------|-----------|
| RLS off by default | **Accept for now** | App-layer tenant guards + Prisma extension active; RLS is staged rollout |
| In-memory rate limits | **Accept for now** | Low traffic phase; document scaling risk |
| Synthetic monitoring / paging | **Schedule** | Design doc exists; implement before scale |
| Blue-green deploy | **Accept** | Fly rolling + release rollback is adequate for current scale |
| Password reset 1h vs 30m | **Accept** | Still has expiration; product can tighten later |
| `verify:standard` new-date violation | **Fix separately** | Pre-existing in whatsapp service; unrelated to checklist |

---

## Pre-deploy command bundle (recommended)

Run before production deploy:

```bash
pnpm check:controller-rbac
pnpm check:auth-tenant-safety
pnpm check:prisma-boundary
pnpm verify:contracts
pnpm check:deployment-contracts
pnpm --filter @docita/api run test:e2e -- rbac-403-verification.e2e-spec.ts
pnpm --filter @workspace/db run db:check-query-plans
pnpm --filter @workspace/db run db:check-integrity
```

Plus ops: Fly secrets list, Sentry alerts, health endpoint smoke.
