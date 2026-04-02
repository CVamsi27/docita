# Security and Performance Audit Report

Date: 2026-04-02
Repository: `docita`
Commit audited: `49945ab5`
Scope: local runtime and CI configuration only (no staging/production probing)
Priority mode: security-first

## Runtime Metadata

- Node.js: `v23.7.0`
- pnpm: `10.30.3`
- Workspace packages discovered: 14
- Workspace inventory:
  - `@docita/api`, `@docita/app`, `@docita/admin`, `@docita/landing`
  - `@workspace/types`, `@workspace/data-access`, `@workspace/ui`, `@workspace/db`
  - `@workspace/auth`, `@workspace/hooks`, `@workspace/utils`
  - `@workspace/eslint-config`, `@workspace/typescript-config`

## CI Coverage Snapshot

- Workflows present: `ci.yml`, `test.yml`, `db-neon-migrations.yml`, `design-system-check.yml`.
- Existing CI controls include:
  - Hygiene check (`pnpm check:hygiene`)
  - Dependency audit gate (`pnpm audit --prod --audit-level=critical`)
  - Build/lint/test execution
  - Migration validation
  - Frontend bundle analysis
  - Playwright smoke test execution

## Evidence Artifacts

- `docs/audits/evidence/2026-04-02-pnpm-audit.json`
- `docs/audits/evidence/2026-04-02-pnpm-audit-severity.tsv`
- `docs/audits/evidence/2026-04-02-pnpm-audit-workspaces.tsv`
- `docs/audits/evidence/2026-04-02-pnpm-audit-findings.tsv`
- `docs/audits/evidence/2026-04-02-pnpm-audit-direct-findings.tsv`
- `docs/audits/evidence/2026-04-02-pnpm-audit-top-modules.tsv`
- `docs/audits/evidence/2026-04-02-gitleaks.json`

## Phase 1 Baseline Summary

| Check | Result | Notes |
|---|---|---|
| `pnpm check:hygiene` | PASS | Repository hygiene checks passed |
| `pnpm check:prisma-boundary` | PASS | No Prisma boundary violations |
| `pnpm lint` | PASS | Turborepo lint across workspace packages passed |
| `pnpm --filter @docita/api run check-types` | PASS | API typecheck passed |
| `pnpm --filter @docita/app run check-types` | PASS | Passed after clean build artifacts were regenerated |
| `pnpm --filter @docita/admin run check-types` | PASS | Admin typecheck passed |
| `pnpm --filter @docita/landing run check-types` | PASS | Landing typecheck passed |
| `pnpm --filter @docita/api run test:e2e -- test/auth.e2e-spec.ts` | PASS | Auth e2e passed |
| `pnpm --filter @docita/api run test:e2e -- test/rbac.e2e-spec.ts test/csrf.e2e-spec.ts` | PASS | RBAC and CSRF e2e passed |
| `pnpm --filter @docita/api run test:e2e -- test/patients.e2e-spec.ts` | PARTIAL | Entire suite skipped (`describe.skip`) |
| `pnpm --filter @docita/app run test` | PASS | 35 files, 245 tests passed |
| `pnpm --filter @docita/admin run test` | PASS | 3 files, 6 tests passed |
| `gitleaks detect --no-git` | PASS | 0 findings |

## Phase 2 Security Findings

### SEC-001: Raw request bodies and stacks are persisted and exported in error pipeline

- Severity: Critical
- Confidence: High
- Exploitability: Medium
- PHI impact: High
- Evidence:
  - `apps/api/src/shared/modules/error-handling/filters/http-exception.filter.ts:264`
  - `apps/api/src/shared/modules/error-handling/filters/http-exception.filter.ts:285`
  - `apps/api/src/shared/modules/monitoring/monitoring/services/error-tracking.service.ts:68`
  - `apps/api/src/shared/modules/monitoring/monitoring/services/error-tracking.service.ts:80`
- Why this matters: exception handling currently forwards full `request.body` to Sentry extras and persists request payloads and stacks into `ErrorLog`. In a PHI system this can capture clinical data in logs/telemetry stores.
- Fix proposal:
  - Introduce a central redaction layer before `logError` and `captureException`.
  - Blocklist/safelist fields (`name`, `phone`, `email`, diagnosis, notes, prescriptions, ids with PHI linkage).
  - Store only hashed request fingerprints and bounded metadata, not full bodies.
  - Keep stacks only for non-PHI code paths or redact values before persistence.

### SEC-002: PHI/PII appears in plaintext operational logs

- Severity: Critical
- Confidence: High
- Exploitability: Medium
- PHI impact: High
- Evidence:
  - `apps/api/src/domains/reminders/application/services/reminder-notification.service.ts:74`
  - `apps/api/src/domains/reminders/application/services/reminder-notification.service.ts:109`
  - `apps/api/src/shared/modules/messaging/email/email-events.listener.ts:40`
  - `apps/api/src/shared/modules/messaging/email/email-events.listener.ts:80`
  - `apps/api/src/shared/modules/messaging/email/providers/console-email.provider.ts:37`
  - `apps/api/src/shared/modules/messaging/channels/whatsapp.channel.ts:46`
