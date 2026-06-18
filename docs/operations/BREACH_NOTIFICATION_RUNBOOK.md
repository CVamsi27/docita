# Personal Data Breach Notification Runbook (DPDP)

> **Owner:** Security / DPO function. **Trigger:** any suspected or confirmed
> personal-data breach (unauthorized access, disclosure, loss, or alteration of
> patient or user personal data).
> **Legal basis:** Digital Personal Data Protection Act 2023 + DPDP Rules 2025.
> A Data Fiduciary must notify the Data Protection Board **and** each affected
> Data Principal **without delay** on becoming aware of a breach.

This runbook makes the obligation operational. Treat the **72-hour** target as
the internal deadline for completing Data Principal notification; escalate to
the DPO immediately on detection — do not wait for certainty.

## 0. Severity triage (first 30 minutes)

| Signal | Action |
|---|---|
| PHI/PII exposed outside the tenant boundary | Treat as breach → continue this runbook |
| Credential/token leak with data-access potential | Treat as breach + rotate per [SECRET_ROTATION_CHECKLIST.md](./SECRET_ROTATION_CHECKLIST.md) / [KEY_ROTATION.md](./KEY_ROTATION.md) |
| Failed attack, no data reached | Log as incident; not a notifiable breach |

If in doubt, treat it as a breach. Under-reporting carries penalties up to ₹250 Cr.

## 1. Contain (hour 0–2)

1. Page the on-call + DPO. Open an incident channel.
2. Stop the bleeding: revoke compromised credentials/tokens, disable the
   affected route or tenant if exploitation is ongoing, take the smallest
   action that halts further exposure.
3. Preserve evidence: snapshot logs (`pg_stat_statements`, app logs, Sentry,
   audit log) **before** remediation overwrites them. The `AuditLog` table and
   PHI-read audit trail are the system of record for who-accessed-what.

## 2. Assess (hour 2–24)

Establish and write down:
- **What** categories of data were involved (PHI? auth credentials? contact?).
- **Whose** data — enumerate affected Data Principals (patients/users) and the
  owning clinic(s). Use the audit trail and tenant scoping to bound the set.
- **How many** records, **when** it started/ended, **how** it happened.
- Whether the data was encrypted at rest (PHI fields are AES-256-GCM — factor
  this into the impact assessment).

## 3. Notify (complete within 72 hours of awareness)

### 3a. Data Protection Board
Submit the breach intimation per the Board's prescribed form. Include nature,
scope, likely consequences, and remediation taken/planned.

### 3b. Affected Data Principals
Notify each affected patient/user in **plain language**. The notice MUST include:
- a description of the breach (what happened);
- the nature and extent of personal data involved;
- likely consequences relevant to them;
- measures taken to mitigate and protective steps they can take;
- contact details (the grievance/DPO contact) for follow-up.

Delivery channels available in-product: transactional email (`email.service`)
and WhatsApp (`whatsapp` domain). Use the patient's verified contact on file.

## 4. Remediate & record (post-notification)

1. Close the root cause (patch, config, access change) and verify.
2. File a postmortem: timeline, root cause, blast radius, notifications sent,
   and corrective actions with owners and dates.
3. Update [DPDP_READINESS.md](../compliance/DPDP_READINESS.md) if the breach
   exposed a control gap.

## 5. Grievance follow-up

Data Principal queries about the breach route through the standard grievance
channel and must be resolved within the **90-day** DPDP SLA. See
[DPDP_READINESS.md](../compliance/DPDP_READINESS.md) §Grievance.

## Quick reference

| Deadline | Obligation |
|---|---|
| Immediately on detection | Page DPO + contain |
| ≤ 72 h from awareness | Board intimation + Data Principal notification |
| ≤ 90 days from complaint | Grievance resolution |
