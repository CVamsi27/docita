# C3 — Prescriptions ABAC Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce `@RequirePolicy('prescription', ...)` on the object-level prescription routes — read retains the RBAC matrix roles, while `update`/`sign` (approval) gains author-of-record identity — mirroring the legacy `PrescriptionPolicy` semantics with differential + e2e proof, as the C3 slice of ADR-0013.

**Architecture:** Add a pure `PrescriptionAbacPolicy` to `@workspace/authorization` (mirroring `AppointmentAbacPolicy`), a `PrescriptionResourceResolver` to the API resolver registry, register both in the existing ABAC registries/module, and decorate the three read routes on `PrescriptionsController` plus the approve route on `LegacyWhatsappApprovalController`. The author-of-record pin on `update`/`sign` is a **recorded tightening** (today the approve route is roles-only) — exactly the C1 assignment-pinning precedent — so the differential oracle encodes the *intended* post-C3 semantics and the ADR records the decision.

**Tech Stack:** NestJS, Prisma, `@workspace/authorization` (pure policy engine), `@workspace/types` attribute schemas (no changes needed — `assignedDoctorIds`/`assignedPatientId`/`status` already exist), Vitest (package), Jest (API).

## Global Constraints

- Default-deny, deny-overrides; missing attribute = deny, never allow (ABAC_MIGRATION_PLAN §5.1).
- No guard weakening: `@Roles`, `@RequireFeature`, tier, tenant, RLS, audit gates remain in force; policy is additive (§5.2).
- Zod-first: attribute schemas live once in `packages/types` — do NOT add parallel interfaces or new schema fields for this slice (§5.4).
- No PHI in logs or decision records; obligations reference ids/reasons only (§5.5).
- Differential-oracle tests + e2e must prove the wire outcome is unchanged EXCEPT the recorded author-of-record tightening on the approve route.
- `Prescription.clinicId` is nullable (`onDelete: SetNull`); resolve clinic from the required `appointment` relation when the column is null.
- jscpd mirror-pairs suppressed with `jscpd:ignore-start/ignore-end` + `SUPPRESSION_LEDGER.md` row (repo precedent).
- New `@RequirePolicy` resources must register both a policy (AbacPolicyRegistry) and a resolver (PolicyResourceResolverRegistry) — `check:policy-resolver-coverage` is a hard gate.
- No emojis, no console.log/console.error; kebab-case files, `handle*` callbacks; comments explain "why" only.
- Commit per task with a focused message; branch cap respected (work continues on `fix/app-deployment-failure`).

---

### Task 1: PrescriptionAbacPolicy (pure policy) + differential-oracle test

**Files:**
- Create: `packages/authorization/src/policies/prescription.policy.ts`
- Create: `packages/authorization/src/policies/prescription.policy.test.ts`
- Modify: `packages/authorization/src/index.ts` (add export)

**Interfaces:**
- Consumes: `AbacPolicy`, `AbacDecision`, `AbacAction` from `../types.js`; `allowDecision`, `denyDecision`, `notApplicableDecision` from `../evaluator.js`; `SubjectAttributes`/`ResourceAttributes`/`EnvAttributes` from `@workspace/types/authorization`.
- Produces: `PrescriptionAbacPolicy` class with `readonly id = "prescription"` and `can(action, subject, resource, env): AbacDecision` — the same contract as `AppointmentAbacPolicy`.

- [ ] **Step 1: Write the failing test**

`packages/authorization/src/policies/prescription.policy.test.ts` — schema-based helpers (copy the `appointment.policy.test.ts` shape) plus an oracle table. The oracle encodes the **intended** semantics (legacy `PrescriptionPolicy` + recorded C3 author-of-record tightening):

