# C4 — Invoices & Lab Orders ABAC Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce `@RequirePolicy('invoice', ...)` on the object-level invoice routes and `@RequirePolicy('lab-order', ...)` on the lab-order object routes (read/update), mirroring the legacy `InvoicePolicy` and the current lab-workflow wire contract, and resolve the recorded C3.1 open question — `approve-invoice` stays clinic-wide (legacy `InvoicePolicy` has no author-of-record branch, unlike prescriptions).

**Architecture:** Two pure policies in `@workspace/authorization` (`InvoiceAbacPolicy`, `LabOrderAbacPolicy`), two resolvers in the API resolver registry (`invoice-resource.resolver.ts`, `lab-order-resource.resolver.ts`), registered in the existing ABAC registries/module, with `@RequirePolicy` decorating the invoice `:id` routes + `approve-invoice` and the lab-order `:id` routes. Both are **mirror-only** slices: the differential oracle + e2e prove wire outcomes unchanged, with the C3.1 approve-invoice question resolved as a recorded decision.

**Tech Stack:** NestJS, Prisma, `@workspace/authorization`, `@workspace/types` attribute schemas (no schema changes needed), Vitest (package), Jest (API).

## Global Constraints

- Default-deny, deny-overrides; missing attribute = deny (§5.1). No guard weakening — policies are additive (§5.2).
- Zod-first: no new attribute schema fields for this slice; reuse `assignedDoctorIds`/`assignedPatientId`/`status`/`ownerId`.
- `Invoice.clinicId` is nullable (`onDelete: SetNull`) — the resolver falls back to the required `patient.clinicId` relation. `LabTestOrder.clinicId` is required non-null.
- **C3.1 resolution (recorded):** `approve-invoice` stays **clinic-wide** for the current `@Roles(DOCTOR, ADMIN, ADMIN_DOCTOR)` — the legacy `InvoicePolicy` has no author-of-record branch (unlike `PrescriptionPolicy`), so pinning it would be an unauthorized tightening. `approve-prescription` remains author-pinned (C3).
- **C4.1 deferral (recorded):** lab-order **assignment pinning** (LAB role → `LabTestOrder.labId`) and **front-desk payment-state conditions** are NOT enforced — no service-layer guard exists today, so enforcing them would tighten LAB/staff behavior beyond the legacy contract. The `status` attribute carries `LabTestOrderStatus` (populated, not enforced); the oracle + e2e pin the baseline and must flip in the same commit as any future decision.
- jscpd mirror-pairs suppressed inline + `SUPPRESSION_LEDGER.md` row.
- `check:policy-resolver-coverage` gate: every new `@RequirePolicy` resource needs both a policy registration and a resolver registration.
- No emojis, no console.log; kebab-case files; comments explain "why".
- Commit per task with a focused message on `fix/app-deployment-failure`.

---

### Task 1: InvoiceAbacPolicy (pure policy) + differential-oracle test

**Files:**
- Create: `packages/authorization/src/policies/invoice.policy.ts`
- Create: `packages/authorization/src/policies/invoice.policy.test.ts`
- Modify: `packages/authorization/src/index.ts` (add export)

**Interfaces:**
- Consumes: `AbacPolicy`/`AbacDecision`/`AbacAction` from `../types.js`; `allowDecision`/`denyDecision`/`notApplicableDecision` from `../evaluator.js`; attribute types from `@workspace/types/authorization`.
- Produces: `InvoiceAbacPolicy` with `readonly id = "invoice"` and the standard `can(action, subject, resource, env)` contract.

- [ ] **Step 1: Write the failing test**

`packages/authorization/src/policies/invoice.policy.test.ts` — schema-based helpers (copy the `appointment.policy.test.ts` shape) + oracle. Oracle = legacy `InvoicePolicy` (PATIENT own-row via `assignedPatientId`; all staff clinic-wide) + clinic-scoped repository (cross-clinic 404). The approve-invoice route is roles-only today (C3.1 resolution: keep clinic-wide; a non-author DOCTOR may approve).

