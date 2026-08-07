# Access audit: roles, tiers, and features

This document records non-negotiables and the audit methodology for Docita’s clinic-facing apps and API. It is the human-facing companion to automated checks (`packages/types/test/access.test.ts`, app policy tests, API specs).

## Non-negotiables

1. **Default deny on the server.** Every sensitive read (list, detail, search, export) and write must enforce `@Roles` / `RolesGuard`, tenant scope (`clinicId`, patient-in-clinic), and—where defined—`TierGuard`, `@RequireFeature`, and permission requirements from [`packages/types/src/access/access-matrix.ts`](../packages/types/src/access/access-matrix.ts).
2. **The UI is not authoritative.** `PageAccessGuard`, `RoleGuard`, `FeatureGuard`, and `canAccessTarget` in `apps/app` exist to prevent wrong navigation and to guide upgrades. They must not be the only enforcement layer.
3. **Single sources of truth.**
   - Roles and app permissions: `APP_ACCESS_MATRIX`, `APP_PERMISSIONS_BY_ROLE`, `hasAppPermission`.
   - Tier per feature: `FEATURE_TIER_MAP` in [`packages/types/src/billing/tier.ts`](../packages/types/src/billing/tier.ts).
   - Clinic tier string normalization: `mapClinicTierDbStringToAccessTier` in [`packages/types/src/access/clinic-tier-map.ts`](../packages/types/src/access/clinic-tier-map.ts) (used by the app permission store and subscription tier UX).
4. **Information leakage** includes: returning sensitive fields on 403, exposing aggregate counts to unauthorized roles, hub pages that advertise or deep-link capabilities denied by the matrix, and broad `PUT` handlers that persist tier-gated settings without `assertClinicHasFeatureOrThrow`.

## Inventory driver

For each `APP_ACCESS_TARGET` in `APP_ACCESS_MATRIX`:

| Column | Source |
|--------|--------|
| Target | `APP_ACCESS_TARGETS.*` |
| Feature / tier | `policy.feature`, `policy.tier` |
| Roles / permissions | `policy.read` / `policy.write` |
| Frontend route | [`apps/app/lib/access-routes.ts`](../apps/app/lib/access-routes.ts) |
| Nav / palette | [`apps/app/features/_shared/components/navigation/nav-config.ts`](../apps/app/features/_shared/components/navigation/nav-config.ts), command palette |
| Settings tab | [`apps/app/features/settings/constants.ts`](../apps/app/features/settings/constants.ts) + [`use-settings-logic.ts`](../apps/app/features/settings/hooks/use-settings-logic.ts) |

## Exhaustive discovery (run periodically)

- **Frontend (`apps/app`):** ripgrep `Feature\.`, `canAccess(`, `canAccessTarget`, `APP_ACCESS_TARGETS`, `FeatureGuard`, `RoleGuard`, `getAccessTargetForPath`, and deep-link path strings. Classify each hit as matrix-aligned or implicit (copy-only, hub, or missing gate).
- **`packages/data-access`:** this package provides generic HTTP helpers (`client-factory`, `crud-resource`, etc.). Clinic API paths primarily live under `apps/app/hooks/api`—map those paths to `APP_ACCESS_TARGETS` and ensure React Query `enabled` respects `canAccess` / `canAccessTarget` at the callsite when the route is gated.
- **Backend (`apps/api`, `apps/worker`):** for every `@Controller`, list guards; ripgrep `@RequireFeature`, `TierGuard`, `assertClinicHasFeatureOrThrow`, `SkipSubscriptionCheck`, `bypassesSessionGuards`. Trace services invoked from HTTP, workers, and webhooks.

## Implemented hardening (this pass)

- **Clinic settings `PUT`:** [`ClinicSettingsService`](../apps/api/src/domains/clinics/application/services/clinic-settings.service.ts) calls `assertClinicHasFeatureOrThrow` when the payload touches WhatsApp-related keys, queue, invoicing reminders, audit logs, or bundled auto-reminder fields aligned to `FEATURE_TIER_MAP`.
- **Inbox hub:** [`apps/app/app/(protected)/inbox/page.tsx`](../apps/app/app/(protected)/inbox/page.tsx) filters tabs using `canAccessTarget` and `manageStaff` so tier- and role-gated shortcuts are not shown.
- **Notification settings:** WhatsApp toggle is shown only when `Feature.WHATSAPP_MESSAGING` is allowed; otherwise a billing upgrade hint is shown and WhatsApp fields are omitted from saves.
- **Tier string mapping:** `mapClinicTierDbStringToAccessTier` unifies legacy Prisma tier strings for the permission store and `useTierAccess`.

