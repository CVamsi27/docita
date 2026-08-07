# AuthorizationModule Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Promote the object-level authorization concern out of `shared/modules/auth/` into its own standalone `shared/modules/authorization/` NestJS module, mirroring the `packages/authorization` split (architecture Candidate B).

**Architecture:** The authorization concern (ABAC policies, resolvers, `AuthorizationService`, registry) becomes a top-level shared module with one reason to change. `AuthModule` keeps identity/session/credentials. The guard chain in `app.module.ts` stays the single documented source of the global guard order; `PolicyGuard` remains the final `APP_GUARD` stage but imports from the new module. No cycles: the new module's only cross-module dependency (`ClinicAuthCacheService`) is provided by the `@Global` `AuthGuardsModule`, and resolvers depend only on the `@Global` `PrismaModule` — so the module no longer imports `AuthModule` at all.

**Tech Stack:** NestJS modules/DI, `@workspace/authorization`, Prisma (global), `check-policy-resolver-coverage.mjs` gate.

## Global Constraints

- Never weaken a guard (ABAC_RETIREMENT_LEDGER rule): the global guard order in `app.module.ts` is unchanged; `PolicyGuard` stays the last `APP_GUARD`.
- `@RequirePolicy`, `@EmergencyAccess` decorators and `PolicyGuard` stay in `auth/` (out of scope — moving them is cosmetic churn with a large blast radius).
- Historical point-in-time audit evidence (`docs/audits/evidence/2026-05-backend-file-audit.md`) is NOT rewritten — it records May 2026 state.
- All imports use `@/` aliases (no new `../` parent imports).
- Validation must include `pnpm check:circular:enforce` (module moves are exactly what it watches) and `pnpm check:policy-resolver-coverage` (its resolver paths are hardcoded and MUST be updated in the same change).

---

### Task 1: Move the directory

**Files:**
- Move: `apps/api/src/shared/modules/auth/authorization/` → `apps/api/src/shared/modules/authorization/`

- [x] **Step 1: Move the folder**

```bash
cd /Users/vamsikrishnachandaluri/repos/docita
mv apps/api/src/shared/modules/auth/authorization apps/api/src/shared/modules/authorization
ls apps/api/src/shared/modules/authorization
```

Expected: `abac-policy.registry.ts`, `authorization.module.ts`, `authorization.service.ts`, `authorization.service.spec.ts`, `policy.guard.spec.ts`, `resolvers/`, `role-bridge.ts`, `types.ts`. Relative imports inside the folder are unaffected.

- [x] **Step 2: Verify no stray files remain in the old location**

```bash
ls apps/api/src/shared/modules/auth/  # must show no authorization/ dir
```

---

### Task 2: Rewire `authorization.module.ts`

**Files:**
- Modify: `apps/api/src/shared/modules/authorization/authorization.module.ts`

- [x] **Step 1: Drop the now-unnecessary `AuthModule` import**

Remove the lines:

```ts
import { AuthModule } from '@/shared/modules/auth/auth/auth.module';
...
imports: [AuthModule],
```

Rationale: `ClinicAuthCacheService` is provided by the `@Global` `AuthGuardsModule` (already in the app via `AuthModule`); resolvers inject only `PrismaService` (`@Global` `PrismaModule`). With no `AuthModule` import there is no cycle between `AuthModule` (whose guards/controllers inject authorization types via `SharedModule`) and `AuthorizationModule`.

- [x] **Step 2: Update the module docstring**

Add a one-line note above `@Module`: "Standalone object-level decision module (ADR-0013, Candidate B): mirrors `packages/authorization`; `PolicyGuard` is the consumer. Guard order documented in `app.module.ts`."

- [x] **Step 3: Verify the module file compiles conceptually**

```bash
cd /Users/vamsikrishnachandaluri/repos/docita/apps/api
grep -n "AuthModule" src/shared/modules/authorization/authorization.module.ts
```

Expected: no `AuthModule` references remain (the `ClinicAuthCacheService` import in `authorization.service.ts` is untouched and stays `@/shared/modules/auth/auth/clinic-auth-cache.service`).

---

### Task 3: Update the three code importers

**Files:**
- Modify: `apps/api/src/shared/shared.module.ts`
- Modify: `apps/api/src/shared/modules/auth/guards/policy.guard.ts`
- Modify: `apps/api/src/shared/modules/auth/auth/auth-effective-permissions.controller.ts`

- [x] **Step 1: `shared.module.ts`**

Replace:

```ts
import { AuthorizationModule } from './modules/auth/authorization/authorization.module';
```

with:

```ts
import { AuthorizationModule } from './modules/authorization/authorization.module';
```

- [x] **Step 2: `policy.guard.ts`**

Replace the three import paths:

```ts
import { AuthorizationService } from '@/shared/modules/auth/authorization/authorization.service';
import { PolicyResourceResolverRegistry } from '@/shared/modules/auth/authorization/resolvers/policy-resource-resolver';
import { dbRoleToUserRole } from '@/shared/modules/auth/authorization/role-bridge';
```

