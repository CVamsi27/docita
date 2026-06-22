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

## F1 — `@ZodSerializerDto` does not trim responses — ✅ RESOLVED (safe serializer shipped)

**Status (2026-06-20):** Implemented via a **non-throwing** global serializer
(`SafeZodSerializerInterceptor`, registered in `app.module.ts`). Responses are now
trimmed to their `@workspace/types` contract where the schema matches; where a schema is
stale, the original response passes through unchanged and a warning is logged (no 500s).
Verified: full e2e == the no-F1 baseline (21 failed / 85 passed, all sandbox artifacts);
the 3 suites that 500'd under the stock interceptor now pass. **Remaining work is
incremental and non-blocking:** fix each schema named in the `SafeZodSerializer` warning
logs so that endpoint begins trimming (no further wiring). The history below explains why
the stock interceptor could not simply be turned on.

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

**Root cause (why the 500s, traced 2026-06-20).** Several `@ZodSerializerDto(schema)`
annotations point at **domain/validation schemas reused as response contracts**, not
response-shaped schemas. Example: prescriptions use `prescriptionResponseSchema =
prescriptionSchema` (`packages/types/src/contracts/prescriptions.ts` →
`clinical/medications.ts`), which has input-style `.transform(stripHtmlTags)` on text
fields and a strict nested `medications: z.array(medicationSchema)`. The persisted/served
prescription shape doesn't satisfy that strict nested schema, so `zod.parse()` throws →
500. So the fix per endpoint is to **author a dedicated response schema that matches the
service's actual output** (and tighten the Prisma `select` to it), verified against real
data via e2e — not a one-line interceptor registration. This is why it's a per-endpoint
effort, and why it can't be landed safely without expanding e2e coverage first.

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

## F2 — Endpoints without `@Roles` — ✅ ALREADY ENFORCED (no work needed)

**Re-verified 2026-06-20 — the original finding was wrong (incomplete grep).** Every one
of the 127 API controllers already declares access intent, and it's CI-enforced:
- The team uses composite access decorators that wrap `Roles(...)` — `@InternalApiAccess`
  (→ `Roles(INTERNAL)`), `@AppointmentsApiAccess`, `@DoctorsApiAccess`,
  `@StaffSelfServiceAccess`, `@PatientsBasicManagementAccess`, etc. — plus `@Roles`,
  `@Public`, `@PatientPortalSession`, `@UseGuards`. A scan for *any* of these found
  **0 controllers without an access declaration**.
- **`scripts/checks/check-controller-rbac.mjs` already enforces per-handler posture**: it
  fails if any `@Get/@Post/@Put/@Patch/@Delete/@All` handler lacks a controller- or
  method-level `@Roles`/`@Public`/`@UseGuards`/`@RequireFeature`/`*Access`. It is wired
  into the `verify:standard` gate (`package.json` `check:controller-rbac`) and passes
  ("Controller RBAC posture check passed").

So F2 ("make access explicit + standards-check") is already implemented. The only real
gaps were the **frontend** parity bugs, which were fixed (below). The legacy text of this
finding is retained for history.

**Legacy finding (superseded).** `RolesGuard` returns `true` when a handler has no `@Roles`;
the raw-`@Roles` grep missed the composite `*Access` decorators above, so the "53 unguarded
controllers" count was an artifact.

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

**Already done by the team** (see above): the `@Public`/`@Roles`/`*Access` convention plus
`check:controller-rbac` is exactly this recommendation, already shipped and gated.

## F3 — Index footprint: 474 `@@index` across 141 models — assessed: NOT required now

**Re-verified 2026-06-20.** Scanned all 141 models for genuine redundancy. Only **2** exact
`@@index`-duplicates-`@@unique` cases exist (Postgres already auto-indexes unique
constraints, so these two are pure duplication):
- `PlatformAlert`: `@@index([alertKey, environment])` duplicates `@@unique([alertKey, environment])`
- `DeviceToken`: `@@index([token])` duplicates `@@unique([token])`

Everything else in the 474 appears intentional (no other exact redundancy; the repo already
gates query perf via `check:n-plus-1`). So the footprint is **not** an over-indexing problem
worth a broad prune — the only safe wins are these 2, a negligible gain.

**Not applied now (would be unsafe/entangled).** Removing them requires a Prisma migration.
Right now `schema.prisma` carries another contributor's **uncommitted** guided-tour schema
change plus an uncommitted migration, so generating a migration would entangle the two
changes; and editing `schema.prisma` without a clean matching migration causes drift that
fails `check:migration-*`. **Apply in a clean tree:** delete those 2 `@@index` lines and run
`prisma migrate dev --name drop_redundant_unique_indexes` (the generated `DROP INDEX` is the
whole change). Low priority.

## F4 — Test coverage gaps in focus features — LOW (partially addressed)

`whatsapp` was the thinnest (1 test file / 7 view components). Added state tests for
`WhatsappRecentSentView` and `WhatsappDeliveryView` (now 3 files / 10 tests). `dashboard`
(today) is 3 files / 42 source files — add view/state tests for the stat grid, alerts, and
advisor rail next. `upgrade` is a redirect to `/settings?tab=subscription` (no UI to test;
the subscription feature is well-covered at 14 files).
