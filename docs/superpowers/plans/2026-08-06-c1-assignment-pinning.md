# C1 Phase-2: Doctor Assignment-Pinning on the Staff Surface — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable doctor assignment-pinning on the staff patients surface — `GET/PATCH /patients/:id` — so an unassigned DOCTOR is denied object-level access (matching the `PatientDoctorGuard` semantics that were designed but never enforced), with a backfill that protects existing doctor-patient relationships and an EmergencyAccess escape hatch that audits.

**Architecture:** This is the C1 phase-2 slice recorded as deferred in [ADR-0013](../architecture/decisions/0013-abac.md). It flips `resource.requiresAssignment` from `false` to `true` in `PatientResourceResolver` (the staff surface), fixes `PatientAbacPolicy` to exempt `ADMIN_DOCTOR` from pinning (mirroring the legacy `PatientDoctorGuard`, which bypasses ADMIN_DOCTOR/NURSE/RECEPTIONIST/ADMIN/INTERNAL), wires `PolicyGuard` to honor the `BreakTheGlassInterceptor` emergency path (which runs after guards, so the guard must check the header + `@EmergencyAccess()` metadata itself), backfills `PatientDoctor` rows from `Appointment` history so existing relationships are not broken, and extends the differential-oracle tests + e2e to prove the new semantics equal the legacy guard's intended semantics. The existing guard chain (roles matrix, tenant, tier/feature) stays untouched.

**Tech Stack:** NestJS 12-era API (`apps/api`), Zod 3.25 (`@workspace/types`), `@workspace/authorization` (pure policy engine, first slice), Vitest (package tests), Jest e2e (`apps/api/test/e2e`, needs docker test Postgres on `:5434`), Prisma + ts-node scripts (`packages/db/scripts`).

**Scope boundary (per skill Scope Check):** Covers only **staff-surface assignment-pinning + EmergencyAccess obligation + backfill**. Out of scope: the patient-portal surface resolver (already pins via `requiresAssignment`), C2 appointments / C3 prescriptions / C4 lab / C5 audit resources, Phase D retirement ledger, Phase E parity-gate cutover.

## Global Constraints

(Every task inherits these; from `AGENTS.md` §3, §5, §7, §9, §12, §15, §16 and the first-slice plan.)

1. **pnpm only** (pnpm@10.30.3), Node `>=22.22.0`. Lockfile changes via `pnpm install` only.
2. **Never weaken a guard.** `@Roles`, `@RequireFeature`, `TierGuard`, tenant, subscription, audit, RLS stay in force. This slice adds a DOCTOR-pinning condition and an emergency bypass — nothing is removed.
3. **Default-deny, deny-overrides.** Missing attribute / policy / resolver denies, never allows.
4. **Differential-equivalence is the contract.** The new effective semantics must equal the legacy `PatientDoctorGuard` *intended* semantics on the pinned roles (the guard is registered but applied to no live route today; pinning is a documented, audited tightening — see ADR-0013).
5. **Existing-user compatibility (§9.4) is mandatory.** Before flipping `requiresAssignment`, a backfill must create active `PatientDoctor` rows from appointment history. Never flip pinning on a clinic whose doctor-patient relationships are not represented.
6. **Zod-first, single source of truth.** No parallel interfaces; `@workspace/types` owns `requiresAssignment`/`assignedDoctorIds`.
7. **Emergency access is an obligation, not a silent bypass.** The BTG path must audit (`EMERGENCY_ACCESS_GRANTED` — already emitted by `BreakTheGlassInterceptor`) and must only be reachable on `@EmergencyAccess()`-eligible routes.
8. **No PHI in logs/decision records.** Log ids/reasons only.
9. **No `console.log`/`console.error`.** NestJS `Logger` in API; no logging in the pure package.
10. **Type hygiene.** No new `any`, no unchecked `unknown`; prefer narrowing + Zod.
11. **Imports:** `@/...` inside `apps/api`; `@workspace/...` for packages; parent `../` ESLint-banned.
12. **Branch rules (§11.3):** work from a branch off `main`; current branch is `fix/app-deployment-failure` (verify ≤2 open-PR cap before pushing). Commit after every task.
13. **Validation before push:** `pnpm --filter @workspace/authorization run check-types && test`, `pnpm --filter @docita/api run check-types`, API unit tests, `pnpm lint`, `pnpm knip`, `pnpm check:circular:enforce`, `pnpm check:controller-rbac`, `pnpm check:policy-resolver-coverage`, `pnpm verify:standard`, e2e on the docker test Postgres.
14. **Reversible operations only.** The backfill script is insert-only and idempotent (dry-run by default, `--apply` to write); no destructive SQL.

---

## File structure map

New files:

| File | Responsibility |
| --- | --- |
| `packages/db/scripts/backfill-patient-doctor.ts` | Idempotent insert-only backfill of active `PatientDoctor` rows from `Appointment` history (dry-run default, `--apply` writes). Mirror `backfill-referrer-codes.ts` conventions |
| `apps/api/test/e2e/patients/patient-abac-pinning.e2e-spec.ts` | e2e: assigned DOCTOR 200, unassigned DOCTOR 403, ADMIN_DOCTOR 200, NURSE 200, BTG emergency 200 + audit row |

Modified files:

| File | Change |
| --- | --- |
| `packages/authorization/src/policies/patient.policy.ts` | Pin only `DOCTOR` when `requiresAssignment` (drop `ADMIN_DOCTOR` from the pin branch — legacy guard exempts it); comment updated |
| `packages/authorization/src/policies/patient.policy.test.ts` | Add ADMIN_DOCTOR-exempt and pinned-role differential rows; extend the oracle table with the legacy-guard semantics |
| `apps/api/src/shared/modules/auth/authorization/resolvers/patient-resource.resolver.ts` | `requiresAssignment: true` on the staff surface (was `false`); comment updated |
| `apps/api/src/shared/modules/auth/guards/policy.guard.ts` | Honor `x-break-the-glass` header + `@EmergencyAccess()` metadata: short-circuit to allow before the policy evaluation (the interceptor owns audit + RLS bypass) |
| `apps/api/src/shared/modules/auth/authorization/policy.guard.spec.ts` | Add BTG-allow and BTG-non-eligible-deny cases |
| `apps/api/src/domains/patients/presentation/controllers/patients.controller.ts` | Add `@EmergencyAccess()` to `findOne` (the route where an unassigned doctor needs emergency access) |
| `apps/api/test/factories.ts` | Add `patientDoctor(patientId, doctorId, clinicId, overrides?)` factory |
| `apps/api/test/e2e/patients/patient-abac-policy.e2e-spec.ts` | Update the two "staff DOCTOR 200" cases to create a `PatientDoctor` row first (pinning is on); keep cross-clinic/PATIENT/unauth cases |
| `docs/architecture/decisions/0013-abac.md` | Status amendment: assignment-pinning enabled on the staff surface 2026-08-06 (C1 phase 2), with the backfill + differential-pass evidence |
| `docs/compliance/ACCESS_AUDIT.md` | Policy index: `requiresAssignment` now `true` on the staff surface; EmergencyAccess obligation row |
| `docs/analysis/EXECUTION_PLAN.md` | C1 note: assignment-pinning shipped with backfill; portal resolver unchanged |

---

### Task 1: Backfill `PatientDoctor` rows from `Appointment` history (existing-user compatibility)

**Files:**
- Create: `packages/db/scripts/backfill-patient-doctor.ts`
- Test: dry-run against the docker test Postgres (`docita_test` on `:5434`); `db:check-integrity` after apply

**Interfaces:**
- Consumes: `packages/db/scripts/prisma-script-client.ts` (the shared script client), the `PatientDoctor`/`Appointment` Prisma models.
- Produces: active `PatientDoctor` rows (`isActive: true`, `firstSeenAt`/`lastSeenAt` from min/max appointment start) for every distinct `(patientId, doctorId, clinicId)` pair in non-cancelled appointment history, skipped where an active row already exists. Task 4's e2e relies on assignment rows existing for assigned doctors (via the factory, not this script).

- [ ] **Step 1: Write the script**

Create `packages/db/scripts/backfill-patient-doctor.ts`:

