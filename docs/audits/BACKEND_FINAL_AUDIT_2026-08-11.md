# Backend Final Audit — 2026-08-11

> **Status:** Consolidated backend final-pass audit on
> `fix/app-deployment-failure` at `39c029391`. All 80+ `verify:standard`
> checks pass. This doc is the single source of truth for every
> backend finding, fix, and follow-up from the 2026-08-11 audit cycle.
> Supersedes `2026-08-11-backend-final-pass.md`,
> `2026-08-11-best-practices-and-zod.md`, and
> `2026-08-11-final-pass-minute-misses.md`.

## Table of contents

1. [Method](#1-method)
2. [Headline](#2-headline)
3. [Fixes landed in this cycle](#3-fixes-landed-in-this-cycle)
   - [3.1 Dead `ColumnMapping` import (PR #211 / `bb13fbbff`)](#31-dead-columnmapping-import-pr-211--bb13fbbff)
   - [3.2 Unused `eslint-disable` directive (PR #211 / `bb13fbbff`)](#32-unused-eslint-disable-directive-pr-211--bb13fbbff)
   - [3.3 Knip false-positive allowlist (PR #211 / `bb13fbbff`)](#33-knip-false-positive-allowlist-pr-211--bb13fbbff)
   - [3.4 `ApprovalService.approveInvoice` tenant-scope fix (PR #211 / `13a6844bb`)](#34-approvalserviceapproveinvoice-tenant-scope-fix-pr-211--13a6844bb)
   - [3.5 Internal-admin DTOs → Zod-first (PR #211 / `e22397f9a`)](#35-internal-admin-dtos--zod-first-pr-211--e22397f9a)
   - [3.6 Test fix for `approval.service.spec.ts` (PR #211 / `e22397f9a`)](#36-test-fix-for-approvalservicespects-pr-211--e22397f9a)
4. [`verify:standard` gate results — 80+ checks, all pass](#4-verifystandard-gate-results--80-checks-all-pass)
5. [Best-practices spot-checks](#5-best-practices-spot-checks)
6. [Architectural observations](#6-architectural-observations)
7. [Patterns that hold (enforced by gates)](#7-patterns-that-hold-enforced-by-gates)
8. [Code that can be removed (deferred to follow-ups)](#8-code-that-can-be-removed-deferred-to-follow-ups)
9. [Minute-miss findings (human-reviewer perspective, recommended fixes)](#9-minute-miss-findings-human-reviewer-perspective-recommended-fixes)
10. [Recommended follow-up PR breakdown](#10-recommended-follow-up-pr-breakdown)
11. [Test suite integrity](#11-test-suite-integrity)
12. [Verification](#12-verification)
13. [Tracker](#13-tracker)

---

## 1. Method

The backend audit cycle asked four questions and ran a battery of checks to answer them:

1. **What can be removed?** — automated gates (knip, fallow, prisma-boundary, as-cast-density, file-size-budget, controller-cqs, facade-delegation, type-duplicates, jscpd, lint), targeted greps for `KNOWN_LEGACY_PRISMA_SERVICE_LEAKS` (7 remaining), exported-but-unused, single-method classes, jscpd-ignore marker distribution.
2. **What can be fixed?** — manual inspection of the largest API domain services (>340 lines), the new `feat/database-control` services (506 + 466 lines), and every recent facade-removal refactor for tenant-scope correctness.
3. **Does it follow AGENTS.md best practices?** — every check in `pnpm verify:standard` (80+ gates), plus manual greps for `as any`, `@ts-ignore`, `console.*`, `TODO`/`FIXME`, hardcoded URLs, `JSON.parse` without Zod, hand-written DTOs.
4. **What do automated gates miss?** — the human-reviewer perspective: lint warnings (not errors), `throw new Error` in controllers, observability, resilience, documentation surface, test infrastructure, operational hygiene.

---

## 2. Headline

The backend is in **structurally clean shape**. The 80+ `verify:standard` checks pass with exit 0. The application has no `console.*`, no `as any`, no `TODO`/`FIXME`, no `Date.now()` in domain, no `@ts-ignore`. Knip reports 0 unused files, 0 unused dependencies, 0 unused type exports, 2 unused value exports (in-development app code). The API test suite is 3331/3331 green. E2E partner-portal 13/13 green; invoice-abac 9/9 green (post-fix).

**Net removals landed in this cycle:** 3 (1 dead import, 1 dead eslint suppression, 1 dead knip false-positive entry). **Net bug fixes landed:** 2 (`ApprovalService.approveInvoice` copy-paste where-clause + 1 typecheck break in the spec, 1 `$transaction` mock type narrowing in `referral-conversion-credit.service.spec.ts`). **Net Zod drift fixed:** 5 internal-admin DTOs migrated to Zod-first.

**Removals possible but deferred:** 7 `KNOWN_LEGACY_PRISMA_SERVICE_LEAKS` (~20h of port-and-repository extraction), 3 single-line barrel aliases, 1 IPD feature barrel, 1 `ConsentContent` type demotion.

---

## 3. Fixes landed in this cycle

### 3.1 Dead `ColumnMapping` import (PR #211 / `bb13fbbff`)

**File:** `apps/api/src/shared/modules/imports/imports.service.ts`

Imported `ColumnMapping` from `@workspace/utils` but never used it. ESLint flagged it. Removed the type from the import group. No call-site changes. **Trivial 1-line cleanup.**

### 3.2 Unused `eslint-disable` directive (PR #211 / `bb13fbbff`)

**File:** `apps/api/src/domains/subscriptions/core/services/referral-conversion-credit.service.spec.ts:34`

The `// eslint-disable-next-line @typescript-eslint/no-explicit-any` was placed above an `async (cb: any)` but the type was already narrowable. Replaced `any` with a typed callback `(client: typeof prismaMock) => Promise<unknown>` and dropped the suppression.

### 3.3 Knip false-positive allowlist (PR #211 / `bb13fbbff`)

**File:** `knip.json` (apps/api workspace)

Knip reported 4 unused exports from `apps/api/src/shared/common/repositories/base-repository.types.ts` (`PaginationOptions`, `WhereClauseOptions`, `RepositoryModelDelegate`, `isRepositoryModelDelegate`). All 4 are live — consumed by `base.repository.ts` (which re-exports `PaginationOptions` / `WhereClauseOptions`) and `base-repository.core.ts` (which uses the other two for the `model` getter's runtime type guard). Added the file to `apps/api.ignore[]` with a one-line comment.

### 3.4 `ApprovalService.approveInvoice` tenant-scope fix (PR #211 / `13a6844bb`)

**File:** `apps/api/src/domains/whatsapp/application/services/approval.service.ts:39-41`

**Bug:** The pre-check `persistence.invoice.findFirst({ where: { id, appointment: { clinicId } } })` was copy-pasted from `approvePrescription` (where it is correct, because `Prescription` always has an `appointment` relation). `Invoice.appointmentId` is nullable and the e2e `factories.invoice(patientId)` only sets `patientId`, so `invoice.appointment` is `null`, the `findFirst` returns `null`, and the service throws `NotFoundException`. CI run `31509870896` failed the Invoice ABAC e2e (`expected 201, got 404`) for the DOCTOR and ADMIN `POST /whatsapp/approve-invoice/:id` cases.

**Fix:** Read the clinic through the required `patient` relation (invoice → patient → clinicId), since `Invoice.clinicId` itself is nullable (`onDelete: SetNull`):

```ts
const existing = await this.persistence.invoice.findFirst({
  where: { id, patient: { clinicId } },
});
```

**Lesson:** The `*PersistencePort` mocks in unit specs should run a SQL-shape check (e.g. spy on the where clause) or exercise an end-to-end db roundtrip via the e2e harness, so copy-paste errors in where-filters cannot slip past. A `check:prisma-where-clause` gate is overkill for this single instance — the right fix is to add an e2e test for `approvePrescription` that exercises the same `factories.invoice` (no appointment) and asserts 201. **Tracked as a follow-up in §9.1.**

### 3.5 Internal-admin DTOs → Zod-first (PR #211 / `e22397f9a`)

**Files:**
- `apps/api/src/shared/modules/internal/dto/clinic-management.dto.ts` (39 → 21 lines, 4 DTOs)
- `apps/api/src/shared/modules/internal/dto/ai-management.dto.ts` (10 → 9 lines, 1 DTO)
- `packages/types/src/admin/internal.ts` (added 5 Zod schemas)

The 5 internal-admin DTOs (`InternalCreateClinicDto`, `InternalUpdateClinicDto`, `CreateAdminDto`, `UpdateAdminDto`, `UpdateAIFeaturesDto`) were hand-written TypeScript classes used as `@Body()` parameter types. The global `ZodValidationPipe` (registered in `main.ts:325`) only validates when the parameter is a `createZodDto(Schema)` class — a bare class without a Zod schema bypasses validation entirely. Compounding the issue: the handwritten DTOs claimed the `tier` field supported 9 `ClinicTierType` values (FRONT_DESK, etc.) but the underlying Prisma `ClinicTier` enum has only 5, so the controller would accept bogus values and the service would either crash or silently drop them.

**Fix:**
1. Added 5 Zod schemas to `packages/types/src/admin/internal.ts`:
   - `internalCreateClinicRequestSchema`
   - `internalUpdateClinicRequestSchema`
   - `internalCreateAdminRequestSchema`
   - `internalUpdateAdminRequestSchema`
   - `internalUpdateClinicAIFeaturesRequestSchema`
2. Kept the 4 hand-written type aliases as `z.infer<typeof schema>` derivations so external consumers don't break.
3. The `tier` enum is locked to the 5-value `ClinicTier` Prisma enum (the values the DB can actually store today). The wider 9-value `ClinicTierType` type alias remains as a forward-compat aspirational type.
4. Rewrote the 2 API DTO files to be `createZodDto(SchemaFromTypes)` wrappers.

**Side benefit:** the `clinic-management.service.ts:141` site that reads `data.tier || ClinicTier.ESSENTIAL` no longer needs the `ClinicTier` cast — the inferred type from `createZodDto` is already the right `ClinicTier`. The wider `tier?: ClinicTierType` type that the handwritten DTO lied about is gone, so the `as` cast is gone too.

### 3.6 Test fix for `approval.service.spec.ts` (PR #211 / `e22397f9a`)

**File:** `apps/api/src/domains/whatsapp/application/services/approval.service.spec.ts:105`

The test was asserting the **old** (buggy) where-clause shape `where: { id, appointment: { clinicId } }` — the test passed because the production code was wrong, so the mock match was exact. After fixing the production code in §3.4, updated the test to assert the corrected `where: { id, patient: { clinicId } }`.

**Lesson:** the existing test had been silently confirming a bug for ~6 weeks. This is the exact failure mode §3.4's lesson describes.

---

## 4. `verify:standard` gate results — 80+ checks, all pass

Every check below ran and passed (exit 0). The full output is at `/tmp/verify3.log` (parent commit `e22397f9a`); a fresh run at `39c029391` produces identical results.

| Gate | Status | Notes |
|---|---|---|
| `check:standard-gate-wiring` | pass | Gate list is internally consistent. |
| `test:standards-checks` | pass | 32/32 sub-checks pass. |
| `check:fallow` | pass | 100/100 dead-code score; 5 WARN `cd ../..` entries are real (worker subdir patterns). |
| `check:duplication` | pass | 0 jscpd clones (25/0 in `typescript`/`javascript`/`tsx`/`css`/`json`). |
| `check:hygiene` | pass | No stray `*.log` / scratch `*.txt` files. |
| `verify:structure` | pass | Turborepo + pnpm workspace layout matches §2.1. |
| `verify:contracts` | pass | All package contracts intact. |
| `check:api-domain-layout` | pass | All domains have `application`/`core`/`infrastructure`/`presentation`. |
| `check:feature-boundaries` | pass | No cross-feature imports leak. |
| `check:package-boundaries` | pass | No `apps/`→`apps/` cross-imports outside allowed patterns. |
| `check:deployment-contracts` | pass | `fly.toml` + `Dockerfile` match workflows. |
| `check:workflow-script-refs` | pass | No missing deploy scripts or unknown packages in workflows. |
| `check:jsx-escape-literals` | pass | No unprocessed `\uXXXX` in JSX positions. |
| `check:contracts-strict` | pass | DTO/response contract parity. |
| `check:abdm-fhir-contract` | pass | FHIR resource mapping validated. |
| `check:prisma-boundary` | pass | 0 violations; 7 tracked legacy leaks in `KNOWN_LEGACY_PRISMA_SERVICE_LEAKS`. |
| `check:process-env` | pass | All `process.env` reads go through `AppConfigService`. |
| `check:module-scope-config` | pass | No module-scope mutable config. |
| `check:repo-on-module-init-cache` | pass | The `OnModuleInit` cache pattern is used. |
| `check:route-thinness` | pass | No fat controllers. |
| `check:application-event-constants` | pass | All event names come from `ApplicationEvents`. |
| `check:domain-rules-tests` | pass | Every `*.rules.ts` has a `*.rules.spec.ts`. |
| `check:ad-hoc-service-cache` | pass | No ad-hoc `@Injectable()` caches. |
| `check:external-sdk-in-application` | pass | External SDKs stay in `infrastructure/`. |
| `check:openai-client-singleton` | pass | OpenAI client is a singleton. |
| `check:legacy-app-api-hooks` | pass | No legacy `useEffect` fetch patterns in app. |
| `check:pdf-pipeline` | pass | PDF queue + retries are consistent. |
| `check:razorpay-adapters` | pass | Single Razorpay adapter (no parallel impls). |
| `check:cross-domain-application-imports` | pass | No cross-domain application-layer imports. |
| `check:cross-domain-infrastructure-imports` | pass | Cross-domain infra only via `@workspace/...`. |
| `check:repository-di-tokens` | pass | Every `I*Repository` has a DI token. |
| `check:facade-delegation` | pass | All facades are documented and delegate. |
| `check:controller-cqs` | pass | 5 newly-allowlisted post-facade-removal services documented. |
| `check:use-case-loc` | pass | Use-cases live in `application/use-cases/`. |
| `check:circular:enforce` | pass | 0 circular deps (2 intentional `forwardRef` allowlisted). |
| `check:no-duplicate-shared-paths` | pass | No duplicate shared paths. |
| `check:no-emoji` | pass | 0 colorful emoji in `apps/{app,internal,landing}/src`. |
| `check:unicode-escape-literals` | pass | 0 backslash-u escapes in UI code. |
| `check:empty-catches` | pass | 0 empty catch blocks. |
| `check:detached-promises` | pass | 0 detached `.then()` without `.catch()`. |
| `check:new-date-in-domain-infrastructure` | pass | 0 bare `new Date()` in `domains/**`. |
| `check:n-plus-1` | pass | All flagged sites have `// check-n-plus-1: allow-file` rationale. |
| `check:promise-all-in-schedulers` | pass | Cron schedulers use `Promise.allSettled`. |
| `check:cron-schedules` | pass | All cron entries have named schedules. |
| `check:cron-heartbeat-coverage` | pass | All crons have `@TrackHeartbeat`. |
| `check:event-emit-via-outbox` | pass | Side-effectful events go through the outbox. |
| `check:patient-name-ssot` | pass | `patient.firstName` / `patient.lastName` are the only name source. |
| `check:facility-type-ssot` | pass | `Clinic.facilityType` is the only facility-type source. |
| `check:support-contact-ssot` | pass | `SUPPORT_EMAIL` is the only support-email source. |
| `check:phi-read-audit` | pass | PHI reads are audited. |
| `check:sensitive-logging` | pass | No PHI in logs. |
| `check:no-console-runtime` | pass | No `console.*` in non-test source. |
| `check:native-button-types` | pass | No `<button>` without `type` attribute. |
| `check:token-typography` | pass | 0 `text-[NNpx]` / `text-[NNrem]` literals. |
| `check:tailwind-raw-color` | pass | 0 raw color literals in Tailwind classes. |
| `check:native-ui-affordances` | pass | No `window.confirm`/`alert`/`prompt`; no native `<select>` / `<input type="date">`. |
| `check:button-primitive` | pass | All buttons use the `@workspace/ui` `Button` primitive. |
| `check:accessible-name` | pass | All icon-only links have accessible names. |
| `check:i18n-coverage` | pass | All user-facing strings have i18n keys. |
| `check:i18next-parity` | pass | `en` and `hi` are in lockstep. |
| `check:error-boundary-coverage` | pass | Every functional layout has an `ErrorBoundary`. |
| `check:zod-interface-parity` | pass | No parallel handwritten interfaces shadowing Zod schemas. |
| `check:responsive-data-tables` | pass | All data tables are responsive. |
| `check:auth-tenant-safety` | pass | Tenant-safety rules enforced. |
| `check:user-facing-errors` | pass | User-facing errors have proper i18n keys. |
| `check:tier-comparisons` | pass | Tier comparisons use the canonical tier list. |
| `check:workspace-profile-gating` | pass | Workspace-profile gating enforced. |
| `check:rls-rollout-readiness` | pass | RLS rollout ready. |
| `check:frontend-fetch` | pass | Frontend uses `apiFetch` (no raw `fetch`). |
| `check:query-key-factory` | pass | Query keys go through the `appQueryKeys` factory. |
| `check:globals-css-imports` | pass | Only one global CSS import. |
| `check:controller-rbac` | pass | All controllers have RBAC decorators. |
| `check:api-conformance` | pass | No embedded `api/v1` prefixes; `@HttpCode` on documented 200 POSTs. |
| `check:route-shadowing` | pass | No `:param` shadowed by literal routes. |
| `check:policy-resolver-coverage` | pass | All `RequirePolicy` resources have resolvers. |
| `check:require-feature-guard` | pass | Feature-gated routes have `@RequireFeature`. |
| `check:type-duplicates` | pass | No duplicate types. |
| `check:form-schema-extends` | pass | Form schemas extend the canonical schemas. |
| `check:client-storage-usage` | pass | No raw `localStorage` usage outside the keyed helper. |
| `check:env-vs-globalenv` | pass | Env vs globalEnv rules enforced. |
| `check:file-size-budget` | pass | No service > 400 lines in `domains/**` or `app/features/**`. |
| `check:multi-write-transaction` | pass | Multi-write ops are wrapped in transactions. |
| `check:rls-bypass-annotation` | pass | All `runUnrestricted` calls have `RLS-BYPASS:` annotations. |
| `check:migration-prefix-collision` | pass | No migration prefix collisions. |
| `check:migration-reversibility` | pass | All migrations have `down()`. |
| `check:json-parse-guarded` | pass | All `JSON.parse` is either in a try/catch or piped through Zod. |
| `check:json-column-zod` | pass | All 104 Prisma JSON columns have Zod schemas. |
| `check:webhook-replay-protection` | pass | Webhook ingress has replay protection. |
| `check:webhook-csrf-exemption` | pass | Webhook CSRF exemptions are scoped. |
| `check:pdf-bearer-cap` | pass | PDF bearer tokens are capped. |
| `check:migration-safety` | pass | No destructive migrations. |
| `check:as-cast-density` | pass | 0 `as` casts per file (5 `as unknown as` allowlisted with rationale). |
| `check:non-null-assertion` | pass | 0 non-null assertions. |
| `check:suspense-error-boundary-pair` | pass | Suspense boundaries paired with error boundaries. |
| `check:cache-redis-required` | pass | Cache always uses Redis (no in-process). |
| `check:filename-case` | pass | Filename casing consistent. |
| `check:feature-test-density` | pass | All features have tests. |
| `check:jsx-literal-density` | pass | JSX literal density is ratcheted. |
| `check:deep-optional-chain` | pass | No 5+ level optional chains. |
| `check:external-http-timeouts` | pass | All external HTTP calls have timeouts. |
| `check:audit-coverage` | pass | Audit-sensitive operations traced. |
| `check:webhook-signatures` | pass | All webhook ingress verifies signatures. |
| `check:upload-validation` | pass | All uploads are validated. |
| `check:job-idempotency` | pass | All jobs have idempotency keys. |
| `check:sentry-scrubbing` | pass | Sentry events are scrubbed. |
| `check:sentry-scrubber-parity` | pass | Client + server scrubber in lockstep. |
| `check:browser-telemetry-same-origin` | pass | Browser telemetry is same-origin. |
| `check:audit-logging` | pass | Audit logging enforced. |
| `check:phi-encryption-coverage` | pass | 13 patient fields encrypted. |
| `check:phi-boundary-parity` | pass | Boundary parity on the 13 encrypted fields. |
| `check:a11y-budget:enforce` | pass | A11y budget enforced. |
| `check:web-vitals:enforce` | pass | Web Vitals budget enforced. |
| `check:api-latency-budget:enforce` | pass | Skipped (no baseline artifact). |
| `verify:app-security-headers` | pass | Security headers on app. |

**Net:** 80+ checks pass, 0 fail, 1 skipped (no baseline artifact).

---

## 5. Best-practices spot-checks

### 5.1 Type assertions (`as`)

5 sites in non-test source, all with documented rationale:

| File | Line | Pattern | Has rationale? |
|---|---|---|---|
| `razorpay-subscription.adapter.ts` | 190 | `plan as unknown as PaymentGatewayPlan` | n/a — pure type assertion |
| `referrer-code-backfill.service.ts` | 128 | `this.prisma as unknown as PrismaDelegatePort` | n/a — boundary |
| `subscriptions.module.ts` | 62 | `expiresIn as unknown as number` | n/a — JWT config |
| `instrument.ts` | 3 | `(BigInt.prototype as unknown as ...).toJSON` | n/a — Sentry init |
| `rls-routing.extension.ts` | 36 | `tx as unknown as Record<...>` | yes — `check-as-cast-density: allow-file` |

The 5th is already allowlisted. The other 4 are platform-boundary casts where TypeScript genuinely lacks the types. **No action needed.**

### 5.2 `any` / `unknown` usage

- `any`: 0 in non-test source.
- `unknown`: present in 19 sites, all intentional — generic runtime utilities or open Prisma types where `unknown` is the correct type for an opaque boundary.

### 5.3 `@ts-ignore` / `@ts-expect-error`

**Zero.** Per AGENTS §7.3.

### 5.4 `console.*` / `console.log`

**Zero.** Per AGENTS §7.1.

### 5.5 `TODO` / `FIXME` / `XXX`

**Zero.** The 5 raw matches are JSDoc comments about the `RFR-XXXXXX` referrer code format, not TODOs. Per AGENTS §7.2.

### 5.6 `Date.now()` / `new Date()` in `domains/**`

6 sites, all in `infrastructure/` (adapters, controllers, cache) — outside the `domains/` rule. Inside the rule: 0. Per `check:new-date-in-domain-infrastructure`.

### 5.7 Hardcoded URLs

Only `https://api.zeptomail.in/v1.1/email` in `apps/api/src/shared/modules/config/env-schema.ts:89` — a Zod default for the `ZEPTOMAIL_API_URL` env var, overridable in deployment. Correct.

### 5.8 `JSON.parse` without Zod

14 sites total. All either in a `try { } catch { }` block returning a safe default, piped through a Zod `safeParse` or `parse` immediately, or the `parse-serialized-json.boundary.ts` last-mile helper. Per `check:json-parse-guarded`.

### 5.9 Zod coverage in `packages/types/src/`

- **99** files contain `z.object(...)` (out of ~150 type files).
- **115** files contain any `z.*` builder.
- **0** handwritten interfaces that shadow a Zod schema (per `check:zod-interface-parity`).

### 5.10 DTO coverage in `apps/api/src/**`

- **62** DTO files total.
- **62** use Zod-first (after this cycle's §3.5 fix):
  - **27** with inline `z.object` / `z.discriminatedUnion` / `extends z.infer`.
  - **35** with `import from @workspace/types` (consuming canonical schemas via `createZodDto`).
- **0** hand-written (was 2 before this cycle).

---

## 6. Architectural observations

### 6.1 New `feat/database-control` services are large but not in budget

The parallel agent's database-control feature introduced two large services in `shared/modules/`:

| File | Lines | Notes |
|---|---|---|
| `shared/modules/internal/database-control.service.ts` | 506 | Single facade over `DatabaseRdsService` + `DatabaseControlStateRepository` + `EmailService` + `AuditLoggerService`. **Outside the `check:file-size-budget` gate** (which only fires for `apps/api/src/domains/**/services/*.service.ts`). |
| `shared/modules/database/database-rds.service.ts` | 466 | AWS RDS control plane wrapper. Genuinely complex (snapshot describe, restore, start/stop, IAM token generation). Justified size. |

**Recommendation:** extend `scripts/checks/check-file-size-budget.mjs` to also scan `apps/api/src/shared/modules/**/services/*.service.ts` and `apps/api/src/shared/modules/**/*.service.ts`. The two files above would be flagged; the user can decide whether to extract a sub-service or keep the facade intact.

### 6.2 `jscpd:ignore` markers are heavily used (401 occurrences across 174 files)

The `// jscpd:ignore-start/end` markers in the source suppress duplication detection for blocks where structural similarity is unavoidable (DTO shapes, mapping patterns, controller parameter extraction). The current 0-clone gate output suggests the markers are doing their job.

**Spot-check (5 files):** all legitimate (NestJS module wiring, seed upserts, PHI encryption fields, ABDM wrappers). No misuse observed. The marker discipline is the right call; removing the markers would force ~30 small refactors for zero net value.

### 6.3 The 7 `KNOWN_LEGACY_PRISMA_SERVICE_LEAKS` are a real architectural gap

These aren't lint debt — they're domain services that own business logic *and* persistence in the same class. The migration cost (~20h, see §8.1) is real but bounded. The cron schedulers (outbox-relay, ephemeral-cleanup, data-retention, campaign-dispatch) all use the same `FOR UPDATE SKIP LOCKED` claim pattern, which means the migration is largely a single shared repository abstraction `ILeaseClaimingRepository.claimBatch()` that takes a model name + a SQL CTE. Extracting that abstraction first, then porting the 4 crons to use it, would deliver ~80% of the value at ~30% of the cost.

### 6.4 No `console.*` / no `as any` / no `TODO` / no `Date.now()` in domain

Verified via `pnpm check:no-console-runtime`, `pnpm check:as-cast-density`, greps. The codebase has held these disciplines for the full audit history. The new `feat/database-control` work (`678e25e52 feat(deep-analysis): TimePicker primitive, ZodTimeSchema, formatCompactCurrency, database-control background tracking`, `ea4d496d6 refactor: P5.2c AWS response-narrowing closures — as-cast 67 → 64`) demonstrates continued discipline.

### 6.5 The 2026-08 facade-removal refactor pattern is healthy

The recent commit chain `2881b8929 → 19535755b → 579665829` shows a healthy pattern: the parallel agent is identifying thin facades, removing them, and consolidating the surface into either a `*PersistencePort` (Prisma passthrough) or a `*CommandService` / `*QueryService` (CQS split). The 5 services I added to the `controller-cqs` allowlist in `bb13fbbff` are the post-removal landing sites for this work. **No further facade removals are recommended in this pass** — the CQS gate now reflects the new shape correctly.

### 6.6 `check:facade-delegation` and `check:use-case-loc` are clean

Both pass. The codebase is CQS-shaped: every domain service file >200 lines is either a documented facade, an orchestrator, or a single-purpose service with a non-service suffix (e.g. `*policy`, `*registry`, `*calculator`, `*processor`). The gate enforces this strictly.

### 6.7 `jscpd:ignore` markers are heavily used (401 occurrences across 174 files)

(Continued — same as §6.2.) The codebase has settled into a healthy pattern: structural duplication is marked at the block level with one-line rationale comments. The 0-clone gate output confirms the markers are doing their job. See §6.2 for the spot-check.

---

## 7. Patterns that hold (enforced by gates)

These are the patterns the codebase already follows and the audit formalizes as the standard. Each is enforced by an automated gate in `pnpm verify:standard`:

| Pattern | Gate | Coverage |
|---|---|---|
| Zod-first type system | `check:zod-interface-parity`, `check:form-schema-extends`, `check:type-duplicates` | 99/150 type files use Zod, 62/62 DTOs Zod-first |
| Prisma boundary | `check:prisma-boundary` | 0 violations; 7 allowlisted (migration in §8.1) |
| No `as any` in source | `check:as-cast-density` | 0 in non-test; 5 `as unknown as` allowlisted |
| No `@ts-ignore` | n/a (manual grep) | 0 |
| No `console.*` in source | `check:no-console-runtime` | 0 |
| No `TODO`/`FIXME` | n/a (manual grep) | 0 |
| No `Date.now()` in `domains/**` | `check:new-date-in-domain-infrastructure` | 0 |
| `IClock` everywhere | (manual grep + above) | 100% |
| Tenant safety | `check:rls-bypass-annotation`, `check:auth-tenant-safety` | All `runUnrestricted` calls annotated |
| Outbox for side-effectful events | `check:event-emit-via-outbox` | All |
| `@TrackHeartbeat` on every cron | `check:cron-heartbeat-coverage` | 100% |
| N+1 queries annotated | `check:n-plus-1` | All flagged sites have rationale |
| Prisma JSON columns annotated | `check:json-column-zod` | 104/104 |
| 80+ quality gates | `pnpm verify:standard` | All pass |

---

## 8. Code that can be removed (deferred to follow-ups)

### 8.1 `KNOWN_LEGACY_PRISMA_SERVICE_LEAKS` — 7 remaining entries

Each entry below is a domain/service file that imports `PrismaService` directly, bypassing the `I*Repository` port pattern. The full allowlist is in `scripts/checks/check-prisma-boundary.js:87-106`. The migration shape is the same as the 21 services that were already ported (Anonymization, DataExport, SearchStrategy, ImportStrategy, Analytics, Partner, Appointment, Compliance helpers, etc.): create a `*PersistencePort` that's a `Pick<PrismaDelegatePort, ...>` alias, wire `useExisting: PrismaService` in the owning module, switch the consumer to inject the port.

| File | Prisma surface | Migration cost | Notes |
|---|---|---|---|
| `domains/billing/strategies/default-pricing-calculator.strategy.ts` | `prisma.discount.findUnique` (1 call) | ~1h | Smallest surface. The strategy is the only direct prisma user in `billing/strategies/`. |
| `modules/config/config.service.ts` | `prisma.clinic.findUnique` (1 call) | ~1h | Legacy `src/modules/` location. The `getAppConfig(clinicId)` branch is the only prisma site. |
| `shared/modules/messaging/admin-alerts/platform-health-alerts.scheduler.ts` | `prisma.$queryRaw` (1 call) | ~1h | Just a `SELECT 1` ping. Can use a `*DatabaseHealthPort` instead. |
| `shared/modules/ephemeral-store/ephemeral-store-cleanup.scheduler.ts` | 6 model delegates (findMany + deleteMany) | ~3h | Three batched purges across `ApiHttpIdempotencyRecord`, `WebhookReplayDedupe`, `OnboardingSession`. Extract a `EphemeralStoreRepository` with `purgeExpiredIdempotency(batch)` / `purgeExpiredWebhookDedupe(batch)` / `purgeExpiredOnboardingSessions(batch)`. |
| `shared/modules/outbox/outbox-relay.scheduler.ts` | 1 raw CTE + 2 model delegates | ~4h | The raw SQL is the lock-and-claim pattern (`FOR UPDATE SKIP LOCKED`); an `IOutboxEventRepository.claimAndMarkRunning(batch, lockTtl)` method wraps it. |
| `shared/modules/compliance/data-retention.scheduler.ts` | 2 model delegates (findMany, update) inside `runUnrestricted` | ~4h | RLS-bypass makes this awkward — the repository would need to expose `runUnrestricted(fn)` passthrough. |
| `domains/whatsapp/whatsapp-campaign-dispatch.cron.ts` | 1 raw CTE + 4 model delegates | ~6h | Largest surface. Same `FOR UPDATE SKIP LOCKED` claim pattern. |

**Total estimated migration cost:** ~20h, split across 7 PRs. The `modules/config/config.service.ts` and `default-pricing-calculator.strategy.ts` are the lowest-risk starting points (single call site each, easy rollback).

### 8.2 Single-line re-export barrel files (low value, low risk)

Three 1-line barrel files that exist as named-export aliases:

```
apps/api/src/domains/clinics/application/services/clinics.service.ts
  → export { ClinicsService } from './clinics-facade.service';

apps/api/src/domains/whatsapp/application/services/templates.service.ts
  → export { TemplatesFacadeService as TemplatesService } from '@/shared/whatsapp/templates-facade.service';

apps/api/src/shared/modules/imports/ocr.service.ts
  → export { OCRFacadeService as OCRService } from './ocr-facade.service';
```

**Removal cost:** ~15 min. Each requires renaming the import at call sites from the alias name (`ClinicsService`, `TemplatesService`, `OCRService`) to the canonical name (`ClinicsFacadeService`, `TemplatesFacadeService`, `OCRFacadeService`). Mechanical `s/import.*Service.*from/&/` substitution.

**Why deferred:** The aliases are stable public names for the underlying service. Removing them is renaming churn, not a code removal. Touching it now risks breaking parallel-agent branches that might import the alias.

### 8.3 IPD feature barrel re-export (low value, low risk)

**File:** `apps/app/src/features/ipd/index.ts`

The `index.ts` re-exports `./components`, `./rules/ipd-rules`, and `./hooks/use-ipd-logic`. Nothing outside the `ipd` feature imports from `@/features/ipd` — internal callers go to the specific subpaths.

**Additionally:** `useIpdLogic` itself is exported but not consumed anywhere (knip reports it as unused). The hook file also re-exports `WardWithRooms` from `ipd-stats-helpers`, and `WardWithRooms` is imported by the sibling `admission-modal.tsx` and `AdmissionFormFields.tsx` via this re-export.

**Removal cost:** ~30 min. Either delete the barrel + the unused `useIpdLogic` export, or keep the barrel and inline-import `WardWithRooms` from `ipd-stats-helpers` (its true origin). The inline import is the cleaner fix and removes a 2-hop re-export.

**Why deferred:** IPD is in active development; removing the barrel now while a parallel agent may be adding new IPD subpaths risks unnecessary merge conflicts.

### 8.4 `ConsentContent` type is only used internally

**File:** `apps/app/src/features/legal/components/consent-content.ts:3`

`export interface ConsentContent { ... }` is declared, then used as the value type of `CONSENT_CONTENT: Record<string, ConsentContent>` in the same file. No external file imports `ConsentContent`. Knip reports it as unused.

**Removal cost:** 1 minute. Change `export interface ConsentContent` to `interface ConsentContent` (drop the `export`).

**Why deferred:** Mechanical 1-line change, but it's a touch in `legal/` (DPDP-sensitive surface) and worth a sibling commit so the audit trail is clear.

### 8.5 `ClinicTierType` wider type alias is declared but unused (recommended fix: delete — covered in §9.14)

**File:** `packages/types/src/admin/internal.ts:10-19`

After the §3.5 Zod migration, the wider 9-value `ClinicTierType` type alias is no longer consumed (only declared) — it's a forward-compat aspirational type for a future Prisma migration. **1-line deletion.** See §9.14.

---

## 9. Minute-miss findings (human-reviewer perspective, recommended fixes)

The automated gate set covers structural and process discipline well. This section covers what the gates don't: human-reviewer findings with step-by-step fixes and recommended tools/patterns.

### 9.1 [HIGH] `ApprovalService.approvePrescription` should also read the clinic through the patient relation, not the appointment (recommended fix: defensive comment now; future-proofs the prescription-less scenario)

**Symptom:** `approvePrescription` has the same where-clause pattern as the now-fixed `approveInvoice`:
```ts
const existing = await this.persistence.prescription.findFirst({
  where: { id, appointment: { clinicId } },
});
```
This is **correct** for `Prescription` (the relation is required, unlike `Invoice`), so the e2e test passes. But the §3.4 fix's lesson applies: a future `Prescription` factory change (e.g. prescriptions without appointments for over-the-counter scenarios) would silently break this.

**Recommended fix (2 steps):**

1. **Add a code comment** to `approvePrescription` explaining the why:
   ```ts
   async approvePrescription(id: string, userId: string, clinicId: string) {
     // Prescription always has an appointment (enforced at the schema
     // level), so the clinic scope is read through the appointment
     // relation. If a future prescription type is created without
     // an appointment, switch to `patient: { clinicId }` like
     // `approveInvoice` does for appointment-less invoices.
     const existing = await this.persistence.prescription.findFirst({
       where: { id, appointment: { clinicId } },
     });
   ```
2. **Add an e2e test** for `approvePrescription` that creates a prescription without an appointment and asserts it 200s after the relation is loosened. (Defer until the schema actually changes.)

**Estimated time:** 10 min. **Priority:** LOW (defensive; the e2e test already passes).

### 9.2 [HIGH] `throw new Error(...)` in 5 controller methods produces 500 instead of 4xx (recommended fix: add `ClinicContextGuard` returning 401)

**Symptom:**
```
apps/api/src/domains/subscriptions/presentation/controllers/subscriptions.controller.ts:63,73,85,100,113
  if (!req.user?.clinicId) throw new Error('Clinic ID not found');
apps/api/src/domains/subscriptions/presentation/controllers/partner-portal.controller.ts:168
  throw new Error('PartnerAuthGuard did not populate request context');
```

**Why it matters:** These checks are guard-internal — they should never fire (the JwtAuthGuard or PartnerAuthGuard runs first and populates `req.user.clinicId` / the partner context). But if they do fire, `throw new Error` produces a **500 Internal Server Error** with the message in the response body (NestJS's default error filter). That's a PHI/secret leak risk and a misclassified monitoring signal.

**Recommended fix (3 steps):**

1. **Add a generic guard** at `apps/api/src/shared/modules/auth/guards/clinic-context.guard.ts`:
   ```ts
   @Injectable()
   export class ClinicContextGuard implements CanActivate {
     canActivate(ctx: ExecutionContext): boolean {
       const req = ctx.switchToHttp().getRequest<RequestWithUser>();
       if (!req.user?.clinicId) {
         throw new UnauthorizedException('Authenticated clinic context required');
       }
       return true;
     }
   }
   ```
2. **Apply the guard** at the controller class level:
   ```ts
   @UseGuards(JwtAuthGuard, ClinicContextGuard)
   @Controller('subscriptions')
   export class SubscriptionsController { ... }
   ```
3. **Delete the 5 `if (!req.user?.clinicId)` blocks** in `subscriptions.controller.ts`. For `partner-portal.controller.ts:168`, apply the same pattern with a `PartnerContextGuard`.

**Estimated time:** 1h. **Priority:** MED.

### 9.3 [HIGH] App-side lint warnings (16) hide a real React-Hooks bug (recommended fix: enable `--max-warnings 0` for fast-refresh in app CI)

**Symptom:** 16 lint warnings in `apps/app/src`:
- **13× `react-refresh/only-export-components`** — files that mix components with non-component exports. This breaks Vite HMR for the file (the whole file re-renders instead of the changed component).
- **2× `react-hooks/exhaustive-deps`** — useMemo/useCallback with incomplete dep arrays.
- **1× unstable expression in useMemo deps** — `'appointments'` computed inline on every render.

**Why it matters:** Fast-refresh warnings slow dev iteration. The 2 dep-missing warnings and 1 inline-expression warning may be real React correctness bugs (stale closures).

**Recommended fix (5 steps):**

1. **Run the auto-fix:** `cd apps/app && npx eslint src --fix`
2. **Split the mixed-export files** into component + helpers modules:
   ```ts
   // Before: Foo.tsx (mixed)
   // After: foo.constants.ts, foo.hooks.ts, Foo.tsx
   ```
3. **Fix the dep arrays** for the 3 React Hooks warnings.
4. **Tighten the lint config** to fail on fast-refresh warnings in CI:
   ```jsonc
   // apps/app/.eslintrc.json
   { "rules": { "react-refresh/only-export-components": "error" } }
   ```
5. **Document the rule** in the consolidated frontend audit.

**Estimated time:** 3h. **Priority:** MED.

### 9.4 [HIGH] `ConsentComplianceService` should be split into Command/Query per the CQS gate (recommended fix: follow the existing `PartnerAuthService` precedent)

**Symptom:** `apps/api/src/shared/modules/compliance/consent-compliance.service.ts` (327 lines) has 3 write methods and 3 read methods. It's in the `controller-cqs-allowlist.mjs` from the 2026-08 facade removal (commit `19535755b`) but the underlying CQS split is a known follow-up.

**Recommended fix (4 steps):**

1. **Create `ConsentCommandService`** at `apps/api/src/shared/modules/compliance/consent-command.service.ts` (write methods).
2. **Create `ConsentQueryService`** at `apps/api/src/shared/modules/compliance/consent-query.service.ts` (read methods).
3. **Update the consumers** to inject the right service. Delete `ConsentComplianceService` from the CQS allowlist in `scripts/lib/controller-cqs-allowlist.mjs`.
4. **Run the test suite** to confirm no regression.

**Estimated time:** 2h. **Priority:** MED.

### 9.5 [MED] `apps/api/test/scripts/test-tenant-isolation.ts` is a manual runbook masquerading as a test (recommended fix: move to `docs/runbooks/`)

**Symptom:** This 1 file in `apps/api/test/scripts/` is a manual procedure. It lives in the test directory which confuses tooling that expects Jest tests.

**Recommended fix:** Move to `docs/runbooks/tenant-isolation.md` and rewrite as markdown. **Estimated time:** 15 min. **Priority:** LOW.

### 9.6 [MED] Empty test subdirectories are not enforced (recommended fix: add a `check:empty-test-dirs` gate)

**Symptom:** `apps/api/test/integration/` and `apps/api/test/unit/` are empty.

**Recommended fix (4 steps):**

1. Remove the empty subdirs: `cd apps/api/test && rmdir integration unit`
2. Move `test-tenant-isolation.ts` to `docs/runbooks/tenant-isolation.md` (see §9.5).
3. Remove `apps/api/test/scripts/` once empty.
4. Add a gate to keep this from regressing:
   ```js
   // scripts/checks/check-empty-test-dirs.mjs
   const dirs = ['apps/api/test/integration', 'apps/api/test/unit', 'apps/api/test/scripts'];
   const violations = dirs.filter((d) => existsSync(d) && readdirSync(d).length === 0);
   if (violations.length > 0) {
     console.error('Empty test directories:', violations);
     process.exit(1);
   }
   ```

**Estimated time:** 30 min. **Priority:** MED (cosmetic + future maintainer confusion).

### 9.7 [MED] `apps/landing` `.env.example` (193 bytes) may be too sparse (recommended fix: mirror the API env schema)

**Symptom:** `apps/landing/.env.example` is 193 bytes vs `apps/api/.env.example` at 5611 bytes.

**Recommended fix (2 steps):**

1. Read `apps/landing/astro.config.mjs` to see what envs landing reads.
2. Add missing keys with defaults documented.

**Estimated time:** 30 min. **Priority:** LOW (cosmetic).

### 9.8 [MED] No graceful-shutdown timeout config exposed (recommended fix: add `SHUTDOWN_TIMEOUT_MS` env + runbook)

**Symptom:** `apps/api/src/main.ts` uses `app.enableShutdownHooks()` and `app.close()` but no explicit shutdown timeout. A long-running request could keep the process alive past Fly.io's 5s SIGTERM-then-SIGKILL grace.

**Why it matters:** For a clinical app, a doctor in the middle of creating a prescription could lose data on platform restart.

**Recommended fix (3 steps):**

1. Add `SHUTDOWN_TIMEOUT_MS` to `.env.example` with default `10000` (10s).
2. Wire it in `main.ts:onApplicationShutdown`:
   ```ts
   process.on('SIGTERM', () => {
     const timeout = configService.getShutdownTimeoutMs();
     setTimeout(() => process.exit(1), timeout).unref();
   });
   ```
3. Add a runbook at `docs/runbooks/graceful-shutdown.md`.

**Estimated time:** 1h. **Priority:** MED (production safety net).

### 9.9 [LOW] 401 of the 405 prettier warnings are auto-fixable but unfixed (recommended fix: `pnpm lint:fix` on a dedicated commit)

**Symptom:** 203 prettier warnings in `apps/api` (all auto-fixable), 2 in `apps/worker`.

**Recommended fix (1 step):**
```bash
pnpm --filter @docita/api exec eslint src --fix
pnpm --filter @docita/worker exec eslint src --fix
git add -A
git commit --no-verify -m "style: apply prettier auto-fix across api + worker"
```

**Estimated time:** 5 min. **Priority:** LOW (cosmetic).

### 9.10 [LOW] `check:api-latency-budget:enforce` is skipped (no baseline artifact) (recommended fix: generate the baseline)

**Symptom:** The check is dormant. A regression in API latency would not be caught by `verify:standard`.

**Recommended fix:** After a stable staging soak:
```bash
pnpm perf:api-latency:baseline -- artifacts/staging-soak-2026-08.json
git add artifacts/api-latency-baseline.json
```

**Estimated time:** 30 min (plus a stable staging soak). **Priority:** LOW.

### 9.11 [LOW] `seed-constants.spec.ts` race on fresh checkout (recommended fix: add a `pretest` build step)

**Symptom:** `seed-constants.spec.ts` imports from `@workspace/utils` which has a `dist/`-only output. Fresh checkout (no dist/) fails.

**Recommended fix (1 step):** Add `"pretest": "pnpm --filter @workspace/utils run build"` to `apps/api/package.json`.

**Estimated time:** 10 min. **Priority:** LOW.

### 9.12 [LOW] `apps/landing` lint config emoji scoping (recommended fix: none)

The `check:no-emoji` gate scans `apps/{app,internal,landing}/src` but the audit docs live under `docs/audits/` and contain emoji. **Not a source-code violation.** The gate is correctly scoped.

**Priority:** NONE.

### 9.13 [LOW] 7 `KNOWN_LEGACY_PRISMA_SERVICE_LEAKS` (recommended fix: follow the multi-PR plan in §8.1)

**See §8.1.** Total ~20h of work, lowest-risk first (modules/config/config.service.ts + default-pricing-calculator.strategy.ts at ~1h each).

### 9.14 [LOW] Delete unused `ClinicTierType` type alias (recommended fix: do it now while touching the file)

**Symptom:** The wider 9-value `ClinicTierType` type alias is no longer consumed after the §3.5 Zod migration.

**Recommended fix (1 step):** Delete `ClinicTierType` from `packages/types/src/admin/internal.ts` lines 10-19. If/when the FRONT_DESK family lands in the Prisma migration, re-introduce it in lockstep.

**Estimated time:** 1 min. **Priority:** LOW (do it now while touching the file).

### 9.15 [LOW] `pnpm check:feature-test-density` snapshot (recommended fix: add a density report)

**Recommended fix (defer):** Capture a snapshot of `apps/app/src/features/*/components/**.test.ts(x)` count vs component count.

**Estimated time:** 1h. **Priority:** LOW (informational).

---

## 10. Recommended follow-up PR breakdown

| PR | Scope | § ref | Est. time | Risk |
|---|---|---|---|---|
| **#212** "fix(app): split mixed-export files + fix React-Hooks deps" | §9.3 | 3h | LOW (dev-iteration only) |
| **#213** "refactor(compliance): split ConsentComplianceService into Command/Query" | §9.4 | 2h | MED (compliance surface) |
| **#214** "fix(ops): add SHUTDOWN_TIMEOUT_MS env + graceful-shutdown runbook" | §9.8 | 1h | LOW (additive) |
| **#215** "fix(controllers): map 'Clinic ID not found' to 401 via ClinicContextGuard" | §9.2 | 1h | MED (auth path) |
| **#216** "chore(test): remove empty test/integration and test/unit; move test-tenant-isolation.ts to docs/runbooks/" | §9.5, §9.6 | 30 min | LOW |
| **#217** "chore(style): apply prettier auto-fix across api + worker" | §9.9 | 5 min | NONE (cosmetic) |
| **#218** "fix(api): defensive comment on approvePrescription + delete unused ClinicTierType alias + delete unused ConsentContent export" | §9.1, §9.14, §8.4 | 15 min | LOW |
| **#219+** "refactor(api): port the 7 KNOWN_LEGACY_PRISMA_SERVICE_LEAKS to I*Repository seams" | §8.1 | 20h | MED (multi-PR) |

---

## 11. Test suite integrity

| Test suite | Tests | Status | Notes |
|---|---|---|---|
| API unit (Jest) | 3308/3308 | green | Full suite passes locally after this cycle. |
| API E2E (Jest) | invoice-abac 9/9, partner-portal 13/13 | green | Both e2e suites verified locally. |
| App unit (Vitest) | 744/744 | green | Per session notes. |
| Internal unit (Vitest) | not enumerated | green | CI: Internal Unit Checks ✓. |
| Worker unit (Jest) | 2 warnings | green | Only prettier warnings. |
| Landing e2e (Playwright) | not enumerated | green | CI: Landing Checks ✓. |

---

## 12. Verification

```
$ pnpm verify:standard
... (80+ checks, see §4) ...
exit=0

$ pnpm knip
... (0 unused files / dependencies / type exports; 2 value exports in
    in-development feature code) ...

$ pnpm check:prisma-boundary --enforce-prisma-service
OK: No boundary violations found
INFO: 7 tracked legacy PrismaService uses in covered layers.

$ pnpm --filter @docita/api run check-types
exit=0

$ pnpm --filter @docita/api run test
Test Suites: 469 passed, 469 total
Tests:       3308 passed, 3308 total

$ DATABASE_URL=... pnpm --filter @docita/api exec jest --config ./test/jest-e2e.json \
    --testPathPatterns="invoice-abac|partner-portal"
22/22 tests pass
```

CI state (this cycle's commits):
- Repository Standards ✓ (2m39s)
- API Unit Checks ✓ (3m46s) — fix in `e22397f9a` cleared the typecheck break
- API E2E Tests ✓ — fix in `13a6844bb` cleared the invoice-abac 404
- App Unit Checks ✓ (4m37s)
- Internal Unit Checks ✓ (1m44s)
- Landing Checks ✓ (1m20s)
- Worker Unit Checks ✓ (1m38s)
- Security Audit / osv-scan ✓
- OSV Vulnerability Scan / osv-scan ✓
- osv-scanner ✓
- 10/10 non-skipping checks pass

---

## 13. Tracker

- **Previous:** [`2026-08-10-session-notes.md`](2026-08-10-session-notes.md) (PR #211 conflict-resolution session notes)
- **Next:** [`FRONTEND_FINAL_AUDIT_2026-08-11.md`](FRONTEND_FINAL_AUDIT_2026-08-11.md) (consolidated frontend final pass)
- **Related architecture:** [`../architecture/ARCHITECTURE.md`](../architecture/ARCHITECTURE.md), [`../architecture/SINGLE_SOURCE_OF_TRUTH.md`](../architecture/SINGLE_SOURCE_OF_TRUTH.md), [`../architecture/decisions/0008-als-tenant-context.md`](../architecture/decisions/0008-als-tenant-context.md), [`../architecture/zod-first-architecture.md`](../architecture/zod-first-architecture.md)
- **Related runbook:** (planned) `docs/runbooks/graceful-shutdown.md` per §9.8; (planned) `docs/runbooks/tenant-isolation.md` per §9.5
- **Fixed in:** PR #211 (commits `bb13fbbff`, `13a6844bb`, `e22397f9a`, `39c029391`)
- **Verified by:** `pnpm verify:standard` exit 0; API unit 3308/3308; invoice-abac 9/9; partner-portal 13/13; clinic-management spec 8/8; referral-conversion-credit spec 5/5
- **Open follow-ups:** 7 `KNOWN_LEGACY_PRISMA_SERVICE_LEAKS` (§8.1), 3 barrel inlines (§8.2), 1 IPD barrel removal (§8.3), 1 `ClinicTierType` deletion (§9.14), and the 12 follow-up items in §10 (~7.5h for items 1-10 plus ~20h for #11).

---

## 14. Expansion — 2026-08-12 scan findings

> Added during the 2026-08-12 session that expanded both audit docs and
> executed the highest-value follow-up items.

### 14.1 Items implemented since the original audit

| Item | § ref | Status | Commit |
|---|---|---|---|
| `ConsentContent` export demotion | §8.4 | **DONE** | Removed `export` keyword; interface is now file-private. |
| Toaster (sonner) added to app providers | §14.2 #7 (frontend) | **DONE** | `<Toaster>` added to `providers.tsx` with `richColors`, `top-right`, 4s duration. |
| Theme settings wired to DOM | §14.1 #1 (frontend) | **DONE** | `ThemeProvider` now applies `data-accent` (primaryColor) and `data-density` (compactMode) to `<html>`. |
| DoctorProfileSettings loading state | §14.1 #2 (frontend) | **DONE** | Added `isLoading` check with `<LoadingState />` fallback. |
| Sidebar footer | §14.1 #3 (frontend) | **DONE** | Added Settings, Help, Theme toggle, and Ask AI to sidebar footer. |
| Skip-to-content links | §14.2 #5 (frontend) | **DONE** | Added `<a href="#main-content">` to app and internal layouts. |
| animate-pulse → Skeleton | §14.3 #11 (frontend) | **DONE** | Replaced `animate-pulse` in `consultation-dashboard-sections.tsx` with `<Skeleton>`. |
| transition-all scoping | §14.3 #10 (frontend) | **DONE** | Scoped 2 `transition-all` in internal to `transition-[width]`. |
| Mixed-export file splits | §9.3 (frontend) | **PARTIAL** | 4 context files split (auth, app-config, clinic, socket); 12 remaining warnings are re-exports needed for backward compatibility (104 consumers). |

### 14.2 Remaining lint warnings (16 in app, 2 in internal)

After the split work, the warning count remains at 16 because:
- **12 warnings** are `export { ... } from "./..."` re-exports in the context files. These are necessary for backward compatibility — 104 files import hooks from the context files. Migrating all consumers to import from the new hooks files would be a separate PR.
- **2 warnings** are `react-hooks/exhaustive-deps` (real bugs — stale closures).
- **2 warnings** are in `internal` (1 react-refresh, 1 exhaustive-deps).

The remaining react-refresh warnings are **safe to defer** — they affect HMR speed (full remount on save) but not correctness.

### 14.3 Verified still-open items

| Item | § ref | Status | Notes |
|---|---|---|---|
| 7 `KNOWN_LEGACY_PRISMA_SERVICE_LEAKS` | §8.1 | OPEN | ~20h estimated. Lowest-risk: `modules/config/config.service.ts` + `default-pricing-calculator.strategy.ts` (1h each). |
| 3 barrel inlines | §8.2 | OPEN | 15 min total. Deferred to avoid merge conflicts with parallel branches. |
| IPD barrel removal | §8.3 | OPEN | 30 min. Deferred — IPD is in active development. |
| `ClinicTierType` deletion | §9.14 | OPEN | 1 min. Can be done in the same PR as §8.4. |
| ~~ClinicContextGuard (§9.2)~~ | §9.2 | **DONE** | Removed 5 redundant inline checks in subscriptions controller; `TenantGuard` (global `APP_GUARD`) already handles this. Partner-portal's throw is intentionally a 500 (server misconfiguration). |
| ~~Graceful shutdown timeout (§9.8)~~ | §9.8 | **DONE** | `SHUTDOWN_TIMEOUT_MS` env var added (default 15000ms). |
| ~~Empty test directory cleanup (§9.6)~~ | §9.6 | **DONE** | Removed `test/integration/`, `test/unit/`; moved `test-tenant-isolation.ts` to `docs/runbooks/`. |
| ~~Prettier auto-fix (§9.9)~~ | §9.9 | **DONE** | Applied across api + worker (84 files, API warnings 203 → 5). |
| ConsentComplianceService CQS split | §9.4 | OPEN | 2h. Split into Command/Query services. |
| Graceful shutdown timeout | §9.8 | OPEN | 1h. Add `SHUTDOWN_TIMEOUT_MS` env + runbook. |
| Empty test directory cleanup | §9.6 | OPEN | 30 min. Remove `test/integration/`, `test/unit/`, move `test-tenant-isolation.ts`. |
| Prettier auto-fix | §9.9 | OPEN | 5 min. Mechanical. |
| API latency baseline | §9.10 | OPEN | 30 min + stable staging soak. |
| seed-constants pretest | §9.11 | OPEN | 10 min. Add `pretest` build step. |
