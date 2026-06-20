# Backend Audit Findings — 2026-06-20

Findings from the repo-wide hardening pass that are **high-value but too high-risk
to auto-apply in one pass** (they change response contracts or access behavior across
many endpoints). Each needs a verified, per-domain rollout. Safe fixes from the same
pass were applied directly (see git log: `fix(access): guard /settings/team…`,
`fix(access): guard /settings/team/join-requests…`, `test(whatsapp)…`,
`test(dashboard)…`, `chore(quality): exclude content-scripts…`).

## Verified secure (no change needed)

- **API auth is deny-by-default** — global `APP_GUARD` stack (`JwtAuthGuard` +
  `RolesGuard` + tenant/subscription/password/email guards) in `app.module.ts`; 55
  explicit `@Public` opt-outs.
- **Patient-portal data isolation (no IDOR)** — portal endpoints derive identity from
  `@PatientPortalSession()` + `req.user.id`, never a client param. Resource-by-id reads
  (e.g. `getPrescriptionById`) resolve `patientId` via `getPatientContext(userId)`, scope
  the query by it, and `throw NotFoundException` on mismatch — a patient cannot read
  another patient's records by guessing ids.
- **Tenant isolation** — `TenantGuard` + `TenantContextInterceptor` are global.

## F1 — `@ZodSerializerDto` does not trim responses (no global serializer) — HIGH

**Finding.** 58/126 controllers annotate responses with `@ZodSerializerDto(<schema>)`
from `@workspace/types`, but **`ZodSerializerInterceptor` is not registered** in
`apps/api/src/app.module.ts` (`APP_INTERCEPTOR` list) or `main.ts`. Per nestjs-zod,
`@ZodSerializerDto` only strips extra fields at runtime when that interceptor is
applied. Today it affects OpenAPI docs only — **responses are shaped by whatever the
service/repository returns, not enforced to the response schema.** So extra fields can
be sent over the wire (the user's "no single extra field to reduce traffic" concern).

**Proven unsafe as a global flip (measured 2026-06-20).** I registered
`ZodSerializerInterceptor` globally and ran the API e2e suite against the isolated test
DB, with a no-F1 baseline for comparison:

| Run | e2e result |
|---|---|
| Baseline (no F1) | 21 failed / 85 passed — all environment artifacts in this sandbox (auth/seed → 403s) |
| **With F1 (global)** | **28 failed / 78 passed** |

F1 **added +7 failures** and broke **3 suites that passed at baseline**:
`prescriptions.e2e-spec`, `clinic-members.e2e-spec`, `rbac-403-verification.e2e-spec`.
Cause: those response schemas don't match what the services return, so the serializer
either strips fields the test (and frontend) expect or `zod.parse()` throws → 500.
**Conclusion: not safe to enable globally — it breaks real prod contracts.** The change
was reverted (not shipped); unit + build stayed green, so the breakage is invisible
without e2e.

**Recommended rollout (per-domain, verified).** Do NOT register globally in one step.
1. Enable serialization for ONE domain at a time (per-controller `@UseInterceptors(ZodSerializerInterceptor)`),
   starting with already-passing domains (dashboard).
2. For each domain, run its e2e spec; fix the response schema to match the service output
   (add missing fields / correct types) until green. Start with the proven-broken three:
   prescriptions, clinic-members, rbac (claims/coding).
3. Only after every domain is individually green, switch to the global `APP_INTERCEPTOR`
   registration and delete the per-controller decorators.
4. Pair with WS3: tighten the Prisma `select`/`include` feeding each trimmed response.
5. Deploy behind a canary with response-error-rate + payload-size monitoring.

## F2 — Endpoints without `@Roles` rely on default-allow — MEDIUM

**Finding.** `RolesGuard` returns `true` when a handler has no `@Roles` (deny-by-default
for *auth*, allow-by-default for *role*). 73/126 controllers use `@Roles`; the rest allow
any authenticated clinic user. Most are intentionally shared (dashboard, profile,
notifications), but the set should be explicit, not implicit.

**Already fixed.** Standalone `/settings/*` pages reachable by all `SETTINGS_ROLES`
(incl. DOCTOR/RECEPTIONIST) that rendered admin-only panels with no guard:
- `/settings/team` — team management (backend mutations `@Roles(ADMIN, ADMIN_DOCTOR)`)
  → wrapped in `RoleGuard requiredPermission="manageStaff"`.
- `/settings/team/join-requests` — approve/reject/list are all
  `@Roles(ADMIN, ADMIN_DOCTOR)` → wrapped in `RoleGuard requiredPermission="manageStaff"`.

**Still open (narrower).** `/settings/compliance` renders `ComplianceSettingsPanel`
with no guard and is reachable by RECEPTIONIST via `PAGE_SETTINGS`, but the backend GET
compliance allows `ADMIN, ADMIN_DOCTOR, DOCTOR` (DSR mutations are admin-only). So a
RECEPTIONIST sees a panel that 403s. Not auto-fixed because the backend intentionally
allows DOCTOR read — decide whether compliance config should be `manageClinic`-gated
(hides DOCTOR too) or split read/write before adding a guard.

**Recommended.** Add explicit `@Roles(...)` (or a documented `@SharedAccess()` marker) to
every handler so role intent is declared, and add a standards-check asserting no
controller handler is missing one of `@Public` / `@Roles` / `@SharedAccess`.

## F3 — Index footprint: 474 `@@index` across 141 models — MEDIUM

**Finding.** Large index count raises write amplification. Likely redundant indexes exist
(single-column indexes covered by a composite's prefix; duplicate `@@index` vs `@@unique`).

**Why not auto-applied.** Pruning an index that backs a specific hot query regresses that
query; validation against real query patterns is required, and index changes need a
migration.

**Recommended method.**
1. From `schema.prisma`, list `@@index`; flag single-column indexes whose column is the
   first field of an existing composite (`@@index([a])` + `@@index([a, b])` → drop `[a]`).
2. Cross-check `@@index` that duplicate an `@@unique` on the same columns.
3. For each candidate, grep the matching repository for queries filtering/sorting on that
   column before dropping. Generate one reviewable migration.

## F4 — Test coverage gaps in focus features — LOW (partially addressed)

`whatsapp` was the thinnest (1 test file / 7 view components). Added state tests for
`WhatsappRecentSentView` and `WhatsappDeliveryView` (now 3 files / 10 tests). `dashboard`
(today) is 3 files / 42 source files — add view/state tests for the stat grid, alerts, and
advisor rail next. `upgrade` is a redirect to `/settings?tab=subscription` (no UI to test;
the subscription feature is well-covered at 14 files).