```ts
import prisma from "./prisma-script-client";

/**
 * Backfill active `PatientDoctor` rows from appointment history.
 *
 * `PatientDoctor` rows are never written by the production request path today
 * (the model is read by `PatientDoctorGuard`, which is registered but applied
 * to no live route). C1 phase-2 flips `resource.requiresAssignment` to `true`
 * on the staff patients surface, so existing doctor-patient relationships
 * must be represented or every DOCTOR loses object-level access to every
 * patient they have ever seen (AGENTS §9.4).
 *
 * Insert-only and idempotent: an existing active row for the same
 * (patientId, doctorId) is left untouched. Cancelled appointments are
 * excluded so an accidental booking does not create an assignment.
 *
 * Usage:
 *   pnpm --filter @workspace/db exec ts-node scripts/backfill-patient-doctor.ts          # dry-run
 *   pnpm --filter @workspace/db exec ts-node scripts/backfill-patient-doctor.ts --apply  # write
 */

const EXCLUDED_STATUSES = ["CANCELLED", "NO_SHOW"];

async function collectCandidatePairs() {
  const appointments = await prisma.appointment.findMany({
    where: { status: { notIn: EXCLUDED_STATUSES } },
    select: {
      patientId: true,
      doctorId: true,
      clinicId: true,
      startTime: true,
    },
  });

  const byPair = new Map<
    string,
    { patientId: string; doctorId: string; clinicId: string; first: Date; last: Date }
  >();

  for (const appointment of appointments) {
    const key = `${appointment.patientId}:${appointment.doctorId}`;
    const existing = byPair.get(key);
    if (!existing) {
      byPair.set(key, {
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        clinicId: appointment.clinicId,
        first: appointment.startTime,
        last: appointment.startTime,
      });
    } else {
      if (appointment.startTime < existing.first) existing.first = appointment.startTime;
      if (appointment.startTime > existing.last) existing.last = appointment.startTime;
    }
  }

  return [...byPair.values()];
}

async function main() {
  const apply = process.argv.includes("--apply");
  const pairs = await collectCandidatePairs();
  console.log(`Candidate distinct (patientId, doctorId) pairs: ${pairs.length}`);

  const existing = await prisma.patientDoctor.findMany({
    where: { isActive: true },
    select: { patientId: true, doctorId: true },
  });
  const existingKeys = new Set(
    existing.map((row) => `${row.patientId}:${row.doctorId}`),
  );

  const toInsert = pairs.filter(
    (pair) => !existingKeys.has(`${pair.patientId}:${pair.doctorId}`),
  );

  console.log(`Already active: ${pairs.length - toInsert.length}`);
  console.log(`To insert: ${toInsert.length}`);

  if (!apply) {
    console.log("Dry-run — pass --apply to write.");
    for (const row of toInsert.slice(0, 20)) {
      console.log(
        `  would insert patient=${row.patientId} doctor=${row.doctorId} clinic=${row.clinicId} firstSeen=${row.first.toISOString()}`,
      );
    }
    if (toInsert.length > 20) console.log(`  ... and ${toInsert.length - 20} more`);
    return;
  }

  let inserted = 0;
  for (const row of toInsert) {
    await prisma.patientDoctor.create({
      data: {
        patientId: row.patientId,
        doctorId: row.doctorId,
        clinicId: row.clinicId,
        isActive: true,
        firstSeenAt: row.first,
        lastSeenAt: row.last,
      },
    });
    inserted += 1;
  }
  console.log(`Inserted ${inserted} PatientDoctor rows.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

- [ ] **Step 2: Run the dry-run**

Run (from repo root; the docker test Postgres is `docita_test` on `:5434`):
```bash
DATABASE_URL="postgresql://docita:docita@localhost:5434/docita_test" pnpm --filter @workspace/db exec ts-node scripts/backfill-patient-doctor.ts
```
Expected: prints the candidate / existing / to-insert counts and the first 20 rows, exits 0. On an empty test DB this may be 0 candidates — acceptable; the script is the deliverable, and the count line proves it runs.

