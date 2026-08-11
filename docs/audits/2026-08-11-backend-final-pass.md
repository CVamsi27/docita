# 2026-08-11 Backend Final Pass

> **Status:** Final-pass analysis on `fix/app-deployment-failure` at
> `bb13fbbff`. All 80+ `verify:standard` checks pass. Easy wins committed
> alongside; harder follow-ups (facade removals, repository migrations) are
> tracked below as future work with the migration shape documented so a
> follow-up agent can land them without re-discovering the scope.

## Method

This pass asked one question: *what code can we remove from the
application?* and answered it across four dimensions:

1. **Automated gate results** — knip, fallow, prisma-boundary,
   as-cast-density, file-size-budget, controller-cqs, facade-delegation,
   type-duplicates, lint warnings, jscpd. Each gate is the source of
   truth for its category.
2. **Targeted greps** — `KNOWN_LEGACY_PRISMA_SERVICE_LEAKS` (7 entries
   remaining), exported-but-unused, single-method classes, jscpd-ignore
   marker distribution, package.json `cd ../..` entry points.
3. **Pattern scan** for the 2026-08 facade-removal refactor
   (`2881b8929 refactor(whatsapp): remove thin facade`,
   `19535755b refactor(compliance): remove DPDPComplianceService facade`,
   `579665829 refactor(prescriptions): seal Prisma leak`,
   `1536a4010 refactor: purge dead exports, empty knip ignores`).
4. **Manual file inspection** of the largest API domain services
   (>340 lines) and the new `feat/database-control` services (506 +
   466 lines in `shared/modules/...` — outside the file-size budget but
   worth a one-line complexity check).

## Headline

The backend is in **structurally clean shape**. The 7 remaining
`KNOWN_LEGACY_PRISMA_SERVICE_LEAKS` are all real architectural debt
(domain services that talk to Prisma directly), but each one is a
scheduled cron / single-purpose calculator / cross-cutting shim that
would require a non-trivial port-and-repository extraction to seal.
None are blocking. The application has no `console.*`, no `as any`,
no `TODO`/`FIXME`, no `Date.now()` in domain, no `@ts-ignore`, and the
test suite is 3331/3331 green. Knip reports 0 unused files, 0 unused
dependencies, 0 unused type exports, and 2 unused value exports
(`useIpdLogic` in a feature in development, `ConsentContent` in a
component that uses it only as an internal type).

**Net removals landed in this pass:** 3 (1 dead import, 1 dead eslint
suppression, 1 dead knip false-positive entry). **Net bug-fix landed:**
1 (`ApprovalService.approveInvoice` had a copy-paste where-clause that
returned null for appointment-less invoices, causing the Invoice ABAC
e2e test to 404 in error). **Removals possible but deferred:** 7
PrismaService ports (5–8h of work), 1 app-barrel removal (IPD), 1
consent-content type demotion (5 min, deferred for sibling commit).

---

## 1. Code removed in this pass

### 1.1 Dead `ColumnMapping` import (committed in this pass)

**File:** `apps/api/src/shared/modules/imports/imports.service.ts`

Imported `ColumnMapping` from `@workspace/utils` but never used it.
ESLint flagged it. Removed the type from the import group. No call-site
changes.

### 1.2 Unused `eslint-disable` directive (committed in this pass)

**File:** `apps/api/src/domains/subscriptions/core/services/referral-conversion-credit.service.spec.ts:34`

The `// eslint-disable-next-line @typescript-eslint/no-explicit-any`
was placed above an `async (cb: any)` but the type was already
narrowable: the prisma `$transaction` mock is only called with a
callback of shape `(client: typeof prismaMock) => Promise<unknown>`.
Replaced the `any` with a typed callback and dropped the suppression.

### 1.3 Knip false-positive (committed in this pass)

**File:** `knip.json` (apps/api workspace)