```ts
import { describe, expect, it } from "vitest";
import {
  type EnvAttributes,
  envAttributesSchema,
  type ResourceAttributes,
  resourceAttributesSchema,
  type SubjectAttributes,
  subjectAttributesSchema,
} from "@workspace/types/authorization";
import { PrescriptionAbacPolicy } from "./prescription.policy.js";

const policy = new PrescriptionAbacPolicy();

function subject(overrides: Partial<SubjectAttributes>): SubjectAttributes {
  return subjectAttributesSchema.parse({
    userId: "u1",
    roles: ["DOCTOR"],
    clinicId: "clinic-a",
    doctorId: "u1",
    ...overrides,
  });
}

function resource(overrides: Partial<ResourceAttributes>): ResourceAttributes {
  return resourceAttributesSchema.parse({
    type: "prescription",
    clinicId: "clinic-a",
    ownerId: null,
    assignedDoctorIds: ["d1"],
    assignedPatientId: "pat-1",
    classification: "phi",
    requiresAssignment: false,
    ...overrides,
  });
}

const env: EnvAttributes = envAttributesSchema.parse({
  authnContext: "session",
  time: "2026-08-07T00:00:00.000Z",
});

describe("PrescriptionAbacPolicy", () => {
  it("allows INTERNAL regardless of clinic", () => {
    const result = policy.can(
      "read",
      subject({ roles: ["INTERNAL"], clinicId: "internal-bypass", doctorId: null }),
      resource({ clinicId: "clinic-b" }),
      env,
    );
    expect(result.effect).toBe("allow");
  });

  it("is not-applicable for a non-prescription resource", () => {
    const result = policy.can("read", subject({}), resource({ type: "appointment" }), env);
    expect(result.effect).toBe("not-applicable");
  });

  it("denies cross-clinic access (tenant discipline)", () => {
    const result = policy.can("read", subject({}), resource({ clinicId: "clinic-b" }), env);
    expect(result).toMatchObject({ effect: "deny", reason: "tenant_mismatch" });
  });

  it("allows the author DOCTOR to update their own prescription", () => {
    const result = policy.can(
      "update",
      subject({ roles: ["DOCTOR"], doctorId: "d1" }),
      resource({ assignedDoctorIds: ["d1"] }),
      env,
    );
    expect(result.effect).toBe("allow");
  });

  it("denies a non-author DOCTOR from updating another doctor's prescription (C3 author-of-record)", () => {
    const result = policy.can(
      "update",
      subject({ roles: ["DOCTOR"], doctorId: "d9" }),
      resource({ assignedDoctorIds: ["d1"] }),
      env,
    );
    expect(result).toMatchObject({ effect: "deny", reason: "ownership_denied" });
  });

  it("denies a DOCTOR with no doctorId from updating (missing attribute = deny)", () => {
    const result = policy.can(
      "update",
      subject({ roles: ["DOCTOR"], doctorId: null }),
      resource({ assignedDoctorIds: ["d1"] }),
      env,
    );
    expect(result).toMatchObject({ effect: "deny", reason: "ownership_denied" });
  });

  it("allows a non-author DOCTOR to READ another doctor's prescription (read retains matrix roles)", () => {
    const result = policy.can(
      "read",
      subject({ roles: ["DOCTOR"], doctorId: "d9" }),
      resource({ assignedDoctorIds: ["d1"] }),
      env,
    );
    expect(result.effect).toBe("allow");
  });

  it("allows a PATIENT on their own prescription (read)", () => {
    const result = policy.can(
      "read",
      subject({ roles: ["PATIENT"], patientId: "pat-1", doctorId: null }),
      resource({ assignedPatientId: "pat-1" }),
      env,
    );
    expect(result.effect).toBe("allow");
  });

  it("denies a PATIENT on another patient's prescription", () => {
    const result = policy.can(
      "read",
      subject({ roles: ["PATIENT"], patientId: "pat-1", doctorId: null }),
      resource({ assignedPatientId: "pat-2" }),
      env,
    );
    expect(result).toMatchObject({ effect: "deny", reason: "ownership_denied" });
  });

  it("denies a PATIENT any non-read action", () => {
    const result = policy.can(
      "update",
      subject({ roles: ["PATIENT"], patientId: "pat-1", doctorId: null }),
      resource({ assignedPatientId: "pat-1" }),
      env,
    );
    expect(result).toMatchObject({ effect: "deny", reason: "role_denied" });
  });

  it.each(["NURSE", "RECEPTIONIST", "ADMIN", "ADMIN_DOCTOR", "LAB"] as const)(
    "%s is clinic-wide on prescriptions (legacy PrescriptionPolicy)",
    (role) => {
      const result = policy.can(
        "read",
        subject({ roles: [role], doctorId: null }),
        resource({}),
        env,
      );
      expect(result.effect).toBe("allow");
    },
  );
});

type OracleRow = {
  name: string;
  sub: SubjectAttributes;
  res: ResourceAttributes;
  action: "read" | "update" | "delete";
  // Intended semantics: legacy PrescriptionPolicy (PATIENT own-row read-only;
  // DOCTOR author-of-record on update/delete; all other staff clinic-wide) +
  // the recorded C3 tightening that the approve route ("sign" = update) is
  // author-of-record, not roles-only as it is on the wire today.
  intended: "allow" | "deny";
};

const ORACLE_ROWS: OracleRow[] = [
  {
    name: "author DOCTOR on own prescription (update)",
    sub: subject({ roles: ["DOCTOR"], doctorId: "d1" }),
    res: resource({ assignedDoctorIds: ["d1"] }),
    action: "update",
    intended: "allow",
  },
  {
    name: "non-author DOCTOR update (C3 recorded tightening)",
    sub: subject({ roles: ["DOCTOR"], doctorId: "d9" }),
    res: resource({ assignedDoctorIds: ["d1"] }),
    action: "update",
    intended: "deny",
  },
  {
    name: "non-author DOCTOR read (read retains matrix roles)",
    sub: subject({ roles: ["DOCTOR"], doctorId: "d9" }),
    res: resource({ assignedDoctorIds: ["d1"] }),
    action: "read",
    intended: "allow",
  },
  {
    name: "ADMIN update any clinic prescription",
    sub: subject({ roles: ["ADMIN"], doctorId: null }),
    res: resource({}),
    action: "update",
    intended: "allow",
  },
  {
    name: "ADMIN_DOCTOR update any clinic prescription",
    sub: subject({ roles: ["ADMIN_DOCTOR"], doctorId: null }),
    res: resource({}),
    action: "update",
    intended: "allow",
  },
  {
    name: "NURSE read any clinic prescription",
    sub: subject({ roles: ["NURSE"], doctorId: null }),
    res: resource({}),
    action: "read",
    intended: "allow",
  },
  {
    name: "RECEPTIONIST read any clinic prescription",
    sub: subject({ roles: ["RECEPTIONIST"], doctorId: null }),
    res: resource({}),
    action: "read",
    intended: "allow",
  },
  {
    name: "staff cross-clinic (404 via guard tenant discipline)",
    sub: subject({ roles: ["DOCTOR"] }),
    res: resource({ clinicId: "clinic-b" }),
    action: "read",
    intended: "deny",
  },
  {
    name: "PATIENT own prescription read (portal parity)",
    sub: subject({ roles: ["PATIENT"], patientId: "pat-1", doctorId: null }),
    res: resource({ assignedPatientId: "pat-1" }),
    action: "read",
    intended: "allow",
  },
  {
    name: "PATIENT on another patient's prescription",
    sub: subject({ roles: ["PATIENT"], patientId: "pat-1", doctorId: null }),
    res: resource({ assignedPatientId: "pat-2" }),
    action: "read",
    intended: "deny",
  },
  {
    name: "PATIENT non-read action",
    sub: subject({ roles: ["PATIENT"], patientId: "pat-1", doctorId: null }),
    res: resource({ assignedPatientId: "pat-1" }),
    action: "update",
    intended: "deny",
  },
  {
    name: "INTERNAL cross-clinic bypass",
    sub: subject({ roles: ["INTERNAL"], clinicId: "internal-bypass", doctorId: null }),
    res: resource({ clinicId: "clinic-b" }),
    action: "read",
    intended: "allow",
  },
];

describe("differential: policy outcome === intended outcome", () => {
  for (const row of ORACLE_ROWS) {
    it(row.name, () => {
      const result = policy.can(row.action, row.sub, row.res, env);
      const policyAllows = result.effect === "allow";
      expect(policyAllows).toBe(row.intended === "allow");
    });
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd packages/authorization && pnpm vitest run src/policies/prescription.policy.test.ts`
Expected: FAIL — `Cannot find module './prescription.policy.js'`.