- [ ] **Step 3: Run `db:check-integrity` (applies to the script's invariants)**

Run: `DATABASE_URL="postgresql://docita:docita@localhost:5434/docita_test" pnpm --filter @workspace/db run db:check-integrity`
Expected: exit 0 (no integrity violations introduced by the script — the script writes only rows derived from existing appointments).

- [ ] **Step 4: Commit**

```bash
git add packages/db/scripts/backfill-patient-doctor.ts
git commit -m "feat(db): backfill PatientDoctor rows from appointment history (C1 phase-2 prereq)"
```

---

### Task 2: Pin only DOCTOR — policy fix + differential-oracle extension

**Files:**
- Modify: `packages/authorization/src/policies/patient.policy.ts`
- Test: `packages/authorization/src/policies/patient.policy.test.ts`

**Interfaces:**
- Consumes: `PatientAbacPolicy` (existing, `id = "patient"`), `requiresAssignment`/`assignedDoctorIds` attributes.
- Produces: a pinning branch that applies to `DOCTOR` only (legacy `PatientDoctorGuard` bypasses `ADMIN_DOCTOR`), and an extended differential-oracle table proving the new semantics equal the legacy guard's intended semantics on the staff surface.

**Design note:** The legacy `PatientDoctorGuard` returns `true` (bypass) for `ADMIN`, `ADMIN_DOCTOR`, `INTERNAL`, `NURSE`, `RECEPTIONIST`; PATIENT is own-row; only `DOCTOR` must have an active `PatientDoctor` row. The current `PatientAbacPolicy` pins `DOCTOR` **and** `ADMIN_DOCTOR` — pinning `ADMIN_DOCTOR` would be a tightening beyond the legacy guard's intent, so this task removes it from the pin branch (clinical-staff same-clinic allow already covers `ADMIN_DOCTOR`).

- [ ] **Step 1: Write the failing tests**

In `packages/authorization/src/policies/patient.policy.test.ts`, extend the existing `PatientAbacPolicy` describe with these cases (before the differential describe):

```ts
  it("exempts ADMIN_DOCTOR from assignment-pinning when requiresAssignment is on (legacy guard bypass)", () => {
    const result = policy.can(
      "read",
      subject({ roles: ["ADMIN_DOCTOR"], doctorId: null }),
      resource({ requiresAssignment: true, assignedDoctorIds: ["d1"] }),
      env,
    );
    expect(result.effect).toBe("allow");
  });

  it("exempts NURSE from assignment-pinning when requiresAssignment is on (legacy guard bypass)", () => {
    const result = policy.can(
      "read",
      subject({ roles: ["NURSE"], doctorId: null }),
      resource({ requiresAssignment: true, assignedDoctorIds: ["d1"] }),
      env,
    );
    expect(result.effect).toBe("allow");
  });

  it("denies an unassigned DOCTOR when requiresAssignment is on", () => {
    const result = policy.can(
      "read",
      subject({ roles: ["DOCTOR"], doctorId: "d9" }),
      resource({ requiresAssignment: true, assignedDoctorIds: ["d1"] }),
      env,
    );
    expect(result).toMatchObject({ effect: "deny", reason: "ownership_denied" });
  });
```

Then extend the differential-oracle table (`ORACLE_ROWS`) with the pinned surface semantics — the legacy `PatientDoctorGuard` *intended* outcomes:

```ts
  {
    name: "unassigned DOCTOR is denied on the pinned surface",
    sub: subject({ roles: ["DOCTOR"], doctorId: "d9" }),
    res: resource({ requiresAssignment: true, assignedDoctorIds: ["d1"] }),
    legacyEffective: "deny",
  },
  {
    name: "assigned DOCTOR is allowed on the pinned surface",
    sub: subject({ roles: ["DOCTOR"], doctorId: "d1" }),
    res: resource({ requiresAssignment: true, assignedDoctorIds: ["d1"] }),
    legacyEffective: "allow",
  },
  {
    name: "ADMIN_DOCTOR bypasses pinning (legacy guard exempts it)",
    sub: subject({ roles: ["ADMIN_DOCTOR"], doctorId: null }),
    res: resource({ requiresAssignment: true, assignedDoctorIds: ["d1"] }),
    legacyEffective: "allow",
  },
  {
    name: "NURSE bypasses pinning (legacy guard exempts it)",
    sub: subject({ roles: ["NURSE"], doctorId: null }),
    res: resource({ requiresAssignment: true, assignedDoctorIds: ["d1"] }),
    legacyEffective: "allow",
  },
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/authorization && pnpm vitest run src/policies/patient.policy.test.ts`
Expected: FAIL — `ADMIN_DOCTOR` and `NURSE` exemption cases fail (the pin branch still pins them) and the oracle rows fail for the same reason.

- [ ] **Step 3: Write the minimal fix**

In `packages/authorization/src/policies/patient.policy.ts`, change the pin branch to `DOCTOR` only:

```ts
    if (
      resource.requiresAssignment &&
      subject.roles.includes("DOCTOR")
    ) {
```

Update the branch comment (step 5 of the class doc) to:

```ts
 *   5. doctor assignment-pinning, only when resource.requiresAssignment is set
 *      AND the subject is a plain DOCTOR (ADMIN_DOCTOR/NURSE/RECEPTIONIST/ADMIN
 *      bypass per the legacy PatientDoctorGuard — C1 phase-2, ADR-0013)
```

- [ ] **Step 4: Run tests + typecheck to verify they pass**

Run: `cd packages/authorization && pnpm vitest run src/policies/patient.policy.test.ts && pnpm run check-types && pnpm run build`
Expected: all tests PASS (existing 13 + 6 new); check-types + build exit 0.

- [ ] **Step 5: Commit**

```bash
git add packages/authorization/src/policies/patient.policy.ts packages/authorization/src/policies/patient.policy.test.ts
git commit -m "feat(authz): pin only DOCTOR when requiresAssignment — mirror legacy PatientDoctorGuard bypasses"
```

---

### Task 3: Flip the staff resolver + EmergencyAccess in `PolicyGuard`

**Files:**
- Modify: `apps/api/src/shared/modules/auth/authorization/resolvers/patient-resource.resolver.ts`
- Modify: `apps/api/src/shared/modules/auth/guards/policy.guard.ts`
- Modify: `apps/api/src/shared/modules/auth/authorization/policy.guard.spec.ts`
- Modify: `apps/api/src/domains/patients/presentation/controllers/patients.controller.ts`

**Interfaces:**
- Consumes: `PatientResourceResolver` (existing), `PolicyGuard` (existing), `EMERGENCY_ACCESS_KEY` + `EmergencyAccess` from `@/shared/modules/auth/decorators/emergency-access.decorator`.
- Produces: `requiresAssignment: true` on the staff surface; `PolicyGuard` short-circuits to allow when the request carries `x-break-the-glass: true` AND the route is `@EmergencyAccess()`-eligible (the `BreakTheGlassInterceptor` — which runs after guards — owns the `EMERGENCY_ACCESS_GRANTED` audit and the `tenantStorage.bypassed` RLS flag).

**Design note:** NestJS runs guards before interceptors. `BreakTheGlassInterceptor` is a global interceptor that audits and sets `tenantStorage.run({ ...user, bypassed: true })` for `x-break-the-glass: true` requests on `@EmergencyAccess()` routes. If `PolicyGuard` also denies unassigned DOCTORs before the interceptor runs, emergency access is dead on arrival. So the guard must check the header + metadata itself and let eligible emergency traffic through; the interceptor still audits + bypasses RLS. The guard's BTG check runs **after** the no-user and clinic checks (an unauthenticated emergency request is still 401/403 at the auth guard) but **before** the resolver lookup (a missing patient on an eligible BTG route should still 404 from the resolver, not 403 — no existence disclosure).

- [ ] **Step 1: Write the failing guard tests**

In `apps/api/src/shared/modules/auth/authorization/policy.guard.spec.ts`, add two cases:

```ts
  it('allows emergency access (x-break-the-glass) on an @EmergencyAccess route without an assignment', async () => {
    const { guard, authorization } = makeGuard({ allow: false });
    const meta = {
      requirePolicy: { resource: 'patient', action: 'read' },
      emergencyAccess: true,
    };
    const context = makeContext(meta, {
      id: 'u1',
      role: Role.DOCTOR,
      clinicId: 'clinic-a',
    });
    // Attach the BTG header to the request
    const request = context.switchToHttp().getRequest();
    request.headers = { 'x-break-the-glass': 'true' };
    Reflect.defineMetadata('emergency_access', true, context.getHandler());

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(authorization.evaluateAbac).not.toHaveBeenCalled();
  });

  it('still denies emergency access on a route that is NOT @EmergencyAccess-eligible', async () => {
    const { guard } = makeGuard({ allow: false });
    const meta = { requirePolicy: { resource: 'patient', action: 'read' } };
    const context = makeContext(meta, {
      id: 'u1',
      role: Role.DOCTOR,
      clinicId: 'clinic-a',
    });
    const request = context.switchToHttp().getRequest();
    request.headers = { 'x-break-the-glass': 'true' };

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/api && npx jest src/shared/modules/auth/authorization/policy.guard.spec.ts`
Expected: FAIL — the BTG path does not exist yet (both cases fail: the first 403s because `evaluateAbac` returns deny; the second fails because the header is not consulted at all).

- [ ] **Step 3: Wire the guard + resolver + controller**

In `apps/api/src/shared/modules/auth/guards/policy.guard.ts`:

- Add imports:

```ts
import { EMERGENCY_ACCESS_KEY } from '@/shared/modules/auth/decorators/emergency-access.decorator';
```

- After the clinic check (`if (!isInternal && !user.clinicId) { ... }`) and **before** the resolver lookup, add:

```ts
    // EmergencyAccess (Break-the-Glass): the BreakTheGlassInterceptor runs
    // AFTER guards, so this guard must honor the header + eligibility itself
    // or emergency access would be denied before the interceptor can audit
    // and bypass RLS. The interceptor emits EMERGENCY_ACCESS_GRANTED and sets
    // tenantStorage.bypassed. Missing patients still 404 from the resolver
    // (no existence disclosure) — BTG only bypasses the policy stage.
    const isEmergencyRequest =
      request.headers?.['x-break-the-glass'] === 'true';
    const isEmergencyEligible = this.reflector.getAllAndOverride<boolean>(
      EMERGENCY_ACCESS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isEmergencyRequest && isEmergencyEligible) return true;
```

In `apps/api/src/shared/modules/auth/authorization/resolvers/patient-resource.resolver.ts`:

- Change `requiresAssignment: false` → `requiresAssignment: true` and update the file doc comment:

```ts
 * ... `requiresAssignment` is true on the staff surface since C1 phase-2
 * (ADR-0013): unassigned DOCTORs are denied object-level access; the
 * patient-portal resolver flips the same flag for portal reads.
```

In `apps/api/src/domains/patients/presentation/controllers/patients.controller.ts`:

- Add the import and decorate `findOne`:

```ts
import { EmergencyAccess } from '@/shared/modules/auth/decorators/emergency-access.decorator';
```

```ts
  @Get(':id')
  @RequirePolicy('patient', 'read')
  @EmergencyAccess()
  @ApiOperation({ summary: 'Get patient by ID' })
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/api && npx jest src/shared/modules/auth/authorization/policy.guard.spec.ts src/domains/patients/presentation/controllers/patients.controller.spec.ts`
Expected: guard spec 7/7 PASS; controller spec still green (the decorator is additive metadata; add a metadata assertion in the controller spec only if the existing suite asserts decorator counts — otherwise no change needed there).

Run: `pnpm --filter @docita/api run check-types`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/shared/modules/auth/authorization/resolvers/patient-resource.resolver.ts apps/api/src/shared/modules/auth/guards/policy.guard.ts apps/api/src/shared/modules/auth/authorization/policy.guard.spec.ts apps/api/src/domains/patients/presentation/controllers/patients.controller.ts
git commit -m "feat(api): pin staff patients surface + EmergencyAccess bypass in PolicyGuard"
```

---

### Task 4: e2e proof — assigned/unassigned/role-bypass/BTG

**Files:**
- Modify: `apps/api/test/factories.ts` (add `patientDoctor` factory)
- Modify: `apps/api/test/e2e/patients/patient-abac-policy.e2e-spec.ts` (update the two DOCTOR-200 cases to create assignment rows)
- Create: `apps/api/test/e2e/patients/patient-abac-pinning.e2e-spec.ts`

**Interfaces:**
- Consumes: `factories.patientDoctor(patientId, doctorId, clinicId, overrides?)`; `signE2eAccessToken`; `signDoctor`/`signPatient` helper pattern from the first-slice spec.
- Produces: e2e regression coverage for the pinned surface and the BTG obligation.

- [ ] **Step 1: Add the `patientDoctor` factory**

In `apps/api/test/factories.ts`, after the `appointment` factory, add:

```ts
  patientDoctor: async (
    patientId: string,
    doctorId: string,
    clinicId: string,
    overrides = {},
  ) => {
    const now = new Date();
    return prisma.patientDoctor.create({
      data: {
        patientId,
        doctorId,
        clinicId,
        isActive: true,
        firstSeenAt: now,
        lastSeenAt: now,
        ...overrides,
      },
    });
  },
```

- [ ] **Step 2: Update the first-slice e2e spec (pinning is now on)**

In `apps/api/test/e2e/patients/patient-abac-policy.e2e-spec.ts`, update the two "staff DOCTOR ... 200" cases so the doctor is **assigned** before the request:

In `it('staff DOCTOR of the owning clinic reads the patient (200)')`:

```ts
    const clinicA = await factories.clinic();
    const { user, token } = await signDoctor(clinicA.id);
    const patient = await factories.patient(clinicA.id);
    await factories.patientDoctor(patient.id, user.id, clinicA.id);
```

In `it('staff DOCTOR of the owning clinic updates the patient (200)')`:

```ts
    const clinicA = await factories.clinic();
    const { user, token } = await signDoctor(clinicA.id);
    const patient = await factories.patient(clinicA.id);
    await factories.patientDoctor(patient.id, user.id, clinicA.id);
```

The cross-clinic (404), PATIENT (403), and unauth (401) cases stay unchanged.

- [ ] **Step 3: Write the new pinning e2e spec**

Create `apps/api/test/e2e/patients/patient-abac-pinning.e2e-spec.ts` (same fixture skeleton as `patient-abac-policy.e2e-spec.ts` — `setupTestDatabase`, `resetDatabase`, `closeDatabase`, `getPrismaInstance`, `factories`/`setPrismaInstance`, `signE2eAccessToken`, `mockWhatsappService`, `mockPaymentLinkProvider`, plus the `AuditService` real provider so the audit assertion works):

```ts
// E2E: C1 phase-2 — doctor assignment-pinning on GET /patients/:id plus the
// EmergencyAccess (Break-the-Glass) obligation path.
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@workspace/db';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/prisma/prisma.service';
import {
  setupTestDatabase,
  resetDatabase,
  closeDatabase,
  getPrismaInstance,
} from '../../setup';
import { factories, setPrismaInstance } from '../../factories';
import { signE2eAccessToken } from '../../e2e-auth-token';
import { WhatsappService } from '@/domains/whatsapp/application/services/whatsapp-clinic-facade.service';
import { mockWhatsappService } from '../../whatsapp.provider';
import { CLINIC_INVOICE_PAYMENT_LINK_PROVIDER_TOKEN } from '@/domains/payments/core/ports/payment-link-provider.port';
import {
  clearMockPaymentLinkProvider,
  createMockPaymentLinkProvider,
} from '../../payment-link-provider.mock';

const mockPaymentLinkProvider = createMockPaymentLinkProvider();

describe('Patient ABAC assignment-pinning (e2e, C1 phase-2)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  beforeAll(async () => {
    setupTestDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(getPrismaInstance())
      .overrideProvider(WhatsappService)
      .useValue(mockWhatsappService)
      .overrideProvider(CLINIC_INVOICE_PAYMENT_LINK_PROVIDER_TOKEN)
      .useValue(mockPaymentLinkProvider)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useLogger(false);
    app.useGlobalPipes(new ZodValidationPipe());
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);
    setPrismaInstance(prisma);
  });

  beforeEach(async () => {
    await resetDatabase();
    clearMockPaymentLinkProvider(mockPaymentLinkProvider);
  });

  afterAll(async () => {
    if (app) await app.close();
    await closeDatabase();
  });

  const signStaff = async (clinicId: string, role: Role) => {
    const { user } = await factories.user({ clinicId, role });
    const token = signE2eAccessToken(jwtService, {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      clinicId: user.clinicId,
    });
    return { user, token };
  };

  it('assigned DOCTOR reads the patient (200)', async () => {
    const clinicA = await factories.clinic();
    const { user, token } = await signStaff(clinicA.id, Role.DOCTOR);
    const patient = await factories.patient(clinicA.id);
    await factories.patientDoctor(patient.id, user.id, clinicA.id);

    await request(app.getHttpServer())
      .get(`/patients/${patient.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('unassigned DOCTOR is denied (403)', async () => {
    const clinicA = await factories.clinic();
    const { token } = await signStaff(clinicA.id, Role.DOCTOR);
    const patient = await factories.patient(clinicA.id);

    await request(app.getHttpServer())
      .get(`/patients/${patient.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('ADMIN_DOCTOR bypasses pinning (200)', async () => {
    const clinicA = await factories.clinic();
    const { token } = await signStaff(clinicA.id, Role.ADMIN_DOCTOR);
    const patient = await factories.patient(clinicA.id);

    await request(app.getHttpServer())
      .get(`/patients/${patient.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('NURSE bypasses pinning (200)', async () => {
    const clinicA = await factories.clinic();
    const { token } = await signStaff(clinicA.id, Role.NURSE);
    const patient = await factories.patient(clinicA.id);

    await request(app.getHttpServer())
      .get(`/patients/${patient.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('unassigned DOCTOR with x-break-the-glass gains emergency access (200) and the grant is audited', async () => {
    const clinicA = await factories.clinic();
    const { user, token } = await signStaff(clinicA.id, Role.DOCTOR);
    const patient = await factories.patient(clinicA.id);

    await request(app.getHttpServer())
      .get(`/patients/${patient.id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-break-the-glass', 'true')
      .set('x-btg-reason', 'e2e emergency test')
      .expect(200);

    // AuditService.createAuditLog maps { actionType -> action, resourceType ->
    // entityType, resourceId -> entityId }, so query the persisted columns.
    const auditRow = await prisma.auditLog.findFirst({
      where: {
        userId: user.id,
        action: 'EMERGENCY_ACCESS_GRANTED',
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(auditRow).toBeDefined();
    expect(auditRow?.entityId).toBe('BREAK_THE_GLASS');
  });

  it('unassigned DOCTOR without the BTG header is still denied after the emergency path exists (403)', async () => {
    const clinicA = await factories.clinic();
    const { token } = await signStaff(clinicA.id, Role.DOCTOR);
    const patient = await factories.patient(clinicA.id);

    await request(app.getHttpServer())
      .get(`/patients/${patient.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });
});
```

- [ ] **Step 4: Typecheck + run the two patients e2e specs**

Run: `pnpm --filter @docita/api run check-types`
Run (docker test Postgres already up on `:5434`):
```bash
cd apps/api && npx jest --config ./test/jest-e2e.json --runInBand test/e2e/patients
```
Expected: both patients specs green — `patient-abac-policy` (5 cases, now with assignment rows) and `patient-abac-pinning` (6 cases). If `EMERGENCY_ACCESS_GRANTED` assertion fails, check the `AuditService` mock wiring in `beforeAll` (the real `AuditService` must be resolvable — the AppModule provides it; do not override it).

- [ ] **Step 5: Commit**

```bash
git add apps/api/test/factories.ts apps/api/test/e2e/patients
git commit -m "test(api): e2e proof for assignment-pinning + EmergencyAccess audit (C1 phase-2)"
```

---

### Task 5: Docs — ADR-0013 amendment, ACCESS_AUDIT, EXECUTION_PLAN

**Files:**
- Modify: `docs/architecture/decisions/0013-abac.md`
- Modify: `docs/compliance/ACCESS_AUDIT.md`
- Modify: `docs/analysis/EXECUTION_PLAN.md`

- [ ] **Step 1: Amend ADR-0013**

In `docs/architecture/decisions/0013-abac.md`, change the "Deferred product decision" section heading to **"Assignment-pinning: ENABLED on the staff surface 2026-08-06 (C1 phase-2)"** and replace its body with:

> **Status: ENABLED on the staff surface (2026-08-06, C1 phase-2).** `PatientResourceResolver` now returns `requiresAssignment: true` for the staff `GET/PATCH /patients/:id` surface. The differential-equivalence pass (package oracle tests + e2e) proves the new semantics equal the legacy `PatientDoctorGuard` *intended* semantics: only plain `DOCTOR` is pinned; `ADMIN_DOCTOR`/`NURSE`/`RECEPTIONIST`/`ADMIN`/`INTERNAL` bypass (mirroring the legacy guard's bypass list); PATIENT own-row unchanged; cross-clinic still 404. Existing-user compatibility: `packages/db/scripts/backfill-patient-doctor.ts` creates active `PatientDoctor` rows from appointment history before the flag flipped, so no existing doctor-patient relationship lost access. Emergency escape hatch: `PolicyGuard` honors `x-break-the-glass` on `@EmergencyAccess()` routes (added to `GET /patients/:id`); `BreakTheGlassInterceptor` audits `EMERGENCY_ACCESS_GRANTED` and sets the RLS bypass. The future patient-portal resolver continues to flip the same flag for portal reads.

- [ ] **Step 2: Update ACCESS_AUDIT.md policy index**

In `docs/compliance/ACCESS_AUDIT.md`, in the ABAC policy index table, change the `patient` row's Surface/Rules cells: note `requiresAssignment: true` on the staff surface since C1 phase-2, the legacy-guard-mirroring bypass list, and the EmergencyAccess obligation (`x-break-the-glass` + `@EmergencyAccess()` on `GET /patients/:id`, audited `EMERGENCY_ACCESS_GRANTED`).

- [ ] **Step 3: Update EXECUTION_PLAN.md**

In `docs/analysis/EXECUTION_PLAN.md`, extend the "NOTE 2026-08-06 — ABAC first slice" paragraph (or add a sibling NOTE) with: C1 phase-2 shipped — assignment-pinning on the staff patients surface, `PatientDoctor` backfill from appointment history, EmergencyAccess obligation, and the ADR-0013 amendment link.

- [ ] **Step 4: Commit**

```bash
git add docs/architecture/decisions/0013-abac.md docs/compliance/ACCESS_AUDIT.md docs/analysis/EXECUTION_PLAN.md
git commit -m "docs(authz): record C1 phase-2 assignment-pinning enablement + EmergencyAccess obligation"
```

---

### Task 6: Full validation gate

- [ ] **Step 1: Run every gate (each must exit 0)**

```bash
pnpm --filter @workspace/authorization run check-types
pnpm --filter @workspace/authorization run test
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
cd apps/api && npx jest --config ./test/jest-e2e.json --runInBand test/e2e/patients test/e2e/auth test/e2e/tier-gating test/e2e/audit
```
Expected: all green; no existing spec regressed (the pinning change only affects routes with `@RequirePolicy('patient', ...)`, and the two first-slice specs were updated to create assignment rows).

- [ ] **Step 3: Commit any fixups and verify the tree**

```bash
git status --short   # only expected files; no stray logs/artifacts
```

---

## Definition of done for C1 phase-2

- [ ] `PatientResourceResolver` returns `requiresAssignment: true` on the staff surface; `PolicyGuard` honors the BTG header on `@EmergencyAccess()` routes before the policy stage.
- [ ] `PatientAbacPolicy` pins only plain `DOCTOR`; `ADMIN_DOCTOR`/`NURSE`/`RECEPTIONIST`/`ADMIN`/`INTERNAL` bypass (mirrors legacy `PatientDoctorGuard`); differential-oracle tests cover every pinned/role-bypass case.
- [ ] `packages/db/scripts/backfill-patient-doctor.ts` exists, is insert-only + idempotent, dry-runs cleanly against the test DB, and passes `db:check-integrity`.
- [ ] e2e proves: assigned DOCTOR 200, unassigned DOCTOR 403, ADMIN_DOCTOR 200, NURSE 200, BTG 200 + `EMERGENCY_ACCESS_GRANTED` audit row, no-BTG still 403; first-slice patients spec still green.
- [ ] ADR-0013 records the enablement + backfill + differential-pass evidence; ACCESS_AUDIT and EXECUTION_PLAN updated.
- [ ] `verify:standard`, knip, circular, lint, all check-types, authorization + API test suites, and the guard-adjacent e2e suites pass.
- [ ] No guard, tenant, tier, feature, RLS, or audit check weakened; the only behavior change is the documented DOCTOR-pinning tightening with its backfill + emergency escape hatch.

## Out of scope (later plans)

Patient-portal resolver changes (already pins via the same flag), C2 appointments, C3 prescriptions, C4 lab/payments, C5 audit-log resources, C6 cross-tenant referral, C7 frontend snapshot, Phase D retirement ledger, Phase E parity-gate cutover, worker-side consumption of `@workspace/authorization`.
