# ABAC First Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the first end-to-end slice of the ABAC migration on top of the existing RBAC + tenant + tier gates: Zod attribute schemas, a pure framework-agnostic policy engine in a new `@workspace/authorization` package, a global `PolicyGuard` + `@RequirePolicy` decorator, and the `patient` resource wired and differentially-proven on `GET/PATCH /patients/:id` — without weakening any existing guard.

**Architecture:** This plan implements `ABAC_MIGRATION_PLAN.md` phases **A2 + A4 + B1 + B2 + B4 + C1 (patients only) + D5-lite** as one PR series. It is a *layered extension*: the existing guard chain (JWT → tenant → roles → subscription → tier/feature) stays untouched and runs before the new policy stage. The policy engine is a pure evaluator in `packages/authorization` (no Nest imports, no Prisma) with a deny-overrides combinator and default-deny. The API keeps `AuthorizationService` as the single decision point: the new `PolicyGuard` derives subject/resource/env attributes and delegates to a new `AuthorizationService.evaluateAbac()` that resolves the policy from a new `AbacPolicyRegistry` and builds environment attributes from `ClinicAuthCacheService`. `packages/types` owns the Zod attribute schemas (single source of truth); no parallel interfaces.

**Tech Stack:** NestJS 12-era API (`apps/api`), Zod 3.25 (`@workspace/types`), TypeScript 6.0.3, tsup (package build), Vitest (package + API unit tests), Jest e2e (`apps/api/test/e2e`), Prisma (`PrismaModule` is `@Global()`).

**Scope boundary (per skill Scope Check):** `ABAC_MIGRATION_PLAN.md` spans multiple subsystems (engine, API enforcement, frontend permission snapshot, ops/retirement). This plan deliberately covers only the **first slice** above — each task produces working, testable software on its own, and later slices (C2 appointments, C3 prescriptions, C4 lab/payments, C5 audit logs, C6 cross-tenant referral, C7 frontend snapshot, D retirement ledger, E parity-gate cutover) are separate plans. Do not expand this plan into those phases.

## Global Constraints

(Every task inherits these; from `AGENTS.md` §3, §5, §7, §12, §15, §16 and `ABAC_MIGRATION_PLAN.md` §5.)

