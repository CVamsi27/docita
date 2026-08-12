# ABAC Migration Plan — Attribute-Based Access Control for Docita

> **CLOSED 2026-08-07.** Phases A–E are complete (A1–A4, B1–B5 shipped as the
> `@workspace/authorization` engine + `PolicyGuard` + `@RequirePolicy`;
> C1–C5 shipped, C6 recorded as a DEFERRED/BLOCKED decision, C7 shipped;
> Phase D retirement ledger + Phase E parity gates recorded). Remaining open
> threads are tracked in ADR-0013's follow-up list and the
> [`ABAC_RETIREMENT_LEDGER.md`](ABAC_RETIREMENT_LEDGER.md): C2.1 write-lock
> product decision, C2.2 remaining controllers, the B5/D2 policy-emitted
> obligation adapter, D3 emergency-access time-boxing, and worker-side
> consumption of `@workspace/authorization`. This document remains the
> roadmap record, not a backlog.

Point-in-time: **2026-08-04** (inventory verified against the live tree).

**Goal**: move authorization from a coarse, statically-fixed Role-Based Access Control (RBAC) model to an Attribute-Based Access Control (ABAC) model — while keeping every existing guard, tenant boundary, tier/feature gate, and RLS policy strictly intact. The migration is a *layered extension*, not a replacement sweep: RBAC (role + tenant + tier/feature) remains the baseline first-pass denial layer, and ABAC policies add **object-level, context-aware** decisions on top.

This is the execution companion for the existing authorization work in
[`apps/api/src/shared/modules/authorization/`](../../apps/api/src/shared/modules/authorization/) (the current
ABAC-precursor), [`docs/compliance/ACCESS_AUDIT.md`](../compliance/ACCESS_AUDIT.md), and
[`docs/compliance/RLS_ROLLOUT.md`](../compliance/RLS_ROLLOUT.md). It extends
[`docs/analysis/EXECUTION_PLAN.md`](EXECUTION_PLAN.md) rather than replacing it.

Status rules are the same as `EXECUTION_PLAN.md`:

- **DONE** means the change exists in the tree and the named verification command passed.
- **READY** means implementation is complete but requires an external environment, credential, or release action.
- **BLOCKED** means the next action cannot be completed without a specific decision or external prerequisite; the blocker must be named.
- **OPEN** means engineering work remains.

Operating rules (from `AGENTS.md` §5, §16, and the EXECUTION_PLAN):

- **Never weaken a guard.** Do not remove a `@Roles`, `@RequireFeature`, tier, tenant, audit, RLS, webhook, or session check to make a policy "work." ABAC policies **add** conditions; the baseline RBAC + tier + tenant gates stay in force until a differential test proves the policy is an exact superset.
- Frontend policy logic remains **non-authoritative**. The UI may preview decisions, but the server stays the enforcement point (ACCESS_AUDIT.md non-negotiable 2).
- Default-deny everywhere this plan adds a decision point; compose policies with **deny-overrides**.
- Work from branches off `main`, respect the two-open-PR cap (§11.3), and keep each phase in its own PR.
- Record product/parity decisions as ADRs or in this document before marking a phase complete.

---

## 1) Current state (inventory, verified 2026-08-04)

### 1.1 What exists today

