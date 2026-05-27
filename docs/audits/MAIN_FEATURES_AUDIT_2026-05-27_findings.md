# Main Features Audit — Findings (2026-05-27)

**Date:** 2026-05-27
**Scope:** login/auth, onboarding, appointments, patients, consultation, prescription, invoice, billing, settings, plus repo-wide infrastructure (outbox, audit, transactions, optimistic locking, cron) and UI quality.
**Method:** Six parallel static-analysis sweeps over the working tree. No runtime reproduction; severities are reviewer judgement and require triage before fixing.
**Companion doc:** [`MAIN_FEATURES_AUDIT_2026-05-27.md`](./MAIN_FEATURES_AUDIT_2026-05-27.md) — separate fix ledger from a prior pass. Some items below may already be partially addressed in that branch; cross-check before acting.

## Severity legend

| Severity | Definition |
|---|---|
| Critical | PHI exposure, cross-tenant access, money/tax correctness, or unrecoverable workflow corruption. |
| High | Breaks a clinician-critical workflow, loses auditability, or persists inconsistent state. |
| Medium | Missing validation/guardrail with bounded blast radius, or significant UX/perf debt. |
| Low | Polish, hygiene, or doc issue without immediate safety impact. |

## Counts

| Severity | Count |
|---|---:|
| Critical | 9 |
| High | 38 |
| Medium | 55 |
| Low | 9 |
| **Total** | **~111** |

---

## Top 12 issues to triage first

1. **Critical — `Float` for money on Invoice totals.** [packages/db/prisma/schema.prisma:830-834](../../packages/db/prisma/schema.prisma) — IEEE 754 rounding on financial fields. Migrate to `Decimal(12,2)`. Conflicts with the "schema locked / additive only" policy; needs explicit user approval to break the lock for correctness.
2. **Critical — `ClinicScopedGuard.canActivate` always returns `true`.** [apps/api/src/shared/modules/auth/decorators/clinic-scoped.decorator.ts:46](../../apps/api/src/shared/modules/auth/decorators/clinic-scoped.decorator.ts) — defeats tenant isolation wherever it is relied on. Cross-check against companion ledger which claims this was fixed.
3. **Critical — Onboarding sessions live in process-local `Map<>`.** [apps/api/src/domains/clinics/application/services/onboarding/onboarding-data.service.ts:29](../../apps/api/src/domains/clinics/application/services/onboarding/onboarding-data.service.ts) — lost on restart, broken under multi-replica routing. Companion ledger claims persistent storage was added; verify.
4. **Critical — Outbox relay lacks `SELECT FOR UPDATE SKIP LOCKED`.** [apps/api/src/shared/modules/outbox/outbox-relay.scheduler.ts:45-52](../../apps/api/src/shared/modules/outbox/outbox-relay.scheduler.ts) — multi-pod relays double-dispatch. In-process `running` flag does not span replicas.
5. **Critical — Refresh-token rotation race.** [apps/api/src/shared/modules/auth/auth/auth-session.service.ts:103-141](../../apps/api/src/shared/modules/auth/auth/auth-session.service.ts) — concurrent refresh issues multiple valid tokens. Companion ledger claims this was fixed.
6. **Critical — Audit log persists raw PHI in JSONB.** [apps/api/src/shared/modules/audit/audit-logger.service.ts:49-72](../../apps/api/src/shared/modules/audit/audit-logger.service.ts) — `oldValue` / `newValue` are unencrypted and unmasked.
7. **Critical — `validateAppointmentTime` returns `valid:true` outside business hours.** [apps/api/src/domains/appointments/core/domain-services/appointment-scheduling-rules.service.ts:111-115](../../apps/api/src/domains/appointments/core/domain-services/appointment-scheduling-rules.service.ts) — pure logic inversion. Companion ledger claims fixed; re-verify.
8. **Critical — Leave overlap query uses exact-date match instead of range overlap.** [apps/api/src/domains/leave/infrastructure/repositories/prisma-leave.repository.ts:72](../../apps/api/src/domains/leave/infrastructure/repositories/prisma-leave.repository.ts) — misses all partial overlaps.
9. **Critical — Self-approval of leave not blocked.** [apps/api/src/domains/leave/application/services/leave-command.service.ts:66](../../apps/api/src/domains/leave/application/services/leave-command.service.ts) — staff can approve own leave.
10. **High — Optimistic lock columns added but repos do not enforce version.** Prescription update increments version without WHERE-clause check ([apps/api/src/domains/prescriptions/infrastructure/repositories/prescription.repository.ts:174-198](../../apps/api/src/domains/prescriptions/infrastructure/repositories/prescription.repository.ts)); DoctorTimeOff has no update path enforcing version. Lost-update bug.
11. **High — No idempotency key on invoice creation.** [apps/api/src/domains/billing/application/services/invoices-command.service.ts:117-198](../../apps/api/src/domains/billing/application/services/invoices-command.service.ts) — duplicate POSTs create duplicate invoices.
12. **High — Place-of-supply fallback can emit invoices with null stateCode.** [apps/api/src/domains/billing/core/services/tax-calculator.service.ts:273-281](../../apps/api/src/domains/billing/core/services/tax-calculator.service.ts) — breaks GST e-Invoice generation. Companion ledger claims fixed.