## ABAC policy index (layered ABAC-on-RBAC, 2026-08-07)

The new policy stage runs **after** the roles/tier/feature baseline and **before** RLS. It is additive: it never weakens the guards above it. See [ADR-0013](../architecture/decisions/0013-abac.md), the [first-slice plan](../superpowers/plans/2026-08-06-abac-first-slice.md), the [C2 appointments plan](../superpowers/plans/2026-08-07-c2-appointments.md), the [C3 prescriptions plan](../superpowers/plans/2026-08-07-c3-prescriptions.md), and the [C4 invoices/lab-orders plan](../superpowers/plans/2026-08-07-c4-lab-payments.md), and the [C5 audit-logs plan](../superpowers/plans/2026-08-07-c5-audit-logs.md), and the [C7 permission-snapshot plan](../superpowers/plans/2026-08-07-c7-permission-snapshot.md).

**Permission snapshot (C7, 2026-08-07):** `GET /auth/effective-permissions` is NON-authoritative by contract — the server remains the enforcement point (non-negotiable 2); the UI consumes it only to preview decisions and falls back to the local matrix offline. `canAccessTarget` prefers the snapshot entry when present; the snapshot computation is a pure mirror (`computeEffectivePermissions` in `@workspace/utils`) of the client matrix with `TIER_SENTINEL_FEATURES` shared from `packages/types`.