| Layer | Mechanism | Canonical location |
| --- | --- | --- |
| **Roles** | `userRoleSchema` — 8 roles (`DOCTOR`, `NURSE`, `RECEPTIONIST`, `ADMIN`, `INTERNAL`, `ADMIN_DOCTOR`, `PATIENT`, `LAB`) | `packages/types/src/shared/users/roles.ts:3` |
| **Permissions** | 22 app permissions assigned per role (`APP_PERMISSIONS_BY_ROLE`) | `packages/types/src/access/access-matrix.ts:6-112` |
| **Access matrix** | ~55 targets (`page.*` / `api.*`), each with `read`/`write` role lists + optional `feature`, `tier`, `comingSoon` | `packages/types/src/access/access-matrix.ts:160-509` |
| **Tier / feature** | 56 `Feature` values → `FEATURE_TIER_MAP`; plan modes (`FULL`/`FRONT_DESK`/`CORE`) block via `MODE_BLOCKED_FEATURES`; per-clinic overrides; `hasFeatureAccess` + `assertClinicHasFeatureOrThrow` | `packages/types/src/billing/tier.ts` |
| **API guard stack** | JWT → `TenantGuard`/`TenantContextInterceptor` (ALS + RLS tx routing) → `SubscriptionStatusGuard` → role guards (`@Roles`) → `FeatureGuard` (`@RequireFeature`) → `TierGuard` → object guards | `apps/api/src/shared/modules/auth/guards/`, `apps/api/src/shared/modules/auth/decorators/` |
| **Predicate atoms** (already attribute-shaped) | `PatientDoctorGuard` (`@DoctorPatientScoped`) — patient-owns-own-record, DOCTOR must have an active `PatientDoctor` relation; `EmergencyAccess` metadata | `apps/api/src/shared/modules/auth/guards/patient-doctor.guard.ts`, `apps/api/src/shared/modules/auth/decorators/emergency-access.decorator.ts` |
| **ABAC precursor (superseded 2026-08-07 — legacy programmatic engine removed; see §1.2 note)** | `AuthorizationService.can()` composed subscription → role → feature → per-resource policy; `ResourcePolicyRegistry` with bespoke `appointment`/`patient`/`prescription`/`invoice` policies + `generic` tenant fallback (`report`/`staff`/`clinic`/`broadcast`) | was `apps/api/src/shared/modules/auth/authorization/{authorization.service.ts,types.ts,policies/*}` → now `apps/api/src/shared/modules/authorization/` (single-engine `evaluateAbac` + `AbacPolicyRegistry`; pure policies in `packages/authorization`) |
| **RLS (data plane)** | `tenant_isolation` policies + `SET LOCAL` GUC handshake + `rls-routing` Prisma extension; `RLS_ENABLED=true` in production; `docita_app` non-owner role | `docs/compliance/RLS_ROLLOUT.md`, migration `20260502143500_add_rls_policies` |
| **Frontend gating** | `canAccessTarget` engine re-derives `APP_ACCESS_MATRIX` client-side; `FeatureGate`, nav gating, `ProtectedLayout`/`PublicRoute`/`PortalAuthGuard`/`LabAuthGuard`/`PatientAuthGuard` | `apps/app/src/lib/access-control/access-policy.ts`, `apps/app/src/App.tsx`, `apps/app/src/components/auth/` |
| **Mechanical gates** | `check:controller-rbac`, `check:auth-tenant-safety`, `check:rls-rollout-readiness`, `check:tier-comparisons`, `check:workspace-profile-gating`; e2e `rbac-high-risk-matrix`, `rbac-403-verification` | `scripts/checks/`, `apps/api/test/e2e/auth/` |

### 1.2 The ABAC precursor today

> **Superseded 2026-08-07 (Candidate A):** the programmatic legacy engine below —
> `AuthorizationService.can()`/`check()`, `ResourcePolicyRegistry`, and the
> `policies/*` implementations — was **unwired (zero production callers) and removed**;
> see `ABAC_RETIREMENT_LEDGER.md` + ADR-0013 Phase D note. The current design is the
> single-engine `AuthorizationService.evaluateAbac()` + `AbacPolicyRegistry` in
> `apps/api/src/shared/modules/authorization/`, evaluated by the global `PolicyGuard`,
> with pure policies in `packages/authorization/src/policies/`. The description below is
> retained as the historical planning-time inventory.

`AuthorizationService.can()` already implements the intended decision pipeline
(`authorization.service.ts:37-113`): `no_user` → INTERNAL bypass → `no_clinic` →
subscription status → billing-lock → feature/tier (`hasFeatureAccess` with mode block) →
role/permission from `APP_ACCESS_MATRIX` → resource policy from the
`ResourcePolicyRegistry`. Deny reasons are typed and machine-readable
(`types.ts:64-72`). Existing resource policies:

- **`PatientPolicy`** — `PATIENT` may only read/update their own record (`ownership_denied`); explicitly notes "DOCTOR sees any patient in the clinic — no assignment-pinning today."
- **`AppointmentPolicy`** — `DOCTOR` only sees/mutates appointments assigned to them (`assignedDoctorId`); `PATIENT` only their own.
- **`PrescriptionPolicy`**, **`InvoicePolicy`** — see `policies/`.