---

## Login / Auth

| # | Sev | File | Issue | Suggested fix |
|---|---|---|---|---|
| A1 | Critical | [clinic-scoped.decorator.ts:46](../../apps/api/src/shared/modules/auth/decorators/clinic-scoped.decorator.ts) | `canActivate` returns `true` unconditionally; bypasses tenant guard. | Verify scope present and `clinicId` matches request resource; fail closed. |
| A2 | Critical | [auth-session.service.ts:103-141](../../apps/api/src/shared/modules/auth/auth/auth-session.service.ts) | Race between checking `replacedByToken` and revoking family. | Single-use atomic UPDATE returning rows; revoke family on reuse. |
| A3 | High | [auth-password.service.ts:36](../../apps/api/src/shared/modules/auth/auth/auth-password.service.ts) | Password-reset returns success even for unknown email; no rate limit / format validation. | Keep silent success but add rate limit + email format check before DB call. |
| A4 | High | [credential-validation.service.ts:106](../../apps/api/src/shared/modules/auth/auth/credential-validation.service.ts) | Mixes `Date.now()` and `clock.now()`; lockout math unstable across clock impls. | Use `clock.now()` consistently. |
| A5 | High | [auth-password.service.ts:73-99](../../apps/api/src/shared/modules/auth/auth/auth-password.service.ts) | Reset token + expiry not cleared after use; replayable on compromise. | Null out token + expiry inside the same TX. |
| A6 | High | [auth-registration.service.ts:40-42](../../apps/api/src/shared/modules/auth/auth/auth-registration.service.ts) | `@test.com` auto-verify gated only on `isProduction()`; misconfig opens the gate in prod. | Require explicit env flag (`ALLOW_TEST_EMAIL_AUTOVERIFY`). |
| A7 | Medium | [auth-registration.service.ts:48](../../apps/api/src/shared/modules/auth/auth/auth-registration.service.ts) | Hardcoded bcrypt rounds=10. | Read from config; plan rehash on login. |
| A8 | Medium | [credential-validation.service.ts:171-179](../../apps/api/src/shared/modules/auth/auth/credential-validation.service.ts) | Failed logins not recorded in AuditLog. | Emit audit entry on every failure with user id (if known) + ip. |
| A9 | Medium | [auth-login.controller.ts:43-63](../../apps/api/src/shared/modules/auth/auth/auth-login.controller.ts) | No CSRF token if cookies become `SameSite=None`. | Document cookie policy; add CSRF if cross-site usage planned. |

## Onboarding