1. **pnpm only** (pnpm@10.30.3), Node `>=22.22.0`. Never use npm/yarn. Lockfile changes go through `pnpm install` only.
2. **Never weaken a guard.** `@Roles`, `@RequireFeature`, `TierGuard`, tenant, subscription, audit, and RLS gates stay in force. ABAC policies **add** conditions only. Removing a legacy check is out of scope for every task here.
3. **Default-deny, deny-overrides.** A missing attribute, missing policy, or missing resolver denies — never allows.
4. **Zod-first.** Attribute schemas live once in `packages/types`; inferred types are reused by `@workspace/authorization`, the API, and (later) UI snapshots. No hand-written parallel interfaces (`check:zod-interface-parity` enforces this).
5. **Package boundary:** `packages/types` = schemas + inferred types only (no runtime evaluation logic, §15.3). `packages/authorization` = pure evaluation logic, no Nest imports, no Prisma imports.
6. **`@workspace/authorization` is a two-consumer promotion** (API now, worker later) with AGENTS §16.1 rationale: the composition logic currently trapped in `AuthorizationService` moves to the package.
7. **Dependency policy (§16.1):** internal deps use `workspace:*` only. No new third-party dependency in any task.
8. **No PHI in logs or decision records.** Log decision id + policy id + reason + user id only — never attribute values (AGENTS §6, §7.1).
9. **Server is the only authority.** This slice adds no frontend changes; do not touch `apps/app`/`apps/internal` access-policy code.
10. **Fail-closed guard posture:** a route that declares `@RequirePolicy` for a resource with no registered resolver throws 403 (misconfiguration), never passes.
11. **No `console.log`/`console.error`.** API code uses NestJS `Logger`; package code uses no logging at all (pure).
12. **Type hygiene:** no new `any`, no unchecked `unknown`, no `as` casts unless justified with the `check-as-cast-density` allow-file marker convention; prefer narrowing and Zod `safeParse`. Avoid `!` non-null assertions.
13. **Imports:** `@/...` alias inside `apps/api`; `@workspace/...` for packages; parent `../` relative imports are ESLint-banned.
14. **File naming:** kebab-case for `.ts` service/guard/resolver files; classes PascalCase. Keep API service files under the 400-line budget (`check:file-size-budget`).
15. **Branch rules (§11.3):** work from a branch off `main` (current branch is `fix/app-deployment-failure`, PR #211 — before pushing a new branch, verify the ≤2 open-PR cap). Commit after every task; keep commits focused.
16. **Validation before push:** `pnpm --filter @workspace/types run check-types`, `pnpm --filter @workspace/authorization run check-types`, `pnpm --filter @docita/api run check-types`, package tests, API unit tests, `pnpm verify:standard`, `pnpm knip`, `pnpm check:circular:enforce`, `pnpm check:controller-rbac`, lint 0 errors. e2e needs the docker test Postgres (`docita_test` on `:5434`).

---

## File structure map

New files:

| File | Responsibility |
| --- | --- |
| `packages/types/src/authorization/attributes.ts` | Zod schemas: `subjectAttributesSchema`, `resourceAttributesSchema`, `envAttributesSchema` (+ classification/consent/authn-context atoms) and inferred types |
| `packages/types/src/authorization/index.ts` | Barrel re-exporting `./attributes` |
| `packages/types/test/authorization.test.ts` | Schema parse/reject tests, no permissive defaults (vitest include pattern is `test/**/*.test.ts` — tests are NOT colocated in this package) |
| `packages/authorization/package.json` | New workspace package `@workspace/authorization` (tsup build, mirrors `packages/utils`) |
| `packages/authorization/tsconfig.json` | Extends `@workspace/typescript-config/base.json`, mirrors `packages/utils/tsconfig.json` |
| `packages/authorization/src/types.ts` | Shared vocabulary: `AbacAction`, `AbacReason`, `AbacEffect`, `AbacObligation`, `AbacDecision`, `AbacPolicy` interface |
| `packages/authorization/src/evaluator.ts` | Pure `evaluatePolicy` + `denyOverrides` combinator + `allow`/`deny`/`notApplicable` builders |
| `packages/authorization/src/evaluator.test.ts` | Evaluator + combinator unit tests |
| `packages/authorization/src/policies/patient.policy.ts` | Pure `PatientAbacPolicy` (patient own-row, tenant discipline, assignment-pinning gated on `requiresAssignment`) |
| `packages/authorization/src/policies/patient.policy.test.ts` | Policy unit tests + differential-oracle table vs today's effective semantics |
| `packages/authorization/src/index.ts` | Package barrel |
| `apps/api/src/shared/modules/auth/authorization/abac-policy.registry.ts` | `AbacPolicyRegistry` (DI map `'patient'` → `PatientAbacPolicy`) |
| `apps/api/src/shared/modules/auth/authorization/resolvers/policy-resource-resolver.ts` | `PolicyResourceResolver` interface + `PolicyResourceResolverRegistry` |
| `apps/api/src/shared/modules/auth/authorization/resolvers/patient-resource.resolver.ts` | `PatientResourceResolver` (Prisma lookup → `ResourceAttributes`) |
| `apps/api/src/shared/modules/auth/decorators/require-policy.decorator.ts` | `@RequirePolicy(resource, action)` metadata decorator |
| `apps/api/src/shared/modules/auth/guards/policy.guard.ts` | Global `PolicyGuard` (no-op without metadata; fail-closed with metadata) |
| `apps/api/src/shared/modules/auth/authorization/policy.guard.spec.ts` | `PolicyGuard` unit tests |
| `apps/api/test/e2e/auth/patient-abac-policy.e2e-spec.ts` | e2e: staff read/update own-clinic 200, cross-clinic 404, PATIENT 403, unauth 401 |

Modified files:

| File | Change |
| --- | --- |
| `packages/types/src/index.ts` | Add `export * from "./authorization";` |
| `packages/types/package.json` | Add `"./authorization"` subpath export + tsup entry |
| `apps/api/src/shared/modules/auth/authorization/types.ts` | Re-export `AbacAction`/`AbacReason` from `@workspace/authorization` as `AuthorizationAction`/`AuthorizationDenyReason`; keep legacy types as-is |
| `apps/api/src/shared/modules/auth/authorization/authorization.service.ts` | Add `evaluateAbac()` (delegates to registry + package evaluator, builds env from `ClinicAuthCacheService`); inject `AbacPolicyRegistry` |
| `apps/api/src/shared/modules/auth/authorization/authorization.module.ts` | Provide/export `AbacPolicyRegistry`, `PatientResourceResolver`, `PolicyResourceResolverRegistry` |
| `apps/api/src/shared/modules/auth/authorization/authorization.service.spec.ts` | Add `evaluateAbac` describe block |
| `apps/api/src/app.module.ts` | Register `PolicyGuard` as global `APP_GUARD` after `UserRateLimitGuard` |
| `apps/api/src/domains/patients/presentation/controllers/patients.controller.ts` | Add `@RequirePolicy('patient', 'read')` on `findOne` and `@RequirePolicy('patient', 'update')` on `update`; keep every existing decorator |
| `apps/api/src/domains/patients/presentation/controllers/patients.controller.spec.ts` | Add `.overrideGuard(PolicyGuard)` next to the existing `RolesGuard` override |
| `docs/architecture/decisions/0013-abac.md` | ADR: layered ABAC-on-RBAC, deny-overrides, typed-policy engine, no XACML, assignment-pinning deferred |
| `docs/compliance/ACCESS_AUDIT.md` | Add policy index row (matrix → layers, pilot policy) |
| `docs/analysis/EXECUTION_PLAN.md` | Cross-ref this plan in the P6.1 row + a NOTE recording the slice |
| `scripts/checks/check-policy-resolver-coverage.mjs` | Static gate: every `@RequirePolicy(resource, …)` usage has a registered resolver (fail-closed posture, Phase A2) |
| `package.json` (root) | Add `check:policy-resolver-coverage` to the `verify:standard` chain + scripts map |

---

### Task 1: Zod attribute schemas in `packages/types` (Phase A2)

**Files:**
- Create: `packages/types/src/authorization/attributes.ts`
- Create: `packages/types/src/authorization/index.ts`
- Test: `packages/types/test/authorization.test.ts` (the package's vitest config includes only `test/**/*.test.ts`, so colocated tests under `src/` would be skipped)
- Modify: `packages/types/src/index.ts`, `packages/types/package.json`

**Interfaces:**
- Consumes: `userRoleSchema` from `packages/types/src/shared/users/roles.ts`; `planModeSchema` from `packages/types/src/billing/tier.ts` (line 1499, canonical).
- Produces: `SubjectAttributes`, `ResourceAttributes`, `EnvAttributes` (+ `ResourceClassification`, `ConsentState`, `AuthnContext`, `ClinicEnvAttributes`) exported from `@workspace/types/authorization`. Task 3/4/5 import these exact names.

- [ ] **Step 1: Write the failing tests**

Create `packages/types/test/authorization.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  envAttributesSchema,
  resourceAttributesSchema,
  subjectAttributesSchema,
} from "../src/authorization";

const VALID_SUBJECT = {
  userId: "u1",
  roles: ["DOCTOR"],
  clinicId: "clinic-a",
  doctorId: "u1",
};

const VALID_RESOURCE = {
  type: "patient",
  clinicId: "clinic-a",
  ownerId: "pat-user-1",
  classification: "phi",
};

const VALID_ENV = {
  authnContext: "session",
  time: "2026-08-06T00:00:00.000Z",
};

describe("subjectAttributesSchema", () => {
  it("parses a minimal valid doctor subject", () => {
    expect(subjectAttributesSchema.parse(VALID_SUBJECT)).toMatchObject({
      userId: "u1",
      roles: ["DOCTOR"],
      clinicId: "clinic-a",
      doctorId: "u1",
    });
  });

  it("defaults optional attribute arrays (no permissive grant)", () => {
    const parsed = subjectAttributesSchema.parse(VALID_SUBJECT);
    expect(parsed.careTeamIds).toEqual([]);
    expect(parsed.shifts).toEqual([]);
    expect(parsed.isVerified).toBe(false);
  });

  it("rejects a subject without roles", () => {
    expect(() =>
      subjectAttributesSchema.parse({ userId: "u1", clinicId: "c" }),
    ).toThrow();
  });

  it("rejects a subject without clinicId", () => {
    expect(() =>
      subjectAttributesSchema.parse({ userId: "u1", roles: ["DOCTOR"] }),
    ).toThrow();
  });

  it("rejects an unknown role", () => {
    expect(() =>
      subjectAttributesSchema.parse({ ...VALID_SUBJECT, roles: ["SYSADMIN"] }),
    ).toThrow();
  });
});

describe("resourceAttributesSchema", () => {
  it("parses a minimal patient resource", () => {
    expect(resourceAttributesSchema.parse(VALID_RESOURCE)).toMatchObject({
      type: "patient",
      clinicId: "clinic-a",
      classification: "phi",
    });
  });

  it("defaults assignment arrays to empty (default = no assignment pin)", () => {
    const parsed = resourceAttributesSchema.parse(VALID_RESOURCE);
    expect(parsed.assignedDoctorIds).toEqual([]);
    expect(parsed.requiresAssignment).toBe(false);
  });

  it("rejects an unknown classification", () => {
    expect(() =>
      resourceAttributesSchema.parse({ ...VALID_RESOURCE, classification: "top-secret" }),
    ).toThrow();
  });

  it("rejects a resource without type or clinicId", () => {
    expect(() => resourceAttributesSchema.parse({ classification: "phi" })).toThrow();
  });
});

describe("envAttributesSchema", () => {
  it("parses a minimal session env with clock time", () => {
    expect(envAttributesSchema.parse(VALID_ENV)).toMatchObject({
      authnContext: "session",
      clinic: null,
    });
  });

  it("rejects env without authnContext (never permissive by default)", () => {
    expect(() =>
      envAttributesSchema.parse({ time: "2026-08-06T00:00:00.000Z" }),
    ).toThrow();
  });

  it("rejects env without time", () => {
    expect(() => envAttributesSchema.parse({ authnContext: "session" })).toThrow();
  });

  it("rejects an unknown authnContext", () => {
    expect(() =>
      envAttributesSchema.parse({ authnContext: "root", time: "2026-08-06T00:00:00.000Z" }),
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/types && pnpm vitest run src/authorization/attributes.test.ts`
Expected: FAIL — `attributes.ts` does not exist (`Cannot find module './attributes'`).

- [ ] **Step 3: Write the minimal implementation**

Create `packages/types/src/authorization/attributes.ts`:

```ts
import { z } from "zod";
import { userRoleSchema } from "../shared/users/roles";
import { planModeSchema } from "../billing/tier";

/** PHI data-classification anchor for resource attributes. */
export const resourceClassificationSchema = z.enum([
  "public",
  "phi",
  "phi-special",
  "billing",
]);
export type ResourceClassification = z.infer<typeof resourceClassificationSchema>;

/** DPDP consent state — a resource attribute, never a role. */
export const consentStateSchema = z.enum(["granted", "withdrawn", "minor"]);
export type ConsentState = z.infer<typeof consentStateSchema>;

/**
 * Subject attributes: who is asking. Derived from the authenticated user +
 * JWT claims. `doctorId` is the User id for doctor roles (PatientDoctor.doctorId
 * references User.id); `patientId` is the Patient profile id from the JWT.
 * Optional collections default to empty — a missing attribute never grants.
 */
export const subjectAttributesSchema = z.object({
  userId: z.string().min(1),
  roles: z.array(userRoleSchema).min(1),
  clinicId: z.string().min(1),
  doctorId: z.string().nullish(),
  patientId: z.string().nullish(),
  department: z.string().nullish(),
  careTeamIds: z.array(z.string()).default([]),
  isVerified: z.boolean().default(false),
  shifts: z.array(z.string()).default([]),
});
export type SubjectAttributes = z.infer<typeof subjectAttributesSchema>;

/**
 * Resource attributes: what is being asked about. `ownerId` is the owning
 * User id (Patient.userId); `assignedDoctorIds` mirrors the many-to-many
 * PatientDoctor relation (active rows only); `requiresAssignment` gates
 * doctor assignment-pinning per surface (staff surface off today, portal
 * surface on later — see ADR-0013).
 */
export const resourceAttributesSchema = z.object({
  type: z.string().min(1),
  clinicId: z.string().min(1),
  ownerId: z.string().nullish(),
  assignedDoctorIds: z.array(z.string()).default([]),
  assignedPatientId: z.string().nullish(),
  classification: resourceClassificationSchema,
  consentState: consentStateSchema.nullish(),
  requiresAssignment: z.boolean().default(false),
});
export type ResourceAttributes = z.infer<typeof resourceAttributesSchema>;

export const authnContextSchema = z.enum([
  "session",
  "api-key",
  "webhook",
  "internal",
]);
export type AuthnContext = z.infer<typeof authnContextSchema>;

/** Clinic facts loaded from ClinicAuthCacheService (tier, mode, features). */
export const clinicEnvAttributesSchema = z.object({
  tier: z.string().min(1),
  planMode: planModeSchema.nullish(),
  hasIntelligence: z.boolean().default(false),
  features: z.record(z.string(), z.boolean()).default({}),
  subscriptionStatus: z.string().min(1),
});
export type ClinicEnvAttributes = z.infer<typeof clinicEnvAttributesSchema>;

/**
 * Environment attributes: request context + clock. `time` and `authnContext`
 * are required — nothing may default them to permissive.
 */
export const envAttributesSchema = z.object({
  authnContext: authnContextSchema,
  time: z.string().datetime(),
  zone: z.string().default("UTC"),
  device: z.string().nullish(),
  origin: z.string().nullish(),
  clinic: clinicEnvAttributesSchema.nullable().default(null),
});
export type EnvAttributes = z.infer<typeof envAttributesSchema>;
```

Create `packages/types/src/authorization/index.ts`:

```ts
export * from "./attributes";
```

- [ ] **Step 4: Wire the package exports**

Add to `packages/types/src/index.ts` (alphabetical placement next to `./access`):

```ts
export * from "./authorization";
```

Add to `packages/types/package.json`:

- In `"exports"` (after the `"./access"` block):

```json
    "./authorization": {
      "types": "./dist/authorization/index.d.ts",
      "import": "./dist/authorization/index.js",
      "require": "./dist/authorization/index.cjs"
    },
```

- In `"scripts.build"`, add the entry so the subpath compiles:

```json
"build": "tsup src/index.ts src/access/index.ts src/authorization/index.ts src/billing/index.ts src/shared/index.ts --format cjs,esm --dts",
```

- [ ] **Step 5: Run tests + typecheck to verify they pass**

Run: `cd packages/types && pnpm vitest run test/authorization.test.ts && pnpm run build && pnpm run check-types`
Expected: all 13 tests PASS; build emits `dist/authorization/`; check-types exit 0.

- [ ] **Step 6: Commit**

```bash
git add packages/types/src/authorization packages/types/src/index.ts packages/types/package.json
git commit -m "feat(types): add ABAC subject/resource/env attribute schemas"
```

---

### Task 2: `@workspace/authorization` package scaffold + shared vocabulary (Phase B1, part 1)

**Files:**
- Create: `packages/authorization/package.json`
- Create: `packages/authorization/tsconfig.json`
- Create: `packages/authorization/src/types.ts`
- Create: `packages/authorization/src/index.ts`
- Modify: `apps/api/src/shared/modules/auth/authorization/types.ts`

**Interfaces:**
- Consumes: `SubjectAttributes`, `ResourceAttributes`, `EnvAttributes` from `@workspace/types/authorization` (Task 1).
- Produces: `AbacAction`, `AbacReason`, `AbacEffect`, `AbacObligation`, `AbacDecision`, `AbacPolicy` from `@workspace/authorization`. Task 3/4/5 import these exact names. The API's `AuthorizationAction`/`AuthorizationDenyReason` become type aliases of `AbacAction`/`AbacReason` (stable outward contract preserved).

- [ ] **Step 1: Write the package manifest + tsconfig**

Create `packages/authorization/package.json` (mirror `packages/utils/package.json` conventions exactly):

```json
{
  "name": "@workspace/authorization",
  "version": "0.0.0",
  "type": "module",
  "sideEffects": false,
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm --dts",
    "dev": "tsup src/index.ts --format cjs,esm --dts --watch",
    "lint": "eslint src/",
    "check-types": "tsc --noEmit",
    "test": "vitest run"
  },
  "devDependencies": {
    "@workspace/eslint-config": "workspace:*",
    "@workspace/typescript-config": "workspace:*",
    "eslint": "^9.17.0",
    "tsup": "^8.0.1",
    "typescript": "^6.0.3",
    "vitest": "^4.1.10",
    "@types/node": "^22.14.1"
  },
  "dependencies": {
    "@workspace/types": "workspace:^"
  }
}
```

Create `packages/authorization/tsconfig.json` (copy `packages/utils/tsconfig.json` verbatim).

- [ ] **Step 2: Write the shared vocabulary**

Create `packages/authorization/src/types.ts`:

```ts
import type {
  EnvAttributes,
  ResourceAttributes,
  SubjectAttributes,
} from "@workspace/types/authorization";

/** Canonical ABAC action vocabulary (same values the matrix uses). */
export const ABAC_ACTIONS = [
  "create",
  "read",
  "update",
  "delete",
  "export",
  "manage",
] as const;
export type AbacAction = (typeof ABAC_ACTIONS)[number];

/**
 * Machine-readable deny reasons. This is the single source; the API's
 * `AuthorizationDenyReason` is a type alias of `AbacReason` so the outward
 * contract stays stable.
 */
export const ABAC_DENY_REASONS = [
  "no_user",
  "no_clinic",
  "subscription_inactive",
  "subscription_billing_locked",
  "feature_not_available",
  "feature_locked",
  "role_denied",
  "permission_denied",
  "ownership_denied",
  "tenant_mismatch",
  "policy_not_found",
] as const;
export type AbacReason = (typeof ABAC_DENY_REASONS)[number];

export type AbacEffect = "allow" | "deny" | "not-applicable";

/** Obligations a policy may emit; the enforcement adapter enforces them after an allow. */
export type AbacObligation =
  | { kind: "audit"; policyId: string; reason: string; action: AbacAction }
  | { kind: "none" };

export interface AbacDecision {
  effect: AbacEffect;
  reason?: AbacReason;
  /** Stable policy id for logs/audit (e.g. "patient"). */
  policyId: string;
  /** Attribute references matched, for audit quality (ids/reasons only, never values). */
  matched?: string[];
  obligations?: AbacObligation[];
}

/**
 * A pure, framework-agnostic policy: evaluates one decision from resolved
 * attributes. Implementations must not import NestJS or Prisma.
 */
export interface AbacPolicy {
  readonly id: string;
  can(
    action: AbacAction,
    subject: SubjectAttributes,
    resource: ResourceAttributes,
    env: EnvAttributes,
  ): AbacDecision;
}
```

Create `packages/authorization/src/index.ts` with **only** the types export for now (Tasks 3 and 4 append their own export lines):

```ts
export * from "./types.js";
```

(Note: `@workspace/typescript-config/base.json` uses NodeNext, so relative imports carry explicit `.js` extensions — same as `packages/utils`.)

- [ ] **Step 3: Re-export the vocabulary from the API types file**

Modify `apps/api/src/shared/modules/auth/authorization/types.ts`:

- Add at the top:

```ts
import type { AbacAction, AbacReason } from "@workspace/authorization";
```

- Delete the local `AuthorizationAction` union and `AuthorizationDenyReason` union definitions, and replace them with aliases:

```ts
/** Stable outward contract — aliases of the package vocabulary. */
export type AuthorizationAction = AbacAction;
export type AuthorizationDenyReason = AbacReason;
```

- Keep `AuthorizationUser`, `AuthorizationContext`, `AuthorizationDecision`, `AuthorizationResource`, and the legacy `ResourcePolicy` interface exactly as they are (the legacy `AuthorizationService.can()` path and the four legacy policies are untouched in this slice).

- [ ] **Step 4: Install the workspace dep + verify builds**

Run: `cd /Users/vamsikrishnachandaluri/repos/docita && pnpm install`
Run: `pnpm --filter @workspace/authorization run build && pnpm --filter @workspace/authorization run check-types`
Run: `pnpm --filter @docita/api run check-types`
Expected: package builds + typechecks; API still typechecks (aliases keep the contract).

- [ ] **Step 5: Commit**

```bash
git add packages/authorization apps/api/src/shared/modules/auth/authorization/types.ts pnpm-lock.yaml
git commit -m "feat(authz): scaffold @workspace/authorization package with shared vocabulary"
```

---

### Task 3: Pure evaluator + deny-overrides combinator (Phase B1, part 2)

**Files:**
- Create: `packages/authorization/src/evaluator.ts`
- Test: `packages/authorization/src/evaluator.test.ts`

**Interfaces:**
- Consumes: `AbacPolicy`, `AbacDecision`, `AbacAction`, `AbacReason` from `./types` (Task 2).
- Produces: `evaluatePolicy(policy, input)` → `AbacDecision`; `denyOverrides(decisions)` → `AbacDecision`; `allowDecision(policyId)`, `denyDecision(policyId, reason)`, `notApplicableDecision(policyId)`. Task 4 uses the builders; Task 5's adapter uses `evaluatePolicy` semantics via the registry.

- [ ] **Step 1: Write the failing tests**

Create `packages/authorization/src/evaluator.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type {
  EnvAttributes,
  ResourceAttributes,
  SubjectAttributes,
} from "@workspace/types/authorization";
import { denyOverrides, evaluatePolicy } from "./evaluator";
import type { AbacDecision, AbacPolicy } from "./types";

const subject: SubjectAttributes = {
  userId: "u1",
  roles: ["DOCTOR"],
  clinicId: "clinic-a",
  doctorId: "u1",
  careTeamIds: [],
  isVerified: true,
  shifts: [],
};

const resource: ResourceAttributes = {
  type: "patient",
  clinicId: "clinic-a",
  ownerId: "pat-user-1",
  assignedDoctorIds: [],
  classification: "phi",
};

const env: EnvAttributes = {
  authnContext: "session",
  time: "2026-08-06T00:00:00.000Z",
  clinic: null,
};

class StubPolicy implements AbacPolicy {
  constructor(
    readonly id: string,
    private readonly decision: AbacDecision,
  ) {}
  can() {
    return this.decision;
  }
}

describe("evaluatePolicy", () => {
  it("returns the policy decision for the given action/subject/resource/env", () => {
    const policy = new StubPolicy("stub", {
      effect: "allow",
      policyId: "stub",
    });
    const result = evaluatePolicy(policy, {
      action: "read",
      subject,
      resource,
      env,
    });
    expect(result).toEqual({ effect: "allow", policyId: "stub" });
  });
});

describe("denyOverrides", () => {
  it("allows when every active decision allows", () => {
    const result = denyOverrides([
      { effect: "allow", policyId: "a" },
      { effect: "allow", policyId: "b" },
    ]);
    expect(result.effect).toBe("allow");
  });

  it("denies when any active decision denies (deny wins)", () => {
    const result = denyOverrides([
      { effect: "allow", policyId: "a" },
      { effect: "deny", policyId: "b", reason: "tenant_mismatch" },
    ]);
    expect(result).toMatchObject({ effect: "deny", reason: "tenant_mismatch" });
  });

  it("defaults to deny when every decision is not-applicable", () => {
    const result = denyOverrides([
      { effect: "not-applicable", policyId: "a" },
    ]);
    expect(result.effect).toBe("deny");
    expect(result.reason).toBe("role_denied");
  });

  it("defaults to deny on an empty decision list", () => {
    const result = denyOverrides([]);
    expect(result.effect).toBe("deny");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/authorization && pnpm vitest run src/evaluator.test.ts`
Expected: FAIL — `Cannot find module './evaluator'`.

- [ ] **Step 3: Write the minimal implementation**

Create `packages/authorization/src/evaluator.ts`:

```ts
import type {
  AbacAction,
  AbacDecision,
  AbacPolicy,
  AbacReason,
} from "./types";
import type {
  EnvAttributes,
  ResourceAttributes,
  SubjectAttributes,
} from "@workspace/types/authorization";

export interface EvaluateInput {
  action: AbacAction;
  subject: SubjectAttributes;
  resource: ResourceAttributes;
  env: EnvAttributes;
}

/** Evaluate a single policy against fully-resolved attributes. */
export function evaluatePolicy(
  policy: AbacPolicy,
  input: EvaluateInput,
): AbacDecision {
  return policy.can(input.action, input.subject, input.resource, input.env);
}

/**
 * Deny-overrides combinator with default-deny: any active deny denies;
 * else any allow allows; else (empty / all not-applicable) deny.
 */
export function denyOverrides(decisions: AbacDecision[]): AbacDecision {
  const active = decisions.filter((d) => d.effect !== "not-applicable");
  const deny = active.find((d) => d.effect === "deny");
  if (deny) return deny;
  const allow = active.find((d) => d.effect === "allow");
  return (
    allow ?? {
      effect: "deny",
      policyId: "default-deny",
      reason: "role_denied",
    }
  );
}

export function allowDecision(policyId: string): AbacDecision {
  return { effect: "allow", policyId };
}

export function denyDecision(
  policyId: string,
  reason: AbacReason,
): AbacDecision {
  return { effect: "deny", policyId, reason };
}

export function notApplicableDecision(policyId: string): AbacDecision {
  return { effect: "not-applicable", policyId };
}
```

Append to `packages/authorization/src/index.ts`:

```ts
export * from "./evaluator";
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/authorization && pnpm vitest run src/evaluator.test.ts && pnpm run check-types`
Expected: all 5 tests PASS; check-types exit 0.

- [ ] **Step 5: Commit**

```bash
git add packages/authorization/src/evaluator.ts packages/authorization/src/evaluator.test.ts
git commit -m "feat(authz): pure ABAC evaluator with deny-overrides and default-deny"
```

---

### Task 4: Pure `PatientAbacPolicy` + differential-oracle tests (Phase B3 + B4, patients)

**Files:**
- Create: `packages/authorization/src/policies/patient.policy.ts`
- Test: `packages/authorization/src/policies/patient.policy.test.ts`
- Modify: `packages/authorization/src/index.ts` (un-comment the policy export)

**Interfaces:**
- Consumes: `AbacPolicy`, `AbacDecision`, builders from Task 3; `SubjectAttributes`/`ResourceAttributes`/`EnvAttributes` from Task 1.
- Produces: `PatientAbacPolicy` (class, `id = "patient"`). Task 5 registers it in `AbacPolicyRegistry`.

**Design note (differential equivalence):** `PatientDoctorGuard`/`@DoctorPatientScoped` is registered in `AuthModule` but **not applied to any live controller route** — assignment-pinning is not enforced anywhere today, and `GET/PATCH /patients/:id` is staff-only (roles gate `API_PATIENTS_READ`/`API_PATIENTS_WRITE`). Enforcing assignment on the staff surface would be an unauthorized behavior tightening. So the policy implements the assignment rule **gated on `resource.requiresAssignment`** (default false on the staff surface, true on the future portal surface per ADR-0013), and the default mode is differential-equivalent to today's effective semantics.

- [ ] **Step 1: Write the failing tests**

Create `packages/authorization/src/policies/patient.policy.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type {
  EnvAttributes,
  ResourceAttributes,
  SubjectAttributes,
} from "@workspace/types/authorization";
import { PatientAbacPolicy } from "./patient.policy";

const policy = new PatientAbacPolicy();

function subject(overrides: Partial<SubjectAttributes>): SubjectAttributes {
  return {
    userId: "u1",
    roles: ["DOCTOR"],
    clinicId: "clinic-a",
    doctorId: "u1",
    careTeamIds: [],
    isVerified: true,
    shifts: [],
    ...overrides,
  };
}

function resource(overrides: Partial<ResourceAttributes>): ResourceAttributes {
  return {
    type: "patient",
    clinicId: "clinic-a",
    ownerId: "pat-user-1",
    assignedDoctorIds: ["d1"],
    classification: "phi",
    requiresAssignment: false,
    ...overrides,
  };
}

const env: EnvAttributes = {
  authnContext: "session",
  time: "2026-08-06T00:00:00.000Z",
  clinic: null,
};

describe("PatientAbacPolicy", () => {
  it("allows INTERNAL regardless of clinic", () => {
    const result = policy.can(
      "read",
      subject({ roles: ["INTERNAL"], clinicId: "internal-bypass", doctorId: null }),
      resource({ clinicId: "clinic-b" }),
      env,
    );
    expect(result.effect).toBe("allow");
  });

  it("is not-applicable for a non-patient resource", () => {
    const result = policy.can(
      "read",
      subject({}),
      resource({ type: "invoice" }),
      env,
    );
    expect(result.effect).toBe("not-applicable");
  });

  it("denies cross-clinic access (tenant discipline)", () => {
    const result = policy.can(
      "read",
      subject({}),
      resource({ clinicId: "clinic-b" }),
      env,
    );
    expect(result).toMatchObject({ effect: "deny", reason: "tenant_mismatch" });
  });

  it("allows a PATIENT on their own row", () => {
    const result = policy.can(
      "read",
      subject({ roles: ["PATIENT"], patientId: "pat-1", doctorId: null }),
      resource({ ownerId: "u1" }),
      env,
    );
    expect(result.effect).toBe("allow");
  });

  it("denies a PATIENT on another patient's row", () => {
    const result = policy.can(
      "read",
      subject({ roles: ["PATIENT"], patientId: "pat-1", doctorId: null }),
      resource({ ownerId: "someone-else" }),
      env,
    );
    expect(result).toMatchObject({ effect: "deny", reason: "ownership_denied" });
  });

  it("allows clinical staff in the same clinic when assignment-pinning is off (current staff surface)", () => {
    const result = policy.can(
      "read",
      subject({ roles: ["NURSE"], doctorId: null }),
      resource({}),
      env,
    );
    expect(result.effect).toBe("allow");
  });

  it("allows an assigned DOCTOR when requiresAssignment is on (future portal surface)", () => {
    const result = policy.can(
      "read",
      subject({ roles: ["DOCTOR"], doctorId: "d1" }),
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

  it("denies a PATIENT on a row with no ownerId (missing attribute = deny)", () => {
    const result = policy.can(
      "read",
      subject({ roles: ["PATIENT"], doctorId: null, patientId: "pat-1" }),
      resource({ ownerId: null }),
      env,
    );
    expect(result).toMatchObject({ effect: "deny", reason: "ownership_denied" });
  });
});
```

**Differential-oracle test (Phase B4, patients)** — same file, second describe. The oracle re-encodes today's *effective* semantics for the `patient` surface (PatientDoctorGuard semantics + the roles matrix gate on `API_PATIENTS_READ`/`API_PATIENTS_WRITE`):

```ts
type OracleRow = {
  name: string;
  sub: SubjectAttributes;
  res: ResourceAttributes;
  // today's effective outcome on the live staff surface
  legacyEffective: "allow" | "deny";
};

// Oracle = PatientDoctorGuard (if it were applied) + roles matrix.
// Staff surface today: clinical staff same-clinic allowed; PATIENT roles-gated
// out of /patients/* (403 at RolesGuard); cross-clinic denied at the service.
const ORACLE_ROWS: OracleRow[] = [
  {
    name: "admin same-clinic",
    sub: subject({ roles: ["ADMIN"], doctorId: null }),
    res: resource({}),
    legacyEffective: "allow",
  },
  {
    name: "nurse same-clinic",
    sub: subject({ roles: ["NURSE"], doctorId: null }),
    res: resource({}),
    legacyEffective: "allow",
  },
  {
    name: "doctor same-clinic (no pin today)",
    sub: subject({ roles: ["DOCTOR"] }),
    res: resource({}),
    legacyEffective: "allow",
  },
  {
    name: "staff cross-clinic",
    sub: subject({ roles: ["DOCTOR"] }),
    res: resource({ clinicId: "clinic-b" }),
    legacyEffective: "deny",
  },
];

describe("differential: policy outcome === legacy effective outcome (staff surface)", () => {
  for (const row of ORACLE_ROWS) {
    it(row.name, () => {
      const result = policy.can("read", row.sub, row.res, env);
      const policyAllows = result.effect === "allow";
      expect(policyAllows).toBe(row.legacyEffective === "allow");
    });
  }
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/authorization && pnpm vitest run src/policies/patient.policy.test.ts`
Expected: FAIL — `Cannot find module './patient.policy'`.

- [ ] **Step 3: Write the minimal implementation**

Create `packages/authorization/src/policies/patient.policy.ts`:

```ts
import type {
  AbacAction,
  AbacDecision,
  AbacPolicy,
} from "../types";
import { allowDecision, denyDecision, notApplicableDecision } from "../evaluator";
import type {
  EnvAttributes,
  ResourceAttributes,
  SubjectAttributes,
} from "@workspace/types/authorization";

/** Roles that may operate a patient record within their own clinic. */
const CLINICAL_STAFF_ROLES = new Set([
  "DOCTOR",
  "ADMIN_DOCTOR",
  "NURSE",
  "RECEPTIONIST",
  "ADMIN",
  "LAB",
]);

/**
 * Patient object-level policy. Order matters:
 *   1. INTERNAL bypass (mirrors AuthorizationService.can())
 *   2. not-applicable for non-patient resources
 *   3. tenant discipline (mirrors BaseResourcePolicy.checkTenantAccess)
 *   4. PATIENT own-row (Patient.userId === subject.userId — PatientDoctorGuard semantics)
 *   5. doctor assignment-pinning, only when resource.requiresAssignment is set
 *      (off on the staff surface today, on for the future portal surface — ADR-0013)
 *   6. clinical staff same-clinic (current effective behavior)
 *   7. default-deny
 */
export class PatientAbacPolicy implements AbacPolicy {
  readonly id = "patient";

  can(
    _action: AbacAction,
    subject: SubjectAttributes,
    resource: ResourceAttributes,
    _env: EnvAttributes,
  ): AbacDecision {
    if (subject.roles.includes("INTERNAL")) return allowDecision(this.id);

    if (resource.type !== "patient") return notApplicableDecision(this.id);

    if (
      subject.clinicId &&
      resource.clinicId &&
      subject.clinicId !== resource.clinicId
    ) {
      return denyDecision(this.id, "tenant_mismatch");
    }

    if (subject.roles.includes("PATIENT")) {
      if (!resource.ownerId || resource.ownerId !== subject.userId) {
        return denyDecision(this.id, "ownership_denied");
      }
      return allowDecision(this.id);
    }

    if (
      resource.requiresAssignment &&
      (subject.roles.includes("DOCTOR") || subject.roles.includes("ADMIN_DOCTOR"))
    ) {
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

Append to `packages/authorization/src/index.ts`:

```ts
export * from "./policies/patient.policy";
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/authorization && pnpm vitest run src/policies/patient.policy.test.ts && pnpm run check-types && pnpm run build`
Expected: all 13 tests PASS (9 policy + 4 differential); check-types + build exit 0.

- [ ] **Step 5: Commit**

```bash
git add packages/authorization/src/policies packages/authorization/src/index.ts
git commit -m "feat(authz): pure PatientAbacPolicy with differential-oracle tests"
```

---

### Task 5: API adapter + resolver registry + `PolicyGuard` + `@RequirePolicy` (Phase B2)

**Files:**
- Create: `apps/api/src/shared/modules/auth/authorization/abac-policy.registry.ts`
- Create: `apps/api/src/shared/modules/auth/authorization/resolvers/policy-resource-resolver.ts`
- Create: `apps/api/src/shared/modules/auth/authorization/resolvers/patient-resource.resolver.ts`
- Create: `apps/api/src/shared/modules/auth/decorators/require-policy.decorator.ts`
- Create: `apps/api/src/shared/modules/auth/guards/policy.guard.ts`
- Test: `apps/api/src/shared/modules/auth/authorization/policy.guard.spec.ts`
- Modify: `apps/api/src/shared/modules/auth/authorization/authorization.service.ts`
- Modify: `apps/api/src/shared/modules/auth/authorization/authorization.module.ts`
- Modify: `apps/api/src/shared/modules/auth/authorization/authorization.service.spec.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**
- Consumes: `AbacPolicyRegistry` keyed by resource string → `AbacPolicy`; `AuthorizationService.evaluateAbac(subject, action, resource)` → `AuthorizationDecision`; `PolicyResourceResolverRegistry.get(resource)`.
- Produces: `@RequirePolicy(resource: string, action: AbacAction)` metadata; global `PolicyGuard`.

- [ ] **Step 1: Write the failing guard test**

Create `apps/api/src/shared/modules/auth/authorization/policy.guard.spec.ts`:

```ts
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@workspace/db';
import { describe, expect, it, jest } from '@jest/globals';
import { AuthorizationService } from './authorization.service';
import { PolicyGuard } from '../guards/policy.guard';
import {
  PolicyResourceResolverRegistry,
  type PolicyResourceResolver,
} from './resolvers/policy-resource-resolver';
import type { ResourceAttributes } from '@workspace/types/authorization';

function makeContext(
  handlerMeta: Record<string, unknown>,
  user: { id: string; role: Role; clinicId: string | null; patientId?: string } | undefined,
): ExecutionContext {
  return {
    getHandler: () => handlerMeta,
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user, params: { id: 'pat-1' } }),
    }),
  } as unknown as ExecutionContext;
}

function makeResolver(allowed: boolean): PolicyResourceResolver {
  const resource: ResourceAttributes = {
    type: 'patient',
    clinicId: 'clinic-a',
    ownerId: 'pat-user-1',
    assignedDoctorIds: [],
    classification: 'phi',
  };
  return {
    resource: 'patient',
    resolve: jest.fn(async () => resource),
  };
}

function makeGuard(options: { allow?: boolean } = {}) {
  const reflector = new Reflector();
  const authorization = {
    evaluateAbac: jest.fn(async () =>
      options.allow === false
        ? { allowed: false, reason: 'ownership_denied' as const }
        : { allowed: true },
    ),
  } as unknown as AuthorizationService;
  const registry = new PolicyResourceResolverRegistry(makeResolver(options.allow !== false));
  return { guard: new PolicyGuard(reflector, authorization, registry), authorization };
}

describe('PolicyGuard', () => {
  it('passes through when no @RequirePolicy metadata is present', async () => {
    const { guard } = makeGuard();
    const result = await guard.canActivate(makeContext({}, { id: 'u1', role: Role.DOCTOR, clinicId: 'clinic-a' }));
    expect(result).toBe(true);
  });

  it('denies when the policy decision is a deny', async () => {
    const { guard } = makeGuard({ allow: false });
    const meta = { requirePolicy: { resource: 'patient', action: 'read' } };
    await expect(
      guard.canActivate(makeContext(meta, { id: 'u1', role: Role.DOCTOR, clinicId: 'clinic-a' })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows when the policy decision allows', async () => {
    const { guard } = makeGuard({ allow: true });
    const meta = { requirePolicy: { resource: 'patient', action: 'read' } };
    const result = await guard.canActivate(makeContext(meta, { id: 'u1', role: Role.DOCTOR, clinicId: 'clinic-a' }));
    expect(result).toBe(true);
  });

  it('denies (fail-closed) when metadata exists but no resolver is registered', async () => {
    const reflector = new Reflector();
    const authorization = {
      evaluateAbac: jest.fn(async () => ({ allowed: true })),
    } as unknown as AuthorizationService;
    const registry = new PolicyResourceResolverRegistry(
      // register a resolver for a different resource so 'patient' is missing
      { resource: 'invoice', resolve: jest.fn(async () => ({ type: 'invoice', clinicId: 'clinic-a', classification: 'billing' })) },
    );
    const guard = new PolicyGuard(reflector, authorization, registry);
    const meta = { requirePolicy: { resource: 'patient', action: 'read' } };
    await expect(
      guard.canActivate(makeContext(meta, { id: 'u1', role: Role.DOCTOR, clinicId: 'clinic-a' })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/api && npx jest src/shared/modules/auth/authorization/policy.guard.spec.ts`
Expected: FAIL — module resolution errors (`./authorization.service` evaluateAbac missing, `../guards/policy.guard` missing, resolvers missing).

- [ ] **Step 3: Write the resolver interface + patient resolver**

Create `apps/api/src/shared/modules/auth/authorization/resolvers/policy-resource-resolver.ts`:

```ts
import { Injectable } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { ResourceAttributes } from '@workspace/types/authorization';

/**
 * Resolves request context (params/body) into resource attributes for a
 * policy decision. Implementations are per-resource and Nest-bound (they may
 * use Prisma); the policies they feed are pure.
 */
export interface PolicyResourceResolver {
  readonly resource: string;
  resolve(context: ExecutionContext): Promise<ResourceAttributes>;
}

/** DI registry mirroring ResourcePolicyRegistry: resource → resolver. */
@Injectable()
export class PolicyResourceResolverRegistry {
  private readonly resolvers: ReadonlyMap<string, PolicyResourceResolver>;

  constructor(patient: PolicyResourceResolver) {
    this.resolvers = new Map<string, PolicyResourceResolver>([
      ['patient', patient],
    ]);
  }

  get(resource: string): PolicyResourceResolver | undefined {
    return this.resolvers.get(resource);
  }
}
```

Create `apps/api/src/shared/modules/auth/authorization/resolvers/patient-resource.resolver.ts`:

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import type { ResourceAttributes } from '@workspace/types/authorization';
import type { PolicyResourceResolver } from './policy-resource-resolver';

/**
 * Resolves a `patient` resource from the route param (`:id` on the staff
 * controller, `:patientId` on sub-resources). Missing row → 404 (no
 * existence disclosure). `requiresAssignment` is false on the staff surface
 * (differential-equivalent to today); the future portal resolver flips it on.
 */
@Injectable()
export class PatientResourceResolver implements PolicyResourceResolver {
  readonly resource = 'patient';

  constructor(private readonly prisma: PrismaService) {}

  async resolve(context: ExecutionContext): Promise<ResourceAttributes> {
    const request = context
      .switchToHttp()
      .getRequest<{ params: Record<string, string | undefined> }>();
    const patientId = request.params?.id ?? request.params?.patientId;
    if (!patientId) throw new NotFoundException('Patient not found');

    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, clinicId: true, userId: true },
    });
    if (!patient) throw new NotFoundException('Patient not found');

    const assignments = await this.prisma.patientDoctor.findMany({
      where: { patientId: patient.id, isActive: true },
      select: { doctorId: true },
    });

    return {
      type: 'patient',
      clinicId: patient.clinicId,
      ownerId: patient.userId,
      assignedDoctorIds: assignments.map((assignment) => assignment.doctorId),
      assignedPatientId: patient.id,
      classification: 'phi',
      consentState: null,
      requiresAssignment: false,
    };
  }
}
```

- [ ] **Step 4: Write the decorator, registry, adapter method, and guard**

Create `apps/api/src/shared/modules/auth/decorators/require-policy.decorator.ts`:

```ts
import { SetMetadata } from '@nestjs/common';
import type { AbacAction } from '@workspace/authorization';