- Why this matters: email addresses, phone numbers, and webhook/template payload data are logged in plaintext, increasing breach blast radius in log aggregation systems.
- Fix proposal:
  - Replace direct values with masked forms (`***@domain`, last-2 digits).
  - Remove webhook payload dumps and template data logs.
  - Enforce a logger wrapper that rejects direct PII/PHI keys.

### SEC-003: Audit service emits full serialized audit payloads to debug logs

- Severity: High
- Confidence: High
- Exploitability: Medium
- PHI impact: High
- Evidence:
  - `apps/api/src/shared/modules/audit/audit/audit.service.ts:100`
  - `apps/api/src/shared/modules/audit/audit/audit.service.ts:114`
- Why this matters: `changes` and `metadata` are serialized verbatim and can include patient-level data.
- Fix proposal:
  - Remove serialized audit payload logging.
  - Log immutable IDs and action classification only.
  - Move detailed values to encrypted audit tables with strict access controls.

### SEC-004: JWT secret policy does not enforce minimum length in runtime env schema

- Severity: High
- Confidence: High
- Exploitability: Medium
- PHI impact: High
- Evidence:
  - `apps/api/src/shared/modules/config/app-config.ts:6`
- Why this matters: `JWT_SECRET` currently accepts any non-empty string, conflicting with repo policy requiring a minimum 32 characters.
- Fix proposal:
  - Enforce `z.string().min(32)` and reject weak secrets on startup.
  - Add CI guard for env examples and deployment manifests.

### SEC-005: Browser access tokens are persisted in `localStorage` across app/admin

- Severity: High
- Confidence: High
- Exploitability: Medium
- PHI impact: High
- Evidence:
  - `packages/data-access/src/lib/browser-session.ts:68`
  - `packages/data-access/src/lib/browser-session.ts:74`
- Why this matters: any XSS can extract bearer tokens from `localStorage` and replay sessions.
- Fix proposal:
  - Move session auth to `HttpOnly`, `Secure`, `SameSite=Strict/Lax` cookies.
  - Keep refresh/access token lifecycle server-managed; avoid JS-readable token stores.

### SEC-006: Dependency vulnerability backlog includes direct high-risk runtime packages

- Severity: High
- Confidence: High
- Exploitability: Medium
- PHI impact: Medium
- Evidence:
  - `docs/audits/evidence/2026-04-02-pnpm-audit-severity.tsv`
  - `docs/audits/evidence/2026-04-02-pnpm-audit-direct-findings.tsv`
- Key data:
  - 49 advisories total: 22 high, 22 moderate, 5 low.
  - Direct high findings in API include `xlsx` (prototype pollution + ReDoS, no npm patch available) and `multer` DoS vulnerabilities.
- Fix proposal:
  - Replace `xlsx` with a maintained parser or vendor patched build with strict file-type and content gating.
  - Upgrade `multer` to non-vulnerable versions.
  - Open tracked risk exceptions only when no patch path exists and compensating controls are in place.

### SEC-007: API CSP currently allows global `'unsafe-inline'`

- Severity: Medium
- Confidence: High
- Exploitability: Low
- PHI impact: Medium
- Evidence:
  - `apps/api/src/main.ts:254`
  - `apps/api/src/main.ts:255`
- Why this matters: inline allowances broaden script/style injection surface.
- Fix proposal:
  - Restrict Swagger/docs-specific CSP to docs route only.
  - Use nonce/hash-based CSP for inline requirements.

### SEC-008: Tenant-isolation patient e2e coverage is currently disabled

- Severity: Medium
- Confidence: High
- Exploitability: Low
- PHI impact: Medium
- Evidence:
  - `apps/api/test/patients.e2e-spec.ts:21`
- Why this matters: a core isolation suite is skipped, reducing regression detection on access-control boundaries.
- Fix proposal:
  - Re-enable suite and stabilize fixtures.
  - Add CI gate requiring tenant-isolation tests on API PRs touching auth/data domains.

## Phase 3 Performance Findings

### PERF-001: Query-plan check fails on appointment listing pattern (sequential scan)

- Severity: High
- Confidence: High
- Evidence:
  - Command result: `appointment-clinic-status-startTime: FAIL (sequential scan detected)`
  - Query definition: `packages/db/scripts/check-query-plans.ts:33`
- Impact: higher latency and CPU under clinic-scale appointment growth.
- Reproduction:
  - Run `pnpm --filter @workspace/db exec ts-node scripts/check-query-plans.ts`.
- Optimization:
  - Add/validate composite index for `(clinicId, status, startTime DESC)` on `Appointment`.
  - Recheck with `EXPLAIN (FORMAT JSON)` in CI.
- Effort: Medium

### PERF-002: Large client chunks in app/admin and heavy landing route payload

- Severity: Medium
- Confidence: High
- Evidence:
  - App top chunks: 439,769 bytes and 378,661 bytes (`apps/app/.next/static/chunks/...`)
  - Admin top chunk: 431,422 bytes (`apps/admin/.next/static/chunks/...`)
  - Landing page chunk near 188,564 bytes (`apps/landing/.next/static/chunks/app/page-...js`)