- [ ] **Step 3: Write the minimal implementation**

`packages/authorization/src/policies/prescription.policy.ts` (mirror of `appointment.policy.ts` with the legacy prescription branch ordering):

```ts
// jscpd:ignore-start — intentional mirror of appointment.policy.ts (C3, ADR-0013):
// policies share the posture scaffold (imports + decision ordering). See
// docs/analysis/SUPPRESSION_LEDGER.md.
import type { AbacAction, AbacDecision, AbacPolicy } from "../types.js";
import { allowDecision, denyDecision, notApplicableDecision } from "../evaluator.js";
import type { EnvAttributes, ResourceAttributes, SubjectAttributes } from "@workspace/types/authorization";

/** Roles that may operate a prescription within their own clinic (legacy PrescriptionPolicy: only DOCTOR/PATIENT get object checks). */
const CLINICAL_STAFF_ROLES = new Set(["DOCTOR", "ADMIN_DOCTOR", "NURSE", "RECEPTIONIST", "ADMIN", "LAB"]);

/**
 * Prescription object-level policy (C3, ADR-0013). Mirrors the legacy
 * PrescriptionPolicy: PATIENT own-row read-only; DOCTOR author-of-record on
 * update/delete (sign maps to update at the enforcement stage); other
 * clinical staff clinic-wide after the matrix gates. Read retains the matrix
 * roles — a non-author DOCTOR may read any clinic prescription.
 * Order matters:
 *   1. INTERNAL bypass
 *   2. not-applicable for non-prescription resources
 *   3. tenant discipline (cross-clinic → PolicyGuard 404, no existence disclosure)
 *   4. PATIENT own-row (assignedPatientId === subject.patientId), read-only
 *   5. DOCTOR author-of-record on update/delete (assignedDoctorIds derived
 *      from prescription.doctorId; unconditional, a prescription always
 *      carries its author)
 *   6. clinical staff same-clinic
 *   7. default-deny
 */
export class PrescriptionAbacPolicy implements AbacPolicy {
  readonly id = "prescription";

  can(
    action: AbacAction,
    subject: SubjectAttributes,
    resource: ResourceAttributes,
    _env: EnvAttributes,
  ): AbacDecision {
    if (subject.roles.includes("INTERNAL")) return allowDecision(this.id);

    if (resource.type !== "prescription") return notApplicableDecision(this.id);

    if (subject.clinicId && resource.clinicId && subject.clinicId !== resource.clinicId) {
      return denyDecision(this.id, "tenant_mismatch");
    }

    if (subject.roles.includes("PATIENT")) {
      if (!resource.assignedPatientId || resource.assignedPatientId !== subject.patientId) {
        return denyDecision(this.id, "ownership_denied");
      }
      if (action !== "read") return denyDecision(this.id, "role_denied");
      return allowDecision(this.id);
    }

    if (subject.roles.includes("DOCTOR") && (action === "update" || action === "delete")) {
      if (!subject.doctorId || !resource.assignedDoctorIds.includes(subject.doctorId)) {
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
// jscpd:ignore-end
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd packages/authorization && pnpm vitest run src/policies/prescription.policy.test.ts`
Expected: PASS (all unit + oracle rows).