| # | Sev | File | Issue | Suggested fix |
|---|---|---|---|---|
| O1 | Critical | [onboarding-data.service.ts:29](../../apps/api/src/domains/clinics/application/services/onboarding/onboarding-data.service.ts) | In-process `Map<>` session storage. | Persist to Redis or DB; expire via cron. |
| O2 | High | [onboarding.service.ts:72-93](../../apps/api/src/domains/clinics/application/services/onboarding/onboarding.service.ts) | SLA signature upload lacks MIME / size / AV checks. | Validate MIME + max bytes; integrate AV scan before storage. |
| O3 | High | [onboarding-validation.service.ts:75-86](../../apps/api/src/domains/clinics/application/services/onboarding/onboarding-validation.service.ts) | Feature/tier compatibility check is one-directional. | Add bi-directional matrix validation. |
| O4 | High | [use-clinic-registration-flow.ts:274](../../apps/app/features/onboarding/hooks/use-clinic-registration-flow.ts) | Error string concatenates internal field names. | Map to user-safe messages. |
| O5 | Medium | [onboarding-data.service.ts:100](../../apps/api/src/domains/clinics/application/services/onboarding/onboarding-data.service.ts) | `getSessionData` does not bind to caller identity. | Sign or scope onboardingId to session/JWT. |
| O6 | Medium | [use-onboarding.ts:26](../../apps/app/features/onboarding/hooks/use-onboarding.ts) | Frontend permits arbitrary step jumps. | Gate on server-validated step completion. |
| O7 | Medium | [onboarding.service.ts:60-61](../../apps/api/src/domains/clinics/application/services/onboarding/onboarding.service.ts) | Checkout creation lacks idempotency key. | Pass deterministic key (onboardingId + attempt). |

## Settings

| # | Sev | File | Issue | Suggested fix |
|---|---|---|---|---|
| S1 | High | [clinic-settings.controller.ts:68-72](../../apps/api/src/domains/clinics/presentation/controllers/clinic-settings.controller.ts) | `clinicId` from token not verified against request resource. | IDOR check before update. |
| S2 | High | [clinic-settings.controller.ts:84-100](../../apps/api/src/domains/clinics/presentation/controllers/clinic-settings.controller.ts) | Only role-coarse RBAC; cannot guarantee requester may modify target. | Hierarchical role/ownership check. |
| S3 | High | [prisma-user.repository.ts:116-133](../../apps/api/src/domains/users/infrastructure/repositories/prisma-user.repository.ts) | Email mutable without re-verification. | Stage pending email + verify link. |
| S4 | Medium | [clinic-settings-command.service.ts:39-100](../../apps/api/src/domains/clinics/application/services/clinic-settings-command.service.ts) | Multi-field update not transactional. | Wrap in `runInTransaction`. |
| S5 | Medium | [clinic-settings-command.service.ts](../../apps/api/src/domains/clinics/application/services/clinic-settings-command.service.ts) | Settings mutations not audit-logged. | Emit AuditLog with before/after diff. |

## Appointments

| # | Sev | File | Issue | Suggested fix |
|---|---|---|---|---|
| AP1 | Critical | [appointment-scheduling-rules.service.ts:111-115](../../apps/api/src/domains/appointments/core/domain-services/appointment-scheduling-rules.service.ts) | Returns `valid:true` when outside business hours. | Return `valid:false`. |
| AP2 | High | [appointment-scheduling-rules.service.ts:105-109](../../apps/api/src/domains/appointments/core/domain-services/appointment-scheduling-rules.service.ts) | `getHours()` on UTC `Date`; ignores clinic timezone. | Convert via clinic TZ before hour check. |
| AP3 | High | [appointment-scheduling-rules.service.ts:250-254](../../apps/api/src/domains/appointments/core/domain-services/appointment-scheduling-rules.service.ts) | RESCHEDULING→IN_PROGRESS not allowed. | Add transition. |
| AP4 | High | [appointment-scheduling-rules.service.ts:168-178](../../apps/api/src/domains/appointments/core/domain-services/appointment-scheduling-rules.service.ts) | Time-off check lacks `clinicId` filter. | Add `clinicId` to where. |
| AP5 | High | [appointment-scheduling-rules.service.ts:131-136](../../apps/api/src/domains/appointments/core/domain-services/appointment-scheduling-rules.service.ts) | Overlap check omits RESCHEDULING status. | Include in conflict set. |
| AP6 | High | [start-consultation.use-case.ts:60-95](../../apps/api/src/domains/appointments/application/use-cases/start-consultation.use-case.ts) | TOCTOU on appointment status; doctor-clinic association not checked. | Re-check inside TX; bind doctor to clinic. |
| AP7 | Medium | [start-consultation.use-case.ts:83-87](../../apps/api/src/domains/appointments/application/use-cases/start-consultation.use-case.ts) | Missing AuditLog for consultation start. | Emit `appointment.consultation.start`. |
| AP8 | Medium | [prisma-appointment-read.repository.ts:137-142](../../apps/api/src/domains/appointments/infrastructure/persistence/prisma-appointment-read.repository.ts) | N+1 on relation hydration via mapper. | Eager `include` patient/doctor/vital. |
| AP9 | Medium | schema.prisma:639-647 | Missing `[doctorId, clinicId, startTime desc]` composite. | Add index for doctor calendars. |
| AP10 | Medium | [TimeSlotPicker.tsx](../../apps/app/features/appointments/components/sections/add-dialog/TimeSlotPicker.tsx) | No empty-state when 0 slots. | Show "no slots" hint. |