export const REQUIRE_POLICY_KEY = 'requirePolicy';

export interface RequirePolicyMetadata {
  resource: string;
  action: AbacAction;
}

/** Declares the ABAC resource+action posture for a route (additive to @Roles/@RequireFeature). */
export const RequirePolicy = (resource: string, action: AbacAction) =>
  SetMetadata(REQUIRE_POLICY_KEY, { resource, action } satisfies RequirePolicyMetadata);
```

Create `apps/api/src/shared/modules/auth/authorization/abac-policy.registry.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { PatientAbacPolicy } from '@workspace/authorization';
import type { AbacPolicy } from '@workspace/authorization';

/**
 * Resolves a resource key to its pure ABAC policy. Add a resource by
 * implementing an AbacPolicy in packages/authorization and registering it here.
 */
@Injectable()
export class AbacPolicyRegistry {
  private readonly policies: ReadonlyMap<string, AbacPolicy>;

  constructor(patient: PatientAbacPolicy) {
    this.policies = new Map<string, AbacPolicy>([['patient', patient]]);
  }

  get(resource: string): AbacPolicy | undefined {
    return this.policies.get(resource);
  }
}
```

Modify `apps/api/src/shared/modules/auth/authorization/authorization.service.ts`:

- Add imports (keep the existing `check-as-cast-density` allow-file marker — it is already justified for this file):

```ts
import { PatientAbacPolicy } from '@workspace/authorization';
import type {
  AbacAction,
  AbacPolicy,
} from '@workspace/authorization';
import type {
  EnvAttributes,
  ResourceAttributes,
  SubjectAttributes,
} from '@workspace/types/authorization';
import { AbacPolicyRegistry } from './abac-policy.registry';
```

- Add `AbacPolicyRegistry` to the constructor (third param) and keep the existing two params:

```ts
  constructor(
    private readonly clinicAuthCache: ClinicAuthCacheService,
    private readonly policies: ResourcePolicyRegistry,
    private readonly abacPolicies: AbacPolicyRegistry,
  ) {}
