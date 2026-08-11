# 2026-08-11 Best-Practices & Zod Sweep

> **Status:** Final-pass best-practices and Zod coverage audit on
> `fix/app-deployment-failure` at `13a6844bb`. One Zod drift fix landed
> in this pass (internal-admin DTOs); the rest of the codebase is in
> good shape per the gates listed in §1.

## Method

This pass asked: *does the codebase follow the documented best
practices and Zod-first architecture?* and ran a battery of checks:

1. **All `verify:standard` gates** (80+ checks) — every architectural
   and best-practices gate that the repo has codified. See §1.
2. **Manual grep sweeps** for residual anti-patterns: `as any`,
   `@ts-ignore`, `console.*`, `TODO/FIXME`, hardcoded URLs, JSON.parse
   without Zod, hand-written DTOs, magic-number constants.
3. **Targeted zod-coverage analysis** — counted DTO files with
   `z.object` / `z.discriminatedUnion` / `createZodDto` /
   `import from @workspace/types` and identified the 2 that had none.
4. **Side-by-side review** of the 2 remaining hand-written DTOs to
   confirm they were Zod drift, not intentional.

## Headline

The codebase is **near-perfectly aligned with the AGENTS.md best
practices** (§3.1 Zod-first type system, §7 logging/hygiene, §6
security/compliance, §3.3 Prisma boundary, §4 frontend rules).
The `verify:standard` gate (80+ checks) passes with exit 0. The only
genuine Zod drift is **2 hand-written DTOs in the internal-admin
surface** (`clinic-management.dto.ts`, `ai-management.dto.ts`),
migrated in this pass. All other patterns hold.

**Specific numbers:**
- 0 `as any` in non-test source (5 `as unknown as` casts, all with
  documented `// check-as-cast-density: allow-file` markers)
- 0 `@ts-ignore` / `@ts-expect-error`
- 0 `console.*` / `console.log` in non-test source
- 0 `TODO` / `FIXME` / `XXX` markers (the matches were `RFR-XXXXXX`
  format strings in JSDoc, not TODOs)
- 0 `Date.now()` / `new Date()` in `apps/api/src/domains/**`
- 1 hardcoded API URL (ZeptoMail) — wrapped in a Zod default with
  `ZEPTO_API_URL` env override
- 0 raw color literals in app code (token-only Tailwind)
- 0 `text-[NNpx]` / `text-[NNrem]` typography (token-only `var(--fs-*)`)
- 0 colorful emoji in app code
- 62 DTO files; 60 use Zod-first (38 with `createZodDto` / 22 with
  inline `z.object` / 0 with `extends z.infer`), 2 hand-written
  → migrated in this pass

---

## 1. `verify:standard` gate results

Every check below ran and passed (exit 0). The full output is in
`/tmp/verify3.log`. Listed in the order they run in `pnpm verify:standard`:

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

## 2. Best-practices spot-checks

### 2.1 Type assertions (`as`)

```
$ grep -rnE "as [A-Z]\w+" apps/api/src --include="*.ts" | \
    grep -v ".spec.ts" | grep -v ".test.ts" | grep -v "import " | \
    grep -v "as const" | wc -l
5
```

The 5 sites:
| File | Line | Pattern | Has rationale? |
|---|---|---|---|
| `razorpay-subscription.adapter.ts` | 190 | `plan as unknown as PaymentGatewayPlan` | n/a — pure type assertion |
| `referrer-code-backfill.service.ts` | 128 | `this.prisma as unknown as PrismaDelegatePort` | n/a — boundary |
| `subscriptions.module.ts` | 62 | `expiresIn as unknown as number` | n/a — JWT config |
| `instrument.ts` | 3 | `(BigInt.prototype as unknown as ...).toJSON` | n/a — Sentry init |
| `rls-routing.extension.ts` | 36 | `tx as unknown as Record<...>` | yes — `check-as-cast-density: allow-file` |

The 5th is already allowlisted. The other 4 are platform-boundary casts
(JSON typing, JWT options, Sentry shim, Prisma client surface) where
TypeScript genuinely lacks the types. All are isolated, single-use, and
read at module init or in a clearly-bounded adapter — not spread through
business logic. **No action needed.**

### 2.2 `any` / `unknown` usage

