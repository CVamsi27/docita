# C2: Appointments — object-level ABAC enforcement — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the appointments surface's object-level authorization into the pure ABAC engine — `GET /appointments/:id`, `PATCH /appointments/:id`, `PATCH /appointments/:id/cancel`, `PATCH /appointments/:id/reschedule` declare `@RequirePolicy('appointment', ...)` and are enforced by `AppointmentAbacPolicy` via `PolicyGuard`, exactly mirroring the semantics the legacy `AppointmentPolicy` + service-layer access context already enforce today (DOCTOR scoped to own appointments, PATIENT own-row, other clinical staff clinic-wide, cross-clinic 404 without existence disclosure). This is the C2 slice of [ADR-0013](../architecture/decisions/0013-abac.md) / [ABAC_MIGRATION_PLAN.md](../../analysis/ABAC_MIGRATION_PLAN.md) §C2.

**Architecture:** Add a `status` attribute to `resourceAttributesSchema` (`@workspace/types`, Zod-first), ship a pure `AppointmentAbacPolicy` in `@workspace/authorization` (INTERNAL bypass → not-applicable → tenant discipline → PATIENT own-row → DOCTOR assignment → clinical-staff allow → default-deny), an `AppointmentResourceResolver` in the API (resolve `:id` → 404 on missing, no existence disclosure), register both in their DI registries, and decorate the four object-level routes. The differential contract is **mirror-only**: every evaluated case must produce the same wire outcome as today (403 `ownership_denied` for doctor-mismatch, 404 for cross-clinic/missing, 200 for staff). The ABAC write-lock on no-show/completed appointments (C2 spec's "write locks by status attribute") is **recorded as DEFERRED** — no service-layer guard exists today, so enforcing it would tighten behavior for staff beyond the legacy policy; the `status` attribute ships now so the later branch is a one-line policy change behind a recorded product decision (C2.1).

**Tech Stack:** NestJS API (`apps/api`), Zod 3.25 (`@workspace/types`), `@workspace/authorization` (pure policy engine), Vitest (package tests), Jest e2e (`apps/api/test/e2e`, docker test Postgres on `:5434`).

**Scope boundary (per skill Scope Check):** Covers only the four object-level appointment routes above + the `status` attribute + deferred write-lock record. Out of scope: list/create routes (matrix gates cover them), clinical/consultation/appointment-request/doctor-delay controllers (C2.2 follow-up), C3 prescriptions, C4 lab/payments, C5 audit logs, C6 cross-tenant referral, C7 frontend snapshot, Phase D retirement ledger, Phase E parity-gate cutover, patient-portal surface (needs the ADR-0013 clinic-less relaxation).

## Global Constraints

(Every task inherits these; from `AGENTS.md` §3, §5, §7, §9, §12, §15, §16 and the C1 phase-2 plan.)

1. **pnpm only** (pnpm@10.30.3), Node `>=22.22.0`. Lockfile changes via `pnpm install` only.
2. **Never weaken a guard.** `@Roles`, `@RequireFeature`, `TierGuard`, tenant, subscription, audit, RLS, the service-layer access-context checks stay in force. This slice only *adds* a guard-stage duplicate of semantics the service layer already enforces.
3. **Default-deny, deny-overrides.** Missing attribute / policy / resolver denies, never allows.
4. **Differential-equivalence is the contract.** The new effective semantics must equal the legacy `AppointmentPolicy` + service-layer outcomes on every evaluated case. The oracle table in the package tests is the proof; e2e asserts the wire outcomes (200/403/404).
5. **Zod-first, single source of truth.** `@workspace/types` owns the `status` resource attribute; no parallel interface.
6. **No backfill needed.** Unlike C1, the appointment row itself carries `doctorId`, so assignment is derived, not stored. No data migration in this slice.
7. **No PHI in logs/decision records.** Log ids/reasons only (`PolicyGuard` already does).
8. **No `console.log`/`console.error`.** NestJS `Logger` in API; no logging in the pure package.
9. **Type hygiene.** No new `any`, no unchecked `unknown`; prefer narrowing + Zod.
10. **Imports:** `@/...` inside `apps/api`; `@workspace/...` for packages; parent `../` ESLint-banned.
11. **Branch rules (§11.3):** work from a branch off `main`; current branch is `fix/app-deployment-failure` (verify ≤2 open-PR cap before pushing). Commit after every task.
12. **Validation before push:** `pnpm --filter @workspace/authorization run check-types && test`, `pnpm --filter @docita/api run check-types`, API unit tests, `pnpm lint`, `pnpm knip`, `pnpm check:circular:enforce`, `pnpm check:controller-rbac`, `pnpm check:policy-resolver-coverage`, `pnpm verify:standard`, e2e on the docker test Postgres.
13. **Reversible operations only.** No destructive SQL, no data writes.

---

## File structure map

New files:

| File | Responsibility |
| --- | --- |
| `packages/authorization/src/policies/appointment.policy.ts` | Pure `AppointmentAbacPolicy` mirroring legacy `AppointmentPolicy` semantics |
| `packages/authorization/src/policies/appointment.policy.test.ts` | Unit tests + differential-oracle table vs the legacy policy |
| `apps/api/src/shared/modules/auth/authorization/resolvers/appointment-resource.resolver.ts` | Resolve `:id` → appointment attributes; 404 on missing (no existence disclosure) |
| `apps/api/test/e2e/appointments/appointment-abac.e2e-spec.ts` | e2e: assigned DOCTOR 200, unassigned DOCTOR 403, other-doctor 403, NURSE/ADMIN 200, cross-clinic 404, missing 404, PATIENT own-row 200 via direct policy eval, write-lock baseline (staff PATCH completed = 200, recorded as deferred tightening) |

Modified files:

| File | Change |
| --- | --- |
| `packages/types/src/authorization/attributes.ts` | Add `status: z.string().nullish()` to `resourceAttributesSchema` (state attribute for future state-based conditions; null when not applicable) |
| `packages/authorization/src/index.ts` | Export `appointment.policy.js` |
| `apps/api/src/shared/modules/auth/authorization/abac-policy.registry.ts` | Register `['appointment', AppointmentAbacPolicy]` |
| `apps/api/src/shared/modules/auth/authorization/resolvers/policy-resource-resolver.ts` | Register `['appointment', AppointmentResourceResolver]` |
| `apps/api/src/shared/modules/auth/authorization/authorization.module.ts` | Provide `AppointmentAbacPolicy` + `AppointmentResourceResolver` |
| `apps/api/src/domains/appointments/presentation/controllers/appointments-schedule.controller.ts` | `@RequirePolicy('appointment', 'read')` on `findOne`; `@RequirePolicy('appointment', 'update')` on `update` |
| `apps/api/src/domains/appointments/presentation/controllers/appointments-workflow.controller.ts` | `@RequirePolicy('appointment', 'update')` on `cancel` + `reschedule` |
| `docs/architecture/decisions/0013-abac.md` | C2 status amendment (appointment surface enforced; write-lock deferred) |
| `docs/compliance/ACCESS_AUDIT.md` | ABAC policy index: `appointment` row (mirror-only semantics, deferred write-lock note) |
| `docs/analysis/EXECUTION_PLAN.md` | C2 note + suppression-inventory total refresh (line ~65: 110 → 99 live: zod-parity 15→5, i18n 1→0) |

---

### Task 1: Zod-first — `status` resource attribute

**Files:**
- Modify: `packages/types/src/authorization/attributes.ts`

- [ ] **Step 1: Add the attribute**

In `resourceAttributesSchema`, after `consentState`:

```ts
  consentState: consentStateSchema.nullish(),
  /**
   * Resource state attribute (e.g. appointment status) for future
   * state-based conditions (C2 write-lock decision — currently DEFERRED,
   * see ADR-0013). Null when the resource carries no state.
   */
  status: z.string().nullish(),
  requiresAssignment: z.boolean().default(false),
```

- [ ] **Step 2: Typecheck + commit**

```bash
pnpm --filter @workspace/types run check-types
git add packages/types/src/authorization/attributes.ts
git commit -m "feat(types): add status resource attribute for ABAC state-based conditions"
```

---

### Task 2: Pure `AppointmentAbacPolicy` — TDD + differential oracle

**Files:**
- Create: `packages/authorization/src/policies/appointment.policy.ts`
- Create: `packages/authorization/src/policies/appointment.policy.test.ts`
- Modify: `packages/authorization/src/index.ts`

**Interfaces:**
- Consumes: `AbacPolicy`/`AbacDecision`/`AbacAction` types, `allowDecision`/`denyDecision`/`notApplicableDecision` helpers from `../evaluator.js`, `SubjectAttributes`/`ResourceAttributes`/`EnvAttributes` from `@workspace/types/authorization`.
- Produces: a pure policy whose semantics mirror the legacy `AppointmentPolicy` (DOCTOR ↔ `context.assignedDoctorId`; PATIENT ↔ `context.assignedPatientId`; every other clinic role allow after matrix gates) plus the C1-established global posture (INTERNAL bypass, tenant discipline, default-deny).

**Design note (mirror the patient policy shape):** Unlike `PatientAbacPolicy`, the appointment policy pins DOCTOR **unconditionally** (no `requiresAssignment` flag) because an appointment row always carries its `doctorId` — the resolver always populates `assignedDoctorIds` from it. The PATIENT branch mirrors the legacy policy for the future portal surface (unreachable on staff routes today — the roles gate denies PATIENT tokens first; ADR-0013 portal note applies).

- [ ] **Step 1: Write the failing tests** (TDD — create the spec first)

`packages/authorization/src/policies/appointment.policy.test.ts`, mirroring the patient policy spec's helpers (`subject()`, `resource()`, `env` builders) and the `ORACLE_ROWS` differential table. Required cases:

```ts
// INTERNAL bypass
// not-applicable for non-appointment resources (resource.type = "patient")
// tenant discipline: subject.clinicId !== resource.clinicId → tenant_mismatch
// PATIENT own-row: assignedPatientId === subject.patientId → allow; mismatch/no patientId → ownership_denied
// DOCTOR assigned: doctorId in assignedDoctorIds → allow
// DOCTOR unassigned (other doctor's appointment) → ownership_denied
// DOCTOR with null doctorId → ownership_denied
// NURSE / RECEPTIONIST / ADMIN / ADMIN_DOCTOR / LAB → allow (clinic-wide, mirrors legacy)
// unknown role (e.g. ["SOME_OTHER"]) → role_denied
// ORACLE row: update on a COMPLETED appointment by staff → allow (legacyEffective; write-lock DEFERRED — the row pins the baseline so a future flip must update the oracle)
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd packages/authorization && pnpm vitest run src/policies/appointment.policy.test.ts
```
Expected: FAIL — module not found (`appointment.policy.ts` does not exist).

- [ ] **Step 3: Write the minimal policy**

`packages/authorization/src/policies/appointment.policy.ts`:

```ts
import type {
  AbacAction,
  AbacDecision,
  AbacPolicy,
} from "../types.js";
import {
  allowDecision,
  denyDecision,
  notApplicableDecision,
} from "../evaluator.js";
import type {
  EnvAttributes,
  ResourceAttributes,
  SubjectAttributes,
} from "@workspace/types/authorization";

/** Roles that may operate an appointment within their own clinic (legacy AppointmentPolicy: only DOCTOR/PATIENT get object checks). */
const CLINICAL_STAFF_ROLES = new Set([
  "DOCTOR",
  "ADMIN_DOCTOR",
  "NURSE",
  "RECEPTIONIST",
  "ADMIN",
  "LAB",
]);

/**
 * Appointment object-level policy (C2, ADR-0013). Mirrors the legacy
 * AppointmentPolicy: DOCTOR scoped to assigned appointments, PATIENT
 * own-row, other clinical staff clinic-wide after the matrix gates.
 * Order matters:
 *   1. INTERNAL bypass
 *   2. not-applicable for non-appointment resources
 *   3. tenant discipline (cross-clinic → PolicyGuard 404, no existence disclosure)
 *   4. PATIENT own-row (assignedPatientId === subject.patientId)
 *   5. DOCTOR assignment (assignedDoctorIds derived from appointment.doctorId;
 *      unconditional — an appointment always carries its doctor)
 *   6. clinical staff same-clinic
 *   7. default-deny
 * Status-based write locks (no-show/completed) are DEFERRED by recorded
 * decision (ADR-0013, C2.1): no service-layer guard exists today, so
 * enforcing them would tighten staff behavior beyond the legacy policy.
 */
export class AppointmentAbacPolicy implements AbacPolicy {
  readonly id = "appointment";

  can(
    _action: AbacAction,
    subject: SubjectAttributes,
    resource: ResourceAttributes,
    _env: EnvAttributes,
  ): AbacDecision {
    if (subject.roles.includes("INTERNAL")) return allowDecision(this.id);

    if (resource.type !== "appointment") return notApplicableDecision(this.id);

    if (
      subject.clinicId &&
      resource.clinicId &&
      subject.clinicId !== resource.clinicId
    ) {
      return denyDecision(this.id, "tenant_mismatch");
    }

    if (subject.roles.includes("PATIENT")) {
      if (
        !resource.assignedPatientId ||
        resource.assignedPatientId !== subject.patientId
      ) {
        return denyDecision(this.id, "ownership_denied");
      }
      return allowDecision(this.id);
    }

    if (subject.roles.includes("DOCTOR")) {
      if (
        !subject.doctorId ||
        !resource.assignedDoctorIds.includes(subject.doctorId)
      ) {
        return denyDecision(this.id, "ownership_denied");
      }
      return allowDecision(this.id);
    }

    if (subject.roles.some((role) => CLINICAL_STAFF_ROLES.has(role))) {
      return allowDecision(this.id);
    }

    return denyDecision(this.id, "role_denied");
  }
}
```

Add the export to `packages/authorization/src/index.ts` next to `PatientAbacPolicy`.

- [ ] **Step 4: Run tests + typecheck + build to verify they pass**

```bash
cd packages/authorization && pnpm vitest run src/policies/appointment.policy.test.ts && pnpm run check-types && pnpm run build
```
Expected: all tests PASS; check-types + build exit 0.

- [ ] **Step 5: Commit**

```bash
git add packages/authorization/src/policies/appointment.policy.ts packages/authorization/src/policies/appointment.policy.test.ts packages/authorization/src/index.ts
git commit -m "feat(authz): AppointmentAbacPolicy — mirror legacy AppointmentPolicy semantics"
```

---

### Task 3: `AppointmentResourceResolver` + registries + module

**Files:**
- Create: `apps/api/src/shared/modules/auth/authorization/resolvers/appointment-resource.resolver.ts`
- Modify: `apps/api/src/shared/modules/auth/authorization/resolvers/policy-resource-resolver.ts`
- Modify: `apps/api/src/shared/modules/auth/authorization/abac-policy.registry.ts`
- Modify: `apps/api/src/shared/modules/auth/authorization/authorization.module.ts`

**Interfaces:**
- Consumes: `PolicyResourceResolver` interface, `PrismaService`, `ResourceAttributes`.
- Produces: a resolver registered for `appointment`; the ABAC registry + module wired. The `check:policy-resolver-coverage` gate auto-discovers `@RequirePolicy('appointment', ...)` → resolver file + registration, so this task must land **before** Task 4's decorators.

- [ ] **Step 1: Write the resolver**

`apps/api/src/shared/modules/auth/authorization/resolvers/appointment-resource.resolver.ts`:

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import type { ResourceAttributes } from '@workspace/types';
import type { PolicyResourceResolver } from './policy-resource-resolver.interface';

/**
 * Resolves an `appointment` resource from the route param (`:id` on the
 * schedule/workflow controllers). Missing row → 404 (no existence
 * disclosure). Cross-clinic rows resolve fine here — the policy's tenant
 * discipline turns them into 404 via PolicyGuard (same wire contract as the
 * clinic-scoped repository). Assignment is derived from the row's own
 * `doctorId` (no backfill needed, unlike C1 patients).
 */
@Injectable()
export class AppointmentResourceResolver implements PolicyResourceResolver {
  readonly resource = 'appointment';

  constructor(private readonly prisma: PrismaService) {}

  async resolve(context: ExecutionContext): Promise<ResourceAttributes> {
    const request = context
      .switchToHttp()
      .getRequest<{ params: Record<string, string | undefined> }>();
    const appointmentId = request.params?.id ?? request.params?.appointmentId;
    if (!appointmentId) throw new NotFoundException('Appointment not found');

    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        id: true,
        clinicId: true,
        doctorId: true,
        patientId: true,
        status: true,
      },
    });
    if (!appointment) throw new NotFoundException('Appointment not found');

    return {
      type: 'appointment',
      clinicId: appointment.clinicId,
      ownerId: null,
      assignedDoctorIds: appointment.doctorId ? [appointment.doctorId] : [],
      assignedPatientId: appointment.patientId,
      classification: 'phi',
      consentState: null,
      status: appointment.status,
      requiresAssignment: false,
    };
  }
}
```

- [ ] **Step 2: Register in both registries + module**

In `policy-resource-resolver.ts` — add `AppointmentResourceResolver` to the constructor injection and the map:

```ts
  constructor(
    @Inject(PatientResourceResolver) patient: PolicyResourceResolver,
    @Inject(AppointmentResourceResolver) appointment: PolicyResourceResolver,
  ) {
    this.resolvers = new Map<string, PolicyResourceResolver>([
      ['patient', patient],
      ['appointment', appointment],
    ]);
  }