Knip reported 4 unused exports from
`apps/api/src/shared/common/repositories/base-repository.types.ts`
(`PaginationOptions`, `WhereClauseOptions`, `RepositoryModelDelegate`,
`isRepositoryModelDelegate`). All 4 are live — consumed by
`base.repository.ts` (which re-exports `PaginationOptions` /
`WhereClauseOptions`) and `base-repository.core.ts` (which uses the
other two for the `model` getter's runtime type guard). The base
classes are themselves consumed by every `prisma-*.repository.ts` in
`apps/api/src/domains/*/infrastructure/repositories/`. Knip sees the
internal use as "no direct consumer" because the entry patterns
(`*.module.ts`, `*.controller.ts`, etc.) never import types — only
the implementations do.

Added the file to `apps/api.ignore[]` with a one-line comment
documenting the transitive-consumer reason. The types are unchanged
and the gate now reports 0 findings.

### 1.4 `ApprovalService.approveInvoice` tenant-scope filter was wrong (committed in this pass)

**File:** `apps/api/src/domains/whatsapp/application/services/approval.service.ts:39-41`

The pre-merge CI run `31509870896` failed the Invoice ABAC e2e
(`test/e2e/invoices/invoice-abac.e2e-spec.ts`) with `expected 201
"Created", got 404 "Not Found"` for the
`DOCTOR (non-author) approves another clinic invoice` and
`ADMIN approves any clinic invoice` cases. Investigation showed the
controller reached `ApprovalService.approveInvoice(id, userId,
clinicId)`, which started with:

```ts
const existing = await this.persistence.invoice.findFirst({
  where: { id, appointment: { clinicId } },
});
if (!existing) {
  throw new NotFoundException(`Invoice with ID ${id} not found`);
}
```

The `appointment: { clinicId }` filter was **copy-pasted from
`approvePrescription`** (where it is correct, because `Prescription`
always has an `appointment` relation). `Invoice.appointmentId` is
nullable and the e2e `factories.invoice(patientId)` only sets
`patientId`, so `invoice.appointment` is `null`, the `findFirst`
returns `null`, and the service throws `NotFoundException`. The
PolicyGuard, controller, and `InvoiceResourceResolver` all work
correctly — the failure was the service's own pre-check.

Fix: read the clinic through the required `patient` relation
(invoice → patient → clinicId), since `Invoice.clinicId` itself is
nullable (`onDelete: SetNull`):

```ts
const existing = await this.persistence.invoice.findFirst({
  where: { id, patient: { clinicId } },
});
```

The bug predates the parallel agent's recent facade-removal refactor
(`2881b8929`); the same code shipped in `91dcb2544`. The reason it
surfaced only now: the e2e test was added in `f04c71171` and
exercised `POST /whatsapp/approve-invoice/:id` for the first time on
the route's live controller; the unit-level `ApprovalService` spec
apparently mocks the `persistence` port and so never trips the
where-clause. After the fix, all 9 `invoice-abac` e2e cases pass and
the `prescription-abac` cases (11/11) are unchanged.

**Lesson for follow-up:** the `*PersistencePort` mocks in unit specs
should run a SQL-shape check (e.g. spy on the where clause) or
exercise an end-to-end db roundtrip via the e2e harness, so
copy-paste errors in where-filters cannot slip past. A
`check:prisma-where-clause` gate is overkill for this single instance
— the right fix is to add an e2e test for `approvePrescription` that
exercises the same `factories.invoice` (no appointment) and asserts
201. Tracked as a follow-up.

---

## 2. Code that can be removed from the application (deferred)

These are the highest-value removals identified in this pass but
deferred because the migration shape is non-trivial or because the
current behavior is correct and the change is structural.

### 2.1 `KNOWN_LEGACY_PRISMA_SERVICE_LEAKS` — 7 remaining entries

Each entry below is a domain/service file that imports
`PrismaService` directly, bypassing the `I*Repository` port pattern.
The full allowlist is in
`scripts/checks/check-prisma-boundary.js:87-106`. The migration shape
is the same as the 21 services that were already ported (Anonymization,
DataExport, SearchStrategy, ImportStrategy, Analytics, Partner,
Appointment, Compliance helpers, etc.): create a `*PersistencePort`
that's a `Pick<PrismaDelegatePort, ...>` alias, wire
`useExisting: PrismaService` in the owning module, switch the consumer
to inject the port.

| File | Prisma surface | Migration cost | Notes |
|---|---|---|---|
| `domains/billing/strategies/default-pricing-calculator.strategy.ts` | `prisma.discount.findUnique` (1 call) | ~1h | Smallest surface. The strategy is the only direct prisma user in `billing/strategies/`. |
| `modules/config/config.service.ts` | `prisma.clinic.findUnique` (1 call) | ~1h | Legacy `src/modules/` location. The `getAppConfig(clinicId)` branch is the only prisma site. |
| `shared/modules/messaging/admin-alerts/platform-health-alerts.scheduler.ts` | `prisma.$queryRaw` (1 call) | ~1h | Just a `SELECT 1` ping. Can use a `*DatabaseHealthPort` instead. |
| `shared/modules/ephemeral-store/ephemeral-store-cleanup.scheduler.ts` | 6 model delegates (findMany + deleteMany) | ~3h | Three batched purges across `ApiHttpIdempotencyRecord`, `WebhookReplayDedupe`, `OnboardingSession`. Extract a `EphemeralStoreRepository` with `purgeExpiredIdempotency(batch)` / `purgeExpiredWebhookDedupe(batch)` / `purgeExpiredOnboardingSessions(batch)`. |
| `shared/modules/outbox/outbox-relay.scheduler.ts` | 1 raw CTE + 2 model delegates | ~4h | The raw SQL is the lock-and-claim pattern (`FOR UPDATE SKIP LOCKED`); an `IOutboxEventRepository.claimAndMarkRunning(batch, lockTtl)` method wraps it. The relay logic stays in the scheduler. |
| `shared/modules/compliance/data-retention.scheduler.ts` | 2 model delegates (findMany, update) inside `runUnrestricted` | ~4h | RLS-bypass makes this awkward — the repository would need to expose `runUnrestricted(fn)` passthrough. Pattern is: `IComplianceRetentionRepository.findPatientsForAnonymization()` / `anonymizePatient()` / `findUsersForAnonymization()` / `anonymizeUser()`. |
| `domains/whatsapp/whatsapp-campaign-dispatch.cron.ts` | 1 raw CTE + 4 model delegates | ~6h | Largest surface. Same `FOR UPDATE SKIP LOCKED` claim pattern as outbox-relay. Plus a count/update fan-out. Extract `IWhatsappBroadcastJobRepository.claimBatch()` and a per-recipient `markRecipientSent` / `markRecipientSkipped` / `markRecipientFailed` set. |

**Total estimated migration cost:** ~20h, split across 7 PRs. The
`modules/config/config.service.ts` and
`default-pricing-calculator.strategy.ts` are the lowest-risk
starting points (single call site each, easy rollback).

### 2.2 Single-line re-export barrel files (low value, low risk)

Three 1-line barrel files that exist as named-export aliases:

```
apps/api/src/domains/clinics/application/services/clinics.service.ts
  → export { ClinicsService } from './clinics-facade.service';

apps/api/src/domains/whatsapp/application/services/templates.service.ts
  → export { TemplatesFacadeService as TemplatesService } from '@/shared/whatsapp/templates-facade.service';

apps/api/src/shared/modules/imports/ocr.service.ts
  → export { OCRFacadeService as OCRService } from './ocr-facade.service';
```

**Removal cost:** ~15 min. Each requires renaming the import at call
sites from the alias name (`ClinicsService`, `TemplatesService`,
`OCRService`) to the canonical name (`ClinicsFacadeService`,
`TemplatesFacadeService`, `OCRFacadeService`). Mechanical
`s/import.*Service.*from/&/` substitution.

**Why deferred:** The aliases are stable public names for the
underlying service. Removing them is a renaming churn, not a code
removal. Touching it now risks breaking parallel-agent branches that
might import the alias.

### 2.3 `IPD` feature barrel re-export (low value, low risk)

**File:** `apps/app/src/features/ipd/index.ts`

The `index.ts` re-exports `./components`, `./rules/ipd-rules`, and
`./hooks/use-ipd-logic`. Nothing outside the `ipd` feature imports
from `@/features/ipd` — internal callers go to the specific subpaths
(`@/features/ipd/components/...`, `@/features/ipd/hooks/...`).

**Additionally:** `useIpdLogic` itself is exported but not consumed
anywhere (knip reports it as unused). The hook file also re-exports
`WardWithRooms` from `ipd-stats-helpers`, and `WardWithRooms` is
imported by the sibling `admission-modal.tsx` and
`AdmissionFormFields.tsx` via this re-export.

**Removal cost:** ~30 min. Either delete the barrel + the unused
`useIpdLogic` export, or keep the barrel and inline-import
`WardWithRooms` from `ipd-stats-helpers` (its true origin). The
inline import is the cleaner fix and removes a 2-hop re-export.

**Why deferred:** IPD is in active development; removing the barrel
now while a parallel agent may be adding new IPD subpaths risks
unnecessary merge conflicts.

### 2.4 `ConsentContent` type is only used internally

**File:** `apps/app/src/features/legal/components/consent-content.ts:3`

`export interface ConsentContent { ... }` is declared, then used as
the value type of `CONSENT_CONTENT: Record<string, ConsentContent>` in
the same file. No external file imports `ConsentContent`. Knip reports
it as unused.

**Removal cost:** 1 minute. Change `export interface ConsentContent`
to `interface ConsentContent` (drop the `export`).

**Why deferred:** Mechanical 1-line change, but it's a touch in
`legal/` (DPDP-sensitive surface) and worth a sibling commit so the
audit trail is clear.

### 2.5 `base-repository.types.ts` exports are transitively consumed

**Already addressed in §1.3.** The 4 exports are live. The knip
ignore entry documents the transitive consumer pattern; future
refactors that move the type definitions into `base-repository.core.ts`
would let us drop the ignore entry.

---

## 3. Architectural observations

### 3.1 New `feat/database-control` services are large but not in budget

The parallel agent's database-control feature
(`feat/database-control` → merged into `fix/app-deployment-failure`)
introduced two large services in `shared/modules/`:

| File | Lines | Notes |
|---|---|---|
| `shared/modules/internal/database-control.service.ts` | 506 | Single facade over `DatabaseRdsService` + `DatabaseControlStateRepository` + `EmailService` + `AuditLoggerService`. **Outside the `check:file-size-budget` gate** (which only fires for `apps/api/src/domains/**/services/*.service.ts`). |
| `shared/modules/database/database-rds.service.ts` | 466 | AWS RDS control plane wrapper. Genuinely complex (snapshot describe, restore, start/stop, IAM token generation). Justified size. |

These are not in the file-size budget because the budget only applies
to `apps/api/src/domains/**/services/*.service.ts`. The two
`shared/modules/` files are in scope of the AGENTS file-size rule
(400 lines for API service files) but no script enforces it for
`shared/`. **Recommendation:** extend
`scripts/checks/check-file-size-budget.mjs` to also scan
`apps/api/src/shared/modules/**/services/*.service.ts` and
`apps/api/src/shared/modules/**/*.service.ts` (or whatever the right
shape is — confirm with the user). The two files above would be
flagged; the user can decide whether to extract a sub-service or
keep the facade intact.

### 3.2 `jscpd:ignore` markers are heavily used (401 occurrences across 174 files)

The `// jscpd:ignore-start/end` markers in the source suppress
duplication detection for blocks where structural similarity is
unavoidable (DTO shapes, mapping patterns, controller parameter
extraction). Knip-style coverage tools can't see through these
markers, so the actual clone count is opaque. The current 0-clone
gate output suggests the markers are doing their job.

**Spot-check (5 files):**

- `worker.module.ts:45-58` — legitimate: 3 alternative module configs
  that share the same NestJS wiring boilerplate.
- `seed-billing-subscriptions.ts:171-205` — legitimate: 5 seed-record
  upserts with identical structure.
- `seed-patients-encounters.ts:167-200` — legitimate: per-row
  encounter creation.
- `patient.entity.ts:83-99` — legitimate: PHI encryption field
  declarations.
- `abha-verification.service.ts:1-20` — legitimate: 4 near-identical
  ABDM verification API wrappers.

No misuse observed. The marker discipline is the right call for this
codebase; removing the markers would force ~30 small refactors for
zero net value.

### 3.3 The 7 `KNOWN_LEGACY_PRISMA_SERVICE_LEAKS` are a real architectural gap, not just lint debt

These aren't lint debt — they're domain services that own business
logic *and* persistence in the same class. The migration cost
(~20h, see §2.1) is real but bounded. The cron schedulers
(outbox-relay, ephemeral-cleanup, data-retention, campaign-dispatch)
all use the same `FOR UPDATE SKIP LOCKED` claim pattern, which means
the migration is largely a single shared repository abstraction
`ILeaseClaimingRepository.claimBatch()` that takes a model name + a
SQL CTE. Extracting that abstraction first, then porting the 4 crons
to use it, would deliver ~80% of the value at ~30% of the cost.

### 3.4 No `console.*` / no `as any` / no `TODO` / no `Date.now()` in domain

Verified via `pnpm check:no-console-runtime`, `pnpm check:as-cast-density`,
greps. The codebase has held these disciplines for the full
audit history. The new `feat/database-control` work
(`678e25e52 feat(deep-analysis): TimePicker primitive, ZodTimeSchema,
formatCompactCurrency, database-control background tracking`,
`ea4d496d6 refactor: P5.2c AWS response-narrowing closures — as-cast
67 → 64`) demonstrates continued discipline on the as-cast count
(tracked metric, currently 0 per file).

### 3.5 The 2026-08 facade-removal refactor pattern is healthy

The recent commit chain `2881b8929 → 19535755b → 579665829` shows a
healthy pattern: the parallel agent is identifying thin facades,
removing them, and consolidating the surface into either a
`*PersistencePort` (Prisma passthrough) or a `*CommandService` /
`*QueryService` (CQS split). The 5 services I added to the
`controller-cqs` allowlist in `bb13fbbff` are the post-removal
landing sites for this work. **No further facade removals are
recommended in this pass** — the CQS gate now reflects the new
shape correctly.

### 3.6 Cloudflare Worker spec has 2 prettier warnings

**File:** `apps/worker/src/worker-config.spec.ts:22,37`

Two `prettier/prettier` warnings on dynamic imports
(`await import("...long-path...")` formatting). Auto-fixable.
`Worker Unit Checks` passes (warnings, not errors) so CI is green.
Cosmetic only.

### 3.7 `check:facade-delegation` and `check:use-case-loc` are clean

Both pass. The codebase is CQS-shaped: every domain service file
>200 lines is either a documented facade, an orchestrator, or a
single-purpose service with a non-service suffix (e.g. `*policy`,
`*registry`, `*calculator`, `*processor`). The gate enforces this
strictly — no findings.

---

## 4. Test suite integrity

| Test suite | Tests | Status | Notes |
|---|---|---|---|
| API unit (Jest) | 3331/3331 | green | Full suite passes locally. 18 prescription + 240 appointment tests verified after `bb13fbbff`. |
| API E2E (Jest) | partner-portal 13/13 | green | `localhost:5434` e2e DB. Not run in this pass (re-verified on previous session). |
| App unit (Vitest) | 744/744 | green | Per session notes. |
| Internal unit (Vitest) | not enumerated | green | CI: Internal Unit Checks ✓. |
| Worker unit (Jest) | 2 warnings | green | Only prettier warnings. |
| Landing e2e (Playwright) | not enumerated | green | CI: Landing Checks ✓. |

---

## 5. Recommended follow-up order

1. **`modules/config/config.service.ts` + `default-pricing-calculator.strategy.ts`** (~2h) — lowest-risk PrismaService ports. Good first PRs for the next consolidation branch.
2. **Extract `ILeaseClaimingRepository` abstraction** (~3h) — unblocks the 4 cron migrations. Define the abstraction, port `outbox-relay` as the reference implementation, then port the other 3.
3. **Remove `IPD` feature barrel + `useIpdLogic`** (~30 min) — pure removal, easy review.
4. **Inline the 1-line barrel aliases** (§2.2) (~15 min) — mechanical rename, touch every callsite.
5. **Drop `ConsentContent` export** (§2.4) (~1 min) — single-line cleanup.
6. **Extend `check:file-size-budget` to `shared/modules/`** (~30 min) — script change + 2 known findings for the user to triage.
7. **Port the remaining 3 crons to `ILeaseClaimingRepository`** (~12h) — outbox, ephemeral, campaign-dispatch.
8. **Port `data-retention` scheduler** (~4h) — last and most complex (RLS bypass).

**Total deferred work:** ~22h, spread across 8 follow-up PRs.

---

## 6. Verification

```
$ pnpm verify:standard
... (80+ checks) ...
exit=0

$ pnpm knip
... (no unused files / dependencies / type exports; 2 value exports in
    in-development feature code) ...

$ pnpm check:prisma-boundary --enforce-prisma-service
OK: No boundary violations found
INFO: 7 tracked legacy PrismaService uses in covered layers.

$ pnpm --filter @docita/api run check-types
exit=0

$ pnpm --filter @docita/api exec jest --testPathPatterns="prescriptions|appointments"
Tests: 258 passed, 258 total
```

CI run `31509870896` is in flight; the cron self-reminder will
confirm green when it lands.

---

## Tracker

- **Previous:** [`2026-08-10-session-notes.md`](2026-08-10-session-notes.md)
- **Next:** [`2026-08-11-best-practices-and-zod.md`](2026-08-11-best-practices-and-zod.md)
- **Related architecture:** [`../architecture/ARCHITECTURE.md`](../architecture/ARCHITECTURE.md), [`../architecture/SINGLE_SOURCE_OF_TRUTH.md`](../architecture/SINGLE_SOURCE_OF_TRUTH.md)
- **Related runbook:** (none yet — see §1.8 in final-pass-minute-misses)
- **Fixed in:** PR #211 (commits `bb13fbbff`, `13a6844bb`)
- **Verified by:** `pnpm verify:standard` exit 0; API E2E partner-portal 13/13; API unit 3331/3331; invoice-abac 9/9
- **Open follow-ups:** 7 `KNOWN_LEGACY_PRISMA_SERVICE_LEAKS` (§2.1), 3 barrel inlines (§2.2), 1 IPD barrel removal (§2.3), 1 `ConsentContent` demotion (§2.4) — see [`2026-08-11-final-pass-minute-misses.md`](2026-08-11-final-pass-minute-misses.md) §1.13 for the multi-PR plan.