**Gaps in the precursor that this plan closes:**

1. **Unwired.** Only the service and module import `AuthorizationService`; no controller or service-layer call site enforces it (`grep` finds zero domain consumers). `@Roles` + guards remain the sole enforcement.
2. **Context is passed manually.** Callers must supply `resourceOwnerId`/`assignedDoctorId`/`resourceClinicId` — there is no `PolicyGuard` that derives subject, resource, and environment attributes from the request (JWT user, tenant context, route params, body, repository lookup).
3. **Static attribute vocabulary.** Subject attributes are only `{id, role, clinicId, doctorId, patientId}`. No department, care-team membership, shift, consent, emergency, or time-of-day — and no data-classification on resources.
4. **Fixed resource set.** `AuthorizationResource` is a hard union; adding a resource touches types, a policy class, and the registry.
5. **No differential harness.** No test proves policy outcomes match the guard stack it replaces, so removing a legacy guard is risky.
6. **Frontend duplicates the matrix.** `canAccessTarget` (client) and `APP_ACCESS_MATRIX` (API) must be kept in sync by hand.

---

## 2) Motivation — what ABAC unlocks

Concrete, product-facing drivers (each with the current RBAC limitation it removes):

| Driver | Today (RBAC) | ABAC target |
| --- | --- | --- |
| **Care-team/assignment scoping** | A DOCTOR can open *any* patient record in the clinic (`PatientPolicy` comment acknowledges no assignment-pinning). | Doctor may read patients assigned to them, or members of their care team / department; `RESTRICTED` reads require an assignment attribute. |
| **Object-ownership** | Handled only by `PatientDoctorGuard` on the few routes that opt in. | Uniform policy per resource; a DOCTOR whose `PatientDoctor` relation becomes inactive immediately loses read; patients always own-own-row. |
| **Emergency / break-glass** | `@EmergencyAccess` is a boolean flag with no time-box, condition, or audit obligation. | An environment attribute `emergencyAccess: { window: [start,end], grantedBy, reason }` — policy allows only within the window and records an obligation. |
| **Consent-scoped data** | DPDP consent exists in the domain but is not an access attribute. | Resource attribute `consentState` gates PHI reads for non-clinical roles (e.g. no marketing/analytics access to consent-withdrawn records). |
| **Cross-tenant / network hospitals** | One user `clinicId`; hospital groups cannot express shared access. | Attribute `accessScope: { clinicId, networkId? }` allows controlled cross-clinic read for network clinicians without global INTERNAL bypass. |
| **API-key vs session trust** | API-key and staff-JWT callers share the same matrix. | Environment `authnContext` (session / api-key / webhook) narrows allowed actions (API key: read-only exports, never PHI writes). |
| **Data classification** | No distinction between PHI categories. | Resource `classification` (public / PHI / PHI-special / billing) as a policy anchor; export+PHI requires `exportData` permission AND a classification predicate. |
| **Audit quality** | Deny reasons are coarse; UI vs server drift is manual. | Every decision records policy id, matched attributes (references, never values), reason — and the server stays single-source via a derived permission snapshot for the UI. |

---

## 3) Target architecture

### 3.1 Attribute model (Zod-first, single source of truth)

New schemas in `packages/types` (namespace `authorization`), inferred types reused by API, worker, and UI snapshots:

```
subject  = { userId, roles[], clinicId, doctorId?, patientId?, department?,
             careTeamIds[], isVerified, shifts[] }
resource = { type, clinicId, ownerId?, assignedDoctorId?, assignedPatientId?,
             classification: 'public'|'phi'|'phi-special'|'billing',
             consentState?: 'granted'|'withdrawn'|'minor' }
env      = { authnContext: 'session'|'api-key'|'webhook'|'internal',
             time (UTC instant), zone, device?, origin,
             clinic: { tier, planMode, hasIntelligence, features, subscriptionStatus } }
```

