---
name: harden backend and ui
overview: "Fix the real, file-anchored P1 issues uncovered by audit: ~20 tenant-isolation gaps in repositories, PHI-in-logs, an unvalidated controller, a referral race, missing composite indexes, plus the highest-impact UI/UX debt (hardcoded colors, a bare-form, missing aria-labels, primitive consolidation, Origin-style token tweaks). Ship in small reviewable commits on the existing branch."
todos:
  - id: tenant-scope
    content: "Phase 1: scope all repository reads/writes by clinicId across patients, appointments, billing, prescriptions, payment-sessions, inventory; route appointment.service through repository; commit + push"
    status: completed
  - id: phi-logs
    content: "Phase 2: drop PHI from prescription warnings logs and Razorpay signature from payment logs; commit + push"
    status: completed
  - id: inventory-zod
    content: "Phase 3: replace inventory controller Record<string, unknown> bodies with Zod DTOs; commit + push"
    status: completed
  - id: referral-tx
    content: "Phase 4: wrap referral credit application in a transaction with idempotent unique constraint; commit + push"
    status: completed
  - id: db-indexes
    content: "Phase 5: add composite indexes for Invoice / InventoryItem / PaymentSession via new migration; commit + push"
    status: completed
  - id: ui-tokens
    content: "Phase 6a: replace inline hex/rgba in global-error and PatientTagManagerUI with semantic tokens; commit"
    status: completed
  - id: ui-origin-tokens
    content: "Phase 6b: Origin-leaning token refinements + tag color ramp in packages/ui globals.css; commit + push"
    status: completed
  - id: ui-primitives
    content: "Phase 6c: consolidate ad-hoc Table / Loading / Empty / Error into shared primitives in invoices, analytics, consultation, search; commit + push"
    status: completed
  - id: ipd-form-rebuild
    content: "Phase 6d: rebuild ipd admission form on react-hook-form + Form/FormField/FieldRow + zodResolver; commit + push"
    status: completed
  - id: a11y
    content: "Phase 6e: add aria-labels to icon-only buttons (PatientTagManagerUI, FaceSheet); commit + push"
    status: completed
  - id: tests
    content: "Phase 7: add unit/integration tests for tenant guards, referral idempotency, inventory DTO, ipd form, search error path; commit + push"
    status: pending
  - id: verify-final
    content: "Phase 8: run lint + check-types + scoped tests + builds + db:migrate:dry-run; fix any red and push final commit"
    status: completed
isProject: false
---

# Harden Backend, DB, and UI/UX (Evidence-Anchored)

## Context (already verified)

- Branch `fix/consolidate-all-into-one-pr` is clean and pushed; 7 prior commits already shipped form-flow stabilization, tenant-safe Prisma sweep, CSP fix, broad test coverage.
- `pnpm lint`, `pnpm exec turbo run check-types` (17/17 packages) PASS; no TODO/FIXME in app code.
- "Nothing works" is not what the static state shows. The real risks live in repository-layer gaps and a few hot spots — they are now identified concretely.

## Scope decision

- Backend/DB/tests: **deep on the audit findings** (no speculative refactors).
- UI/UX: **token + primitive level**, no page-layout rewrites (lower risk for a PHI app).
- New "features": none invented — instead, plug real holes (Zod DTOs, tenant guards, indexes).
- All work on the current branch `fix/consolidate-all-into-one-pr`. Commits split per concern, pushed as we go.

## Phase 1 — Tenant isolation hardening (P1, biggest risk)

Audit found ~20 repository queries that look up / mutate by raw `id` without `clinicId`. Each is a cross-tenant data leak waiting to happen. Fix pattern: every method accepts (and asserts) `clinicId`, and the Prisma query includes `clinicId` in the `where` clause; deletes/updates that previously used `update({where:{id}})` move to `updateMany`/`deleteMany` keyed on `(id, clinicId)` and assert the affected count.

Files to fix:

- [apps/api/src/domains/patients/infrastructure/persistence/prisma-patient.repository.ts](apps/api/src/domains/patients/infrastructure/persistence/prisma-patient.repository.ts) — `findFirst({where:{id}})` (L21), `updateMany({where:{id}})` (L92), `deleteMany({where:{id}})` (L105).
- [apps/api/src/domains/appointments/infrastructure/persistence/prisma-appointment.repository.ts](apps/api/src/domains/appointments/infrastructure/persistence/prisma-appointment.repository.ts) — L125, L145, L158, L164, L179, L194 (find/update/delete/count + `findMany({patientId})` and `findMany({doctorId,startTime})`).
- [apps/api/src/domains/billing/infrastructure/repositories/prisma.invoice.repository.ts](apps/api/src/domains/billing/infrastructure/repositories/prisma.invoice.repository.ts) — L116, L135, L153.
- [apps/api/src/domains/prescriptions/infrastructure/repositories/prescription.repository.ts](apps/api/src/domains/prescriptions/infrastructure/repositories/prescription.repository.ts) — L97, L163, L170 (prescription) and L177 (`patient.findUnique` for allergies — must scope by `clinicId`).
- [apps/api/src/domains/billing/infrastructure/repositories/prisma.payment-session.repository.ts](apps/api/src/domains/billing/infrastructure/repositories/prisma.payment-session.repository.ts) — L24, L53, L83, L90.
- [apps/api/src/domains/inventory/infrastructure/repositories/prisma-inventory.repository.ts](apps/api/src/domains/inventory/infrastructure/repositories/prisma-inventory.repository.ts) — L55.
- [apps/api/src/domains/appointments/application/services/appointment.service.ts](apps/api/src/domains/appointments/application/services/appointment.service.ts) — L116, L269, L391: route reads through tenant-scoped repository methods instead of bare `prisma.appointment.findFirst`/`prisma.diagnosis.findMany`.

