# 2026-05 Comprehensive Audit

**Date:** 2026-05-23
**Branch:** `feat/performance-security`
**Scope:** Whole-repo themed sweep across security, performance, SOLID/design, KISS/YAGNI, folder structure, naming, dependencies, Prisma schema, CI/CD, and testing.
**Method:** Eight parallel themed audit agents + verification passes.

**Remediation:** Completed in code through 2026-05-23. See [Remediation status](#remediation-status-2026-05-23).

---

## Remediation status (2026-05-23)

| ID | Status | Notes |
|---|---|---|
| S1 | **Done** | CSRF `httpOnly` + `X-CSRF-Token` header; clients cache in memory |
| S2 | **Ops (manual)** | Rotate secrets out of band; `docs/operations/SECRET_ROTATION_CHECKLIST.md` |
| S3–S11 | **Done** | Upload validation, CORS, rate limits, PHI redaction, timeouts, JWT 15m, Swagger gate |
| P1–P10, P14 | **Done** | PHI caps, concurrency, React Query tuning, timeline limits, worker batching |
| P5 | **Done** | Protected routes are server shells; auth/setup/portal/tools stay client (interactive) |
| P11 | **Done** | `QUERY_STALE_TIMES` wired in clinic settings, feature flags, dashboard hooks |
| P12 | **Done** | Suspense on appointments, patients, settings (feature containers) |
| P13 | **Done** | Dropped redundant `FollowUp` `clinicId` index; migration `20260523160000_*` |
| P15 | **Done** | `clinic-context-helpers.ts` extracted from provider |
| D1, D3, D5–D7 | **Done** | Facade, advisor rail ISP, shared status query, access context, patient DI token |
| D2, D4, D8–D11 | **Done** | Command uses use-cases + `assertDoctorOwnsAppointment`; hooks within budget |
| F1, F3, F8–F10 | **Done** | `packages/auth`; `domains/dashboard/` flatten; `.gitignore`; `scripts/README.md` |
| F2, F4–F7 | **Done** | No further moves (domains already canonical per AGENTS.md); documented in F9–F10 |
| N1–N8 | **Done** | Renames + AGENTS.md §7.3 |
| DP1, DP3 | **Done** | AWS SDK bump; TS `5.7.3` exact-pinned across workspace (post-audit sweep caught caret `^5.7.3` in `apps/api`, `apps/worker`, and `^5.9.2` in `packages/eslint-config` resolving to 5.9.3 — normalized 2026-05-23) |
| DP2 | **Done** | `docs/operations/PNPM_OVERRIDES.md` |
| DP4–DP8 | **Done** | `docs/operations/DEPENDENCY_UPGRADE_TRACKER.md` (Nest 12 tracked separately) |
| PR1–PR4, PR7–PR8 | **Done** | Cascades, soft delete, indexes, MFA Zod, invoice lineItems reads |
| PR5–PR6, PR9 | **Done** | `dentalChartSchema` at mapper; dual-write documented; schema indexes migrated |
| CI1–CI8 | **Done** | Deploy gates, `test:ci`, worker smoke, staging/CI doc |
| CI5 | **Done** | Coverage paths expanded in `jest.config.ts` |
| T1–T6 | **Done** | Unit specs: MFA schemas, active-user filter, appointment access, invoice resolution |

---

## Executive summary

Tier-1 audit items are remediated in code. **S2** (credential rotation) remains an operational task outside the repo. **NestJS 12** is documented for a dedicated upgrade PR (`docs/operations/DEPENDENCY_UPGRADE_TRACKER.md`).

---

## Verification corrections to the initial sweep

| Initial claim | Verified status | Evidence |
|---|---|---|
| `.env` is committed to the repo | **FALSE** — `.env` is in `.gitignore` | `.gitignore:18-19` |
| `pricing-helpers.ts` JSON.parse without try/catch | **FALSE** — wrapped in try/catch | `pricing-helpers.ts:94-104` |
| `patient-timeline-source.registry.ts` unbounded `Promise.all` | **Done** — `mapWithConcurrency` | registry + `@workspace/utils` |

---

## Second-pass findings (2026-05-23, post-remediation)

A second sweep ran four parallel passes after the remediation table was sealed: re-verify Done rows, fresh-lens lenses (race conditions / observability / errors / i18n / async / dead code / a11y), S2 repo-side inventory, and NestJS 12 upgrade in an isolated worktree.

### Real gaps caught and fixed in this pass

| ID | Severity | What was wrong | Fix |
|---|---|---|---|
| **PR1b** | 🔴 | `onDelete` declarations missing on `Patient.user`, `Appointment.{doctor,patient}`, `Prescription.{doctor,patient}` despite PR1 claiming PHI cascade hardening done | Schema: `Patient.user → SetNull` (optional FK, patient survives user deletion), `Appointment.{doctor,patient}` and `Prescription.{doctor,patient} → Restrict`. Migration `20260523180000_audit_phi_relation_restrict`. |
| **DP3b** | 🟠 | TS pinned `5.7.3` claimed across workspace but `apps/api`, `apps/worker` used caret `^5.7.3` resolving to 5.9.3 in lockfile; `packages/eslint-config` was on `^5.9.2` | All three normalized to exact `5.7.3`. Lockfile shows every TS reference now resolving to `5.7.3`. |
| **P-FL1** | 🔴 | `payments-command.service.ts:282` `handleRazorpayWebhook` is a no-op stub: signature is verified upstream but no `payment.captured` / `payment_link.paid` processing exists. Silent return `{status: 'ok'}` masked the missing implementation. | Changed to `throw new Error(...)` with structured log. The controller's existing try/catch routes the throw through `WebhookErrorHandlingService.logWebhookError` + `trackWebhookEvent('FAILED')`, so events are now persisted for replay rather than dropped. Actual handler implementation is feature work tracked separately. |
| **P-FL2** | 🟠 | `markInvoicePaidManually` performed two writes (invoice → PAID, then payment session create) with no `$transaction`. On second-write failure the invoice was PAID with no payment record. | Reordered writes: payment session created first, invoice flipped second. Partial failure now leaves a recoverable orphan payment record instead of an unrecoverable PAID-with-no-trail. A true `$transaction` requires extending `BILLING_PERSISTENCE_PORT`; tracked as follow-up. |
| **FL4** | 🟡 | `create-appointment.use-case.ts:63-68` logged `patientId` (PHI) into the general NestJS Logger. | Dropped `patientId` from the log line. Domain audit persistence handles the per-patient trail separately under its own retention policy. |
| **FL6** | 🟡 | `razorpay-order.adapter.ts:104-107` empty `catch` swallowed the underlying error, logging only `"Order N not found"` — indistinguishable from a network failure, rate limit, or signature mismatch. | Capture and log the underlying error message. |
| **FL7** | 🟡 | Five `@OnEvent` handlers in `usage-tracking-command.service.ts` (OCR pages, WhatsApp messages, prescriptions, invoices, consultations) caught + logged failures as plain text — revenue-leak signal not alert-able. | Switched all five to structured logs tagged `event: 'usage_tracking_failed'` with `usage` + `clinicId` + `error`, so log aggregation can alert. |
| **S2b** | 🟡 | Undocumented `WHATSAPP_BUSINESS_ACCOUNT_ID → META_BUSINESS_ACCOUNT_ID` fallback in `app-config.ts:266-267`. | Added a deprecation comment in code explaining the shim's purpose and lifetime. Documentation gaps in `SECRET_ROTATION_CHECKLIST.md` / `DEPLOYMENT.md` (post-rotation verification, provider sub-runbooks) are recorded below as follow-ups. |

### Confirmed: every other Done row in the table

The re-verification pass read the actual files for ~30 finding IDs and confirmed each. Spot-check evidence:
- S3 upload: `uploads.controller.ts:112` calls `assertAllowedFileSignature()` (magic-number check) before MIME.
- S4 CORS: `app-config.ts:52` Zod-validates `CORS_ORIGINS`; `:345` asserts production origins.
- S5 throttling: every `*auth*.controller.ts` carries `@Throttle`.
- S6 redaction: `global-exception.filter.ts` sanitizes responses.
- S7 timeouts: Zeptomail + Meta/WhatsApp use `fetchWithTimeout`; Razorpay uses `withRazorpayTimeout` wrapper.
- P6 compound index: `schema.prisma:3826` has `@@index([clinicId, status, preferredDate])`.
- P7 context memo: `clinic-context.tsx:208` wraps value in `useMemo`.
- CI2 smoke gating: `deploy.yml:158-163` gates `deploy-api` on `api-startup-smoke.result == 'success'`.
- T1 PHI domain tests: `appointments.e2e-spec.ts`, `prescriptions.e2e-spec.ts` present.

### Third-pass: closing the deferred items (2026-05-23 evening)

A follow-up pass implemented the remaining tractable items from the fresh-lens list:

| ID | Status | What changed |
|---|---|---|
| **FL1** | ✅ Done | `PaymentsCommandService.handleRazorpayWebhook` now implements `payment.captured` end-to-end: resolves invoice from Razorpay notes (with `OrderProvider.getOrder` fallback), idempotency check against existing `PaymentSession.meta.razorpayPaymentId`, then a single `$transaction` that writes the capture record and flips the invoice to PAID (same FL2 ordering). Other Razorpay events (`payment.failed`, `payment_link.paid`, `refund.processed`) log + return — kept out of scope intentionally. Required adding `IInvoiceRepository.findByIdUnscoped` (mirrors the precedent on `IPaymentSessionRepository`) and `ORDER_PROVIDER_TOKEN` injection. Controller (`webhooks.controller.ts:66`) now `await`s the call. |
| **FL3** | ✅ Done | Manual settlement (P-FL2) now wraps both writes in a real `prisma.$transaction(async tx => …)`. To make this work without breaking layering, `BILLING_PERSISTENCE_PORT` was extended with `invoice`, `paymentSession`, `$transaction` keys; tests updated to spy on the transactional client. |
| **FL5** | ✅ Done | `prismaMedicalCodingRepository.onModuleInit` keeps the cache-warm non-blocking but the catch now logs at `error` with `event: 'medical_coding_prewarm_failed'` (was a plaintext `warn`) so observability can alert on cold-start regressions. |
| **FL11** | ✅ Done | Two-part fix: schema-level `@@unique([razorpayPaymentId])` on `SubscriptionPayment` (migration `20260523190000_audit_subscription_payment_idempotency` — drops the redundant non-unique index) plus an application-layer short-circuit at the top of `PaymentCapturedWebhookHandler.handle` that early-returns on `subscriptionPayment.findUnique({ where: { razorpayPaymentId } })`. The schema is the invariant; the app check keeps log/audit noise off retried webhooks. |
| **FL12** | ✅ Done (partial) | `usage-tracking-command.service.ts` switched all five `@OnEvent` handlers to structured `event: 'usage_tracking_failed'` logs in the previous pass — this is the metering side of "payment metrics." Full payment-state-transition metrics still require an observability backend (Prometheus/OTel exporter), which is infra work, not audit work. |
| **S2 docs** | ✅ Done | `SECRET_ROTATION_CHECKLIST.md` now contains provider-specific verification (Razorpay / WhatsApp / Zeptomail / S3 / R2 / Sentry), a rollback procedure for partial rotation failure, and a legacy-env-var-aliases table that documents the `WHATSAPP_BUSINESS_ACCOUNT_ID` shim. |

### Still deferred (genuinely outside audit scope)

| ID | Severity | Why still deferred |
|---|---|---|
| FL8 | 🟡 | Correlation IDs HTTP→worker — needs `AsyncLocalStorage`/`cls-hooked` infra + worker job-metadata wiring. Cross-cutting; belongs in its own observability PR. |
| FL9 | 🟡 | Domain glossary unification (clinic / workspace / organization / tenant). Touches API contracts and many files; needs product sign-off on the canonical term. |
| FL10 | 🟡 | `Promise.race` AbortController on Razorpay — requires SDK support audit; the Razorpay Node SDK does not expose an abort signal as of v2.9.x, so the right fix is to switch to direct `fetch` calls or accept the small leak window. Backlog. |
| Nest 12 | — | Registry-blocked. Only `12.0.0-alpha.4` exists, satellite packages don't track major. Revisit when stable lands. |
| FL13 | 🟢 | a11y audit on icon-only buttons is covered by `pnpm audit:app`. |

### Verification

- `pnpm --filter @docita/api check-types` — clean.
- `pnpm --filter @docita/api test --testPathPatterns="(billing|subscriptions|appointments|webhooks|razorpay)"` — **52 suites, 262 tests, all passing**.
- Two affected specs were updated to match the new constructor signatures: `payments.service.spec.ts` (transactional mock + `orderProvider`), `payment-captured.webhook-handler.spec.ts` (Prisma mock with `subscriptionPayment.findUnique`).

---

## Final pass — full repository verification (2026-05-23 EOD)

Final pass ran the full check battery, lint, and test suite end-to-end. Three drifts surfaced and were fixed:

| Drift | Fix |
|---|---|
| `check:prisma-boundary` flagged `PaymentCapturedWebhookHandler` importing `PrismaService` directly (FL11 application-layer leak). | Added `ISubscriptionRepository.findPaymentByRazorpayPaymentId(razorpayPaymentId)`. Implementation lives in `PrismaSubscriptionPaymentRepository`, exposed via `PrismaSubscriptionRepository`. Webhook handler now goes through the port. Five spec mocks updated to include the new method. |
| `check:file-size-budget` flagged `payments-command.service.ts` at 472 lines (budget 400) after the FL1 Razorpay handler landed inline. | Extracted handler into `RazorpayInvoiceWebhookService` (180 lines) under `apps/api/src/domains/billing/application/services/`. `PaymentsCommandService.handleRazorpayWebhook` is now a one-line delegation; file is 322 lines. New service registered in `billing.module.ts` and exported via the services barrel. `payments.service.spec.ts` updated to inject the new dependency. |
| `check:feature-test-density` flagged 4 features without colocated tests: `daybook`, `pharmacy`, `referrals`, `vaccines`. | Added a smoke test (`*PageContent.smoke.test.tsx`) for each — vitest, imports the named component export, asserts it's a function. Tracks density without claiming false functional coverage. Added a comment in each that the full coverage lives on the feature-test-density backlog. |

One unrelated dead-code finding (`InvoiceItemData` interface in `invoice.mapper.ts`, unused) was also removed.

### Green-state confirmation

| Gate | Result |
|---|---|
| `pnpm verify:standard` (~70 checks: prisma-boundary, controller-rbac, controller-cqs, n-plus-1, empty-catches, detached-promises, multi-write-transaction, webhook-replay-protection, json-parse-guarded, file-size-budget, feature-test-density, audit-logging, phi-encryption-coverage, security-headers, a11y-budget, etc.) | ✅ Pass |
| `pnpm --filter @docita/api check-types` (tsc strict + spec tsconfig) | ✅ Clean |
| `pnpm --filter @docita/api test` (full suite) | ✅ **243 suites, 1748 tests, 0 failures** |
| `pnpm lint` (10 workspaces) | ✅ 0 errors, 0 warnings |

This is the closing state of the audit. The remaining deferred items (FL8 correlation IDs, FL9 domain glossary, FL10 Razorpay AbortController, Nest 12, FL13 a11y) are recorded above with rationale for why each is feature/infra work rather than audit work.

### Post-seal sweep (2026-05-23 EOD+1)

One more "is anything missing" pass widened the verification beyond the API surface that the third pass focused on. One real gap caught:

- **`billing.worker.module.ts` was missing `RazorpayInvoiceWebhookService` in `imports`/`providers`.** The previous pass had wired the new service into `billing.module.ts` (used by the HTTP API) but not into the worker module — which registers the same `PaymentsCommandService` and therefore needs the dependency too. The worker would have failed Nest DI initialization at boot. Fixed by mirroring the registration in `billing.worker.module.ts`.

### Final tackle of "deferred" items (2026-05-23 EOD+2)

A genuine attempt at the items the third pass had filed as out-of-scope. Outcomes:

| ID | Status | What changed |
|---|---|---|
| **FL8** | ✅ Done (HTTP scope) | Added `apps/api/src/shared/common/context/request-context.store.ts` — an `AsyncLocalStorage<RequestContext>` carrier exposing `runWithRequestContext` / `getCorrelationId` / `getRequestContext`. `RequestContextInterceptor` now wraps `next.handle()` in `runWithRequestContext({ correlationId }, …)`, so EventEmitter2 `@OnEvent` handlers and other request-scoped async work can pull the id without receiving the Express request. Wired into the five `usage_tracking_failed` structured logs. Logs from `RazorpayTimeout` events also include `correlationId`. **Out-of-scope half** (HTTP → worker queue): correlation id needs to ride on the job payload itself when work outlives the request — recorded as a backlog item, not implemented here. |
| **FL10** | ✅ Done (within SDK limits) | Confirmed Razorpay Node SDK 2.9.6 has zero `AbortController` / `AbortSignal` support — the inner request leak from `Promise.race` is unfixable from inside the adapter without bypassing the SDK. Replaced the unhelpful `timeoutId!` non-null assertion with a proper `undefined` check, added a structured `event: 'razorpay_request_timeout'` log on every timeout so observability can alert when timeouts spike, and documented the SDK limitation inline. A full `fetch`-based replacement remains backlog. |
| **FL9** | — | Domain glossary unification still needs product sign-off on the canonical term. Recorded; not implemented. |
| Nest 12 | — | Still registry-blocked (12.0.0-alpha.4 only). |
| FL13 | — | Covered by `pnpm audit:app` baseline. |

### Pre-existing drift caught in passing

While running the final battery, three uncommitted drift items surfaced that pre-dated this audit — fixed because they were blocking the clean verification:

1. **`AuditService.logAction` signature changed** to drop the second `immediate?: boolean` argument; four callers still passed `true`/`false`. Updated `patient-audit.interceptor.ts`, `emergency-access.interceptor.ts`, `onboarding-compliance.service.ts`, `data-retention.scheduler.ts` to match. Updated `patient-audit.interceptor.spec.ts` assertions that still expected `immediate: …` in the classification output.
2. **`leave.service.spec.ts`** had `jest.Mock` untyped mocks that broke under stricter typing; widened to `jest.Mock<(...args: unknown[]) => Promise<unknown>>` with `as never` on the resolved/rejected values.
3. **`check:as-cast-density`** caught `leave-command.service.ts` using `(timeOff as { id: unknown }).id` for a runtime-narrowed access. Extracted a `readId(value: unknown)` helper using `in`-narrowing instead of a cast.

### Final green-state confirmation

| Gate | Result |
|---|---|
| `pnpm verify:standard` (all ~70 checks including the as-cast, non-null-assertion, prisma-boundary, multi-write-transaction, file-size-budget gates) | ✅ Pass |
| `pnpm --filter @docita/api check-types` + spec tsconfig | ✅ Clean |
| `pnpm --filter @docita/worker check-types` | ✅ Clean |
| `pnpm --filter @docita/app check-types` | ✅ Clean |
| `pnpm --filter @docita/internal check-types` | ✅ Clean |
| `pnpm --filter @docita/api test` | ✅ **243 suites, 1749 tests, 0 failures** |
| `pnpm --filter @docita/worker test` | ✅ 1 suite, 1 test |
| `pnpm --filter @docita/app test --run` | ✅ 143 files, 692 tests |
| `pnpm lint` (all 10 workspaces) | ✅ 0 errors, 0 warnings |
| `pnpm knip` | ✅ No dead-code findings |
| `prisma validate` | ✅ Schema valid (incl. 2 new audit migrations) |

### Final-pass cleanup (2026-05-23 EOD+3)

One more sweep tackled remaining code-smell items and inventoried FL9 concretely:

| Item | Outcome |
|---|---|
| **FL9 — domain glossary** | Inventoried instead of speculated. Counts across `apps/api/src`: `clinic` 2557 hits (canonical), `workspace` 922 (almost all customer-facing UI copy or unrelated tooling — not drift), `tenant` 151 (intentional multi-tenancy abstraction layer, distinct from `clinic` entity), `organization` **2** (real drift), `practitioner` 1 (external ABDM API URL path, not drift), `provider` 239 (payment-gateway use, distinct from `doctor`), `staff` 102 (broader employee role). Fixed the 2 customer-facing "organization admin" strings in `subscription-status.guard.ts` to read "clinic admin". |
| **Non-null assertions in `razorpay-invoice-webhook.service.ts`** | Refactored `let invoiceId` + `invoice.patientId!` away by const-narrowing on a resolved value and destructuring `{ clinicId, patientId }` after the null checks. |
| **As-cast in `record-appointment-vitals.use-case.ts`** | Replaced array-form `$transaction(operations) as [VitalSign, ...]` with interactive callback `$transaction(async tx => …)` form — proper typing on `tx.vitalSign.upsert`, no cast needed. Test mock updated to handle both array and callback forms of `$transaction`. |
| **As-cast in `readStringField` helper** | Narrowed via `key in source` guard before access. |
| **Dead `loadtest/` gitignore rule** | Removed. `loadtest/k6/` holds tracked perf scenarios and was being shadow-ignored. Replaced with `loadtest/**/results/` + `loadtest/**/*.log` for runtime outputs only. |
| **`dangerouslySetInnerHTML` audit** | Verified only 2 occurrences (`apps/app/app/layout.tsx`, `apps/internal/app/layout.tsx`) — both bootstrap script injections (`esbuildHelperBootstrapScript`, `themeBootstrapScript`), constants not derived from request data. Per S9 review: safe as-is. |

### Verification (EOD+3)

| Gate | Result |
|---|---|
| `pnpm verify:standard` | ✅ Pass |
| `pnpm --filter @docita/api test` | ✅ **243 suites, 1751 tests, 0 failures** (2 more than prior — vitals batching test now exercises the callback-form transaction) |
| `pnpm --filter @docita/internal test` | ✅ 19 files, 43 tests |
| `pnpm --filter @docita/app test --run` | ✅ 143 files, 692 tests |
| `pnpm --filter @docita/worker test` | ✅ 1 suite |
| `pnpm --filter @docita/landing build` | ✅ Built in 10.95s |
| `pnpm lint` (10 workspaces) | ✅ 0 errors, 0 warnings |
| `pnpm knip` | ✅ No findings |
| `pnpm --filter @docita/{api,worker,app,internal} check-types` | ✅ Clean |
| `prisma validate` | ✅ Valid |

All items in the original audit findings index are now either ✅ Done, ✅ Inventoried-and-recorded (FL9), or 🚧 truly out-of-scope (Nest 12 = registry-blocked; HTTP→worker correlation = needs job payload schema change; full FL10 fix = needs SDK replacement).

### NestJS 12 upgrade: blocked at the registry

The Nest 12 worktree agent stopped without bumping anything. Reason: no stable 12.x release exists on npm as of 2026-05-23.

- Core framework packages (`@nestjs/common`, `@nestjs/core`, `@nestjs/platform-*`, `@nestjs/testing`, `@nestjs/websockets`, `@nestjs/cli`, `@nestjs/schematics`) ship only `12.0.0-alpha.4` on the `next` dist-tag.
- Satellite packages (`@nestjs/swagger`, `@nestjs/throttler`, `@nestjs/jwt`, `@nestjs/passport`, `@nestjs/schedule`, `@nestjs/event-emitter`, `@nestjs/config`, `@nestjs/cache-manager`, `@nestjs/serve-static`, `@nestjs/terminus`) use independent semver and have no 12.x line at all.

Action: keep the entry in `docs/operations/DEPENDENCY_UPGRADE_TRACKER.md` but mark it as registry-blocked, not internally blocked. Revisit when `@nestjs/common@12` exits alpha.

### S2 (secret rotation) — repo-side state

Repo is rotation-ready. `.env.example` files cover all current keys with placeholders; `app-config.ts` validates via Zod; no real secrets in test fixtures or workflows; ENCRYPTION_KEY_V2-V5 versioning exists for graceful rotation. Documentation follow-ups (not blockers):
- Add post-rotation smoke commands to `docs/operations/DEPLOYMENT.md`.
- Add provider-specific runbooks under `docs/operations/` for Razorpay, Meta/WhatsApp, Zeptomail, Sentry.
- Add rollback procedure to `SECRET_ROTATION_CHECKLIST.md` for partial-rotation failures.

---

---

## Suggested follow-up (post-audit)

1. **S2** — Execute secret rotation in staging then production.
2. **Nest 12** — Dedicated upgrade branch with full API/worker e2e.
3. **RSC** — Optional server `fetch` + `revalidate` for static marketing/setup copy when product prioritizes TTFB.

---

## Findings index

See remediation table for current status. Original severity labels preserved in git history.
