# C7 — Frontend Permission Snapshot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `GET /auth/effective-permissions` (server-derived permission snapshot) and backfill the client `canAccessTarget` from it with a documented non-authoritative + offline-fallback contract.

**Architecture:** The server computes the snapshot with a pure, tested mirror (`computeEffectivePermissions` in `@workspace/utils`) using the same `packages/types` access helpers the client matrix uses (`APP_ACCESS_MATRIX` roles/permissions/feature/tier, `shouldDenyAccessForFrontDeskMode`, `hasFeatureAccess`). The client fetches it once per session (feature-boundary `.api.ts` file + `useEffectivePermissions` hook), and `canAccessTarget` prefers the snapshot entry when supplied, else falls back to the local matrix (current behavior — zero UI regression). Frontend policy logic stays **non-authoritative**: the server remains the enforcement point (ACCESS_AUDIT non-negotiable 2); the snapshot only previews decisions. `internal` is INTERNAL-role gated (no matrix usage) — its C7 leg is the INTERNAL bypass on the endpoint.

**Tech Stack:** `packages/types` (Zod schema, sentinel-map SSOT), `packages/utils` (pure mirror), NestJS auth module (controller + DTO), jest e2e, app React (`useEffectivePermissions` + `canAccessTarget` opt-in).

## Global Constraints

- No guard weakening: the endpoint is read-only; `@Roles`-style gating on the route mirrors staff+INTERNAL access; the snapshot is never used for server-side enforcement.
- Differential-equivalence: `computeEffectivePermissions` must reproduce the client's `canAccessTarget` outcomes for identical inputs (spot-checked in its unit tests + e2e).
- No UI regression: existing `canAccessTarget` call sites behave identically when no snapshot is supplied (default path unchanged); the snapshot path is opt-in per call site.
- `check:frontend-fetch`: the client fetch lives in a `.api.ts` file (sanctioned boundary), not inline.
- No `console.log`, no emojis, aliases (`@/...`, `@workspace/...`), commits per task with the standard footer.

---

### Task 1: Schema + sentinel-map SSOT (packages/types)

**Files:**
- Modify: `packages/types/src/access/access-matrix.ts`
- Create: `packages/types/src/auth/effective-permissions.ts` (+ test in `packages/types/test/`)
- Modify: `packages/types/src/index.ts` (barrel)

**Interfaces:**
- Produces: `TIER_SENTINEL_FEATURES` (exported const, canonical home), `effectivePermissionsResponseSchema` (Zod), `EffectivePermissionsResponse` (`z.infer`) — consumed by Task 2/3/4.

- [ ] **Step 1: Move `TIER_SENTINEL_FEATURES` into `access-matrix.ts`** (copy the 4-entry map from `apps/app/src/lib/access-control/access-policy.ts`, export it).
- [ ] **Step 2: Create the schema** (`effective-permissions.ts`): `role` (`userRoleSchema`), `tier` (string), `planMode` (`planModeSchema`), `hasIntelligence` (boolean), `permissions` (`z.array(z.string())`), `targets` (`z.record(z.string(), z.object({ read: z.boolean(), write: z.boolean() }))`), `generatedAt` (string). Test: parse/reject.
- [ ] **Step 3: Barrel + build + test** (`pnpm --filter @workspace/types build`, `pnpm --filter @workspace/types test`).

### Task 2: Pure mirror — `computeEffectivePermissions` (packages/utils)

**Files:**
- Create: `packages/utils/src/access/effective-permissions.ts` + `effective-permissions.test.ts`
- Modify: `packages/utils/src/index.ts` (barrel)

**Interfaces:**
- Consumes: `APP_ACCESS_MATRIX`, `TIER_SENTINEL_FEATURES`, `getAccessRequirement`, `getAccessPermissions`, `getAccessFeature`, `getAccessTier`, `isAccessComingSoon`, `shouldDenyAccessForFrontDeskMode`, `APP_PERMISSIONS_BY_ROLE`, `hasFeatureAccess` (local), `userRoleSchema` types from `@workspace/types`.
- Produces: `computeEffectivePermissions(input: { role: UserRole; tierName: TierName; planMode: PlanMode; hasIntelligence?: boolean; featureOverrides?: ClinicFeatureOverrides }): Record<string, { read: boolean; write: boolean }>` — consumed by the API controller (Task 3).

- [ ] **Step 1: Failing test** — an ADMIN at PROFESSIONAL/FULL must have `page.dashboard.read=true` and `api.patient-portal.*`-style targets false; a FRONT_DESK-mode clinic must have clinical targets blocked (spot-check `shouldDenyAccessForFrontDeskMode`); coming-soon targets false; INTERNAL → all true.
- [ ] **Step 2: Implementation** — for each `APP_ACCESS_MATRIX` key: comingSoon → false; Front Desk block → false; else `read`/`write` via a shared `canForTarget(target, mode)` replicating the client's `canAccessTarget` (roles, permissions, feature via `hasFeatureAccess`, tier via `TIER_SENTINEL_FEATURES` + `hasFeatureAccess`; INTELLIGENCE → `hasIntelligence`).
- [ ] **Step 3: Run tests + typecheck + commit.**