## Patients

| # | Sev | File | Issue | Suggested fix |
|---|---|---|---|---|
| P1 | High | patients domain queries | `deletedAt` filter not consistently applied. | Add Prisma middleware or audit each query. |
| P2 | Medium | [record-appointment-vitals.use-case.ts](../../apps/api/src/domains/patients/application/use-cases/record-appointment-vitals.use-case.ts) | `updateMany` on MedicationDose lacks version. | Switch to `update` with version where-clause. |
| P3 | Medium | patients.controller.ts | Patient creation not audit-logged (PII). | Emit redacted AuditLog. |
| P4 | Medium | create-appointment / patient binding | Patient-clinic ownership not asserted on booking. | Add check before create. |

## Consultation

| # | Sev | File | Issue | Suggested fix |
|---|---|---|---|---|
| C1 | High | [ConsultationDetailPageContent.tsx](../../apps/app/features/consultation/components/ConsultationDetailPageContent.tsx) | No error boundary around fetch. | Wrap in ErrorBoundary with retry. |
| C2 | High | [ConsultationTimerUI.tsx:48-70](../../apps/app/features/consultation/components/ConsultationTimerUI.tsx) | Hardcoded thresholds + no aria-label on timer button. | Token-based colors; descriptive label. |
| C3 | Medium | [use-consultation-shell-scroll.ts](../../apps/app/features/consultation/hooks/use-consultation-shell-scroll.ts) | Focus not restored to triggering button after scroll. | Save and restore `focusRef`. |
| C4 | Medium | [ConsultationTimerUI.tsx](../../apps/app/features/consultation/components/ConsultationTimerUI.tsx) | Reset timer lacks confirm dialog. | Confirm before reset. |
| C5 | Medium | start-consultation prerequisites | Vitals presence checked, values not bounded. | Validate physiologic ranges. |

## Prescription

| # | Sev | File | Issue | Suggested fix |
|---|---|---|---|---|
| RX1 | High | [prescription.repository.ts:174-198](../../apps/api/src/domains/prescriptions/infrastructure/repositories/prescription.repository.ts) | `version` incremented without WHERE-clause check. | Include expected version in where; throw on mismatch. |
| RX2 | High | [prescriptions-command.service.ts:141-147](../../apps/api/src/domains/prescriptions/application/services/prescriptions-command.service.ts) | Allergy hits logged as warning only. | Require explicit override + signature. |
| RX3 | Medium | prescription-pdf.processor.ts | PDF generation not audit-logged. | Log doctor id + timestamp + signing key. |
| RX4 | Medium | schema.prisma:728 | `Prescription.version` orphan field. | Wire optimistic locking or drop. |
| RX5 | Medium | PDF template version | No mismatch handling on regeneration. | Pin template version; refuse regen on mismatch. |

## Invoice & Billing