Rules:
- Subject attributes come from the authenticated user + JWT claims; clinic attributes come from the existing `ClinicAuthCacheService` (same source the current `AuthorizationService` uses).
- Resource attributes come from route params/body (id → repository lookup) or are supplied explicitly where a lookup is prohibitive.
- Environment attributes come from `TenantContextInterceptor`, the request, and clock. `time` and `authnContext` are always set; nothing may default them to permissive.
- These are **schemas and pure types only** in `packages/types` — no runtime evaluation logic there (keeps the §15.3 package boundary honest).

### 3.2 Policy model

Keep the existing typed-policy pattern (`ResourcePolicy` + registry) as the engine, and add a small **declarative shorthand** for the common predicate class `subject.<attr> op resource.<attr>` / `resource.<attr> in env.<context>` so simple rules stay one-file-readable. Do **not** build a general XACML/JSON-policy engine in phase A–C; revisit only if the rule population exceeds what the typed DSL expresses comfortably.

- `PolicyEffect` = `allow` | `deny` | `not-applicable`, with a typed `reason`.
- Combinator: **deny-overrides**. Any active `deny` denies; else any `allow` allows; else deny (default-deny).
- `ResourcePolicy.can(action, subject, resource, env)` → `{ effect, reason, policyId, matched?: string[] }`.
- **Obligations**: policies may emit obligations (e.g. "record audit event with policyId") that the enforcement adapter enforces after an allow for sensitive actions (`read` on `phi-special`, `export`, `manage`).
- Keep `AuthorizationDenyReason` as the stable outward contract; map new predicates to existing reasons (`ownership_denied`, `tenant_mismatch`) and add new ones only when none fit.

### 3.3 Enforcement pipeline (unchanged order + policy stage)

```
authenticate (JWT / API key / webhook signature)
  → tenant (clinicId; failure = 404 for cross-clinic, no existence disclosure)
  → subscription status + billing lock
  → tier / feature (assertClinicHasFeatureOrThrow; mode block)
  → role / permission baseline (APP_ACCESS_MATRIX)         [kept as-is]
  → ABAC resource policy (new PolicyGuard stage)           [NESTED: adds only]
  → RLS data-plane policy (unchanged backstop)
```

The new `PolicyGuard` + `@RequirePolicy(resource, action)` decorator:

1. Bind the registry policy for `resource` (or the `generic` tenant policy).
2. Derive `subject` from the authenticated user (plus `clinicId` from tenant context); `resource` from params/body via an injectable resolver, or from metadata; `env` from context + `ClinicAuthCacheService` + clock.
3. Evaluate; on `deny`, return the canonical 403 (or 404 where tenant/non-disclosure rules apply) with the typed reason. Log the decision id, policy id, and reason — never attribute values (no PHI in logs, AGENTS §6/§7.1).

### 3.4 Layer responsibilities (no duplication of decision-making)

| Layer | Owns | Not responsible for |
| --- | --- | --- |
| Decorators/guards (`@Roles`, `@RequireFeature`, tenant, subscription) | Baseline denial | Object-level nuance |
| `AuthorizationModule` (`AbacPolicyRegistry` + resolvers + pure policies in `packages/authorization`) | Object/context-level conditions | Tier math, tenant plumbing |
| RLS | Data-plane row enforcement (defense in depth) | Business policy |
| Frontend `canAccessTarget` | UX preview only | Enforcement |

### 3.5 UI permission snapshot (closes drift)

Server exposes `GET /auth/effective-permissions` (tenant-scoped) returning the subject's evaluated per-action decisions for the targets the app asks for (`page.*`/`api.*`), derived from the *same* registry the API enforces. `canAccessTarget` becomes a stale-free consumer of that snapshot (falls back to the current local matrix only while offline/loading, explicitly marked non-authoritative). This replaces the hand-synced client copy of `APP_ACCESS_MATRIX` over time; the shared constant remains the schema/atom source.

---

## 4) Phased plan

Each phase is a PR series with an explicit, verifiable exit criterion.

### Phase A — Inventory and attribute model (Zod-first)

Work:

1. **A1 — Decision-point census.** Enumerate every enforcement site: all `@Roles`/`@RequireFeature`/`TierGuard`/`@ClinicScoped` controllers, every `assertClinicHasFeatureOrThrow` call, every `canAccessTarget`/`page`-gate hit in `apps/app` + `apps/internal`, `PatientDoctorGuard` and `EmergencyAccess` usages, and worker/webhook entrypoints. Emit a table: `resource × action × current gate × owner × intended policy`.
2. **A2 — Add the attribute schemas** (§3.1) to `packages/types` with unit tests (parse/reject, no permissive defaults), plus a `check` that new `@Controller` routes must declare a `resource`+`action` posture (fail-closed) or an explicit `@Public`.
3. **A3 — Data provisioning plan.** Identify Prisma fields/relations needed for subject attributes (`department`, `careTeam`, `PatientDoctor` already exists, `shifts`), resource classification (derive initially from route/domain constants, not a new column). Prefer derived/resolved attributes over new columns in Phase A; add columns only where a real query needs them (recorded as a `packages/db` migration item).
4. **A4 — ADR.** Write `docs/architecture/decisions/0013-abac.md` recording: layered ABAC-on-RBAC, deny-overrides, typed-policy engine + declarative shorthand, no XACML, UI via permission snapshot, RLS preserved as backstop.

Exit: census table complete; `packages/types` schemas + tests green; posture check wired; ADR accepted. **Oracle to verification:** `pnpm turbo check-types --continue`, `pnpm test`, lint, `pnpm verify:standard`, `pnpm check:controller-rbac` still green.

### Phase B — Engine and enforcement adapter

Work:

1. **B1 — Move evaluation to a pure, framework-agnostic core.** Extract the composition (subscription → role → feature → policy) from `AuthorizationService` into a pure evaluator that takes resolved `subject/resource/env` (no Nest imports). Keep the existing `AuthorizationService` as a thin Nest adapter that loads attributes from `ClinicAuthCacheService` + request and delegates. Place the core in `packages/types`? **No** — §15.3 forbids runtime logic there. Place it in a new `packages/authorization` (workspace package) with pure evaluator + predicate DSL + deny-overrides combinator; both `apps/api` and (later) `apps/worker` consume it — a two-consumer promotion with the AGENTS §16.1 rationale.
2. **B2 — `PolicyGuard` + `@RequirePolicy(resource, action)`.** Decorator carries metadata; guard resolves subject/env, calls the adapter with a resource resolver (params/body → repository lookup, or explicit context). Add `@Public`-style escape only where the plan's posture check allows.
3. **B3 — Port the four existing policies** (`patient`, `appointment`, `prescription`, `invoice`) onto the new core unchanged in behavior; keep the registry interface stable.
4. **B4 — Differential harness.** A test that runs every `api.*` target through (a) the legacy guard composition and (b) the new evaluator on identical fixtures, asserting equivalent allow/deny. Feeds the Phase-E parity matrix.
5. **B5 — Obligations plumbing.** Audit-emit on `read(phi-special)`/`export`/`manage` allows, wired to the existing audit service (no new logging paths, no PHI values).

Exit: new package builds and passes unit tests; `AuthorizationService` delegates; `PolicyGuard` works on one pilot controller (see C1) with an e2e spec; differential harness runs in CI on the API target set; `verify:standard` + knip + `check:circular:enforce` green.

### Phase C — Enforce top-risk resources (incremental, RBAC baseline intact)

Ordered by risk/impact. Each row is one PR: pilot policy → e2e high-risk cases → parity differential → guard kept or superseded (kept unless differential proves exact-superset).