- Impact: slower initial load and interaction on low-bandwidth/mobile devices.
- Reproduction:
  - `pnpm --filter @docita/app run build:analyze`
  - `ANALYZE=true pnpm --filter @docita/admin run build`
  - `ANALYZE=true pnpm --filter @docita/landing run build`
- Optimization:
  - Route-level code splitting for chart-heavy and dashboard modules.
  - Prefer dynamic import for rarely used UI/reporting features.
  - Set bundle budget thresholds in CI.
- Effort: Medium

### PERF-003: Slow-query profiling capability is partially disabled (`pg_stat_statements` absent)

- Severity: Medium
- Confidence: High
- Evidence:
  - `pnpm db:profile` output: `relation "pg_stat_statements" does not exist`
- Impact: reduced ability to detect true high-latency query contributors in runtime.
- Optimization:
  - Enable `pg_stat_statements` extension in local and CI database profiles used for performance checks.
- Effort: Low

### PERF-004: Web vitals reporter component exists but is not wired into app tree

- Severity: Medium
- Confidence: High
- Evidence:
  - Component definition: `apps/app/features/_shared/components/layout/web-vitals-reporter.tsx:8`
  - No references found by search for `WebVitalsReporter` outside its own file.
- Impact: missing LCP/INP/CLS telemetry limits user-experience performance governance.
- Optimization:
  - Mount reporter in root layout once and ensure endpoint ingestion budget.
- Effort: Low

### PERF-005: Index usage report shows high seq-scan skew and many zero-hit indexes in current dataset

- Severity: Low
- Confidence: Medium
- Evidence:
  - `pnpm --filter @workspace/db exec ts-node scripts/analyze-indexes.ts` output.
- Impact: possible extra write overhead and memory churn; may indicate mismatch between query patterns and index set.
- Optimization:
  - Validate with production-like workload before dropping/adding indexes.
  - Keep index changes evidence-driven via query-plan checks.
- Effort: Medium

## Phase 4 Remediation Backlog

### P0 (Immediate Risk Reduction)

| ID | Area | Action | Effort | Verification |
|---|---|---|---|---|
| P0-1 | API error handling | Redact/remove `request.body`, stacks, and payload details from telemetry/log persistence | M | Unit tests for redaction + manual error-path smoke |
| P0-2 | Messaging/notifications | Remove PHI-bearing logs (email, phone, payloads, template data) and replace with masked identifiers | S | Grep guard + logger tests + runtime smoke |
| P0-3 | Dependencies | Mitigate direct high findings (`multer`, `xlsx`) with upgrades/replacement and compensating controls | M | `pnpm audit` delta, upload-fuzz smoke tests |

### P1 (Next Sprint)

| ID | Area | Action | Effort | Verification |
|---|---|---|---|---|
| P1-1 | Auth/session | Migrate browser token storage from `localStorage` to HttpOnly cookie session model | L | Auth integration tests + XSS replay simulation |
| P1-2 | Config hardening | Enforce `JWT_SECRET` minimum length in env schema and CI validation | S | Startup validation tests |
| P1-3 | DB performance | Fix appointment query seq scan with composite index and plan-check guard | M | `check-query-plans.ts` PASS in CI |
| P1-4 | Frontend perf | Add CI bundle budgets and route-level chunk reduction tasks | M | Budget check gate and build analyze deltas |

### P2 (Scheduled Hardening)

| ID | Area | Action | Effort | Verification |
|---|---|---|---|---|
| P2-1 | CSP | Replace global `'unsafe-inline'` with route-scoped policy/nonces | M | CSP integration tests |
| P2-2 | Observability | Enable `pg_stat_statements` in local/CI profiles and integrate into performance checks | S | `db:profile` includes top slow queries |
| P2-3 | Test coverage | Re-enable patient isolation e2e suite and make it non-optional in CI | M | CI gate on patient isolation suite |
| P2-4 | Web vitals | Wire `WebVitalsReporter` into root layout and monitor ingestion quality | S | Web-vitals records appear in monitoring endpoint |

## Quick Wins vs Structural Fixes

- Quick wins:
  - Remove PHI from logs and telemetry payloads.
  - Enforce JWT secret length.
  - Enable `pg_stat_statements`.
  - Wire web vitals reporter.
- Structural fixes:
  - Session architecture migration away from `localStorage` tokens.
  - Dependency modernization for vulnerable direct packages with long-term ownership.
  - Query/index governance with CI plan checks and production-like profiling.

## Acceptance Criteria Status

- Every identified finding includes severity, evidence, and remediation: Complete.
- P0/P1/P2 backlog is implementation-ready: Complete.
- Security-critical items are separated from performance items: Complete.

## Assumptions and Constraints

- Findings are based on local runtime and checked-in CI configuration as of 2026-04-02.
- No staging/production traffic, data, or infrastructure probing was performed.
- Performance data reflects local dataset characteristics and must be validated against production-like load before irreversible index decisions.