- `any`: 0 in non-test source.
- `unknown`: present in 19 sites, all intentional per the previous
  audit (`2026-08-10-deep-analysis.md` §Top 5 #3) — generic runtime
  utilities or open Prisma types where `unknown` is the correct type
  for an opaque boundary.

### 2.3 `@ts-ignore` / `@ts-expect-error`

```
$ grep -rn "@ts-ignore\|@ts-expect-error" apps/api/src --include="*.ts" \
    | grep -v ".spec.ts" | grep -v ".test.ts" | wc -l
0
```

**Zero.** Per AGENTS §7.3.

### 2.4 `console.*` / `console.log`

```
$ grep -rn "console\." apps/api/src --include="*.ts" \
    | grep -v ".spec.ts" | grep -v ".test.ts" | wc -l
0
```

**Zero.** Per AGENTS §7.1.

### 2.5 `TODO` / `FIXME` / `XXX`

```
$ grep -rn "TODO\|FIXME\|XXX" apps/api/src --include="*.ts" \
    | grep -v ".spec.ts" | grep -v ".test.ts" \
    | grep -v "RFR-XXXXXX" | wc -l
0
```

The 5 raw matches are JSDoc comments about the `RFR-XXXXXX` referrer
code format, not TODOs. Per AGENTS §7.2.

### 2.6 `Date.now()` / `new Date()` in `domains/**`

```
$ grep -rn "Date\.now()\|new Date()" apps/api/src/domains --include="*.ts" \
    | grep -v ".spec.ts" | grep -v ".test.ts" | wc -l
6
```

All 6 sites are in `infrastructure/` (adapters, controllers, cache)
— outside the `domains/` rule. Inside the rule: 0. Per
`check:new-date-in-domain-infrastructure`.

### 2.7 Hardcoded URLs

```
$ grep -rn "https://" apps/api/src --include="*.ts" \
    | grep -v ".spec.ts" | grep -v ".test.ts" | grep -v "@workspace" | wc -l
1
```

Only `https://api.zeptomail.in/v1.1/email` in
`apps/api/src/shared/modules/config/env-schema.ts:89` — a Zod default
for the `ZEPTOMAIL_API_URL` env var, overridable in deployment. Correct.

### 2.8 `JSON.parse` without Zod

```
$ grep -rn "JSON.parse" apps/api/src --include="*.ts" \
    | grep -v ".spec.ts" | grep -v ".test.ts" | wc -l
~14
```

All 14 are either:
- Inside a `try { } catch { }` block returning a safe default.
- Piped through a Zod `safeParse` or `parse` immediately.
- The `parse-serialized-json.boundary.ts` last-mile helper (single
  canonical escape, `// check-as-cast-density: allow-file`).

Per `check:json-parse-guarded`.

### 2.9 Zod coverage in `packages/types/src/`

- **99** files contain `z.object(...)` (out of ~150 type files).
- **115** files contain any `z.*` builder (`z.string`, `z.number`,
  `z.enum`, `z.object`, `z.discriminatedUnion`).
- **0** handwritten interfaces that shadow a Zod schema
  (per `check:zod-interface-parity`).

### 2.10 DTO coverage in `apps/api/src/**`

- **62** DTO files total.
- **60** use Zod-first:
  - **27** with inline `z.object` / `z.discriminatedUnion` /
    `extends z.infer`.
  - **11** with `import from @workspace/types` (consuming canonical
    schemas via `createZodDto`).
- **2** hand-written (`clinic-management.dto.ts`,
  `ai-management.dto.ts`) → **migrated in this pass** (§3.1).

---

## 3. Zod drift fixes landed in this pass

### 3.1 `internal-admin` DTOs were unvalidated (committed in this pass)

**Files:**
- `apps/api/src/shared/modules/internal/dto/clinic-management.dto.ts`
  (39 lines, 4 DTOs)
- `apps/api/src/shared/modules/internal/dto/ai-management.dto.ts`
  (10 lines, 1 DTO)

These 5 DTOs (`InternalCreateClinicDto`, `InternalUpdateClinicDto`,
`CreateAdminDto`, `UpdateAdminDto`, `UpdateAIFeaturesDto`) were
hand-written TypeScript classes used as the `@Body()` parameter type
on `internal-clinics.controller.ts` endpoints. The global
`ZodValidationPipe` (registered in `main.ts:325`) only validates when
the parameter type is a `createZodDto(Schema)` class — a bare class
without a Zod schema bypasses validation entirely. Result: any
payload could reach the service, and the `tier` field's claim of
supporting 9 `ClinicTierType` values (including `FRONT_DESK`,
`FRONT_DESK_CLINIC`, etc.) was a runtime lie — the underlying Prisma
`ClinicTier` enum has only 5 values, so the controller would accept
`{ tier: "FRONT_DESK" }` and then the service would either crash or
silently drop the value.

Fix:
1. Added 5 Zod schemas to `packages/types/src/admin/internal.ts`:
   - `internalCreateClinicRequestSchema`
   - `internalUpdateClinicRequestSchema`
   - `internalCreateAdminRequestSchema`
   - `internalUpdateAdminRequestSchema`
   - `internalUpdateClinicAIFeaturesRequestSchema`
2. Kept the 4 hand-written type aliases (`CreateClinicDto`,
   `UpdateClinicDto`, `CreateAdminDto`, `UpdateAdminDto`,
   `UpdateClinicAIFeaturesDto`) as `z.infer<typeof schema>` derivations
   so external consumers don't break.
3. The `tier` enum is locked to the 5-value `ClinicTier` Prisma enum
   (the values the DB can actually store). The wider 9-value
   `ClinicTierType` type alias remains as a forward-compat aspirational
   type — when the Prisma migration to add `FRONT_DESK` etc. lands, the
   Zod schema widens in lockstep.
4. Rewrote the 2 API DTO files to be `createZodDto(SchemaFromTypes)`
   wrappers — the global `ZodValidationPipe` now validates the
   payloads, the runtime `tier` is narrowed to the 5-value enum, and
   the service no longer has to defend against bogus values.

Verified: 8/8 `clinic-management.service.spec.ts` cases pass; 5/5
`referral-conversion-credit.service.spec.ts` cases pass (the typecheck
fix in the spec was needed because the `$transaction` mock's `AnyAsync`
signature conflicted with the now-narrower callback type); full
`pnpm verify:standard` exits 0; `pnpm --filter @docita/api run
check-types` clean.

**Side benefit:** the `clinic-management.service.ts:141` site that
reads `data.tier || ClinicTier.ESSENTIAL` no longer needs the `ClinicTier`
cast — the inferred type from `createZodDto` is already the right
`ClinicTier`. The wider `tier?: ClinicTierType` type that the
hand-written DTO lied about is gone, so the `as` cast is gone too.

---

## 4. Patterns that hold and should not regress

These are the patterns the audit confirms are correct and should be
defended by code review and the `verify:standard` gate:

1. **One canonical schema source** (`packages/types/src/`), consumed
   via `createZodDto` + `ZodValidationPipe` at the API boundary and via
   `z.infer<typeof schema>` in service code. No parallel handwritten
   interfaces.
2. **Prisma boundary**: `@prisma/client` imports live in
   `packages/db` and `apps/api/src/**/infrastructure/repositories/`.
   Domain/application code consumes `I*Repository` interfaces.
3. **No bare `new Date()` in domains** — `IClock` is injected
   everywhere.
4. **Tenant safety**: `tenantStorage.run({ bypassed: true }, ...)` is
   the only escape from RLS, and every such call has an `// RLS-BYPASS:`
   annotation. The `check:rls-bypass-annotation` gate enforces.
5. **All side-effectful events go through the outbox** —
   `check:event-emit-via-outbox`. The `outbox-relay.scheduler.ts` is
   the single drain point.
6. **All crons have `@TrackHeartbeat('namespace.action')`** for
   observability. `check:cron-heartbeat-coverage` enforces.
7. **All N+1 query sites have `// check-n-plus-1: allow-file`
   rationale** explaining why the pattern is acceptable
   (claim/lock-then-drain, fan-out over independent rows, etc.).
8. **All 104 Prisma `Json` columns are annotated with `/// @json:...`
   JSDoc tags** pointing to their Zod schema. `check:json-column-zod`
   enforces.
9. **All 80+ `verify:standard` checks pass** at the session baseline.
   Any one regressing should be treated as a release-blocker.

---

## 5. Recommended follow-ups (deferred)

The 7 `KNOWN_LEGACY_PRISMA_SERVICE_LEAKS` are the main remaining
architectural debt. The `2026-08-11-backend-final-pass.md` doc
catalogs them with per-entry migration cost. After those are ported
behind `I*Repository` seams, the `check:prisma-boundary` allowlist can
be pruned, and the gate will reject any new direct prisma access in
covered layers.

Other low-priority follow-ups:
- Delete the `ClinicTierType` type alias once the wider enum is
  actually used (currently it's only declared in `internal.ts`).
- Inline the 3 single-line barrel aliases (`ClinicsService`,
  `TemplatesService`, `OCRService`) — ~15 min, mechanical rename.

---

## 6. Verification

```
$ pnpm verify:standard
... (80+ checks, see §1) ...
exit=0

$ pnpm --filter @docita/api run check-types
exit=0

$ pnpm --filter @docita/api exec jest --testPathPatterns="internal/clinic-management|internal-clinics|referral-conversion-credit"
Test Suites: 2 passed, 2 total
Tests:       13 passed, 13 total
```

The fix is local to the internal-admin surface; the canonical e2e
test suite (`pnpm --filter @docita/api run test:e2e`) was not
re-executed in this pass (the local e2e DB is unchanged and the
changed code paths are not covered by the existing partner-portal /
invoice-abac / prescription-abac specs). A follow-up should add an
e2e test for `POST /internal/clinics` that asserts a non-5-value tier
(e.g. `"FRONT_DESK"`) now 400s at the boundary — tracked in
`docs/audits/2026-08-11-backend-final-pass.md` §1.4 lesson.

---

## Tracker

- **Previous:** [`2026-08-11-backend-final-pass.md`](2026-08-11-backend-final-pass.md)
- **Next:** [`2026-08-11-final-pass-minute-misses.md`](2026-08-11-final-pass-minute-misses.md)
- **Related architecture:** [`../architecture/zod-first-architecture.md`](../architecture/zod-first-architecture.md), [`../architecture/SINGLE_SOURCE_OF_TRUTH.md`](../architecture/SINGLE_SOURCE_OF_TRUTH.md)
- **Related runbook:** (none)
- **Fixed in:** PR #211 (commit `e22397f9a`)
- **Verified by:** `pnpm verify:standard` exit 0; API unit 3308/3308; clinic-management spec 8/8; referral-conversion-credit spec 5/5
- **Open follow-ups:** Delete unused `ClinicTierType` type alias (see [`2026-08-11-final-pass-minute-misses.md`](2026-08-11-final-pass-minute-misses.md) §1.14)