1. **C1 — Patients.** `read`/`update`: PATIENT own-row, DOCTOR assigned/`PatientDoctor`-active-else-deny (mirrors and then supersedes `PatientDoctorGuard`), clinical staff same-clinic. Ship `EmergencyAccess` time-box handling here (obligation to audit).
2. **C2 — Appointments.** Assignment-based doctor scoping (already in `AppointmentPolicy`), plus cross-clinic 404 discipline and `no-show`/`completed` write locks by status attribute.
3. **C3 — Prescriptions.** Author-of-record identity for `update`/`sign`; read retains matrix roles.
4. **C4 — Lab orders & payment verification.** Fulfilment roles + lab-order assignment + front-desk payment attribute (mirrors existing matrix write roles, adds the object-level conditions the matrix cannot express).
5. **C5 — Audit logs.** `VIEW_PROFILE` read obligations; tenant-scoped admin `read`; no existence disclosure.
6. **C6 — Referral-partner program.** Cross-tenant `accessScope` support (program partner accounts) — the first resource that genuinely needs attributes beyond one `clinicId`; ties into the BLOCKED referral-partner inventory in `EXECUTION_PLAN.md`. **BLOCKED — recorded decision 2026-08-07 (ADR-0013 C6 section):** the partner program is BLOCKED (external prerequisite: partner signup, facility-lead intake, internal progression, 10% first-year policy, clinic discount policy, anti-abuse controls, notification/calendar handoff), so there is no cross-tenant wire contract to mirror; `referral` stays unregistered in both ABAC registries (any premature `@RequirePolicy('referral', ...)` fails closed via `policy_not_found`). Unblock condition: the program ships → add `accessScope`-style attribute to `packages/types/authorization`, then a `referral` policy + resolver mirroring the C2–C5 pattern.
7. **C7 — Frontend permission snapshot.** `GET /auth/effective-permissions`, `canAccessTarget` backfilled from it (non-authoritative, offline fallback documented); `internal` consumes the same snapshot for its admin surfaces. **DONE 2026-08-07:** endpoint live (staff + INTERNAL roles, INTERNAL = all-true bypass); pure mirror `computeEffectivePermissions` in `@workspace/utils`; `TIER_SENTINEL_FEATURES` SSOT in `packages/types/access`; client `useEffectivePermissions` + `canAccessTarget` snapshot preference with offline fallback (no UI regression — existing call sites unchanged when the snapshot is absent); e2e + unit proof green.

Exit: C1–C6 each have a policy + e2e + differential entry (**C1–C5 shipped; C6 recorded decision DEFERRED/BLOCKED**); C7 snapshot deployed with no UI regression; `check:controller-rbac` unchanged (guards kept), `check:a11y-budget`/app a11y audit re-run for any gated-control change.

### Phase D — Operations, hardening, and retirement decisions

Work:

1. **D1 — Extend `rbac-high-risk-matrix`** (and the new `abac-*` spec) with ownership, consent, emergency-window, api-key, and cross-tenant cases; keep table-driven 403/404 assertions. **DONE 2026-08-07:** the C1–C7 `abac-*` e2e specs add ownership / cross-tenant 404 / emergency-window (BTG + audit) / role-bypass cases; consent + api-key cases are recorded as future risk rows in the retirement ledger (attributes typed in `packages/types/authorization`, enforced by no policy today).
2. **D2 — Audit obligations enforce.** Verified adds: decision id + policy id + reason appear in `AuditLog` for sensitive allows/denies, with attribute values referenced by id only (no PHI). **DONE 2026-08-07 (shipped surface):** `EMERGENCY_ACCESS_GRANTED` (C1, `BreakTheGlassInterceptor`) + `VIEW_PROFILE` PHI-read rows (controller layer `logPatientPhiRead`); the **policy-emitted obligation adapter (B5 full) stays DEFERRED** — typed `AbacObligation` exists in `packages/authorization`; enforcement lands with a future sensitive-action allow.
3. **D3 — Emergency-access policy.** Time-boxed attribute grant + obligation + revocation test; keep the legacy decorator as metadata but stop treating it as a bare boolean. **DONE 2026-08-07 (C1):** BTG is a read-only, audited, reason-gated escape hatch honored only on `@EmergencyAccess()`-eligible routes; the legacy decorator stays as metadata. **Time-boxing + revocation recorded as future work** in the retirement ledger.
4. **D4 — Legacy-guard retirement decisions.** For each guard superseded by a policy, record a differential-pass note and either keep (cheap, low-drift) or remove with the retired-guard reasoning. Never weaken; when in doubt keep. **DONE 2026-08-07:** [`ABAC_RETIREMENT_LEDGER.md`](ABAC_RETIREMENT_LEDGER.md) — every touched guard has a differential-pass note and a **KEEP** decision (nothing removed; the ABAC layer is additive after the RBAC/tier/tenant baseline).
5. **D5 — Docs.** Update `ACCESS_AUDIT.md` (matrix → layers, add policy index, fix stale `apps/app` references), `RLS_ROLLOUT.md` (cross-reference policies as the app-plane dual), `EXECUTION_PLAN.md` (link this plan), and the AGENTS.md §15.6 pattern list (`ResourcePolicy` example). **DONE 2026-08-07:** ACCESS_AUDIT policy index (C2–C5 rows) + ledger pointer; RLS_ROLLOUT app-plane-dual section; EXECUTION_PLAN P6.1 notes + ledger link; AGENTS.md §15.6 `ResourcePolicy` row.

