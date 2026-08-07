# ABAC Retirement Ledger — Legacy Guard Decisions (Phase D4)

Companion to [`ABAC_MIGRATION_PLAN.md`](ABAC_MIGRATION_PLAN.md) and
[`ADR-0013`](../architecture/decisions/0013-abac.md). Records, for every
legacy guard that an ABAC policy touches, the differential-pass evidence and
the keep/remove decision. Rule: **never weaken a guard** — the RBAC/tier/
tenant/RLS baseline stays in force; a policy may only supplement or (after a
differential pass) supersede. When in doubt, keep.

## Decision table

| Legacy guard / check | Policy (resource) | Differential evidence | Decision |
| --- | --- | --- | --- |
| `PatientDoctorGuard` (`@DoctorPatientScoped`) | `patient` (C1) — assignment-pinning on the staff surface (`requiresAssignment: true`) | C1 oracle + `patient-abac.e2e` (assigned 200 / unassigned 403 / ADMIN_DOCTOR·NURSE·RECEPTIONIST·ADMIN·INTERNAL bypass / BTG + audit) | **KEEP** the guard as defense-in-depth (cheap, low-drift); the policy now also covers the guard's bypass semantics at the guard stage. `PatientDoctor` backfill script + deploy-order tripwire required before the flip ships (AGENTS §9.4 existing-user protection). |
| Legacy `AppointmentPolicy` (service-layer `AuthorizationService.can`) | `appointment` (C2) — assignment-based doctor scoping + cross-clinic 404 | C2 oracle (12 rows) + `appointment-abac.e2e` (11 cases): wire outcomes unchanged vs the service-layer access context | **KEEP** the service-layer check; the policy is mirror-only (status write-locks DEFERRED as C2.1 pending a product decision). |
| Legacy `PrescriptionPolicy` | `prescription` (C3) — read retains matrix roles; DOCTOR author-of-record on update/delete | C3 oracle (incl. delete branch) + `prescription-abac.e2e` (11 cases) + existing `prescriptions.e2e` 8/8 unchanged | **KEEP** the legacy policy for read parity; the approve route (`POST /whatsapp/approve-prescription/:id`) is a **recorded tightening** (C3.1, ADR-0013): was roles-only, now author-of-record for plain DOCTOR (403 otherwise); ADMIN/ADMIN_DOCTOR clinic-wide. |
| Legacy `InvoicePolicy` | `invoice` (C4) — PATIENT own-row + clinical staff clinic-wide | C4 oracle + `invoice-abac.e2e` (9 cases) + existing `invoices.e2e` 25/25 unchanged | **KEEP**; mirror-only, no author pin. `approve-invoice` stays clinic-wide (C4.3 — resolves the C3.1 question; the legacy policy has no author branch, unlike prescriptions). |
| Lab-order object checks (clinic-scoped `getOrderById` + matrix roles) | `lab-order` (C4) — clinical staff clinic-wide incl. LAB | C4 oracle + `lab-order-abac.e2e` (9 cases) | **KEEP**; mirror-only. Assignment pinning (LAB → `labId`) and payment-state conditions DEFERRED (C4.1) — no service-layer guard exists today to mirror. |
| Audit controller tenant-forcing (`filter.clinicId = userClinicId`) + `TenantGuard` clinic-scope rejection | `audit-log` (C5) — tenant-scoped admin read, no existence disclosure | C5 oracle + `audit-log-abac.e2e` (11 cases) + existing `patient-phi-read-audit` 6/6 | **KEEP** both; the policy's tenant discipline is structural (list routes resolve the requester's own clinic); `TenantGuard` rejects cross-clinic `?clinicId=` with 403 before the controller. |
| `@EmergencyAccess` boolean (Break-the-Glass) | `patient` (C1) emergency handling | `patient-abac.e2e` BTG case + `BreakTheGlassInterceptor` audit row (`EMERGENCY_ACCESS_GRANTED`) | **KEEP** the decorator as metadata; `PolicyGuard` honors `x-break-the-glass` only on `@EmergencyAccess()`-eligible routes (read-only escape hatch, audited, reason-gated). Time-boxing + revocation remain Phase D3 recorded future work. |
| Generic tenant fallback (`report`/`staff`/`clinic`/`broadcast` targets) | n/a (generic, no resource policy) | Existing service-layer behavior | **KEEP**; documented generic per the coverage gate (`check:policy-resolver-coverage`). |
| `RolesGuard`, `TierGuard`, `@RequireFeature`, `TenantGuard`, subscription guards, RLS | all | All C1–C7 gates + full e2e suites | **KEEP ALL** — the ABAC layer is additive and sits after them in the global guard order (`app.module.ts`). Nothing was removed. |

## Shipped obligation surface (D2 record)

- `EMERGENCY_ACCESS_GRANTED` audit row (C1, `BreakTheGlassInterceptor`) — the
  emergency-access obligation, audited with the requesting user id and reason.
- `VIEW_PROFILE` PHI-read rows (C1/C5 precedent, controller layer
  `logPatientPhiRead`) — profile reads are audited at the call site.
- The **policy-emitted obligation adapter (B5/D2 full)** remains DEFERRED: the
  typed `AbacObligation` exists in `packages/authorization`; enforcement lands
  when a sensitive-action allow (e.g. `read(phi-special)`/`export`) needs a
  decision-emitted audit event. No new logging paths ship in C1–C7.

## Risk rows carried forward (D3 record)

- Emergency access is a boolean header today (read-only escape hatch, audited).
  Time-boxed attribute grant (`window: [start, end]`), revocation test, and
  obligation enforcement remain **recorded future work** (D3) — the legacy
  decorator stays as metadata, never a bare boolean in policy decisions.
- Consent (`consentState: granted | withdrawn | minor`) and api-key authn
  (`AuthnContext: api-key | webhook`) attributes are typed in
  `packages/types/authorization` but enforced by no policy today — recorded
  as future high-risk-matrix rows (D1), not silent gaps.

## Verification

`pnpm check:policy-resolver-coverage` (wired into `verify:standard`) enforces
every `api.*` target maps to a registry policy or a documented generic;
`pnpm check:controller-rbac` enforces every controller declares a posture.
Full gate: `pnpm verify:standard` exit 0 after C1–C7 (see the C-slice notes in
`EXECUTION_PLAN.md` P6.1).
