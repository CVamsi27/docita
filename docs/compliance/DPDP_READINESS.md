# DPDP Readiness Tracker

> Tracks Docita's posture against the Digital Personal Data Protection Act 2023
> and DPDP Rules 2025. Companion to [PHI_ENCRYPTION_POLICY.md](./PHI_ENCRYPTION_POLICY.md),
> [AUDIT_EXPORT.md](./AUDIT_EXPORT.md), [RLS_ROLLOUT.md](./RLS_ROLLOUT.md), and the
> [breach runbook](../operations/BREACH_NOTIFICATION_RUNBOOK.md).

## Enforcement timeline (verify before each milestone)

| Date | What activates |
|---|---|
| 13 Nov 2025 | Data Protection Board established |
| 13 Nov 2026 | Consent Manager registration provisions |
| 13 May 2027 | Bulk obligations: notice, breach reporting, retention/erasure, security safeguards, Data Principal rights, cross-border transfer |

Healthcare data fiduciaries handling large volumes of sensitive data are likely
candidates for **Significant Data Fiduciary** designation (annual DPIA, DPO,
independent audit, algorithmic-fairness review).

## Control status

| Obligation | Status | Where |
|---|---|---|
| Consent capture at collection | ✅ | onboarding compliance step; public-booking DPDP consent; `recordDpdpNoticeConsent` |
| Consent history + withdrawal | ✅ | `POST /consent`, `GET /consent/history`, `POST /consent/:id/withdraw` (`ConsentController`) |
| PHI encryption at rest | ✅ | AES-256-GCM, 13 fields, CI-enforced parity ([PHI_ENCRYPTION_POLICY.md](./PHI_ENCRYPTION_POLICY.md)) |
| Tenant isolation | Partial — verified 15 October | API uses a BYPASSRLS owner; 16 of 91 tenant tables lack enabled RLS/policy. The isolated 19-case rehearsal passes; production rollout/soak remain open ([RLS_ROLLOUT.md](./RLS_ROLLOUT.md)). |
| Audit trail of PHI access | ✅ | `AuditLog` + PHI-read audit util; export ([AUDIT_EXPORT.md](./AUDIT_EXPORT.md)) |
| Right to access + portability | ✅ | `GET /consent/patients/:id/export` → `handlePortabilityRequest` (audit-logged JSON copy) |
| Right to erasure | ✅ | `POST /consent/patients/:id/delete` → anonymization, blocked while statutory obligations remain |
| Retention / archival | ✅ | `DataRetentionScheduler` (audit 90d, WhatsApp 180d, appointments 2y, soft-deletes 30d) |
| Erasure vs backup retention | Decision and activation gate open | Independent encrypted backups are being prepared; technical retention does not approve a PHI resurrection window. See [ADR 0016](../architecture/decisions/0016-patient-data-lifecycle-and-recovery.md). |
| Breach notification (72h) | ✅ doc | [BREACH_NOTIFICATION_RUNBOOK.md](../operations/BREACH_NOTIFICATION_RUNBOOK.md) |
| Grievance / DSR queue (90d SLA) | ✅ | `DataSubjectRequest` model + `ClinicDataSubjectRequestService` (dueAt defaults to **+30 days**, stricter than the 90-day rule) + staff queue in Settings → Compliance with overdue badges/ordering |
| Patient-portal self-service rights | ✅ | `POST /portal/profile/delete-request` and `POST /portal/profile/export-request` create `DataSubjectRequest` rows (channel `PORTAL`) that land in the staff compliance queue |
| Consent notice versioning | ✅ | `Consent.templateVersion` persisted from `DPDP_NOTICE_VERSION` (`consent-compliance.service.ts`) |
| Patient-portal consent toggle | ✅ | `POST /patient-portal/consent` persists data-storage consent as a `DPDP_NOTICE` consent (record/withdraw via `setDpdpNoticeConsent`); first-login banner driven by actual consent state |
| AI/OCR data-minimisation | ✅ | Cloud Vision OCR **off by default** (`AI_CLOUD_OCR_ENABLED=false`) — raw patient images are not sent to OpenAI; text to AI is identifier-redacted (`redactPatientIdentifiers`). See [DPDP_SUBPROCESSORS.md](./DPDP_SUBPROCESSORS.md) |
| Sub-processor register + DPAs | ⚠️ paperwork | Register + data-flow map + DPA how-to in [DPDP_SUBPROCESSORS.md](./DPDP_SUBPROCESSORS.md); signing the DPAs + publishing DPO contact is the open operational task |
| DPO designation + DPIA cadence | ☐ org | operational/legal task, outside the codebase |
| Consent Manager integration | ☐ backlog | required only if/when we onboard a registered Consent Manager (≥ 13 Nov 2026) |

## Erasure ↔ medical-record retention reconciliation

The NMC requires clinical records be retained for ≥ 3 years; DPDP grants a right
to erasure. These are reconciled by **anonymization, not hard deletion**:
`AnonymizationFactory.anonymizePatient` strips personal identifiers (satisfying
erasure) while the de-identified clinical record is retained (satisfying the
medical-record floor and any open billing/audit obligations). Erasure is blocked
while there are unpaid invoices or future appointments
(`checkPendingObligations`). No code change is needed for the 3-year floor — the
record is never destroyed, only de-identified.

This describes live-system behavior. A backup taken before anonymization can
contain the earlier identifiers. The 15 October independent-backup preparation
uses a dedicated bucket with a 30-day lock and 31-day expiry, but no accepted
erasure/resurrection window or policy-owner sign-off is inferred from that
technical configuration. Keep backup activation gated on the explicit decision
in ADR 0016 D4. Keep any restored copy isolated until the approved erasure and
legal-hold state has been reconciled and verified before access is enabled.
The [bounded recovery drill](../operations/dr-drills/2026-10-15-neon-isolated.md)
used synthetic canaries and empty clinical tables; it does not close this gate.

## Grievance / DSR workflow (in place)

Requests reach the queue from two channels: staff log them in Settings →
Compliance ("Log request"), and patients raise them directly from the portal
(`delete-request` / `export-request`, channel `PORTAL`). Every row carries a
due date (default +30 days), a status workflow (OPEN → IN_REVIEW →
FULFILLED/REJECTED), and audit logging; the staff card sorts overdue requests
first and flags them with a destructive badge (`isDsrOverdue` in
`compliance-settings-constants.ts`).

## Backlog to close before 13 May 2027

1. Overdue-DSR alerting beyond the UI badge (email/WhatsApp digest — channel choice is a product call).
2. DPIA + DPO designation (organizational).