Exit: new specs green; obligations audited in an e2e; retirement ledger recorded; docs current and non-duplicative.

### Phase E — Cutover and verification

Work:

1. **E1 — Parity matrix (automated).** For every `APP_ACCESS_TARGET` and every resource policy, a fixture-driven differential: legacy composition vs policy evaluator must agree on allow/deny for a cross-product of roles × tiers × plan-modes × ownership states. Any divergence is a blocker (either side may be right; the mismatch gets a recorded decision). **DONE 2026-08-07:** per-policy differential oracles (C1–C7, covering roles × ownership × cross-tenant × emergency branches) + the `effective-permissions` mirror spot-checks (tier × plan-mode) + the automated coverage gate. A full cross-product matrix for every target would duplicate the oracle rows without new decision branches — the oracle evidence is the parity record.
2. **E2 — Existing-user regression.** Per AGENTS §9.4: a clinic-associated user with stale/missing new attributes (no `department`, no `careTeam`) must still land in the workspace with matrix-equivalent access, never re-onboarding. **DONE 2026-08-07:** no new required user attributes ship (role/clinicId unchanged; `department`/`careTeam` remain optional and unenforced). The one new enforcement — `PatientDoctor` assignment (C1) — ships with the backfill script + deploy-order tripwire per §9.4; the auth/user e2e suites cover existing-user flows green.
3. **E3 — Gates.** Add `check:abac-parity` (differential), `check:abac-policy-coverage` (every `api.*` target maps to a registry policy or a documented generic), and any posture check from A2. Wire into `verify:standard` + pre-push subset if runtime stays affordable. **DONE 2026-08-07:** `check:policy-resolver-coverage` (the coverage gate — every `api.*` target maps to a registry policy or a documented generic) and `check:controller-rbac` (posture) are wired into `verify:standard`; parity evidence is the C1–C7 oracle suites.
4. **E4 — Release evidence.** Per `RELEASE_EVIDENCE_CHECKLIST.md`: commit, checks, e2e reports, differential matrix, baselines, deployment, rollback rehearsal, alert owner for decision-log errors. **DONE 2026-08-07 (evidence recorded):** commits `834d8eca2`→HEAD (`fix/app-deployment-failure`), full validation (`pnpm verify:standard` exit 0, authorization package suite, API unit 3070+, guard-adjacent e2e incl. C1–C7 specs), differential oracles, and this plan's P6.1 notes as the differential-matrix pointer. Deployment/rollback rehearsal + alert-owner wiring follow the standard release checklist on the next release.

Exit: E3 gates green in CI; `verify:standard`, knip, circular, lint, check-types, tests, both app builds green; release evidence recorded.

---

## 5) Non-negotiables

1. **Default-deny, deny-overrides.** A missing attribute or policy defaults to deny, never allow.
2. **No guard weakening.** `@Roles`, `@RequireFeature`, tier, tenant, RLS, audit, webhook, and subscription gates remain in force. A policy may supersede only after a differential test passes; even then removal is recorded in the D4 ledger.
3. **Server is the only authority.** `canAccessTarget` and any permission snapshot are UX previews. Nothing hinges on them for enforcement; they may never return "allowed" for a server-denied decision.
4. **Zod first.** Attribute schemas live once in `packages/types`; no parallel hand-written interfaces (AGENTS §3.1, §12.3).
5. **No PHI in logs or decision records.** Obligations record ids/reasons, never attribute values (AGENTS §6, §7.1).
6. **RLS stays on.** Policies are the app plane; RLS remains the data-plane backstop (`docs/compliance/RLS_ROLLOUT.md` Step 4 is complete in production and stays).
7. **One concern per change set.** Each phase is its own PR series; ABAC work does not ride along on unrelated migration PRs (§16.3).