- [ ] **Step 5: Export the policy and run the full package suite**

Add to `packages/authorization/src/index.ts` after the appointment export:
```ts
export * from "./policies/prescription.policy.js";
```
Run: `cd packages/authorization && pnpm vitest run` then `pnpm check-types` (or `npx tsc --noEmit`) and `pnpm build`.
Expected: all green (existing patient/appointment suites unchanged).

- [ ] **Step 6: Commit**

```bash
git add packages/authorization/src/policies/prescription.policy.ts packages/authorization/src/policies/prescription.policy.test.ts packages/authorization/src/index.ts
git commit -m "feat(authz): PrescriptionAbacPolicy — author-of-record update/sign, read retains matrix roles"
```

---

### Task 2: PrescriptionResourceResolver + registry + module wiring

**Files:**
- Create: `apps/api/src/shared/modules/auth/authorization/resolvers/prescription-resource.resolver.ts`
- Modify: `apps/api/src/shared/modules/auth/authorization/resolvers/policy-resource-resolver.ts` (register)
- Modify: `apps/api/src/shared/modules/auth/authorization/abac-policy.registry.ts` (register)
- Modify: `apps/api/src/shared/modules/auth/authorization/authorization.module.ts` (providers + imports)
- Modify: `apps/api/src/shared/modules/auth/authorization/authorization.service.spec.ts` (constructor arg)

