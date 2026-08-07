# C5 — Audit Logs ABAC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Formalize the audit-log surface's tenant-scoped admin read + no-existence-disclosure invariant as an enforceable ABAC layer (`audit-log` resource), mirroring the C1–C4 pattern.

**Architecture:** A pure `AuditLogAbacPolicy` in `packages/authorization` (INTERNAL bypass → not-applicable → tenant discipline → audit-reader role matrix → default-deny), a scope-based `AuditLogResourceResolver` in the API (list routes have no `:id`; the resource clinicId is the requester's own tenant — the controller already forces `filter.clinicId`), registration in both ABAC registries, and `@RequirePolicy('audit-log', 'read')` on the two audit routes. RolesGuard runs before PolicyGuard (global order in `app.module.ts`), so the policy union role set can never widen the wire contract — it is purely additive.

**Tech Stack:** `packages/authorization` (pure policies, vitest), NestJS `apps/api` (PolicyGuard, resolver registry, Prisma), jest e2e harness (supertest + factories + `signE2eAccessToken`).

## Global Constraints

- Never weaken a guard: `@Roles(ADMIN, INTERNAL)` (`/audit-logs`) and `@Roles(ADMIN, ADMIN_DOCTOR, DOCTOR)` (`/audit/recent`) + `@RequireFeature(Feature.AUDIT_LOGS)` + `TierGuard` stay in force; the policy is additive only.
- Differential-equivalence: cross-clinic reads must keep the current wire contract. **CORRECTED during execution:** the plan initially assumed `?clinicId=<other>` → 200 with forced filter, but `TenantGuard` rejects any cross-clinic `clinicId` param with 403 `CLINIC_SCOPE_MISMATCH` before the controller — that 403 is the true no-existence-disclosure wire contract and is what the e2e pins. The controller's filter-forcing + the policy's tenant discipline remain the defense-in-depth layers.
- `Feature.AUDIT_LOGS` requires ≥ `Tier.ESSENTIAL` — e2e clinics must use `tier: 'ESSENTIAL'`.
- Pure policies must not import NestJS or Prisma; `AbacPolicy` interface from `packages/authorization/src/types.ts`.
- Mirror-pair jscpd suppressions recorded in `docs/analysis/SUPPRESSION_LEDGER.md` (C2–C4 precedent).
- No `console.log`, no emojis, aliases (`@/...`, `@workspace/...`), commits per task with the standard footer.

---

### Task 1: `AuditLogAbacPolicy` (pure) + differential oracle

**Files:**
- Create: `packages/authorization/src/policies/audit-log.policy.ts`
- Test: `packages/authorization/src/policies/audit-log.policy.test.ts`
- Modify: `packages/authorization/src/index.ts`

**Interfaces:**
- Consumes: `AbacPolicy`, `AbacAction`, `AbacDecision` from `../types.js`; `allowDecision`, `denyDecision`, `notApplicableDecision` from `../evaluator.js`; `SubjectAttributes`, `ResourceAttributes`, `EnvAttributes` from `@workspace/types/authorization`.
- Produces: `AuditLogAbacPolicy` (class, `readonly id = "audit-log"`) — consumed by `AbacPolicyRegistry` in Task 2.

- [ ] **Step 1: Write the failing test**

```ts
// packages/authorization/src/policies/audit-log.policy.test.ts
import { describe, expect, it } from "vitest";
import {
  type EnvAttributes,
  envAttributesSchema,
  type ResourceAttributes,
  resourceAttributesSchema,
  type SubjectAttributes,
  subjectAttributesSchema,
} from "@workspace/types/authorization";
import { AuditLogAbacPolicy } from "./audit-log.policy.js";

const policy = new AuditLogAbacPolicy();

function subject(overrides: Partial<SubjectAttributes>): SubjectAttributes {
  return subjectAttributesSchema.parse({
    userId: "u1",
    roles: ["ADMIN"],
    clinicId: "clinic-a",
    doctorId: null,
    ...overrides,
  });
}

function resource(overrides: Partial<ResourceAttributes>): ResourceAttributes {
  return resourceAttributesSchema.parse({
    type: "audit-log",
    clinicId: "clinic-a",
    ownerId: null,
    assignedDoctorIds: [],
    assignedPatientId: null,
    classification: "phi",
    requiresAssignment: false,
    ...overrides,
  });
}

const env: EnvAttributes = envAttributesSchema.parse({
  authnContext: "session",
  time: "2026-08-07T00:00:00.000Z",
});

describe("AuditLogAbacPolicy", () => {
  it("allows INTERNAL regardless of clinic", () => {
    const result = policy.can(
      "read",
      subject({ roles: ["INTERNAL"], clinicId: "internal-bypass", doctorId: null }),
      resource({ clinicId: "clinic-b" }),
      env,
    );
    expect(result.effect).toBe("allow");
  });

  it("is not-applicable for a non-audit-log resource", () => {
    const result = policy.can("read", subject({}), resource({ type: "invoice" }), env);
    expect(result.effect).toBe("not-applicable");
  });

  it("denies cross-clinic staff (tenant_mismatch — PolicyGuard 404)", () => {
    const result = policy.can(
      "read",
      subject({ roles: ["ADMIN"], clinicId: "clinic-a" }),
      resource({ clinicId: "clinic-b" }),
      env,
    );
    expect(result.effect).toBe("deny");
    expect(result.reason).toBe("tenant_mismatch");
  });

  it("allows ADMIN clinic-wide", () => {
    const result = policy.can("read", subject({ roles: ["ADMIN"] }), resource({}), env);
    expect(result.effect).toBe("allow");
  });

  it("allows ADMIN_DOCTOR and DOCTOR clinic-wide (audit/recent summary roles)", () => {
    for (const role of ["ADMIN_DOCTOR", "DOCTOR"] as const) {
      const result = policy.can(
        "read",
        subject({ roles: [role] }),
        resource({}),
        env,
      );
      expect(result.effect).toBe("allow");
    }
  });

  it("denies roles outside the audit-reader set (default-deny)", () => {
    for (const role of ["NURSE", "RECEPTIONIST", "LAB"] as const) {
      const result = policy.can(
        "read",
        subject({ roles: [role] }),
        resource({}),
        env,
      );
      expect(result.effect).toBe("deny");
      expect(result.reason).toBe("role_denied");
    }
  });

  it("denies PATIENT (own-row has no meaning on the audit surface)", () => {
    const result = policy.can(
      "read",
      subject({ roles: ["PATIENT"], patientId: "pat-1" }),
      resource({}),
      env,
    );
    expect(result.effect).toBe("deny");
    expect(result.reason).toBe("role_denied");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd packages/authorization && pnpm vitest run src/policies/audit-log.policy.test.ts`
Expected: FAIL — module `./audit-log.policy.js` not found.

- [ ] **Step 3: Write the minimal implementation**

```ts
// packages/authorization/src/policies/audit-log.policy.ts
// jscpd:ignore-start — intentional mirror of invoice.policy.ts (C4, ADR-0013):
// policies share the posture scaffold (imports + decision ordering); see
// docs/analysis/SUPPRESSION_LEDGER.md.
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

/**
 * Roles that may read audit logs within their own clinic. Union of the two
 * audit controllers' role gates (AuditLogsApiAccess: ADMIN + INTERNAL;
 * AuditSummaryApiAccess: ADMIN + ADMIN_DOCTOR + DOCTOR). INTERNAL is handled
 * by the bypass below; RolesGuard runs before PolicyGuard, so the union can
 * never widen the wire contract — it is additive.
 */
const AUDIT_READER_ROLES = new Set(["ADMIN", "ADMIN_DOCTOR", "DOCTOR"]);

/**
 * Audit-log object-level policy (C5, ADR-0013). Mirrors the current audit
 * surface: tenant-scoped admin read (the controller forces filter.clinicId to
 * the requester's clinic) with no existence disclosure. The tenant discipline
 * here is the defense-in-depth invariant: on today's list routes the resource
 * clinicId IS the requester's own clinic (resolver resolves from the user), so
 * tenant_mismatch never fires — it pins the contract for any future `:id` route.
 * Order matters:
 *   1. INTERNAL bypass (cross-clinic read is the INTERNAL job)
 *   2. not-applicable for non-audit-log resources
 *   3. tenant discipline (cross-clinic → PolicyGuard 404, no existence disclosure)
 *   4. audit-reader roles (ADMIN / ADMIN_DOCTOR / DOCTOR) same-clinic
 *   5. default-deny (no PATIENT own-row — the audit surface is staff-only)
 * VIEW_PROFILE PHI-read obligations are enforced at the controller layer via
 * logPatientPhiRead (C1 precedent); the policy-emitted obligation adapter is
 * Phase D2 (B5), not this slice.
 */
export class AuditLogAbacPolicy implements AbacPolicy {
  readonly id = "audit-log";

  can(
    _action: AbacAction,
    subject: SubjectAttributes,
    resource: ResourceAttributes,
    _env: EnvAttributes,
  ): AbacDecision {
    if (subject.roles.includes("INTERNAL")) return allowDecision(this.id);

    if (resource.type !== "audit-log") return notApplicableDecision(this.id);

    if (
      subject.clinicId &&
      resource.clinicId &&
      subject.clinicId !== resource.clinicId
    ) {
      return denyDecision(this.id, "tenant_mismatch");
    }

    if (subject.roles.some((role) => AUDIT_READER_ROLES.has(role))) {
      return allowDecision(this.id);
    }

    return denyDecision(this.id, "role_denied");
  }
}
// jscpd:ignore-end
```

- [ ] **Step 4: Run it to verify it passes**

Run: `cd packages/authorization && pnpm vitest run src/policies/audit-log.policy.test.ts`
Expected: PASS — all 7 tests.

- [ ] **Step 5: Export + full package suite + typecheck + commit**

Add to `packages/authorization/src/index.ts` (alphabetical, with the other policy exports):
```ts
export { AuditLogAbacPolicy } from "./policies/audit-log.policy.js";
```
Run: `cd packages/authorization && pnpm vitest run && pnpm check-types && pnpm build`
Expected: all green.
Commit: `git add packages/authorization && git commit -m "feat(authz): AuditLogAbacPolicy — tenant-scoped admin read, default-deny (C5)"` (with the standard footer).

---

### Task 2: `AuditLogResourceResolver` + registries + module wiring

**Files:**
- Create: `apps/api/src/shared/modules/auth/authorization/resolvers/audit-log-resource.resolver.ts`
- Modify: `apps/api/src/shared/modules/auth/authorization/resolvers/policy-resource-resolver.ts`, `apps/api/src/shared/modules/auth/authorization/abac-policy.registry.ts`, `apps/api/src/shared/modules/auth/authorization/authorization.module.ts`, `apps/api/src/shared/modules/auth/authorization/authorization.service.spec.ts`

**Interfaces:**
- Consumes: `AuditLogAbacPolicy` (Task 1); `PolicyResourceResolver` interface; `ResourceAttributes` from `@workspace/types`; `PolicyGuard` subject semantics (INTERNAL → `clinicId: 'internal-bypass'`).
- Produces: `AuditLogResourceResolver` (class with `readonly resource = 'audit-log'`), registered under key `'audit-log'` in both registries — consumed by `@RequirePolicy` in Task 3.

- [ ] **Step 1: Write the resolver**

```ts
// apps/api/src/shared/modules/auth/authorization/resolvers/audit-log-resource.resolver.ts
import { Injectable } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { ResourceAttributes } from '@workspace/types';
import type { PolicyResourceResolver } from './policy-resource-resolver.interface';

/**
 * Resolves an `audit-log` resource for the list-only audit routes. These
 * routes carry no `:id` — the resource is the requester's own clinic's log
 * collection (the controller forces `filter.clinicId` to the requester's
 * clinic for every non-INTERNAL). Resolving from the authenticated user keeps
 * tenant discipline structural: cross-clinic targeting is impossible by
 * construction on these routes, and the discipline pins the no-existence-
 * disclosure invariant for any future `:id` route. INTERNAL has no clinicId —
 * the placeholder is never compared (INTERNAL bypasses before tenant
 * discipline in the policy).
 */
@Injectable()
export class AuditLogResourceResolver implements PolicyResourceResolver {
  readonly resource = 'audit-log';

  async resolve(context: ExecutionContext): Promise<ResourceAttributes> {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: { clinicId?: string } }>();
    return {
      type: 'audit-log',
      clinicId: request.user?.clinicId ?? 'internal',
      ownerId: null,
      assignedDoctorIds: [],
      assignedPatientId: null,
      classification: 'phi',
      consentState: null,
      status: null,
      requiresAssignment: false,
    };
  }
}
```

- [ ] **Step 2: Register in the three wiring files**

`policy-resource-resolver.ts` — import + add to the resolver registry map (follow the existing `invoice`/`lab-order` entries exactly).
`abac-policy.registry.ts` — import `AuditLogAbacPolicy` from `@workspace/authorization`; add constructor param `auditLog` and map entry `['audit-log', auditLog]` (mirror the `invoice` entry).
`authorization.module.ts` — add `AuditLogResourceResolver` to the resolver providers (mirror the `LabOrderResourceResolver` entry).

- [ ] **Step 3: Update the service spec constructor + add `evaluateAbac` assertions**

In `authorization.service.spec.ts`: add `auditLog: new AuditLogAbacPolicy()` to the `AbacPolicyRegistry` mock constructor; add assertions: INTERNAL cross-clinic `audit-log` read → allowed; ADMIN same-clinic → allowed; NURSE → denied with `role_denied`. Also change the existing "unregistered resource" test resource from `'invoice'` to a still-unregistered type (e.g. `'referral'`) — `invoice` is now registered (C4).

- [ ] **Step 4: Run typecheck + unit tests**

Run: `cd apps/api && npx tsc --noEmit` then `cd apps/api && pnpm test -- authorization.service.spec.ts`
Expected: clean, all pass.

- [ ] **Step 5: Run the static gate + commit**

Run: `cd /Users/vamsikrishnachandaluri/repos/docita && npx tsx scripts/checks/check-policy-resolver-coverage.mjs` (or the wired `pnpm check:policy-resolver-coverage` name from the C2–C4 runs)
Expected: passes with `audit-log` accepted.
Commit: `feat(api): AuditLogResourceResolver + ABAC registries + module wiring (C5)`.

---

### Task 3: Enforce `@RequirePolicy('audit-log', 'read')` on the audit routes

**Files:**
- Modify: `apps/api/src/shared/modules/audit/audit/audit.controller.ts`

- [ ] **Step 1: Decorate both routes**

Import `RequirePolicy` from `@/shared/modules/auth/decorators/require-policy.decorator`; add `@RequirePolicy('audit-log', 'read')` to `getAuditLogs` (in `AuditController`) and to `getRecentAuditLogs` (in `AuditSummaryController`).

- [ ] **Step 2: Typecheck + run the existing audit e2e spec (no-regression proof)**

Run: `cd apps/api && npx tsc --noEmit`; then run the audit e2e: `cd apps/api && pnpm test:e2e -- test/e2e/audit/patient-phi-read-audit.e2e-spec.ts --config test/jest-e2e.json` (use the exact invocation from the C2–C4 runs)
Expected: existing audit spec 100% green (its ADMIN/DOCTOR/401 cases are policy-preserved).

- [ ] **Step 3: Commit**

Commit: `feat(api): enforce AuditLogAbacPolicy read on audit-logs + audit/recent (C5)`.

---

### Task 4: e2e proof — `audit-log-abac.e2e-spec.ts`

**Files:**
- Create: `apps/api/test/e2e/audit/audit-log-abac.e2e-spec.ts`

**Interfaces:**
- Consumes: `factories.clinic({ tier: 'ESSENTIAL' })`, `factories.user({ clinicId, role })`, `factories.patient`, `signE2eAccessToken`, `prisma.auditLog.create` (direct row seeding).

- [ ] **Step 1: Write the spec** (mirror the invoice-abac harness; seed audit rows directly via `prisma.auditLog.create`)

Cases (11):
1. ADMIN reads own-clinic logs (200, only own rows).
2. ADMIN targeting another clinic via `?clinicId=` still returns 200 with only own rows (filter forced — no disclosure).
3. ADMIN_DOCTOR reads `/audit/recent` (200).
4. DOCTOR reads `/audit/recent` (200).
5. DOCTOR on `/audit-logs` → 403 (roles gate unchanged).
6. PATIENT on `/audit-logs` → 403.
7. NURSE on `/audit-logs` → 403.
8. INTERNAL reads `/audit-logs` cross-clinic (200, sees both clinics' rows — bypass).
9. Unauthenticated `/audit-logs` → 401.
10. Unknown clinic filter for ADMIN stays 200 own-rows (forced filter).
11. INTERNAL on `/audit/recent` → 403 (roles gate unchanged — policy bypass never reached).

Seeding helper:
```ts
const seedLog = async (clinicId: string, user: { id: string }) =>
  prisma.auditLog.create({
    data: {
      clinicId,
      userId: user.id,
      action: 'PATIENT_PHI_READ',
      entityType: 'Patient',
      entityId: 'pat-1',
      status: 'SUCCESS',
    },
  });
```

- [ ] **Step 2: Run the spec**

Run: `cd apps/api && pnpm test:e2e -- test/e2e/audit/audit-log-abac.e2e-spec.ts --config test/jest-e2e.json`
Expected: all pass. (If a 201/200 mismatch appears, the route is a GET — 200.)

- [ ] **Step 3: Run the whole audit e2e directory + lint + commit**

Run both audit specs together; then `cd apps/api && pnpm exec eslint "test/e2e/audit/**/*.ts" --fix` (prettier).
Commit: `test(api): e2e proof for AuditLogAbacPolicy differential-equivalence (C5)`.

---

### Task 5: Docs — ADR-0013, ACCESS_AUDIT, EXECUTION_PLAN, SUPPRESSION_LEDGER

**Files:**
- Modify: `docs/architecture/decisions/0013-abac.md`, `docs/compliance/ACCESS_AUDIT.md`, `docs/analysis/EXECUTION_PLAN.md`, `docs/analysis/SUPPRESSION_LEDGER.md`

- [ ] **Step 1: ADR-0013** — add the C5 section after C4 (same format): policy id `audit-log`, decision ordering, differential-equivalence note (list routes, resolver = requester's clinic, tenant discipline is structural), VIEW_PROFILE obligations note (controller-layer `logPatientPhiRead`, obligation adapter deferred to D2), roles union can't widen (RolesGuard-first global order).
- [ ] **Step 2: ACCESS_AUDIT.md** — add the `audit-log` row to the policy index (mirror the `prescription`/`invoice` rows).
- [ ] **Step 3: EXECUTION_PLAN.md** — add the C5 note blockquote under the P6.1 C1 paragraph (mirror the C2/C3/C4 notes; include validation numbers).
- [ ] **Step 4: SUPPRESSION_LEDGER.md** — add the audit-log mirror-pair row (policy mirrors invoice scaffold).
- [ ] **Step 5: Commit**

Commit: `docs(authz): record C5 audit-logs enforcement + tenant-scoped read posture`.

---

### Task 6: Full validation gate + review pass

- [ ] **Step 1: Package + API unit + static gates**

Run in parallel:
- `cd packages/authorization && pnpm vitest run` (all policy tests)
- `cd apps/api && npx tsc --noEmit`
- `cd /Users/vamsikrishnachandaluri/repos/docita && pnpm check:policy-resolver-coverage && pnpm check:controller-rbac && pnpm check:circular:enforce`

- [ ] **Step 2: Guard-adjacent e2e batch**

Run the audit + auth + patients + appointments + prescriptions + invoices + clinical e2e specs (the C4 batch invocation + the audit dir).
Expected: all green (audit suite is the no-regression proof).

- [ ] **Step 3: knip + verify:standard**

Run: `pnpm knip` then `pnpm verify:standard` (capture exit code).
Expected: exit 0.

- [ ] **Step 4: Code-reviewer pass**

Dispatch `code-reviewer-deepseek-flash` on `HEAD~6..HEAD` (C5 commits): decision ordering vs the two controllers' role gates; resolver clinicId from user (INTERNAL placeholder never compared); wiring + service spec constructor + changed policy_not_found resource; e2e harness (ESSENTIAL tier, direct auditLog seeding, filter-forced no-disclosure assertions); docs accuracy.
Fix any real findings, commit, and close.

---