| # | Sev | File | Issue | Suggested fix |
|---|---|---|---|---|
| I1 | Critical | [schema.prisma:830-834](../../packages/db/prisma/schema.prisma) | `Float` for money totals. | Migrate to `Decimal(12,2)`. |
| I2 | Critical | [tax-calculator.service.ts:273-281](../../apps/api/src/domains/billing/core/services/tax-calculator.service.ts) | Place-of-supply fallback can yield null stateCode. | Require explicit stateCode for taxable invoices. |
| I3 | High | [invoices-command.service.ts:117-198](../../apps/api/src/domains/billing/application/services/invoices-command.service.ts) | No idempotency key on create. | Add unique `idempotencyKey` column + upsert. |
| I4 | High | [invoices-command.service.ts:52-62](../../apps/api/src/domains/billing/application/services/invoices-command.service.ts) | Status transitions not validated (PAID→DRAFT possible). | State-machine validation. |
| I5 | High | [tax-calculator.service.ts:46-50](../../apps/api/src/domains/billing/core/services/tax-calculator.service.ts) | Per-line rounding drift. | Sum before tax; use Decimal arithmetic. |
| I6 | High | [tax-calculator.service.ts:225-227](../../apps/api/src/domains/billing/core/services/tax-calculator.service.ts) | CGST/SGST half-paise allocation untracked. | Persist allocation; test INR 100.01. |
| I7 | High | [payments-command.service.ts:70-87](../../apps/api/src/domains/billing/application/services/payments-command.service.ts) | Payment session create races invoice status update. | Wrap in `$transaction`. |
| I8 | High | [webhooks.controller.ts:39-114](../../apps/api/src/domains/billing/presentation/controllers/webhooks.controller.ts) | Razorpay webhook lacks replay protection. | Dedupe on `razorpayPaymentId`. |
| I9 | High | [invoices-command.service.ts:200-278](../../apps/api/src/domains/billing/application/services/invoices-command.service.ts) | Status changes not audit-logged. | Emit `invoice.status.change` AuditLog. |
| I10 | High | [prisma.invoice.repository.ts:196](../../apps/api/src/domains/billing/infrastructure/repositories/prisma.invoice.repository.ts) | `Invoice.version` never incremented. | `version: { increment: 1 }` + WHERE check. |
| I11 | High | schema.prisma:2971 | `Subscription.basePriceCents` not updated on plan change. | Add `scheduledChange.newBasePriceCents`. |
| I12 | High | schema.prisma:3046 | `trueUpThresholdPercent` not enforced by any job. | Add aggregation cron + alert. |
| I13 | Medium | schema.prisma:857 | `Invoice.items` JSON duplicates `InvoiceItem` relation. | Choose one source of truth. |
| I14 | Medium | [payments-command.service.ts:65-68](../../apps/api/src/domains/billing/application/services/payments-command.service.ts) | Expired payment sessions never reaped. | Cron to mark EXPIRED. |
| I15 | Medium | schema.prisma:3142 | `SubscriptionPayment.status` is loose `String`. | Convert to enum. |
| I16 | Medium | schema.prisma:887-891 | No `(status, createdAt desc)` index on Invoice. | Add composite index. |
| I17 | Medium | [InvoiceTotalsOnly.tsx:23-27](../../apps/app/features/invoices/components/details/InvoiceTotalsOnly.tsx) | `total || 0` fallback can render "INR undefined". | Assert presence; throw early. |
| I18 | Medium | [InvoiceDetailsUI.tsx:216](../../apps/app/features/invoices/components/details/InvoiceDetailsUI.tsx) | `visibility:hidden` print CSS hides margins/footers. | Use `display:none`. |
| I19 | Low | [prisma.invoice.repository.ts:75](../../apps/api/src/domains/billing/infrastructure/repositories/prisma.invoice.repository.ts) | Invoice prefix hardcoded `DC`. | Derive from clinic abbreviation. |
| I20 | Medium | manual mark-paid path | No patient notification. | Send SMS/WhatsApp confirmation. |

## Leave & Doctor Time-Off

