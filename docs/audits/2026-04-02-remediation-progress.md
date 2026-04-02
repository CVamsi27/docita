# Security/Performance Remediation Progress

Date: 2026-04-02
Base audit: `docs/audits/2026-04-02-security-performance-audit.md`

## Implemented in this pass

### 1) PHI-safe error logging and telemetry capture

- Redacted request-body capture in global exception filter.
- Replaced raw request body persistence with key-only summary metadata.
- Limited error stack forwarding in monitoring pipeline to development mode.
- Trimmed request error messages in request logging interceptors and stopped forwarding raw stacks.

Files:
- `apps/api/src/shared/modules/error-handling/filters/http-exception.filter.ts`
- `apps/api/src/common/interceptors/request-logging.interceptor.ts`
- `apps/api/src/shared/modules/interceptors/request-logging.interceptor.ts`

### 2) Removed PHI-bearing operational logs

- Removed direct email/phone/payload logging from reminder and messaging flows.
- Masked email addresses in event logs.
- Replaced webhook payload dumps with event-type-only logging.
- Replaced console email provider content logging with recipient counts and template key summaries.
- Removed serialized audit payload debug log.

Files:
- `apps/api/src/domains/reminders/application/services/reminder-notification.service.ts`
- `apps/api/src/shared/modules/messaging/email/email-events.listener.ts`
- `apps/api/src/shared/modules/messaging/email/providers/console-email.provider.ts`
- `apps/api/src/shared/modules/messaging/channels/whatsapp.channel.ts`
- `apps/api/src/shared/modules/audit/audit/audit.service.ts`

### 3) Harder JWT secret policy enforcement

- Enforced `JWT_SECRET` minimum length in env schema.
- Raised startup validation minimum JWT secret length to 32 chars in all environments.
- Updated fallback test secret to satisfy the new bound.

Files:
- `apps/api/src/shared/modules/config/app-config.ts`
- `apps/api/src/shared/modules/services/startup-validation.service.ts`

### 4) Upload surface hardening and dependency update

- Added explicit `files: 1` and file size limits for import upload interceptors.
- Updated API dependency to `multer@^2.1.1`.

Files:
- `apps/api/src/shared/modules/imports/imports.controller.ts`
- `apps/api/package.json`
- `pnpm-lock.yaml`

### 5) Dependency backlog burn-down and import parser hardening

- Replaced vulnerable `xlsx` usage with `exceljs` (`.xlsx`) + `papaparse` (`.csv`) parsing in import service.
- Explicitly deprecated legacy `.xls` uploads and now fail fast with actionable error messaging.
- Upgraded framework/runtime dependencies across workspaces:
  - `next` to `16.2.2` for app/admin/landing
  - `@sentry/nextjs` and `@sentry/nestjs` to `10.47.0`
  - Prisma stack (`prisma`, `@prisma/client`, `@prisma/adapter-pg`) to `7.6.0`
  - `socket.io` to `4.8.3`
- Added root-level pnpm overrides for vulnerable transitives (including `axios`, `jws`, `hono`, `@hono/node-server`, `effect`, `path-to-regexp`, `qs`, `serialize-javascript`, `socket.io-parser`, `lodash`, `rollup`, `webpack`, and scoped `schema-utils>ajv`).
- Cleared stale `.next` type artifacts after Next.js upgrade to keep typechecking deterministic.

Files:
- `apps/api/src/shared/modules/imports/imports.service.ts`
- `apps/api/src/shared/modules/imports/imports.controller.ts`
- `apps/api/package.json`
- `apps/app/package.json`
- `apps/admin/package.json`
- `apps/landing/package.json`
- `packages/db/package.json`
- `package.json`
- `pnpm-lock.yaml`

### 6) Browser token persistence removal (cookie-first session behavior)

- Updated shared browser session manager to keep access tokens in memory only (no localStorage persistence).
- Added automatic cleanup of legacy token storage keys to reduce residual token exposure.
- Removed app onboarding and patient-portal localStorage token writes, replacing them with in-memory session token updates.
- Hardened admin auth bootstrap to rely on server-managed cookies plus refresh/validate flow, and removed non-HttpOnly admin token cookie usage.
- Kept `docita_user` localStorage persistence for UX/session restoration while authentication itself remains cookie-based.

Files:
- `packages/data-access/src/lib/browser-session.ts`
- `apps/app/lib/auth-context.tsx`
- `apps/app/features/onboarding/hooks/use-clinic-registration-flow.ts`
- `apps/app/features/patient-portal/hooks/use-portal-otp-auth.ts`
- `apps/admin/lib/session.ts`
- `apps/admin/lib/auth.tsx`
- `apps/admin/app/page.tsx`

## Verification Run Results

- `pnpm lint`: PASS
- `pnpm --filter @docita/api run check-types`: PASS
- `pnpm --filter @docita/app run check-types`: PASS
- `pnpm --filter @docita/admin run check-types`: PASS
- `pnpm --filter @workspace/data-access run build`: PASS
- `pnpm --filter @docita/api run test -- error-tracking.service.spec.ts email-events.listener.spec.ts`: PASS
- `pnpm --filter @docita/api run test:e2e -- test/auth.e2e-spec.ts test/rbac.e2e-spec.ts test/csrf.e2e-spec.ts`: PASS
- `pnpm --filter @docita/api run test:e2e -- test/patients.e2e-spec.ts`: PASS
- `pnpm --filter @docita/api run test:e2e -- test/rbac-authorization.e2e-spec.ts`: PASS
- `pnpm --filter @docita/app exec vitest run lib/browser-session.spec.ts`: PASS
- `pnpm --filter @docita/admin run test -- app/page.spec.tsx`: PASS

## Dependency Audit Snapshot (After This Pass)

Artifacts:
- `docs/audits/evidence/2026-04-02-pnpm-audit-final.json`
- `docs/audits/evidence/2026-04-02-pnpm-audit-final-severity.tsv`
- `docs/audits/evidence/2026-04-02-pnpm-audit-final-findings.tsv`

Current `pnpm audit --prod` count: `0` (`critical/high/moderate/low` all zero).

## Remaining High-Priority Work

- Re-enable remaining skipped security/authorization API e2e suites (`apps/api/test/rbac-403-verification.e2e-spec.ts`, `apps/api/test/prescriptions.e2e-spec.ts`, `apps/api/test/invoices.e2e-spec.ts`, and related skipped suites).