**Interfaces:**
- Consumes: `PolicyResourceResolver` interface (from `./policy-resource-resolver.interface.ts`), `ResourceAttributes` type, `PrismaService`, `PrescriptionAbacPolicy` from `@workspace/authorization`.
- Produces: `PrescriptionResourceResolver` (`readonly resource = "prescription"`; `resolve(context): Promise<ResourceAttributes>`); `AbacPolicyRegistry` and `PolicyResourceResolverRegistry` both map `"prescription"`.

- [ ] **Step 1: Write the resolver**

`apps/api/src/shared/modules/auth/authorization/resolvers/prescription-resource.resolver.ts`:

```ts
// jscpd:ignore-start — intentional mirror of appointment-resource.resolver.ts
// (C3, ADR-0013): resolvers share the standard scaffold (imports + resolve
// posture). See docs/analysis/SUPPRESSION_LEDGER.md.
import { Injectable, NotFoundException } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import type { ResourceAttributes } from "@workspace/types";
import type { PolicyResourceResolver } from "./policy-resource-resolver.interface";

/**
 * Resolves a `prescription` resource from the route param (`:id` on the
 * prescriptions controller; `:id` on the whatsapp approve-prescription
 * route). Missing row → 404 (no existence disclosure). Cross-clinic rows
 * resolve fine here — the policy's tenant discipline turns them into 404 via
 * PolicyGuard (same wire contract as the clinic-scoped repository). The
 * author-of-record is the row's own `doctorId` (required, non-null). Note
 * `Prescription.clinicId` is nullable (`onDelete: SetNull`) — fall back to
 * the required `appointment` relation, which always carries the clinic.
 */
@Injectable()
export class PrescriptionResourceResolver implements PolicyResourceResolver {
  readonly resource = "prescription";

  constructor(private readonly prisma: PrismaService) {}

  async resolve(context: ExecutionContext): Promise<ResourceAttributes> {
    const request = context
      .switchToHttp()
      .getRequest<{ params: Record<string, string | undefined> }>();
    const prescriptionId = request.params?.id;
    if (!prescriptionId) throw new NotFoundException("Prescription not found");

    const prescription = await this.prisma.prescription.findUnique({
      where: { id: prescriptionId },
      select: {
        id: true,
        clinicId: true,
        doctorId: true,
        patientId: true,
        approvalStatus: true,
        appointment: { select: { clinicId: true } },
      },
    });
    if (!prescription) throw new NotFoundException("Prescription not found");

    return {
      type: "prescription",
      clinicId: prescription.clinicId ?? prescription.appointment.clinicId,
      ownerId: null,
      assignedDoctorIds: [prescription.doctorId],
      assignedPatientId: prescription.patientId,
      classification: "phi",
      consentState: null,
      status: prescription.approvalStatus,
      requiresAssignment: false,
    };
  }
}
// jscpd:ignore-end
```

- [ ] **Step 2: Register in the resolver registry**

In `apps/api/src/shared/modules/auth/authorization/resolvers/policy-resource-resolver.ts`:
- Import `PrescriptionResourceResolver`.
- Constructor: add `@Inject(PrescriptionResourceResolver) prescription: PolicyResourceResolver` parameter.
- Map: add `["prescription", prescription],`.

- [ ] **Step 3: Register in the policy registry**

In `apps/api/src/shared/modules/auth/authorization/abac-policy.registry.ts`:
- Import `PrescriptionAbacPolicy` from `@workspace/authorization` (add to the existing import list).
- Constructor: add `prescription: PrescriptionAbacPolicy` parameter.
- Map: add `["prescription", prescription],`.