| # | Sev | File | Issue | Suggested fix |
|---|---|---|---|---|
| L1 | Critical | [prisma-leave.repository.ts:72](../../apps/api/src/domains/leave/infrastructure/repositories/prisma-leave.repository.ts) | Exact-date match misses overlapping ranges. | `startDate <= end AND endDate >= start`. |
| L2 | Critical | [leave-command.service.ts:66](../../apps/api/src/domains/leave/application/services/leave-command.service.ts) | Self-approval not blocked. | Reject if `staffId === approverId`. |
| L3 | High | [leave-command.service.ts:66](../../apps/api/src/domains/leave/application/services/leave-command.service.ts) | No approver-role check. | Verify ADMIN/MANAGER. |
| L4 | High | [leave-command.service.ts:86-112](../../apps/api/src/domains/leave/application/services/leave-command.service.ts) | TOCTOU on status before TX. | Re-check status inside TX. |
| L5 | High | [prisma-doctor-time-off.repository.ts:47](../../apps/api/src/domains/doctors/infrastructure/repositories/prisma-doctor-time-off.repository.ts) | `OR: [{ clinicId }, { clinicId: null }]` mixes global + scoped. | Require explicit clinicId match. |
| L6 | High | leave + appointments | Leave approval doesn't check conflicting appointments. | `hasConflictingAppointments()` before creating TimeOff. |
| L7 | Medium | leave-command.service.ts | No audit logging for approve/reject/cancel. | AuditLog with old/new state. |
| L8 | Medium | [availability-schedule.service.ts:321-328](../../apps/api/src/domains/doctors/application/services/availability-schedule.service.ts) | Inclusive end-of-day boundary fragile across TZ. | Use UTC midnight-to-midnight. |
| L9 | Medium | leave / time-off | No DST/timezone handling on date+time fields. | Document and apply clinic TZ utility. |
| L10 | Medium | [availability-schedule.service.ts:257-269](../../apps/api/src/domains/doctors/application/services/availability-schedule.service.ts) | Partial-day `endTime <= startTime` not validated. | Add range check. |
| L11 | Medium | schema.prisma:154 | Missing composite index for time-off queries. | `(doctorId, clinicId, startDate, endDate, isFullDay)`. |
| L12 | Medium | [leave-command.service.ts:165-182](../../apps/api/src/domains/leave/application/services/leave-command.service.ts) | Cancelled leave can orphan TimeOff. | Fail the cancel or retry async. |
| L13 | Medium | leave.service.spec.ts | No tenancy violation tests. | Add cross-clinic rejection cases. |
| L14 | Medium | leave.service.spec.ts | No concurrent-approval race test. | Simulate interleaved TX. |
| L15 | Low | [leave-command.service.ts:106](../../apps/api/src/domains/leave/application/services/leave-command.service.ts) | Approver existence not verified. | Pre-load and validate. |

## Cross-cutting infrastructure

### Outbox

| # | Sev | File | Issue | Suggested fix |
|---|---|---|---|---|
| OX1 | Critical | [outbox-relay.scheduler.ts:45-52](../../apps/api/src/shared/modules/outbox/outbox-relay.scheduler.ts) | No `SELECT FOR UPDATE SKIP LOCKED`. | Raw SQL or advisory locks per shard. |
| OX2 | High | [outbox-relay.scheduler.ts:25-42](../../apps/api/src/shared/modules/outbox/outbox-relay.scheduler.ts) | In-process running flag does not span replicas. | Replace with DB-level lock. |
| OX3 | Medium | [outbox-relay.scheduler.ts:20,71-75](../../apps/api/src/shared/modules/outbox/outbox-relay.scheduler.ts) | No exponential backoff on retry. | Backoff by `attempts`. |
| OX4 | Medium | [outbox-relay.scheduler.ts:80-84](../../apps/api/src/shared/modules/outbox/outbox-relay.scheduler.ts) | DLQ silent past MAX_ATTEMPTS. | Alert + drain job. |
| OX5 | Medium | migration:25 | `idempotencyKey` UNIQUE not conditional on `processedAt`. | Caller must catch P2002 explicitly. |
| OX6 | Medium | outbox-relay.scheduler.ts | Out-of-order dispatch on retry. | Per-aggregate ordering / partitioning. |
| OX7 | Medium | outbox.interface.ts | Consumer-side idempotency undocumented. | Document and enforce per consumer. |

### Audit logger