```

- Add the new public methods at the end of the class (before the closing brace):

```ts
  /**
   * ABAC stage: evaluates a pure resource policy against resolved attributes.
   * Runs AFTER the legacy guard chain (JWT → tenant → roles → subscription →
   * tier/feature), so it only adds object-level conditions.
   */
  async evaluateAbac(
    subject: SubjectAttributes,
    action: AbacAction,
    resource: ResourceAttributes,
  ): Promise<AuthorizationDecision> {
    const policy = this.abacPolicies.get(resource.type);
    if (!policy) {
      return {
        allowed: false,
        reason: 'role_denied',
        detail: { policyId: 'policy_not_found' },
      };
    }

    const env = await this.buildAbacEnv(subject);
    const decision = policy.can(action, subject, resource, env);

    if (decision.effect !== 'allow') {
      return {
        allowed: false,
        reason: decision.reason ?? 'role_denied',
        detail: { policyId: decision.policyId },
      };
    }
    return { allowed: true };
  }

  private async buildAbacEnv(
    subject: SubjectAttributes,
  ): Promise<EnvAttributes> {
    const clinic = subject.clinicId
      ? await this.clinicAuthCache.getClinicAuth(subject.clinicId)
      : null;
    return {
      authnContext: 'session',
      time: new Date().toISOString(),
      zone: 'UTC',
      clinic: clinic
        ? {
            tier: clinic.tier,
            planMode: clinic.planMode,
            hasIntelligence: clinic.hasIntelligence,
            features: clinic.features,
            subscriptionStatus: clinic.subscriptionStatus,
          }
        : null,
    };
  }