Backstop: an integration test per repository that asserts `clinicId` mismatch returns `NotFound` (never the row).

Commit: `fix(api): scope repository reads/writes by clinicId across patients, appointments, billing, prescriptions, payment-sessions, inventory`.

## Phase 2 — PHI-safe logging + signature redaction

- [apps/api/src/domains/prescriptions/application/services/prescription.service.ts](apps/api/src/domains/prescriptions/application/services/prescription.service.ts) — L182 (allergy warnings keyed to a patient), L200 (medication name in dosage warning). Replace with non-PHI structured fields (`prescriptionId`, `warningType`, `count`).
- [apps/api/src/domains/billing/application/services/payments.service.ts](apps/api/src/domains/billing/application/services/payments.service.ts) — L259: stop logging the Razorpay webhook signature value; log only `signaturePresent: boolean` and the event name.

Commit: `fix(api): drop PHI and webhook signatures from prescription/payment logs`.

## Phase 3 — Boundary validation: inventory controller

- [apps/api/src/domains/inventory/inventory.controller.ts](apps/api/src/domains/inventory/inventory.controller.ts) — L64 / L78 use `@Body() body: Record<string, unknown>`. Replace with `nestjs-zod` `createZodDto()` wrappers around the existing inventory create/update Zod schemas in `packages/types`. If schemas are missing, define them there first (Zod-first rule).

Commit: `fix(api): validate inventory create/update bodies with Zod DTOs`.

## Phase 4 — Race condition fix: referral credits

- [apps/api/src/domains/subscriptions/core/services/referral.service.ts](apps/api/src/domains/subscriptions/core/services/referral.service.ts) — L30 (first-payment count check) and L56 (cap check) move inside a single `prisma.$transaction([...])` with `Serializable` isolation; rely on a unique constraint on `(referrerId, refereeId)` for hard idempotency. Add a focused unit test that simulates two concurrent first-payments.

Commit: `fix(api): make referral credit application transactional and idempotent`.

## Phase 5 — DB index gaps (new migration)

New migration `20260429190000_optimize_hot_query_indexes`:

- [packages/db/prisma/schema.prisma](packages/db/prisma/schema.prisma) — add composite indexes:
  - `Invoice @@index([clinicId, status, createdAt(sort: Desc)])` (L740 area).
  - `InventoryItem @@index([clinicId, active])` and `@@index([clinicId, category])` (L1746 area).
  - `PaymentSession @@index([clinicId, providerSessionId])` (L1243 area).
- Run `pnpm --filter @workspace/db run db:migrate:dry-run` and validate, then generate the migration via `db:migrate`.

Commit: `perf(db): add composite indexes for hot invoice / inventory / payment-session queries`.

## Phase 6 — UI/UX: token + primitive cleanup (Origin-leaning, low risk)