| # | Sev | File | Issue | Suggested fix |
|---|---|---|---|---|
| AU1 | Critical | [audit-logger.service.ts:49-72](../../apps/api/src/shared/modules/audit/audit-logger.service.ts) | Raw PHI in old/new value JSONB. | Field-level masking + encryption. |
| AU2 | High | [audit-logger.service.ts:96-136](../../apps/api/src/shared/modules/audit/audit-logger.service.ts) | Tenant filtering in app-layer only. | Enforce at RLS / verify. |
| AU3 | Medium | [audit-logger.service.ts:34-88](../../apps/api/src/shared/modules/audit/audit-logger.service.ts) | TX-bound logging blocks request path. | Opt-in fire-and-forget mode. |
| AU4 | Medium | [audit-logger.service.ts:79-88](../../apps/api/src/shared/modules/audit/audit-logger.service.ts) | TX path rethrows; audit failure aborts business write. | Configurable fail-mode. |
| AU5 | Medium | schema.prisma (AuditLog) | Missing `(clinicId, action, createdAt)` composite. | Add index. |
| AU6 | Low | [audit-logger.service.ts:91-94](../../apps/api/src/shared/modules/audit/audit-logger.service.ts) | Hardcoded MAX_PAGE_SIZE=200. | Make configurable. |

### Transaction runner port

| # | Sev | File | Issue | Suggested fix |
|---|---|---|---|---|
| TX1 | Medium | [transaction-runner.ts:10-14](../../apps/api/src/prisma/transaction-runner.ts) | No isolation-level parameter. | Accept optional level. |
| TX2 | Medium | [transaction-runner.port.ts](../../apps/api/src/shared/common/ports/transaction-runner.port.ts) | Nested-TX behavior undocumented. | Add JSDoc on flattening. |
| TX3 | Low | [transaction-runner.ts](../../apps/api/src/prisma/transaction-runner.ts) | Loose `Prisma.TransactionClient` surface. | Confirm boundary check active in CI. |

### Optimistic locking

| # | Sev | File | Issue | Suggested fix |
|---|---|---|---|---|
| OL1 | High | migration `20260527100000_add_optimistic_lock_versions` | Only 4 models received version columns. | Audit coverage; extend or document scope. |
| OL2 | High | [prisma-doctor-time-off.repository.ts](../../apps/api/src/domains/doctors/infrastructure/repositories/prisma-doctor-time-off.repository.ts) | No `updateTimeOff` enforcing version. | Add method with version where-clause. |
| OL3 | High | [prescription.repository.ts:174-198](../../apps/api/src/domains/prescriptions/infrastructure/repositories/prescription.repository.ts) | Update increments version without checking incoming version. | Validate and 409 on mismatch. |
| OL4 | Low | migration SQL | Backfill DEFAULT 1 may clash with "never modified" semantics. | Verify; align if needed. |

### Cron / heartbeat

| # | Sev | File | Issue | Suggested fix |
|---|---|---|---|---|
| CR1 | Medium | [cron-heartbeat.ts:42-50](../../apps/api/src/shared/modules/schedule/cron-heartbeat.ts) | Heartbeat decorator points at noop service. | Implement or remove. |
| CR2 | Medium | [cron-schedules.ts:28](../../apps/api/src/shared/schedule/cron-schedules.ts) | Outbox relay every 5s thrashes DB on backlog. | Increase interval or adaptive backoff. |

## UI quality & a11y