### Task 3: API endpoint `GET /auth/effective-permissions`

**Files:**
- Create: `apps/api/src/shared/modules/auth/auth/auth-effective-permissions.controller.ts` (+ `dto` addition)
- Modify: `apps/api/src/shared/modules/auth/auth/auth.module.ts` (controllers), `apps/api/src/shared/modules/auth/auth/auth.controller.access.ts` (access decorator)

**Interfaces:**
- Consumes: `computeEffectivePermissions` (Task 2), `ClinicAuthCacheService.getClinicAuth`, `Role` from request user, `getTierName`/`mapDbClinicTierToTierAndMode` from `@workspace/types`.
- Produces: `GET /auth/effective-permissions` — protected staff/INTERNAL route returning `EffectivePermissionsResponse`.

- [ ] **Step 1: Access decorator** — `EffectivePermissionsApiAccess()` = `UseGuards(TierGuard)` + `Roles(DOCTOR, ADMIN_DOCTOR, NURSE, RECEPTIONIST, ADMIN, INTERNAL)` (staff + INTERNAL; the portal roles are excluded — they have no app matrix targets) + no `RequireFeature` (the snapshot is read-only metadata, not a feature-gated surface).
- [ ] **Step 2: Controller** — read `user.role`/`user.clinicId`; INTERNAL → all-targets-true snapshot with tier `'ENTERPRISE'`/`FULL`; staff → `getClinicAuth(clinicId)` → `mapDbClinicTierToTierAndMode` → `computeEffectivePermissions`; serialize via the DTO.
- [ ] **Step 3: Typecheck + unit + register in module + commit.**

### Task 4: e2e — `effective-permissions.e2e-spec.ts`

**Files:**
- Create: `apps/api/test/e2e/auth/effective-permissions.e2e-spec.ts`

**Interfaces:**
- Consumes: `factories.clinic({ tier: 'PROFESSIONAL' })`, `factories.user`, `signE2eAccessToken`, `factories.clinic` with `planMode: 'FRONT_DESK'` support.

- [ ] **Step 1: Write the spec** — ADMIN 200 with `page.dashboard.read=true` + `role` echoed + `generatedAt` present; FRONT_DESK-mode clinic → clinical target `read=false`; INTERNAL 200 with all-true snapshot; unauthenticated 401; PATIENT 403 (not in the staff roles set).
- [ ] **Step 2: Run + lint + commit.**

### Task 5: Client — hook + snapshot-aware `canAccessTarget`

**Files:**
- Create: `apps/app/src/lib/api/effective-permissions.api.ts`, `apps/app/src/lib/access-control/use-effective-permissions.ts`
- Modify: `apps/app/src/lib/access-control/access-policy.ts` (import `TIER_SENTINEL_FEATURES` from `@workspace/types`; add optional `snapshot` to `AccessContext`; prefer snapshot entry when present)
- Modify: `apps/app/src/features/inbox/components/InboxPageContent.tsx`, `apps/app/src/features/consultation/components/ConsultationWorkspaceExtras.tsx` (pass snapshot)

**Interfaces:**
- Consumes: `fetchEffectivePermissions` (api boundary, uses the app api client), `EffectivePermissionsResponse`.
- Produces: `useEffectivePermissions(): EffectivePermissionsResponse | null` (fetches once, non-blocking, null on failure → offline fallback), `AccessContext.snapshot`.

- [ ] **Step 1: API boundary** — `fetchEffectivePermissions()` using the existing app api client (mirror the surrounding `lib/api` files' fetch pattern; session-bearer).
- [ ] **Step 2: Hook** — module-level cache + `useEffect` fetch; return `null` until loaded or on error.
- [ ] **Step 3: `canAccessTarget`** — delete the local `TIER_SENTINEL_FEATURES`, import from `@workspace/types`; add `snapshot?: EffectivePermissionsResponse['targets']` to `AccessContext`; at the top, when `context.snapshot?.[target]` exists, return `context.snapshot[target][mode]`. Update the file's existing unit tests (if any) to cover the snapshot path.
- [ ] **Step 4: Wire the two call sites** — call `useEffectivePermissions()` and pass `snapshot` (only when loaded).
- [ ] **Step 5: App typecheck + lint + app unit tests + commit.**

### Task 6: Docs + final validation + review

- [ ] **Step 1: Docs** — ADR-0013 C7 section (non-authoritative contract, offline fallback, INTERNAL bypass, differential mirror), ACCESS_AUDIT non-negotiable note (snapshot is preview-only), EXECUTION_PLAN C7 note, ABAC_MIGRATION_PLAN C7 status.
- [ ] **Step 2: Full gate** — `pnpm --filter @workspace/types test`, `pnpm --filter @workspace/utils test`, authorization package suite, API unit, guard-adjacent e2e batch, `pnpm check:policy-resolver-coverage`, `check:controller-rbac`, `check:circular:enforce`, knip, `pnpm verify:standard`.
- [ ] **Step 3: Code-reviewer pass** — dispatch on `HEAD~6..HEAD` (C7 commits); fix findings; commit; close.

---