with `@/shared/modules/authorization/...` equivalents.

- [x] **Step 3: `auth-effective-permissions.controller.ts`**

Replace:

```ts
import { dbRoleToUserRole } from '@/shared/modules/auth/authorization/role-bridge';
```

with:

```ts
import { dbRoleToUserRole } from '@/shared/modules/authorization/role-bridge';
```

- [x] **Step 4: Verify no stale path remains in src**

```bash
cd /Users/vamsikrishnachandaluri/repos/docita
grep -rn "auth/authorization" apps/api/src --include="*.ts" || echo "CLEAN"
```

Expected: `CLEAN`.

---

### Task 4: Update the hardcoded resolver paths in the coverage gate

**Files:**
- Modify: `scripts/checks/check-policy-resolver-coverage.mjs` (lines ~33, ~40)

- [x] **Step 1: Replace both path occurrences**

`apps/api/src/shared/modules/auth/authorization/resolvers/` → `apps/api/src/shared/modules/authorization/resolvers/` (both the registry path and the per-resource template string).

- [x] **Step 2: Verify**

```bash
cd /Users/vamsikrishnachandaluri/repos/docita
grep -n "modules/authorization" scripts/checks/check-policy-resolver-coverage.mjs
pnpm check:policy-resolver-coverage   # must exit 0
```

---

### Task 5: Update live docs (skip historical audit evidence)

**Files:**
- Modify: `docs/analysis/ABAC_MIGRATION_PLAN.md` (lines ~19, ~53)
- Modify: `docs/compliance/ACCESS_AUDIT.md` (resolver link paths, rows 51–55)
- Modify: `docs/architecture/decisions/0013-abac.md` (References → Files list)
- NOT modified: `docs/audits/evidence/2026-05-backend-file-audit.md` (point-in-time record)

- [x] **Step 1: ABAC_MIGRATION_PLAN.md** — replace both `apps/api/src/shared/modules/auth/authorization` references with `apps/api/src/shared/modules/authorization`.

- [x] **Step 2: ACCESS_AUDIT.md** — replace the `../apps/api/src/shared/modules/auth/authorization/resolvers/*` link paths in rows 51–55 with `modules/authorization/...`.

- [x] **Step 3: ADR-0013 References** — update the `Files:` bullet: `apps/api/src/shared/modules/auth/authorization/` → `apps/api/src/shared/modules/authorization/`.

- [x] **Step 4: Verify no live-doc stale path**

```bash
cd /Users/vamsikrishnachandaluri/repos/docita
grep -rn "auth/authorization" docs/analysis/ABAC_MIGRATION_PLAN.md docs/compliance/ACCESS_AUDIT.md docs/architecture/decisions/0013-abac.md || echo "CLEAN"
```

Expected: `CLEAN` (the only remaining `auth/authorization` strings repo-wide are in the historical audit evidence file, intentionally untouched).

---

### Task 6: Validate

- [x] **Step 1: Typecheck + lint + module tests**

```bash
cd /Users/vamsikrishnachandaluri/repos/docita/apps/api
pnpm run check-types          # expect 0 errors
pnpm run lint                 # expect 0 errors
npx jest src/shared/modules/authorization src/shared/modules/auth 2>&1 | tail -3   # expect all pass
npx jest src/domains/patients/presentation/controllers/patients.controller.spec.ts 2>&1 | tail -3  # overrides PolicyGuard
```

- [x] **Step 2: Circular-dependency gate (module moves are the risk)**

```bash
cd /Users/vamsikrishnachandaluri/repos/docita
pnpm check:circular:enforce   # expect exit 0 (baseline 0 cycles)
```

- [x] **Step 3: Repo gates + knip**

```bash
pnpm check:policy-resolver-coverage
pnpm check:controller-rbac
pnpm check:api-domain-layout
pnpm knip                     # expect exit 0
```

- [x] **Step 4: Full gate**

```bash
pnpm verify:standard          # expect exit 0
```

- [x] **Step 5: Review pass**

Dispatch `code-reviewer-deepseek-flash` over the change (folder move + rewire), focusing on: module graph cycles, import-path completeness, the coverage-gate path update, and whether the guard order in `app.module.ts` remains the single source of truth. Fix findings, re-run affected checks.

---

## Self-Review

**1. Spec coverage (Candidate B):** module boundary fixed (Task 1–2), all importers updated (Task 3), hidden coupling in the coverage gate handled (Task 4), docs kept current (Task 5), guard order unchanged + documented (Global Constraints + Task 6). No gaps.

**2. Placeholder scan:** every step has concrete commands and expected outputs; no TBDs.

**3. Type consistency:** no public API changes — `AuthorizationService`, `AbacPolicyRegistry`, `PolicyResourceResolverRegistry` exports are unchanged; only import paths move. `PolicyGuard` and decorators stay in `auth/` by design (documented).