| # | Sev | File | Issue | Suggested fix |
|---|---|---|---|---|
| U1 | High | multiple (AppointmentsPageContent.tsx:59, use-consultation-shell-scroll.ts:87,222, use-appointments-logic.ts:200, sidebar.tsx) | `behavior:"smooth"` without `prefers-reduced-motion`. | Helper hook + guard. |
| U2 | High | FollowUpForm.tsx | Decorative `slide-in-from-top-2` banned by motion policy. | Remove animation. |
| U3 | High | Dialogs (AddAppointmentDialogUI, EditPatientDialog, …) | Focus not returned to trigger on close. | Restore `focusRef`. |
| U4 | High | apps/app/features (forms) | Only 17 files use `role="alert"` for errors. | Wrap error text in alert roles. |
| U5 | High | 11 large components (>300 lines) | Inline loading/error/empty instead of `DataState`. | Refactor with `DataState`. |
| U6 | High | [AuthLoginStepUI.tsx:144](../../apps/app/features/auth/components/AuthLoginStepUI.tsx) | No double-submit protection. | Debounce / disable + ref. |
| U7 | Medium | AuthSharedFields/PreDashboardShell/AuthBrandingPanel/booking-progress | Transition durations >200ms. | Reduce to ≤150ms. |
| U8 | Medium | Notifications inbox | Unbounded list rendering. | Virtualize. |
| U9 | Medium | tier-card-pricing.tsx / Reminder / AdvancedMetrics | Heavy panels eagerly imported. | `dynamic()` with skeleton. |
| U10 | Medium | consultation workspace | No `React.memo` on hot rows. | Memoize section/row components. |
| U11 | Medium | use-consultation-shell-scroll.ts | 244 lines + 7 effects; focus traps risk. | Split + keyboard test. |
| U12 | Medium | SettingsPageUI.tsx:45-50 | Hardcoded Tailwind colors; no dark variants. | Use tokens. |
| U13 | Medium | patient-tag-color-pickers.tsx:39 | Inline hex bypasses contrast checker. | CSS variables. |
| U14 | Medium | various modal forms | `htmlFor` audit needed. | Verify all inputs labeled. |
| U15 | Medium | useBookFollowUp / others | `suppressGlobalErrorToast: true` silences errors. | Surface field-level error. |
| U16 | Low | scroll timeouts (520ms, 300ms) | Hardcoded magic numbers. | Replace with event sync. |
| U17 | Low | feature gates | UI gating inconsistent vs API gating. | Wrap premium surfaces in `<FeatureGate>`. |
| U18 | Low | various | Mixed "Loading…" copy. | Standardize via DataState. |
| U19 | Low | sidebar.tsx | `scrollBy` smooth without motion guard. | Same hook as U1. |
| U20 | Medium | 11 components | File-size budget violations (>300 lines). | Decompose per AGENTS.md §15.5. |

## Schema / index recommendations (consolidated)

- `Appointment`: `@@index([doctorId, clinicId, startTime(sort: Desc)])`.
- `Appointment`: single-column `@@index([status])` for status-only filtering.
- `DoctorTimeOff`: `@@index([doctorId, clinicId, startDate, endDate, isFullDay])`.
- `DoctorSchedule`: `@@index([clinicId, dayOfWeek, isActive])`.
- `Invoice`: `@@index([status, createdAt(sort: Desc)])`.
- `AuditLog`: `@@index([clinicId, action, createdAt])`.

## Recommended next steps

1. Cross-check this doc against the companion ledger [`MAIN_FEATURES_AUDIT_2026-05-27.md`](./MAIN_FEATURES_AUDIT_2026-05-27.md); mark items already fixed.
2. **Money correctness** — decide whether to break the DB-locked policy for the `Float→Decimal` migration. Without that, all downstream tax/rounding fixes are partial.
3. **Tenancy hardening** — re-verify `ClinicScopedGuard`, audit log tenant reads, leave's `clinicId: null` mix.
4. **Onboarding persistence** — confirm in-process Map is gone in production code paths.
5. **Outbox HA** — add `SELECT FOR UPDATE SKIP LOCKED` + consumer idempotency + DLQ alerting before scaling replicas.
6. **Optimistic locking** — enforce version on Prescription/DoctorTimeOff/Invoice update paths, then expand coverage list.
7. **Audit log PHI** — implement field-level masking before next compliance review.
8. **GST correctness** — fail closed on missing place-of-supply; add CGST/SGST allocation tests for paise-odd amounts.
9. **UI sweep** — global helper for `prefers-reduced-motion`, audit `role="alert"` on form errors, restore dialog focus, complete `DataState` migration.

## Caveats

- All findings are static-analysis level; runtime reproduction is recommended before fixing.
- Severities are reviewer judgement.
- Some claims may overlap with the companion ledger which marked similar items as Fixed; trust `git log` over either document when they disagree.