- [ ] **Step 4: Wire the module**

In `apps/api/src/shared/modules/auth/authorization/authorization.module.ts`:
- Add `import { PrescriptionResourceResolver } from "./resolvers/prescription-resource.resolver";`
- Add `PrescriptionAbacPolicy` to the `@workspace/authorization` import.
- Providers array: add `PrescriptionAbacPolicy` and `PrescriptionResourceResolver`.

- [ ] **Step 5: Update the service spec constructor**

In `apps/api/src/shared/modules/auth/authorization/authorization.service.spec.ts`:
- Import `PrescriptionAbacPolicy` from `@workspace/authorization`.
- `new AbacPolicyRegistry(new PatientAbacPolicy(), new AppointmentAbacPolicy())` → add `, new PrescriptionAbacPolicy()`.
- Add one `evaluateAbac` assertion for the new resource: a same-clinic DOCTOR `update` on a `type: "prescription"` resource where `assignedDoctorIds` includes `d1` is allowed; one where it does not is denied with `ownership_denied`.

- [ ] **Step 6: Typecheck + run the guard-adjacent unit specs**

Run: `cd apps/api && npx tsc --noEmit` (expect clean) and `npx jest authorization.service.spec.ts policy.guard.spec.ts -t "prescription" --silent` (the new spec cases) — then the full two files.
Expected: all pass.

- [ ] **Step 7: Verify the static gate accepts the new resource**

Run: `node scripts/checks/check-policy-resolver-coverage.mjs`
Expected: exit 0 (both `prescription-resource.resolver.ts` file exists and `['prescription',` registration found).

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/shared/modules/auth/authorization/
git commit -m "feat(api): PrescriptionResourceResolver + ABAC registries + module wiring"
```

---

### Task 3: Decorate the read routes with @RequirePolicy

**Files:**
- Modify: `apps/api/src/domains/prescriptions/presentation/controllers/prescription.controller.ts`

**Interfaces:**
- Consumes: `@RequirePolicy` decorator from `@/shared/modules/auth/decorators/require-policy.decorator`.
- Produces: `GET /prescriptions/:id`, `GET /prescriptions/:id/pdf/status`, `GET /prescriptions/:id/pdf` all declare `@RequirePolicy("prescription", "read")`.

- [ ] **Step 1: Add the decorator to the three read routes**

In `prescription.controller.ts`:
- Add `import { RequirePolicy } from "@/shared/modules/auth/decorators/require-policy.decorator";`
- On `@Get(":id")` — the `findOne` handler — add `@RequirePolicy("prescription", "read")`.
- On `@Get(":id/pdf/status")` — the `getPdfStatus` handler — add `@RequirePolicy("prescription", "read")`.
- On `@Get(":id/pdf")` — the `getPdf` handler — add `@RequirePolicy("prescription", "read")`.

Do NOT decorate `@Get()` (list), `@Post()` (create — no object yet, matrix-gated), or the patient-portal prescriptions surface (separate PATIENT surface; the policy's PATIENT branch is parity-ready but enforcement there is out of scope for C3).

- [ ] **Step 2: Typecheck + lint**

Run: `cd apps/api && npx tsc --noEmit` and `pnpm exec eslint src/domains/prescriptions/presentation/controllers/prescription.controller.ts`
Expected: clean.

- [ ] **Step 3: Run the existing prescriptions e2e spec (no regression)**

Run: `cd apps/api && npx jest --config ./test/jest-e2e prescriptions --silent 2>&1 | tail -5`
Expected: the existing `prescriptions.e2e-spec.ts` passes unchanged — its GET `:id` tests read as the authoring DOCTOR (author-of-record = themselves) and expect 404 for a missing id (resolver 404 path). No assignment rows are needed because read is NOT author-pinned.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/domains/prescriptions/presentation/controllers/prescription.controller.ts
git commit -m "feat(api): enforce PrescriptionAbacPolicy read on GET /prescriptions/:id + pdf routes"
```

---

### Task 4: Author-of-record on the approve route (@RequirePolicy update)

**Files:**
- Modify: `apps/api/src/domains/whatsapp/presentation/controllers/legacy-whatsapp-approval.controller.ts`