Test cases (unit, `describe("InvoiceAbacPolicy")`):
1. INTERNAL bypass (cross-clinic allow).
2. not-applicable for a non-invoice resource.
3. tenant discipline: cross-clinic staff deny `tenant_mismatch`.
4. PATIENT own invoice read allow.
5. PATIENT another's invoice deny `ownership_denied`.
6. PATIENT update own invoice allow (legacy `InvoicePolicy` has no read-only restriction — it only checks ownership; portal surface parity).
7. `it.each` ADMIN/DOCTOR/RECEPTIONIST/ADMIN_DOCTOR/NURSE/LAB: clinic-wide read allow.

Oracle rows (`action: "read" | "update"`, `intended: "allow" | "deny"`):
- ADMIN same-clinic read → allow
- DOCTOR same-clinic read (any invoice, incl. non-author) → allow
- RECEPTIONIST same-clinic update → allow
- NURSE same-clinic read → allow
- LAB same-clinic read → allow (legacy InvoicePolicy allows all staff)
- staff cross-clinic → deny
- PATIENT own read → allow
- PATIENT another's read → deny
- PATIENT own update → allow (no read-only branch in legacy)
- INTERNAL cross-clinic → allow

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd packages/authorization && npx vitest run src/policies/invoice.policy.test.ts`
Expected: FAIL — `Cannot find module './invoice.policy.js'`.

- [ ] **Step 3: Write the minimal implementation**

`packages/authorization/src/policies/invoice.policy.ts` (mirror of `prescription.policy.ts` minus the DOCTOR author branch):

```ts
// jscpd:ignore-start — intentional mirror of prescription.policy.ts (C4, ADR-0013).
import type { AbacAction, AbacDecision, AbacPolicy } from "../types.js";
import { allowDecision, denyDecision, notApplicableDecision } from "../evaluator.js";
import type { EnvAttributes, ResourceAttributes, SubjectAttributes } from "@workspace/types/authorization";

/** Roles that may operate an invoice within their own clinic (legacy InvoicePolicy: only PATIENT gets an object check). */
const CLINICAL_STAFF_ROLES = new Set(["DOCTOR", "ADMIN_DOCTOR", "NURSE", "RECEPTIONIST", "ADMIN", "LAB"]);

/**
 * Invoice object-level policy (C4, ADR-0013). Mirrors the legacy InvoicePolicy:
 * PATIENT own-row; all clinical staff clinic-wide after the matrix gates.
 * NO doctor author-of-record branch — the legacy policy has none, so the C3.1
 * question resolved to keep approve-invoice clinic-wide (unlike prescriptions).
 * Order matters:
 *   1. INTERNAL bypass
 *   2. not-applicable for non-invoice resources
 *   3. tenant discipline (cross-clinic → PolicyGuard 404, no existence disclosure)
 *   4. PATIENT own-row (assignedPatientId === subject.patientId)
 *   5. clinical staff same-clinic
 *   6. default-deny
 */
export class InvoiceAbacPolicy implements AbacPolicy {
  readonly id = "invoice";

