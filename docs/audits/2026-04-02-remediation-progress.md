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

## Verification Run Results

- `pnpm lint`: PASS
- `pnpm --filter @docita/api run check-types`: PASS
- `pnpm --filter @docita/app run check-types`: PASS
- `pnpm --filter @docita/api run test -- error-tracking.service.spec.ts email-events.listener.spec.ts`: PASS
- `pnpm --filter @docita/api run test:e2e -- test/auth.e2e-spec.ts test/rbac.e2e-spec.ts test/csrf.e2e-spec.ts`: PASS

## Dependency Audit Snapshot (After This Pass)

Artifacts:
- `docs/audits/evidence/2026-04-02-pnpm-audit-after-remediation.json`
- `docs/audits/evidence/2026-04-02-pnpm-audit-after-remediation-severity.tsv`
- `docs/audits/evidence/2026-04-02-pnpm-audit-after-remediation-direct-findings.tsv`

Current high/moderate/low counts remain non-zero due unresolved direct/transitive items (notably `xlsx`, `next`, and transitive ecosystem packages).

## Remaining High-Priority Work

- Replace or isolate `xlsx` usage with a maintained parsing path and strict parser sandboxing/validation.
- Upgrade Next.js and related transitive toolchain dependencies to versions that clear current advisories.
- Complete session architecture migration from browser token storage to HttpOnly cookie model.
- Re-enable skipped tenant isolation e2e suite (`apps/api/test/patients.e2e-spec.ts`).