```

Create `apps/api/src/shared/modules/auth/guards/policy.guard.ts`:

```ts
import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@workspace/db';
import type { SubjectAttributes } from '@workspace/types/authorization';
import { forbiddenProblem } from '@/shared/common/errors/forbidden-problem';
import { RequestWithUser } from '@/shared/common/types/common.types';
import { AuthorizationService } from '@/shared/modules/auth/authorization/authorization.service';
import { PolicyResourceResolverRegistry } from '@/shared/modules/auth/authorization/resolvers/policy-resource-resolver';
import {
  REQUIRE_POLICY_KEY,
  type RequirePolicyMetadata,
} from '@/shared/modules/auth/decorators/require-policy.decorator';
import { dbRoleToUserRole } from '@/shared/modules/auth/authorization/role-bridge';

/**
 * Global ABAC enforcement stage. No-op when the route declares no
 * @RequirePolicy. When it does: resolve subject from the JWT user, resource
 * from the resolver registry, evaluate via AuthorizationService, and deny
 * (403, typed reason) on anything but allow. Fail-closed: a declared policy
 * with no resolver denies.
 */
@Injectable()
export class PolicyGuard implements CanActivate {
  private readonly logger = new Logger(PolicyGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly authorization: AuthorizationService,
    private readonly resolvers: PolicyResourceResolverRegistry,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const metadata = this.reflector.getAllAndOverride<RequirePolicyMetadata>(
      REQUIRE_POLICY_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!metadata) return true;

    const request = context
      .switchToHttp()
      .getRequest<RequestWithUser & { params: Record<string, string | undefined> }>();
    const user = request.user;
    if (!user) return true; // JwtAuthGuard denies before this stage; defensive.

    const isInternal = user.role === Role.INTERNAL;
    if (!isInternal && !user.clinicId) {
      throw forbiddenProblem(
        'INSUFFICIENT_PERMISSIONS',
        'Access denied.',
      );
    }

    const resolver = this.resolvers.get(metadata.resource);
    if (!resolver) {
      this.logger.warn(
        `PolicyGuard: no resolver registered for resource '${metadata.resource}'`,
      );
      throw forbiddenProblem('INSUFFICIENT_PERMISSIONS', 'Access denied.');
    }

    const resource = await resolver.resolve(context);

    const subject: SubjectAttributes = {
      userId: user.id,
      roles: [dbRoleToUserRole(user.role)],
      clinicId: isInternal ? 'internal-bypass' : (user.clinicId ?? ''),
      doctorId:
        user.role === Role.DOCTOR || user.role === Role.ADMIN_DOCTOR
          ? user.id
          : null,
      patientId: user.patientId ?? null,
      careTeamIds: [],
      isVerified: user.emailVerified === true,
      shifts: [],
    };

    const decision = await this.authorization.evaluateAbac(
      subject,
      metadata.action,
      resource,
    );

    if (!decision.allowed) {
      this.logger.warn(
        `ABAC deny: policy=${decision.detail?.policyId} reason=${decision.reason} user=${user.id}`,
      );
      throw forbiddenProblem('INSUFFICIENT_PERMISSIONS', 'Access denied.');
    }
    return true;
  }
}
```

- [ ] **Step 5: Wire the module and the global guard**

Modify `apps/api/src/shared/modules/auth/authorization/authorization.module.ts` — add imports and providers/exports:

```ts
import { AbacPolicyRegistry } from './abac-policy.registry';
import { PatientResourceResolver } from './resolvers/patient-resource.resolver';
import { PolicyResourceResolverRegistry } from './resolvers/policy-resource-resolver';
```

In `providers` add: `AbacPolicyRegistry`, `PatientResourceResolver`, `PolicyResourceResolverRegistry`.
In `exports` add: `AuthorizationService` (already), `PolicyResourceResolverRegistry`, `AbacPolicyRegistry`.

(`PatientAbacPolicy` is provided by the `@workspace/authorization` package barrel — no DI registration needed since it is a plain class instantiated by `AbacPolicyRegistry`'s constructor injection; Nest can construct it as a provider only if listed. Add `PatientAbacPolicy` to `providers` too — Nest resolves it as a value-class provider from the package export.)

Modify `apps/api/src/app.module.ts` — register the guard after `UserRateLimitGuard` (last guard in the existing APP_GUARD list):

```ts
import { PolicyGuard } from './shared/modules/auth/guards/policy.guard';
```

```ts
    {
      provide: APP_GUARD,
      useClass: UserRateLimitGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PolicyGuard,
    },