## 6) Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Differential divergence silently locks a resource out | E1 parity matrix is a CI gate before any retired guard; divergence → decision, then re-run |
| Policy engine over-engineering (scope creep toward XACML) | Typed-policy engine + narrow DSL first; revisit only behind a documented rule-count signal |
| Attribute provisioning cost (department, care teams) | Phase A prefers derived/resolved attributes; only add columns when a query needs them (§9.3 index discipline) |
| UI snapshot drift returns | Snapshot is server-generated; client treats it as cache, never as truth |
| Emergency access abused | Time-boxed attribute + obligation + revocation test (D3); audit event mandatory |
| Cross-tenant leakage via `accessScope` | Explicit grant records, deny-overrides, 404 on non-disclosure, and e2e coverage in C6 before any partner rollout |

## 7) Verification matrix

Run the smallest applicable set per phase, full set at phase boundaries (this is additive to `EXECUTION_PLAN.md`'s matrix):

| Scope | Commands / evidence |
| --- | --- |
| Types/attributes | `pnpm --filter @workspace/types run check-types`; authorization-schema unit tests |
| Engine/package | `pnpm --filter @workspace/authorization run check-types` + tests; `pnpm check:circular:enforce` |
| Parity | `pnpm check:abac-parity` (differential); per-resource e2e specs; `rbac-high-risk-matrix` + `rbac-403-verification` still green |
| Full gate | `pnpm verify:standard`; `pnpm knip`; `pnpm lint`; `pnpm turbo check-types --continue`; `pnpm test`; `pnpm build`; `pnpm check:prisma-boundary`; `pnpm check:controller-rbac`; `pnpm check:auth-tenant-safety`; `pnpm check:rls-rollout-readiness` |

## 8) Definition of Done for the ABAC migration

- [ ] Attribute schemas in `packages/types` are the single source; feature code consumes inferred types, no parallel interfaces.
- [ ] Pure evaluator lives in `packages/authorization`; `AuthorizationService` is a thin adapter; `PolicyGuard` + `@RequirePolicy` cover C1–C6.
- [ ] Differential parity matrix is a CI gate and is fully green for the `api.*` target set and all resource policies.
- [ ] No legacy guard, tenant, tier, feature, RLS, audit, or webhook check was weakened; the D4 ledger records every supersession with evidence.
- [ ] Emergency access is time-boxed with audit obligation and revocation test.
- [ ] UI consumes the server permission snapshot; the client `canAccessMatrix` is explicitly non-authoritative.
- [ ] Existing clinic users with missing new attributes still land in the workspace (E2 regression green).
- [ ] `verify:standard`, all targeted checks, tests, and builds pass; release evidence recorded per `RELEASE_EVIDENCE_CHECKLIST.md`.
- [ ] Docs updated: `ACCESS_AUDIT.md`, `RLS_ROLLOUT.md`, ADR-0013, `EXECUTION_PLAN.md` cross-ref; no stale RBAC-only language implies ABAC is absent.

---

## 9) Relationship to existing plans

- **`EXECUTION_PLAN.md`** — keeps the P0–P6 cutover scope; ABAC is additive. The guard-parity work (`P3.5`: subscription lockout, doctor verification, direct-URL behavior) and the authenticated-route validation (`P3.6`) produce the decision records and real-API fixtures this plan reuses in A1 and C1. The `view-profile` PHI audit e2e and the new 2026-08-04 API e2e suites are the precedent pattern for the per-resource ABAC specs.
- **`ACCESS_AUDIT.md`** — becomes the layer map (roles/tier base + policy index); its non-negotiables 1–4 are carried forward verbatim.
- **`RLS_ROLLOUT.md`** — unchanged; the app-plane policies complement the data-plane policy, and Step 3 notes on `runScopedTransaction` apply to any repository lookup the policy guard performs.