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

**Why not auto-applied.** Registering the interceptor globally flips every
`@ZodSerializerDto` endpoint to strict trimming at once. If any response schema is
narrower than what the frontend actually reads, fields get stripped → frontend breakage
across up to 58 endpoints.

**Recommended rollout.**
1. Register `ZodSerializerInterceptor` via `APP_INTERCEPTOR` (one line).
2. Before/with that, audit each response schema vs its `@workspace/data-access` consumer;
   widen schemas that are missing fields the UI reads.
3. Roll out per-domain (dashboard → appointments → patients → billing …), running app+api
   tests after each. The shared zod schemas already exist, so this is verification +
   schema-completion, not new contracts.
4. Pair with WS3: tighten the Prisma `select`/`include` feeding each trimmed response so
   the DB doesn't fetch columns that get stripped.

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