  can(
    _action: AbacAction,
    subject: SubjectAttributes,
    resource: ResourceAttributes,
    _env: EnvAttributes,
  ): AbacDecision {
    if (subject.roles.includes("INTERNAL")) return allowDecision(this.id);

    if (resource.type !== "invoice") return notApplicableDecision(this.id);

    if (subject.clinicId && resource.clinicId && subject.clinicId !== resource.clinicId) {
      return denyDecision(this.id, "tenant_mismatch");
    }

    if (subject.roles.includes("PATIENT")) {
      if (!resource.assignedPatientId || resource.assignedPatientId !== subject.patientId) {
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

Run: `cd packages/authorization && npx vitest run src/policies/invoice.policy.test.ts`
Expected: PASS (all unit + oracle rows).

- [ ] **Step 5: Export and run the full package suite**

Add to `packages/authorization/src/index.ts`: `export * from "./policies/invoice.policy.js";`
Run: `cd packages/authorization && npx vitest run` then `npx tsc --noEmit` and `pnpm build`.
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add packages/authorization/src/policies/invoice.policy.ts packages/authorization/src/policies/invoice.policy.test.ts packages/authorization/src/index.ts
git commit -m "feat(authz): InvoiceAbacPolicy — clinic-wide staff + PATIENT own-row, mirror-only"
```

---

### Task 2: LabOrderAbacPolicy (pure policy) + differential-oracle test

**Files:**
- Create: `packages/authorization/src/policies/lab-order.policy.ts`
- Create: `packages/authorization/src/policies/lab-order.policy.test.ts`
- Modify: `packages/authorization/src/index.ts`

**Interfaces:**
- Produces: `LabOrderAbacPolicy` with `readonly id = "lab-order"`.

- [ ] **Step 1: Write the failing test**

`packages/authorization/src/policies/lab-order.policy.test.ts` — same helper shape. Oracle = the current lab-workflow wire contract (clinic-scoped 404 via `getOrderById` + matrix roles; LAB is clinic-wide on object routes today — `labId` scoping exists only on the list queue, and the object routes `recordSampleCollection`/`uploadResult`/`releaseResult`/`verifyPayment` check clinic only). The C4.1 deferral pins this baseline: a LAB user may act on any clinic order.

Unit tests:
1. INTERNAL bypass.
2. not-applicable for a non-lab-order resource.
3. tenant discipline.
4. PATIENT own order read allow (portal parity).
5. PATIENT another's order deny.
6. `it.each` DOCTOR/NURSE/LAB/ADMIN/ADMIN_DOCTOR/RECEPTIONIST: clinic-wide read allow.
7. `it.each` LAB: sample-collection / result-upload / payment-verification / release on any clinic order allow (C4.1 baseline).

Oracle rows:
- LAB same-clinic read → allow
- LAB same-clinic update (any order) → allow (C4.1 baseline pin)
- DOCTOR same-clinic read → allow
- NURSE same-clinic update → allow
- staff cross-clinic → deny
- PATIENT own read → allow
- PATIENT another's read → deny
- INTERNAL cross-clinic → allow

- [ ] **Step 2: Run the test to verify it fails** (module missing).

- [ ] **Step 3: Write the minimal implementation**

`packages/authorization/src/policies/lab-order.policy.ts` — identical posture to `invoice.policy.ts` (tenant discipline + PATIENT own-row + clinical staff same-clinic + default-deny; `id = "lab-order"`), with the doc comment noting the C4.1 deferral (assignment pinning + payment-state conditions not enforced; `status` carries `LabTestOrderStatus` populated-not-enforced).

- [ ] **Step 4: Run the tests to verify they pass.**

- [ ] **Step 5: Export + full package suite.**

- [ ] **Step 6: Commit**

```bash
git add packages/authorization/src/policies/lab-order.policy.ts packages/authorization/src/policies/lab-order.policy.test.ts packages/authorization/src/index.ts
git commit -m "feat(authz): LabOrderAbacPolicy — clinic-wide staff incl LAB, mirror-only (C4.1 deferral)"
```

---

### Task 3: Resolvers + registries + module wiring

**Files:**
- Create: `apps/api/src/shared/modules/auth/authorization/resolvers/invoice-resource.resolver.ts`
- Create: `apps/api/src/shared/modules/auth/authorization/resolvers/lab-order-resource.resolver.ts`
- Modify: `apps/api/src/shared/modules/auth/authorization/resolvers/policy-resource-resolver.ts`
- Modify: `apps/api/src/shared/modules/auth/authorization/abac-policy.registry.ts`
- Modify: `apps/api/src/shared/modules/auth/authorization/authorization.module.ts`
- Modify: `apps/api/src/shared/modules/auth/authorization/authorization.service.spec.ts`

**Interfaces:**
- Produces: `InvoiceResourceResolver` (`resource = "invoice"`), `LabOrderResourceResolver` (`resource = "lab-order"`); both registries map the new keys.

- [ ] **Step 1: Write the invoice resolver**

`invoice-resource.resolver.ts` — mirror of `prescription-resource.resolver.ts`:
- Param `:id`; missing → 404 `Invoice not found`.
- Select: `{ id, clinicId, patientId, status, approvalStatus, patient: { select: { clinicId: true } } }`.
- Return `{ type: "invoice", clinicId: invoice.clinicId ?? invoice.patient.clinicId, ownerId: null, assignedDoctorIds: [], assignedPatientId: invoice.patientId, classification: "billing", consentState: null, status: invoice.status, requiresAssignment: false }`.
- Doc comment: nullable `clinicId` falls back to the required `patient` relation.

- [ ] **Step 2: Write the lab-order resolver**

`lab-order-resource.resolver.ts` — same shape:
- Param `:id`; missing → 404 `Lab order not found`.
- Select: `{ id, clinicId, patientId, orderedBy, status }`.
- Return `{ type: "lab-order", clinicId: order.clinicId, ownerId: order.orderedBy, assignedDoctorIds: [], assignedPatientId: order.patientId, classification: "phi", consentState: null, status: order.status, requiresAssignment: false }`.
- Doc comment: `clinicId` required non-null; `ownerId` = `orderedBy` (author, populated for future assignment pinning — C4.1).

- [ ] **Step 3: Register both resolvers + policies**

- `policy-resource-resolver.ts`: import both, add `@Inject(...)` constructor params, add `["invoice", invoice], ["lab-order", labOrder],` map entries.
- `abac-policy.registry.ts`: import both from `@workspace/authorization`, add constructor params + map entries.
- `authorization.module.ts`: add both policies to the `@workspace/authorization` import + providers; import both resolvers + providers.
- `authorization.service.spec.ts`: add `new InvoiceAbacPolicy(), new LabOrderAbacPolicy()` to the `AbacPolicyRegistry` constructor; add 2 `evaluateAbac` assertions (same-clinic invoice read allow for ADMIN; cross-clinic lab-order deny).

- [ ] **Step 4: Typecheck + unit specs + static gate**

Run: `cd apps/api && npx tsc --noEmit`; `npx jest authorization.service.spec.ts policy.guard.spec.ts --silent`; `node scripts/checks/check-policy-resolver-coverage.mjs`.
Expected: clean, tests pass, gate exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/shared/modules/auth/authorization/
git commit -m "feat(api): Invoice + LabOrder resource resolvers + ABAC registries + module wiring"
```

---

### Task 4: Decorate the invoice + approve-invoice routes

**Files:**
- Modify: `apps/api/src/domains/billing/presentation/controllers/invoices.controller.ts`
- Modify: `apps/api/src/domains/whatsapp/presentation/controllers/legacy-whatsapp-approval.controller.ts`

- [ ] **Step 1: Add `@RequirePolicy` to the invoice object routes**

In `invoices.controller.ts` (import `RequirePolicy`):
- `@Get(":id")` findOne → `@RequirePolicy("invoice", "read")`
- `@Get(":id/payment-activity")` → read
- `@Get(":id/claim-readiness")` → read
- `@Get(":id/pdf/status")` → read
- `@Get(":id/pdf")` → read
- `@Patch(":id")` update → `@RequirePolicy("invoice", "update")`
- `@Post(":id/submit-claim")` → `@RequirePolicy("invoice", "update")`

Do NOT decorate `@Get()` (list), `@Get("reports/collections-by-mode")` (report), `@Post()` (create — no object yet).

- [ ] **Step 2: Add `@RequirePolicy` to approve-invoice**

In `legacy-whatsapp-approval.controller.ts` (already imports `RequirePolicy` from C3), on the `approveInvoice` handler (below `@Roles(Role.DOCTOR, Role.ADMIN, Role.ADMIN_DOCTOR)`): add `@RequirePolicy("invoice", "update")`.

**Recorded decision (C4.3, resolves C3.1):** unlike `approve-prescription` (author-pinned in C3), `approve-invoice` stays **clinic-wide** — the legacy `InvoicePolicy` has no DOCTOR author-of-record branch, so any clinic DOCTOR/ADMIN/ADMIN_DOCTOR may approve any clinic invoice. The policy's clinic-wide staff branch + tenant discipline enforce exactly the current contract.

- [ ] **Step 3: Typecheck + lint**

Run: `cd apps/api && npx tsc --noEmit` + eslint on both controllers.
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/domains/billing/presentation/controllers/invoices.controller.ts apps/api/src/domains/whatsapp/presentation/controllers/legacy-whatsapp-approval.controller.ts
git commit -m "feat(api): enforce InvoiceAbacPolicy on invoice object routes + approve-invoice (C4.3 resolution)"
```

---

### Task 5: Decorate the lab-order routes

**Files:**
- Modify: `apps/api/src/domains/clinical/presentation/controllers/lab-tests.controller.ts`
- Modify: `apps/api/src/domains/clinical/presentation/controllers/lab-workflow.controller.ts`

- [ ] **Step 1: Add `@RequirePolicy` to the lab-order object routes**

`lab-tests.controller.ts`:
- `@Get("orders/:id")` getOrderById → `@RequirePolicy("lab-order", "read")`
- `@Put("orders/:id/status")` updateOrderStatus → `@RequirePolicy("lab-order", "update")`

`lab-workflow.controller.ts` (all under `clinical/lab-tests`):
- `@Put("orders/:id/sample")` recordSampleCollection → `@RequirePolicy("lab-order", "update")`
- `@Post("orders/:id/result")` uploadResult → `@RequirePolicy("lab-order", "update")`
- `@Post("orders/:id/payment")` verifyPayment → `@RequirePolicy("lab-order", "update")`
- `@Post("orders/:id/release")` releaseResult → `@RequirePolicy("lab-order", "update")`

Do NOT decorate `@Get("queue")`, `@Get("labs")`, `@Post("labs")`, `@Put("labs/:id")`, `@Get("orders")` (list), `@Get()`/`@Get("stats")`/`@Post()`/`@Put(":id")`/`@Delete(":id")` (LabTest catalog — a different resource, out of C4 scope).

- [ ] **Step 2: Typecheck + lint**

Run: `cd apps/api && npx tsc --noEmit` + eslint on both controllers.
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/domains/clinical/presentation/controllers/lab-tests.controller.ts apps/api/src/domains/clinical/presentation/controllers/lab-workflow.controller.ts
git commit -m "feat(api): enforce LabOrderAbacPolicy on lab-order object routes"
```

---

### Task 6: e2e proof — invoice-abac + lab-order-abac specs

**Files:**
- Create: `apps/api/test/e2e/invoices/invoice-abac.e2e-spec.ts`
- Create: `apps/api/test/e2e/clinical/lab-order-abac.e2e-spec.ts`

**Interfaces:**
- Consumes: `factories` (need a `labTestOrder` factory — add to `apps/api/test/factories.ts`), `signE2eAccessToken`, whatsapp mock (invoice spec needs `approveInvoice` extended locally).

- [ ] **Step 1: Add the `labTestOrder` factory**

In `apps/api/test/factories.ts`, after `invoice`:
```ts
labTestOrder: async (
  patientId: string,
  clinicId: string,
  overrides = {},
) => {
  const labTest = await prisma.labTest.create({
    data: {
      clinicId,
      name: `Lab Test ${Date.now()}`,
      category: 'BLOOD',
    },
  });
  return prisma.labTestOrder.create({
    data: {
      clinicId,
      patientId,
      labTestId: labTest.id,
      orderedBy: 'system',
      ...overrides,
    },
  });
},
```

- [ ] **Step 2: Write `invoice-abac.e2e-spec.ts`**

Harness mirrors `prescription-abac.e2e-spec.ts` (ESSENTIAL tier clinics; whatsapp mock extended with `approveInvoice`). Tests:
1. ADMIN reads any clinic invoice (200)
2. DOCTOR (non-author) reads another invoice (200 — clinic-wide, no author pin)
3. RECEPTIONIST reads any invoice (200)
4. staff of another clinic cannot read (404)
5. unknown invoice id is a 404
6. unauthenticated → 401
7. DOCTOR (non-author) approves another clinic invoice (201 — C4.3 resolution: clinic-wide approve)
8. ADMIN approves any invoice (201)
9. RECEPTIONIST update invoice (200)

- [ ] **Step 3: Write `lab-order-abac.e2e-spec.ts`**

Harness: ESSENTIAL tier clinics, whatsapp mock. Tests:
1. DOCTOR reads a clinic lab order (200)
2. LAB role reads any clinic order (200)
3. LAB records sample collection on any clinic order (200 — C4.1 baseline pin)
4. LAB uploads a result (200)
5. LAB verifies payment (200)
6. staff of another clinic cannot read (404)
7. unknown order id is a 404
8. unauthenticated → 401
9. PATIENT role is rejected at the roles gate (403 — matrix excludes PATIENT on staff routes)

- [ ] **Step 4: Run both specs**

Run: `cd apps/api && npx jest --config ./test/jest-e2e.json invoice-abac lab-order-abac --runInBand --silent 2>&1 | tail -6`
Expected: PASS.

- [ ] **Step 5: Run the existing invoices e2e (no regression)**

Run: `cd apps/api && npx jest --config ./test/jest-e2e.json invoices --runInBand --silent 2>&1 | tail -6`
Expected: the existing `invoices.e2e-spec.ts` passes unchanged (its GET `:id` tests read as clinic staff — policy allows; missing id → resolver 404).

- [ ] **Step 6: Lint + commit**

```bash
git add apps/api/test/factories.ts apps/api/test/e2e/invoices/invoice-abac.e2e-spec.ts apps/api/test/e2e/clinical/lab-order-abac.e2e-spec.ts
git commit -m "test(api): e2e proof for Invoice + LabOrder ABAC differential-equivalence"
```

---

### Task 7: Docs — ADR-0013, ACCESS_AUDIT, EXECUTION_PLAN, SUPPRESSION_LEDGER

**Files:**
- Modify: `docs/architecture/decisions/0013-abac.md`
- Modify: `docs/compliance/ACCESS_AUDIT.md`
- Modify: `docs/analysis/EXECUTION_PLAN.md`
- Modify: `docs/analysis/SUPPRESSION_LEDGER.md`

- [ ] **Step 1: ADR-0013 C4 section**

Add after the C3 section: `InvoiceAbacPolicy` (clinic-wide staff + PATIENT own-row; no author pin — C4.3 resolution of C3.1) on the invoice `:id` routes + `approve-invoice`; `LabOrderAbacPolicy` (clinic-wide staff incl LAB + tenant discipline) on the lab-order object routes. Record C4.1 deferral: lab-order assignment pinning (LAB → `labId`) and payment-state conditions not enforced (no service-layer guard today; `status` attribute populated with `LabTestOrderStatus`; oracle + e2e pin the baseline). Update the follow-up line (C4 done; `approve-invoice` question closed).

- [ ] **Step 2: ACCESS_AUDIT policy index**

Add `invoice` and `lab-order` rows (rules, resolver, decorator, surface) mirroring the existing rows; note the C4.1 deferral and C4.3 resolution.

- [ ] **Step 3: EXECUTION_PLAN P6.1 note**

Add a C4 paragraph (shipped 2026-08-07, plan link, wire-contract summary, C3.1 resolution, C4.1 deferral, validation numbers after Task 8).

- [ ] **Step 4: SUPPRESSION_LEDGER row**

Add the C4 mirror-pair row (invoice/lab-order policies + resolvers) after the C3 row.

- [ ] **Step 5: Commit**

```bash
git add docs/architecture/decisions/0013-abac.md docs/compliance/ACCESS_AUDIT.md docs/analysis/EXECUTION_PLAN.md docs/analysis/SUPPRESSION_LEDGER.md
git commit -m "docs(authz): record C4 invoices + lab-orders enforcement + C3.1 resolution + C4.1 deferral"
```

---

### Task 8: Full validation gate

**Files:** none.

- [ ] **Step 1: Package + unit gates**

`cd packages/authorization && npx vitest run`; `cd apps/api && npx jest --silent 2>&1 | tail -5`.

- [ ] **Step 2: Guard-adjacent e2e suites**

`npx jest --config ./test/jest-e2e.json invoices clinical appointments patients prescriptions --runInBand --silent`.

- [ ] **Step 3: Static gates**

`pnpm check:policy-resolver-coverage`, `pnpm check:controller-rbac`, `pnpm check:circular:enforce`, `pnpm knip`, `pnpm verify:standard` (exit 0).

- [ ] **Step 4: Review pass**

Dispatch `code-reviewer-deepseek-flash` over the C4 commits (HEAD~8..HEAD) focusing on: policy ordering vs legacy `InvoicePolicy`; the C4.3 resolution (clinic-wide approve-invoice) and C4.1 deferral framing; resolver clinic fallbacks; registry/DI wiring; the new e2e specs' harness (factory, tier, whatsapp mock). Fix findings, re-run affected tests, commit fixes.

- [ ] **Step 5: Final commit + close the plan**

Commit review fixes; tick the checkboxes; update the EXECUTION_PLAN note numbers if they differ.