```

In `abac-policy.registry.ts`:

```ts
  constructor(
    patient: PatientAbacPolicy,
    appointment: AppointmentAbacPolicy,
  ) {
    this.policies = new Map<string, AbacPolicy>([
      ['patient', patient],
      ['appointment', appointment],
    ]);
  }
```

In `authorization.module.ts` — import `AppointmentAbacPolicy` from `@workspace/authorization` and `AppointmentResourceResolver`, add both to `providers`.

- [ ] **Step 3: Typecheck + coverage gate + commit**

```bash
pnpm --filter @docita/api run check-types
pnpm check:policy-resolver-coverage
git add apps/api/src/shared/modules/auth/authorization
git commit -m "feat(api): AppointmentResourceResolver + ABAC registries + module wiring"
```

---

### Task 4: Decorate the object-level routes

**Files:**
- Modify: `apps/api/src/domains/appointments/presentation/controllers/appointments-schedule.controller.ts`
- Modify: `apps/api/src/domains/appointments/presentation/controllers/appointments-workflow.controller.ts`

**Design note:** Decorators are additive metadata; the legacy `AuthorizationService`/legacy `AppointmentPolicy` and the service-layer access-context checks stay untouched (defense-in-depth). Only the four object-level routes get `@RequirePolicy`; list/create stay matrix-gated.

- [ ] **Step 1: Schedule controller** (`appointments-schedule.controller.ts`)

Add the import:

```ts
import { RequirePolicy } from '@/shared/modules/auth/decorators/require-policy.decorator';
```

On `findOne`:

```ts
  @Get(':id')
  @RequirePolicy('appointment', 'read')
  @ApiOperation({ summary: 'Get appointment by ID' })