| Policy (id) | Rules | Resolver | Decorator | Surface |
|-------------|-------|----------|-----------|---------|
| `patient` | tenant discipline; PATIENT own-row (`ownerId === subject.userId`); doctor assignment-pinning **on since C1 phase-2 (2026-08-06)** — plain `DOCTOR` must have an active `PatientDoctor` row; `ADMIN_DOCTOR`/`NURSE`/`RECEPTIONIST`/`ADMIN`/`INTERNAL` bypass (mirrors legacy `PatientDoctorGuard`); clinical staff same-clinic; default-deny | [`PatientResourceResolver`](../apps/api/src/shared/modules/auth/authorization/resolvers/patient-resource.resolver.ts) (Prisma lookup → `ResourceAttributes`; `requiresAssignment: true`) | `@RequirePolicy('patient', 'read'|'update')` + `@EmergencyAccess()` on `GET /patients/:id` | Staff patients surface (`GET/PATCH /patients/:id`) |
| `appointment` | tenant discipline (cross-clinic → 404 via `PolicyGuard`, no existence disclosure); PATIENT own-row (`assignedPatientId === subject.patientId` — parity for the future portal surface; roles gate excludes PATIENT tokens on staff routes today); DOCTOR assigned-only (`assignedDoctorIds` derived from the row's own `doctorId`); `ADMIN_DOCTOR`/`NURSE`/`RECEPTIONIST`/`ADMIN`/`LAB` clinic-wide (mirrors legacy `AppointmentPolicy`); default-deny. **Mirror-only** since 2026-08-07 (C2): wire outcomes unchanged vs the service-layer access context. Status-based write locks (no-show/completed) **DEFERRED** (C2.1) — `status` attribute ships, branch pending a recorded product decision; the e2e case `NURSE updates a COMPLETED appointment (200)` pins the baseline | [`AppointmentResourceResolver`](../apps/api/src/shared/modules/auth/authorization/resolvers/appointment-resource.resolver.ts) (Prisma lookup → `ResourceAttributes`; no backfill needed) | `@RequirePolicy('appointment', 'read'|'update')` | `GET/PATCH /appointments/:id`, `PATCH /appointments/:id/cancel\|reschedule` |
| `prescription` | tenant discipline (cross-clinic → 404 via `PolicyGuard`, no existence disclosure); PATIENT own-row read-only (`assignedPatientId === subject.patientId` — parity for the future portal surface); **read retains matrix roles** (non-author DOCTOR may read any clinic prescription); DOCTOR **author-of-record** on `update`/`delete` (`assignedDoctorIds` derived from the row's own `doctorId`); `ADMIN_DOCTOR`/`NURSE`/`RECEPTIONIST`/`ADMIN`/`LAB` clinic-wide (mirrors legacy `PrescriptionPolicy`); default-deny. **C3 since 2026-08-07:** read side is wire-equivalent; the approve route is a **recorded tightening** (ADR-0013 C3.1) — `POST /whatsapp/approve-prescription/:id` was roles-only, now a plain DOCTOR must be the author (403 otherwise); `ADMIN`/`ADMIN_DOCTOR` keep clinic-wide approve. `status` carries `approvalStatus` (populated, not enforced) | [`PrescriptionResourceResolver`](../apps/api/src/shared/modules/auth/authorization/resolvers/prescription-resource.resolver.ts) (Prisma lookup → `ResourceAttributes`; nullable `clinicId` falls back to `appointment.clinicId`; no backfill needed) | `@RequirePolicy('prescription', 'read'|'update')` | `GET /prescriptions/:id`, `GET /prescriptions/:id/pdf/status`, `GET /prescriptions/:id/pdf`, `POST /whatsapp/approve-prescription/:id` |
| `invoice` | tenant discipline (cross-clinic → 404 via `PolicyGuard`, no existence disclosure); PATIENT own-row (`assignedPatientId === subject.patientId` — portal parity); clinical staff clinic-wide after the matrix gates (mirrors legacy `InvoicePolicy`); default-deny. **C4 since 2026-08-07:** mirror-only; **no doctor author-of-record pin** — `approve-invoice` stays clinic-wide (ADR-0013 C4.3, resolves C3.1; the legacy policy has no author branch, unlike prescriptions) | [`InvoiceResourceResolver`](../apps/api/src/shared/modules/auth/authorization/resolvers/invoice-resource.resolver.ts) (Prisma lookup → `ResourceAttributes`; nullable `clinicId` falls back to `patient.clinicId`; no backfill needed) | `@RequirePolicy('invoice', 'read'|'update')` | `GET/PATCH /invoices/:id`, `GET /invoices/:id/payment-activity\|claim-readiness\|pdf/status\|pdf`, `POST /invoices/:id/submit-claim`, `POST /whatsapp/approve-invoice/:id` |
| `lab-order` | tenant discipline (cross-clinic → 404 via `PolicyGuard`, no existence disclosure); PATIENT own-row (`assignedPatientId === subject.patientId` — portal parity); clinical staff clinic-wide incl. **LAB** after the matrix gates; default-deny. **C4 since 2026-08-07:** mirror-only; **assignment pinning (LAB → `LabTestOrder.labId`) and payment-state write conditions DEFERRED (C4.1)** — no service-layer guard exists today; `status` carries `LabTestOrderStatus` (populated, not enforced); oracle rows + e2e pin the baseline (LAB acts on any clinic order; RECEPTIONIST verifies payment — the front-desk payment attribute is matrix-scoped to ADMIN/ADMIN_DOCTOR/RECEPTIONIST) | [`LabOrderResourceResolver`](../apps/api/src/shared/modules/auth/authorization/resolvers/lab-order-resource.resolver.ts) (Prisma lookup → `ResourceAttributes`; `ownerId` = `orderedBy` populated, not enforced) | `@RequirePolicy('lab-order', 'read'|'update')` | `GET /clinical/lab-tests/orders/:id`, `PUT .../orders/:id/status`, `PUT .../orders/:id/sample`, `POST .../orders/:id/result\|payment\|release` |
| `audit-log` | tenant-scoped admin read: INTERNAL bypass (cross-clinic read); tenant discipline (cross-clinic → 404 via `PolicyGuard` — structural on today's list routes, pins the invariant for any future `:id` route); audit-reader role matrix (union of the two controllers' gates: ADMIN/ADMIN_DOCTOR/DOCTOR — **can never widen the wire contract** because RolesGuard runs before PolicyGuard); default-deny (no PATIENT own-row — staff-only surface). **C5 since 2026-08-07:** mirror-only; cross-clinic `?clinicId=` targeting is rejected earlier by `TenantGuard` (`CLINIC_SCOPE_MISMATCH` 403); VIEW_PROFILE read obligations stay at the controller layer (`logPatientPhiRead`), the policy-emitted obligation adapter is Phase D2 | [`AuditLogResourceResolver`](../apps/api/src/shared/modules/auth/authorization/resolvers/audit-log-resource.resolver.ts) (scope-based — resource clinicId = requester's own tenant; no DB lookup) | `@RequirePolicy('audit-log', 'read')` | `GET /audit-logs`, `GET /audit/recent` |

EmergencyAccess obligation: `GET /patients/:id` is `@EmergencyAccess()`-eligible; `PolicyGuard` honors `x-break-the-glass` before the policy stage and `BreakTheGlassInterceptor` audits `EMERGENCY_ACCESS_GRANTED` + sets the RLS bypass. Read-only escape hatch (updates are not BTG-eligible). Backfill prerequisite: `packages/db/scripts/backfill-patient-doctor.ts` must run before the `requiresAssignment: true` flag ships (AGENTS §9.4).

Every `@RequirePolicy(resource, …)` usage must have a registered resolver — enforced statically by [`check:policy-resolver-coverage`](../../scripts/checks/check-policy-resolver-coverage.mjs) in `verify:standard` (fail-closed: a declared policy with no resolver 403s at runtime).

## Traceability appendix (high-risk rows)

Keep this table aligned with `APP_ACCESS_TARGETS` and real call paths. When you add a route or hook, add or update a row and extend automated tests where practical.

| Capability | Frontend / surface | Client / hook | HTTP API | Nest controller |
|------------|-------------------|-----------------|----------|-----------------|
| WhatsApp stats & automation | `/whatsapp`, dialogs | [`use-whatsapp.ts`](../apps/app/hooks/api/use-whatsapp.ts) (`/whatsapp/*`) | `GET /whatsapp/stats`, `PUT /whatsapp/settings`, … | [`WhatsappController`](../apps/api/src/shared/modules/messaging/whatsapp/whatsapp.controller.ts) (`TierGuard` + `@RequireFeature(API_WHATSAPP)`) |
| WhatsApp v2 send | (same) | Domain client if used | `GET /whatsapp-v2/templates`, `POST /whatsapp-v2/messages/send` | [`WhatsAppController`](../apps/api/src/domains/whatsapp/presentation/controllers/whatsapp.controller.ts) |
| Medical coding (ICD/CPT, settings) | `/coding-queue`, settings | [`use-medical-coding.ts`](../apps/app/hooks/api/use-medical-coding.ts), [`use-settings.ts`](../apps/app/hooks/api/use-settings.ts) (`/clinical/medical-coding/*`) | `GET /clinical/medical-coding/icd/search`, `PUT /clinical/medical-coding/settings`, … | [`MedicalCodingController`](../apps/api/src/domains/clinical/presentation/controllers/medical-coding.controller.ts) (`TierGuard` + `@RequireFeature(API_MEDICAL_CODING)`) |
| Subscription billing | Settings billing, subscription workspace | [`use-billing.ts`](../apps/app/hooks/api/use-billing.ts), [`use-billing-history.ts`](../apps/app/hooks/api/use-billing-history.ts) | `GET /subscription/billing`, `GET /subscription/billing/payments`, … | Subscription / billing controllers (`APP_ACCESS_TARGETS` via guards; see matrix) |
| Invoices | `/invoices`, patient billing | [`use-billing.ts`](../apps/app/hooks/api/use-billing.ts) | `GET /POST /invoices`, … | Invoices domain (tier for clinic-wide list; see [`invoices.e2e-spec.ts`](../apps/api/test/invoices.e2e-spec.ts)) |
| Patient list / detail | `/patients/*` | [`use-patients.ts`](../apps/app/hooks/api/use-patients.ts), timeline hooks | `GET /patients`, `GET /patients/:id`, … | Patients module (`API_PATIENTS` / `BASIC_PATIENT_MANAGEMENT`) |
| Clinic settings (broad PUT) | Settings general / notifications | [`use-settings.ts`](../apps/app/hooks/api/use-settings.ts) | `PUT /clinic/settings` | [`ClinicSettingsController`](../apps/api/src/domains/clinics/presentation/controllers/clinics.controller.ts) + [`ClinicSettingsService`](../apps/api/src/domains/clinics/application/services/clinic-settings.service.ts) (`assertTierGatedSettingsAllowed`) |
| Internal ops | N/A (INTERNAL only) | N/A | `GET /internal/clinics`, … | Internal controllers |

### Automated tests (extend here first)

| Suite | What it covers |
|-------|----------------|
| [`apps/api/test/rbac-high-risk-matrix.e2e-spec.ts`](../apps/api/test/rbac-high-risk-matrix.e2e-spec.ts) | Table-driven **403**s: Starter tier vs WhatsApp + medical coding; NURSE vs medical coding; DOCTOR/NURSE vs subscription billing |
| [`apps/api/test/rbac-403-verification.e2e-spec.ts`](../apps/api/test/rbac-403-verification.e2e-spec.ts) | Internal routes, subscription billing (no clinic), consent cross-clinic |
| [`apps/api/test/invoices.e2e-spec.ts`](../apps/api/test/invoices.e2e-spec.ts) | Invoicing tier for clinic-wide `GET /invoices` |
| [`apps/app/lib/access-policy.matrix.test.ts`](../apps/app/lib/access-policy.matrix.test.ts) | Client-side `canAccessTarget` vs `FEATURE_TIER_MAP` for selected `PAGE_*` targets |

Run API matrix e2e locally (requires test `DATABASE_URL`):

`pnpm --filter @docita/api exec jest test/rbac-high-risk-matrix.e2e-spec.ts`