Token drift removal:
- [apps/app/app/global-error.tsx](apps/app/app/global-error.tsx) — replace inline hex/rgba (L20, L21, L31, L60) with semantic tokens / Tailwind classes (`bg-[var(--surface-1)]`, `text-foreground`, `bg-[color-mix(in_oklch,var(--destructive),transparent_88%)]`).
- [apps/app/features/patients/components/details/PatientTagManagerUI.tsx](apps/app/features/patients/components/details/PatientTagManagerUI.tsx) — L66 hex tag palette: move palette to `packages/ui/src/styles/globals.css` as `--tag-1..--tag-8` and consume via tokens; small helper `getTagColorVar(index)`.
- [apps/app/features/patients/components/details/PatientTagManagerContainer.tsx](apps/app/features/patients/components/details/PatientTagManagerContainer.tsx) — L21 default `#3b82f6` -> token.
- [apps/app/lib/services/clinic-feature.service.ts](apps/app/lib/services/clinic-feature.service.ts) — L28 preset tags use the same token names instead of raw hex.
- [apps/app/features/onboarding/components/steps/PaymentStep.tsx](apps/app/features/onboarding/components/steps/PaymentStep.tsx) (L133) and [apps/app/hooks/use-subscription-checkout.ts](apps/app/hooks/use-subscription-checkout.ts) (L107) — Razorpay theme color: read from a CSS-var-resolved value at call time (it's a JS string handed to Razorpay, so resolve `getComputedStyle(document.documentElement).getPropertyValue('--primary')` once).

Origin-style token tweaks (in `packages/ui/src/styles/globals.css`):
- Tighter typography ramp on body (slimmer `--fw-regular: 380` if the font supports variable axis; otherwise leave) and crisper `--lh-tight`.
- Slightly denser default `--density-scale` for `data-density="comfortable"` baseline (only on the protected app shell).
- Add an `--accent-monochrome` ramp so utility chips/badges can flip from saturated to monochrome where appropriate.

Primitive consolidation:
- [apps/app/features/invoices/components/sections/details/InvoiceItemsTableReadOnly.tsx](apps/app/features/invoices/components/sections/details/InvoiceItemsTableReadOnly.tsx) — L18: replace ad-hoc `<table>` with shared `Table` primitive.
- [apps/app/features/analytics/components/charts/chart-helpers.tsx](apps/app/features/analytics/components/charts/chart-helpers.tsx) — L3/L9: drop local `LoadingSpinner`/`EmptyState`, import from `@workspace/ui`.
- [apps/app/features/consultation/components/ConsultationSidebarContainer.tsx](apps/app/features/consultation/components/ConsultationSidebarContainer.tsx) — L23/L50: switch to `DataState` (handles loading/error/empty consistently).

Form rebuild (P1, biggest single UI debt):
- [apps/app/features/ipd/components/forms/admission-form.tsx](apps/app/features/ipd/components/forms/admission-form.tsx) — full rewrite to React Hook Form + `zodResolver` + `<Form>`/`<FormField>`/`<FieldRow>` from `@workspace/ui`, with the existing IPD admission Zod schema in `packages/types`. Keep the visible behaviour identical.

Accessibility:
- [apps/app/features/patients/components/profile/PatientFaceSheetHeaderUI.tsx](apps/app/features/patients/components/profile/PatientFaceSheetHeaderUI.tsx) — L77 add `aria-label="Back"` to icon button.
- [apps/app/features/patients/components/details/PatientTagManagerUI.tsx](apps/app/features/patients/components/details/PatientTagManagerUI.tsx) — L198 (`type="button"` + `aria-label="Clear search"`), L279 ("Save tag"), L287 ("Cancel edit"), L316 ("Delete tag").
- [apps/app/features/search/components/GlobalSearch.tsx](apps/app/features/search/components/GlobalSearch.tsx) — L40 surface `isError` state distinctly from "no results" via `DataState`.

Commits (split for review):
- `style(ui): replace inline hex with semantic tokens in global-error and patient tag manager`.
- `feat(ui): origin-leaning token refinements and tag color ramp`.
- `refactor(app): consolidate ad-hoc table/loading/empty states into shared primitives`.
- `refactor(app): rebuild ipd admission form on react-hook-form + form primitives`.
- `a11y(app): add missing aria-labels and surface error state in global search`.

## Phase 7 — Tests for the changes

- API unit tests: `prisma-patient.repository.spec.ts`, `prisma-appointment.repository.spec.ts`, `prisma.invoice.repository.spec.ts`, `prescription.repository.spec.ts`, `prisma.payment-session.repository.spec.ts`, `prisma-inventory.repository.spec.ts` — for each repository fix, assert `findById(otherClinicId, id)` returns null and `update`/`delete` for cross-tenant id throws `NotFoundException`.
- API unit test: `referral.service.spec.ts` — concurrent first-payments only credit once.
- API unit test: `inventory.controller.spec.ts` — invalid body produces `400` with field errors.
- App vitest: `apps/app/features/ipd/components/forms/admission-form.spec.tsx` — required-field validation + happy submit.
- App vitest: token-drift unit on `getTagColorVar` and the global-search error path.

Commit: `test: cover tenant guards, referral idempotency, inventory dto, ipd form`.

## Phase 8 — Final verification + push

Run, in order, against the touched scope:

```bash
pnpm lint
pnpm exec turbo run check-types
pnpm --filter @docita/api test -- patient appointment invoice prescription payment inventory referral
pnpm --filter @docita/app test
pnpm --filter @workspace/db run db:migrate:dry-run
pnpm --filter @docita/api build
pnpm --filter @docita/app build
```

Fix anything red. Then push the branch.

```bash
git push origin fix/consolidate-all-into-one-pr
```

PR already exists for this branch; new commits land on the open PR — no new PR needed.

## Out of scope (called out explicitly so it does not silently expand)

- New product features beyond plugging the above holes.
- Page-layout / IA restructure to literally mimic Origin (high-risk in PHI app).
- Schema-level normalization changes — every migration in `packages/db/prisma/migrations/` is forward-only and the schema is already mature; touching shape requires its own dedicated PR with backfills, which a "do everything" pass cannot safely include.
- Re-enabling the still-skipped E2E suites listed in `docs/audits/2026-04-02-remediation-progress.md`. Those are tracked separately.

If after this pass you want any of the out-of-scope items, that becomes its own plan.