```

- [ ] **Step 6: Add adapter tests to the existing service spec**

Modify `apps/api/src/shared/modules/auth/authorization/authorization.service.spec.ts` — in the existing `beforeEach` factory, the `AuthorizationService` is constructed as `new AuthorizationService(cache, registry)`. Update the factory to pass a third argument: `new AbacPolicyRegistry(new PatientAbacPolicy())`. Then add a describe block:

```ts
describe('evaluateAbac', () => {
  it('denies with policy_not_found for an unregistered resource', async () => {
    const result = await service.evaluateAbac(
      { userId: 'u1', roles: ['DOCTOR'], clinicId: 'clinic-a', doctorId: 'u1', careTeamIds: [], isVerified: true, shifts: [] },
      'read',
      { type: 'invoice', clinicId: 'clinic-a', ownerId: 'x', assignedDoctorIds: [], classification: 'billing' },
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('role_denied');
  });

  it('allows a clinical staff user on a same-clinic patient', async () => {
    const result = await service.evaluateAbac(
      { userId: 'u1', roles: ['DOCTOR'], clinicId: 'clinic-a', doctorId: 'u1', careTeamIds: [], isVerified: true, shifts: [] },
      'read',
      { type: 'patient', clinicId: 'clinic-a', ownerId: 'pat-user-1', assignedDoctorIds: [], classification: 'phi' },
    );
    expect(result.allowed).toBe(true);
  });

  it('denies cross-clinic patient access', async () => {
    const result = await service.evaluateAbac(
      { userId: 'u1', roles: ['DOCTOR'], clinicId: 'clinic-a', doctorId: 'u1', careTeamIds: [], isVerified: true, shifts: [] },
      'read',
      { type: 'patient', clinicId: 'clinic-b', ownerId: 'pat-user-1', assignedDoctorIds: [], classification: 'phi' },
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('tenant_mismatch');
  });
});
```

- [ ] **Step 7: Run all tests + typecheck to verify they pass**

Run: `cd apps/api && npx jest src/shared/modules/auth/authorization/policy.guard.spec.ts src/shared/modules/auth/authorization/authorization.service.spec.ts`
Run: `pnpm --filter @docita/api run check-types`
Expected: guard spec 4/4 PASS; service spec green; API typecheck exit 0.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/shared/modules/auth/authorization apps/api/src/shared/modules/auth/guards/policy.guard.ts apps/api/src/shared/modules/auth/decorators/require-policy.decorator.ts apps/api/src/app.module.ts
git commit -m "feat(api): add PolicyGuard, RequirePolicy decorator, and ABAC adapter stage"
```

---

### Task 6: Wire `patients.controller` + e2e proof (Phase C1, patients)

**Files:**
- Modify: `apps/api/src/domains/patients/presentation/controllers/patients.controller.ts`
- Modify: `apps/api/src/domains/patients/presentation/controllers/patients.controller.spec.ts`
- Test: `apps/api/test/e2e/auth/patient-abac-policy.e2e-spec.ts`

**Interfaces:**
- Consumes: `@RequirePolicy` (Task 5); `PatientResourceResolver` (Task 5).
- Produces: enforced `patient` read/update posture on `GET/PATCH /patients/:id`; e2e regression suite.

- [ ] **Step 1: Write the e2e spec (failing first)**

Use the exact fixture pattern from the existing `apps/api/test/e2e/audit/patient-phi-read-audit.e2e-spec.ts` (`setupTestDatabase`/`resetDatabase`/`closeDatabase`/`getPrismaInstance` from `../../setup`, `factories`/`setPrismaInstance` from `../../factories`, `signE2eAccessToken` from `../../e2e-auth-token`, plus the same mock providers). Create `apps/api/test/e2e/patients/patient-abac-policy.e2e-spec.ts`:

```ts
// E2E: ABAC patient policy — additive object-level enforcement on
// GET/PATCH /patients/:id. Existing decorators (roles/feature/tier/tenant)
// stay in force; this suite proves the policy stage does not change the
// effective outcomes on the staff surface and that the pipeline is intact.
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

describe('Patient ABAC policy (e2e)', () => {
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

  const signDoctor = async (clinicId: string) => {
    const { user } = await factories.user({ clinicId, role: Role.DOCTOR });
    await factories.doctorClinic(user.id, clinicId);
    const token = signE2eAccessToken(jwtService, {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      clinicId: user.clinicId,
    });
    return { user, token };
  };

  const signPatient = async (clinicId: string, patientId: string) => {
    const { user } = await factories.user({ clinicId, role: Role.PATIENT });
    const token = signE2eAccessToken(jwtService, {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      clinicId: user.clinicId,
      patientId,
    });
    return { user, token };
  };

  it('staff DOCTOR of the owning clinic reads the patient (200)', async () => {
    const clinicA = await factories.clinic();
    const { token } = await signDoctor(clinicA.id);
    const patient = await factories.patient(clinicA.id);

    await request(app.getHttpServer())
      .get(`/patients/${patient.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('staff DOCTOR of another clinic cannot read the patient (404, no existence disclosure)', async () => {
    const clinicA = await factories.clinic();
    const clinicB = await factories.clinic();
    const { token: tokenA } = await signDoctor(clinicA.id);
    const patientB = await factories.patient(clinicB.id);

    await request(app.getHttpServer())
      .get(`/patients/${patientB.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(404);
  });

  it('unauthenticated request is rejected (401)', async () => {
    const clinicA = await factories.clinic();
    const patient = await factories.patient(clinicA.id);

    await request(app.getHttpServer()).get(`/patients/${patient.id}`).expect(401);
  });

  it('PATIENT-role token is rejected at the roles gate (403, unchanged)', async () => {
    const clinicA = await factories.clinic();
    const { token } = await signPatient(clinicA.id, 'pat-profile-1');
    const patient = await factories.patient(clinicA.id);

    await request(app.getHttpServer())
      .get(`/patients/${patient.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('staff DOCTOR of the owning clinic updates the patient (200)', async () => {
    const clinicA = await factories.clinic();
    const { token } = await signDoctor(clinicA.id);
    const patient = await factories.patient(clinicA.id);

    await request(app.getHttpServer())
      .patch(`/patients/${patient.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ firstName: 'Updated' })
      .expect(200);
  });
});
```

Run: `cd apps/api && npx jest test/e2e/patients/patient-abac-policy.e2e-spec.ts`
Expected: FAIL — 404s/403s until the decorators land in Step 2 (the policy stage is not yet wired). This is the red phase.

- [ ] **Step 2: Wire the controller**

Modify `apps/api/src/domains/patients/presentation/controllers/patients.controller.ts`:

- Add the import (next to the other auth imports):

```ts
import { RequirePolicy } from '@/shared/modules/auth/decorators/require-policy.decorator';
```

- On `findOne` (the `@Get(':id')` method), add immediately below its `@ApiOperation(...)`:

```ts
  @RequirePolicy('patient', 'read')
```

- On `update` (the `@Patch(':id')` method), add:

```ts
  @RequirePolicy('patient', 'update')
```

Do NOT remove or reorder any existing decorator on either method. `create`, `findAll`, and `delete` stay unchanged (no object-level policy this slice; the matrix roles + feature gates already cover them).

- [ ] **Step 3: Update the controller unit spec**

Modify `apps/api/src/domains/patients/presentation/controllers/patients.controller.spec.ts` — next to the existing `.overrideGuard(RolesGuard)` call, add:

```ts
import { PolicyGuard } from '@/shared/modules/auth/guards/policy.guard';
```

and in the testing module:

```ts
      .overrideGuard(PolicyGuard)
      .useValue({ canActivate: () => true })
```

Run: `cd apps/api && npx jest src/domains/patients/presentation/controllers/patients.controller.spec.ts`
Expected: PASS (guard stubbed; existing behavior assertions unchanged).

- [ ] **Step 4: Bring up the docker test Postgres and run the e2e suite**

Run (from repo root — the test DB service is `db_test`, behind the `test` profile):

```bash
docker compose --profile test up -d db_test
```

Run: `cd apps/api && pnpm run test:e2e`
Expected: the full e2e suite passes including the new `patient-abac-policy` spec (5 cases). If any *existing* spec fails, stop and investigate — the policy stage must not change outcomes elsewhere.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/domains/patients/presentation/controllers/patients.controller.ts apps/api/src/domains/patients/presentation/controllers/patients.controller.spec.ts apps/api/test/e2e/auth/patient-abac-policy.e2e-spec.ts
git commit -m "feat(api): enforce ABAC patient policy on GET/PATCH /patients/:id + e2e"
```

---

### Task 7: A2 posture gate — `check:policy-resolver-coverage` (Phase A2)

**Files:**
- Create: `scripts/checks/check-policy-resolver-coverage.mjs`
- Modify: `package.json` (root) — add the `check:policy-resolver-coverage` script + append it to the `verify:standard` chain (immediately after `pnpm check:controller-rbac`)

**Interfaces:**
- Consumes: `gitLsSourceFiles` + `reportFindingsAndExit` from `../lib/check-runner.mjs` (same helpers `check-controller-rbac.mjs` uses).
- Produces: a fail-closed static gate that every `@RequirePolicy("resource", …)` usage in `apps/api/src` maps to a registered resolver — the A2 "posture check wired" exit criterion. `pnpm check:standard-gate-wiring` auto-validates the chain entry, so no separate wiring test is needed.

- [ ] **Step 1: Write the check script**

Create `scripts/checks/check-policy-resolver-coverage.mjs`:

```js
#!/usr/bin/env node
// Fail-closed posture gate (ABAC Phase A2): every @RequirePolicy(resource, ...)
// usage in apps/api must have a registered resolver, or the guard 403s at
// runtime. Catches the misconfiguration class statically.
import fs from "node:fs";
import { gitLsSourceFiles, reportFindingsAndExit } from "../lib/check-runner.mjs";

const controllerFiles = gitLsSourceFiles(["apps/api/src"], {
  include: [/\.controller\.ts$/],
});

const usageRe = /@RequirePolicy\(\s*["']([a-z-]+)["']/g;
const usage = new Map(); // resource -> sites[]

for (const file of controllerFiles) {
  if (!fs.existsSync(file)) continue;
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    let match;
    usageRe.lastIndex = 0;
    while ((match = usageRe.exec(line)) !== null) {
      const resource = match[1];
      if (!usage.has(resource)) usage.set(resource, []);
      usage.get(resource).push(`${file}:${index + 1}`);
    }
  });
}

const registryFile =
  "apps/api/src/shared/modules/auth/authorization/resolvers/policy-resource-resolver.ts";
const registryText = fs.existsSync(registryFile)
  ? fs.readFileSync(registryFile, "utf8")
  : "";

const violations = [];
for (const [resource, sites] of usage.entries()) {
  const resolverFile = `apps/api/src/shared/modules/auth/authorization/resolvers/${resource}-resource.resolver.ts`;
  const hasFile = fs.existsSync(resolverFile);
  const hasRegistration = new RegExp(`\\['${resource}',`).test(registryText);
  if (!hasFile || !hasRegistration) {
    violations.push(
      `${sites.join(", ")}: @RequirePolicy('${resource}') has no resolver ` +
        `(missing ${resolverFile} or registration in ${registryFile})`,
    );
  }
}

reportFindingsAndExit("ABAC policy-resolver coverage check", violations, {
  failAlways: true,
});
```

- [ ] **Step 2: Run it against the tree**

Run: `node scripts/checks/check-policy-resolver-coverage.mjs`
Expected: PASS — after Tasks 5/6 the only `@RequirePolicy` usage is `'patient'`, and `patient` has `PatientResourceResolver` + a `['patient',` registration. (Before Tasks 5/6 it exits 0 trivially — no usages yet; the gate bites on the first divergence.)

- [ ] **Step 3: Wire into the gate chain**

In root `package.json`, add next to the other `check:` scripts:

```json
"check:policy-resolver-coverage": "node scripts/checks/check-policy-resolver-coverage.mjs",
```

and insert `pnpm check:policy-resolver-coverage &&` into the `verify:standard` chain immediately after `pnpm check:controller-rbac &&`.

- [ ] **Step 4: Verify gate wiring**

Run: `pnpm check:standard-gate-wiring` and `pnpm check:policy-resolver-coverage`
Expected: both exit 0 (the wiring check validates that every `check:*` referenced in the chain has a script).

- [ ] **Step 5: Commit**

```bash
git add scripts/checks/check-policy-resolver-coverage.mjs package.json
git commit -m "feat(checks): gate ABAC policy-resolver coverage (Phase A2 posture)"
```

---

### Task 8: ADR-0013, docs, and full validation gate (Phases A4 + D5-lite)

**Files:**
- Create: `docs/architecture/decisions/0013-abac.md`
- Modify: `docs/compliance/ACCESS_AUDIT.md`
- Modify: `docs/analysis/EXECUTION_PLAN.md`

- [ ] **Step 1: Write ADR-0013**

Create `docs/architecture/decisions/0013-abac.md` (follow the format of the existing ADRs in `docs/architecture/decisions/`; the `0002-opennext-on-cloudflare.md` file is a good structural template). Record:

- **Status:** Accepted.
- **Context:** ABAC_MIGRATION_PLAN.md inventory; `AuthorizationService` precursor is unwired; `@DoctorPatientScoped` is registered but not applied to any live route; PATIENT own-row is enforced nowhere on the route surface; roles matrix is the sole object-level gate.
- **Decision:** Layered ABAC-on-RBAC with deny-overrides and default-deny; typed-policy engine in `packages/authorization` with a declarative rule style, no XACML; `packages/types` owns attribute schemas; `PolicyGuard` is a global stage after the roles baseline; UI remains non-authoritative (snapshot deferred to a later slice); RLS stays on as the data-plane backstop.
- **Deferred product decision (recorded):** doctor **assignment-pinning** on the staff patients surface. `PatientAbacPolicy` implements the rule behind `resource.requiresAssignment` (default false); the staff resolver keeps it false (differential-equivalent to today). Enabling it on the staff surface is a product decision that must land with a differential pass + a separate PR (C1 phase 2), never silently.
- **Consequences:** any new `@RequirePolicy` route must register a resolver or the guard 403s; attribute vocabulary is versioned in `packages/types`; deny reasons are machine-readable.

- [ ] **Step 2: Update ACCESS_AUDIT.md**

Add a one-row entry to the matrix → layers section: `ABAC policy index` listing the `patient` policy (id `patient`, owner/tenant/assignment rules, resolver `PatientResourceResolver`, decorator `@RequirePolicy`) and noting the layered pipeline position (after roles, before RLS).

- [ ] **Step 3: Update EXECUTION_PLAN.md**

- In the P6.1 row of the Priority-6 table, change `Backend` status from `0/4` description to reference this slice: `P6.1 first slice done 2026-08-06 — see docs/superpowers/plans/2026-08-06-abac-first-slice.md`.
- Add a short NOTE paragraph (mirroring the existing "NOTE 2026-08-06" style) recording: attribute schemas in `packages/types`, `@workspace/authorization` package, `PolicyGuard` + `@RequirePolicy`, patients enforcement, e2e + differential green, and the deferred assignment-pinning decision with its ADR link.

- [ ] **Step 4: Run the full validation gate**

Run (each must exit 0):

```bash
pnpm --filter @workspace/types run check-types
pnpm --filter @workspace/types run test
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

Expected: all gates green; knip reports no unused exports (the new package exports are all consumed: `PatientAbacPolicy` by `AbacPolicyRegistry`, `evaluatePolicy`/builders by the package tests, `AbacAction`/`AbacReason` by the API aliases).

- [ ] **Step 5: Commit**

```bash
git add docs/architecture/decisions/0013-abac.md docs/compliance/ACCESS_AUDIT.md docs/analysis/EXECUTION_PLAN.md
git commit -m "docs(authz): record ADR-0013, ABAC policy index, and first-slice execution note"
```

---

## Definition of done for this slice

- [ ] `packages/types` owns the attribute schemas; no parallel interfaces; `check:zod-interface-parity` green.
- [ ] `packages/authorization` builds, typechecks, and passes its unit + differential tests; `AuthorizationService` gained `evaluateAbac` and the package has a consumer (AGENTS §16.1 satisfied).
- [ ] `PolicyGuard` + `@RequirePolicy` enforce `patient` read/update on `GET/PATCH /patients/:id`; every existing decorator on those routes is untouched.
- [ ] `check:policy-resolver-coverage` wired into `verify:standard` (A2 posture gate) and passing.
- [ ] Fail-closed proven: declared policy without a resolver → 403 (unit test).
- [ ] e2e green: staff same-clinic 200, cross-clinic 404, PATIENT 403, unauth 401, update 200; no existing e2e regressed.
- [ ] No guard, tenant, tier, feature, RLS, audit, or webhook check weakened; assignment-pinning explicitly deferred in ADR-0013.
- [ ] `verify:standard`, knip, circular, lint, all check-types, and the API/package test suites pass.
- [ ] Docs updated: ADR-0013, ACCESS_AUDIT policy index, EXECUTION_PLAN cross-ref.

## Out of scope (later plans)

C2 appointments, C3 prescriptions, C4 lab/payments, C5 audit logs, C6 cross-tenant referral, C7 frontend permission snapshot, **B5 audit obligations** (AuditLog rows on sensitive allows — decision logging only in this slice; full obligation plumbing is a C5/Phase-D plan), Phase D retirement ledger, Phase E parity-gate cutover (`check:abac-parity` CI gate), worker-side consumption of `@workspace/authorization`.