**Interfaces:**
- Consumes: `@RequirePolicy` decorator.
- Produces: `POST /whatsapp/approve-prescription/:id` declares `@RequirePolicy("prescription", "update")` — the "sign" action, enforced as `update` (the action vocabulary has no `sign`; the legacy policy's `update` branch covers it). `approve-invoice` stays untouched (C4 scope).

- [ ] **Step 1: Add the decorator**

In `legacy-whatsapp-approval.controller.ts`:
- Add `import { RequirePolicy } from "@/shared/modules/auth/decorators/require-policy.decorator";`
- On the `approvePrescription` handler (below its existing `@Roles(Role.DOCTOR, Role.ADMIN, Role.ADMIN_DOCTOR)` line), add `@RequirePolicy("prescription", "update")`.

**Recorded decision (C3, ADR-0013):** this is a **tightening**. Today the route is roles-only — any DOCTOR in the clinic can approve any prescription. After C3, a plain DOCTOR must be the author (`prescription.doctorId === user.id`); ADMIN/ADMIN_DOCTOR/NURSE/RECEPTIONIST/LAB remain clinic-wide per the legacy policy. The service-layer `approvePrescription` (which sets `approvedById`) is unchanged — the guard denies before the handler for non-authors.

- [ ] **Step 2: Typecheck + lint**

Run: `cd apps/api && npx tsc --noEmit` and `pnpm exec eslint src/domains/whatsapp/presentation/controllers/legacy-whatsapp-approval.controller.ts`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/domains/whatsapp/presentation/controllers/legacy-whatsapp-approval.controller.ts
git commit -m "feat(api): author-of-record on approve-prescription via PrescriptionAbacPolicy update"
```

---

### Task 5: e2e proof — prescription-abac.e2e-spec.ts

**Files:**
- Create: `apps/api/test/e2e/prescriptions/prescription-abac.e2e-spec.ts`

**Interfaces:**
- Consumes: `factories` (`clinic`, `user`, `patient`, `appointment`, `prescription`), `signE2eAccessToken`, `mockWhatsappService`, payment-link mock (same harness as `appointment-abac.e2e-spec.ts`). The shared `mockWhatsappService` LACKS `approvePrescription` — extend it locally in this spec (do not edit `whatsapp.provider.ts`).
- Produces: proof that the C3 wire contract holds: author DOCTOR read 200, non-author DOCTOR read 200 (matrix), NURSE/ADMIN read 200, cross-clinic 404, missing 404, unauth 401, non-author approve 403 (tightening), author/ADMIN approve 200.

- [ ] **Step 1: Write the spec**

`apps/api/test/e2e/prescriptions/prescription-abac.e2e-spec.ts` — same harness as `appointment-abac.e2e-spec.ts` (module fixture with Prisma override, WhatsappService override, payment-link provider override, `setupTestDatabase`/`resetDatabase` per test). Override WhatsappService with `{ ...mockWhatsappService, approvePrescription: jest.fn().mockResolvedValue({ success: true }) }`. The helper `signStaff(clinicId, role)` returns `{ user, token }`. Create a prescription via `factories.prescription(appointmentId, patientId, doctorId)` after `factories.appointment(patientId, doctorId, clinicId)`.

Tests (each `it`):
1. `author DOCTOR reads their own prescription (200)`
2. `non-author DOCTOR reads another doctor's prescription (200 — read retains matrix roles)` — second DOCTOR user via `factories.user`, prescription authored by the first.
3. `NURSE reads any clinic prescription (200)`
4. `ADMIN reads any clinic prescription (200)`
5. `staff DOCTOR of another clinic cannot read the prescription (404, no existence disclosure)`
6. `unknown prescription id is a 404`
7. `unauthenticated request is rejected (401)`
8. `non-author DOCTOR cannot approve another doctor's prescription (403 — C3 author-of-record)`
9. `author DOCTOR approves their own prescription (200)`
10. `ADMIN approves any clinic prescription (200)`

- [ ] **Step 2: Run the new spec**

Run: `cd apps/api && npx jest --config ./test/jest-e2e prescription-abac --silent 2>&1 | tail -8`
Expected: PASS (10/10).

- [ ] **Step 3: Run the whole prescriptions e2e directory**

Run: `cd apps/api && npx jest --config ./test/jest-e2e prescriptions --silent 2>&1 | tail -8`
Expected: all prescription suites pass (existing `prescriptions.e2e-spec.ts` + new `prescription-abac.e2e-spec.ts`).

- [ ] **Step 4: Lint + commit**

Run: `cd apps/api && pnpm exec eslint test/e2e/prescriptions/prescription-abac.e2e-spec.ts`
Expected: clean.
```bash
git add apps/api/test/e2e/prescriptions/prescription-abac.e2e-spec.ts
git commit -m "test(api): e2e proof for PrescriptionAbacPolicy differential-equivalence + author-of-record"
```

---

### Task 6: Docs — ADR-0013 amendment, ACCESS_AUDIT, EXECUTION_PLAN

**Files:**
- Modify: `docs/architecture/decisions/0013-abac.md`
- Modify: `docs/compliance/ACCESS_AUDIT.md`
- Modify: `docs/analysis/EXECUTION_PLAN.md`

- [ ] **Step 1: Amend ADR-0013**

Add a C3 section (after the C2 section): `PrescriptionAbacPolicy` enforced on `GET /prescriptions/:id` + both PDF routes (`read`) and `POST /whatsapp/approve-prescription/:id` (`update`). Record the decision: read retains matrix roles; `update`/`sign` is author-of-record — a tightening vs. the roles-only approve route, mirrored from the legacy `PrescriptionPolicy`'s `update`/`delete` DOCTOR branch, same precedent as C1 assignment-pinning. Note the `status` attribute carries `approvalStatus` (populated, not enforced) and the nullable `clinicId` fallback through `appointment`.

- [ ] **Step 2: Update the ACCESS_AUDIT policy index**

Add the `prescription` row to the ABAC policy index (mirroring the `appointment` row): resource, routes, decision ordering, e2e spec name.

- [ ] **Step 3: Update EXECUTION_PLAN P6.1 note**

Extend the ABAC NOTE with a C3 paragraph (shipped 2026-08-07, plan link, wire-contract summary, recorded tightening, validation numbers after Task 7).

- [ ] **Step 4: Commit**

```bash
git add docs/architecture/decisions/0013-abac.md docs/compliance/ACCESS_AUDIT.md docs/analysis/EXECUTION_PLAN.md
git commit -m "docs(authz): record C3 prescriptions enforcement + author-of-record tightening"
```

---

### Task 7: Full validation gate

**Files:** none (validation only).

- [ ] **Step 1: Package + unit gates**

Run in parallel (or sequence): `cd packages/authorization && pnpm vitest run` (all policy suites), `cd apps/api && npx jest --silent 2>&1 | tail -5` (API unit; expect all pass), `cd packages/types && pnpm test` if touched (it is not).

- [ ] **Step 2: Guard-adjacent e2e suites**

Run: `cd apps/api && npx jest --config ./test/jest-e2e prescriptions --silent` then the C1/C2 neighbors that share the guard chain: `patients`, `appointments`, `auth` (each under the 10-min tool clamp; report totals).

- [ ] **Step 3: Static gates**

Run: `pnpm check:policy-resolver-coverage`, `pnpm check:controller-rbac`, `pnpm check:circular:enforce`, `pnpm knip`, and `pnpm verify:standard` (the heavy 71-gate set).
Expected: all exit 0.

- [ ] **Step 4: Review pass**

Dispatch `code-reviewer-deepseek-flash` over the C3 commits (HEAD~6..HEAD) focusing on: policy decision ordering vs. legacy `PrescriptionPolicy`; the recorded author-of-record tightening on the approve route (correctness + differential-equivalence); resolver nullable-clinicId fallback; registry/DI wiring; `check-policy-resolver-coverage` compatibility. Fix findings, re-run affected tests, commit fixes.

- [ ] **Step 5: Final commit + close the plan**

Commit any review fixes; update this plan's checkboxes; record the gate results in the EXECUTION_PLAN note (already written in Task 6 — update numbers if they differ).