```

On `update`:

```ts
  @Patch(':id')
  @RequirePolicy('appointment', 'update')
  @ApiOperation({ summary: 'Update appointment details' })
```

- [ ] **Step 2: Workflow controller** (`appointments-workflow.controller.ts`)

Add the same import; decorate `cancel` and `reschedule`:

```ts
  @Patch(':id/cancel')
  @RequirePolicy('appointment', 'update')
```

```ts
  @Patch(':id/reschedule')
  @RequirePolicy('appointment', 'update')
  @RequiresIdempotency()
```

- [ ] **Step 3: Typecheck + unit tests + coverage gate + commit**

```bash
pnpm --filter @docita/api run check-types
cd apps/api && npx jest src/domains/appointments --silent
pnpm check:policy-resolver-coverage
git add apps/api/src/domains/appointments/presentation/controllers
git commit -m "feat(api): enforce AppointmentAbacPolicy on object-level appointment routes"
```

Expected: controller unit specs still green (decorators are additive; `check:controller-rbac` treats `@RequirePolicy` as a posture supplement, not a replacement).

---

### Task 5: e2e proof — differential-equivalence on the wire

**Files:**
- Create: `apps/api/test/e2e/appointments/appointment-abac.e2e-spec.ts`

**Interfaces:**
- Consumes: `factories.clinic()`, `factories.user({ clinicId, role })`, `factories.doctorClinic(...)`, `factories.patient(clinicId)`, `factories.appointment(patientId, doctorId, clinicId, overrides?)` (factory at `apps/api/test/factories.ts:110`), `signE2eAccessToken`, the same provider overrides as `patient-abac-policy.e2e-spec.ts` (WhatsApp mock + payment-link mock).
- Produces: wire-level proof that the ABAC stage changes nothing on the staff surface while the pipeline is armed.

- [ ] **Step 1: Write the spec** — fixture skeleton identical to `apps/api/test/e2e/patients/patient-abac-policy.e2e-spec.ts` (setup/reset/close/getPrismaInstance/factories/signE2eAccessToken + overrides). Cases:

```ts
// assigned DOCTOR reads own appointment (200)
// unassigned DOCTOR reads another doctor's appointment in the same clinic (403 — mirrors service-layer ForbiddenException)
// unassigned DOCTOR reads an appointment with no doctorId (403)
// NURSE reads any appointment in the clinic (200)
// ADMIN reads any appointment in the clinic (200)
// staff DOCTOR of clinic A reads an appointment of clinic B (404, no existence disclosure)
// unknown appointment id (404)
// assigned DOCTOR updates own appointment (200)
// unassigned DOCTOR updates another doctor's appointment (403)
// NURSE cancels an appointment (200)
// NURSE updates a COMPLETED appointment (200 — current effective behavior; write-lock tightening is DEFERRED per ADR-0013 C2.1 and this case pins the baseline)
// unauthenticated request (401)
```

The appointment factory's default `status` is `SCHEDULED`; for the COMPLETED case pass `overrides: { status: 'COMPLETED' }` (verify the Prisma enum spelling — the factory uses `AppointmentStatus.SCHEDULED`; use the same enum or the exact string the e2e factories already use).

- [ ] **Step 2: Typecheck + run the appointments e2e folder**

```bash
pnpm --filter @docita/api run check-types
cd apps/api && npx jest --config ./test/jest-e2e.json --runInBand test/e2e/appointments
```
Expected: the two existing specs (`appointment-timezone`, `appointments`) stay green AND the new `appointment-abac` spec passes. If an existing spec breaks, the differential contract was violated — investigate before committing.

- [ ] **Step 3: Commit**

```bash
git add apps/api/test/e2e/appointments
git commit -m "test(api): e2e proof for AppointmentAbacPolicy differential-equivalence"
```

---

### Task 6: Docs — ADR-0013 amendment, ACCESS_AUDIT, EXECUTION_PLAN (+ suppression-inventory refresh)

**Files:**
- Modify: `docs/architecture/decisions/0013-abac.md`
- Modify: `docs/compliance/ACCESS_AUDIT.md`
- Modify: `docs/analysis/EXECUTION_PLAN.md`

- [ ] **Step 1: Amend ADR-0013** — add a C2 section: appointment surface enforced 2026-08-07 (`GET/PATCH /appointments/:id`, `PATCH /appointments/:id/cancel|reschedule`) via `AppointmentAbacPolicy`, mirror-only semantics, `status` attribute shipped, write-lock (no-show/completed) **DEFERRED** (C2.1) pending a recorded product decision because no service-layer guard exists today.

- [ ] **Step 2: Update ACCESS_AUDIT.md** — ABAC policy index: `appointment` row (roles/outcomes, mirror-only, deferred write-lock note).

- [ ] **Step 3: Update EXECUTION_PLAN.md** — (a) NOTE paragraph for C2; (b) refresh the stale suppression-inventory total on the inventory row (~line 65): `110 measurable suppressions` → **99** with the corrected breakdown `(40 as-cast allow-file + 0 NNA + 23 jscpd ignore + 5 zod-parity + 0 i18n + 0 feature-test-density + 30 client-storage allowlist + 1 eslint-disable + 0 ts-ignore)` and note the zod-parity 15→5 (P5.5) and i18n 1→0 (legal-docs migration) closures that the 2026-08-05 row predates.

- [ ] **Step 4: Commit**

```bash
git add docs/architecture/decisions/0013-abac.md docs/compliance/ACCESS_AUDIT.md docs/analysis/EXECUTION_PLAN.md
git commit -m "docs(authz): record C2 appointments enforcement + deferred write-lock + inventory refresh"
```

---

### Task 7: Full validation gate

- [ ] **Step 1: Run every gate (each must exit 0)**

```bash
pnpm --filter @workspace/authorization run check-types
pnpm --filter @workspace/authorization run test
pnpm --filter @workspace/authorization run build
pnpm --filter @docita/api run check-types
pnpm lint
pnpm knip
pnpm check:circular:enforce
pnpm check:controller-rbac
pnpm check:policy-resolver-coverage
pnpm verify:standard
```

- [ ] **Step 2: Re-run the guard-adjacent e2e suites**

```bash
cd apps/api && npx jest --config ./test/jest-e2e.json --runInBand test/e2e/appointments test/e2e/patients test/e2e/auth
```
Expected: all green; no existing spec regressed.

- [ ] **Step 3: Verify the tree**

```bash
git status --short   # only expected files; no stray logs/artifacts
```

---

## Definition of done for C2

- [ ] `resourceAttributesSchema` carries `status` (Zod-first, exported through `@workspace/types`).
- [ ] `AppointmentAbacPolicy` in `@workspace/authorization` passes unit tests + the differential oracle (legacy `AppointmentPolicy` semantics: DOCTOR assignment, PATIENT own-row, staff clinic-wide, INTERNAL bypass, tenant discipline, default-deny).
- [ ] `AppointmentResourceResolver` registered; both DI registries + module wired; `check:policy-resolver-coverage` green with the four decorated routes.
- [ ] The four object-level routes declare `@RequirePolicy('appointment', 'read'|'update')`; list/create untouched.
- [ ] e2e proves the wire outcomes are unchanged (assigned 200, doctor-mismatch 403, cross-clinic/missing 404, staff 200, unauth 401) and pins the deferred write-lock baseline (staff PATCH on COMPLETED = 200).
- [ ] ADR-0013 records C2 enablement + the deferred write-lock decision (C2.1); ACCESS_AUDIT and EXECUTION_PLAN updated; the suppression-inventory total corrected to the live 99.
- [ ] All Task 7 gates pass; no guard, tenant, tier, feature, RLS, or audit check weakened.

## Out of scope (later plans)

C2.2 (clinical/consultation/appointment-request/doctor-delay controllers), C2.1 (write-lock decision — needs recorded product sign-off), C3 prescriptions, C4 lab/payments, C5 audit-log resources, C6 cross-tenant referral, C7 frontend snapshot, Phase D retirement ledger, Phase E parity-gate cutover, patient-portal surface (needs the ADR-0013 clinic-less relaxation), worker-side consumption of `@workspace/authorization`.
