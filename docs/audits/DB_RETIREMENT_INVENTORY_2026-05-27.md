# Database Retirement Inventory - 2026-05-27

This inventory records schema objects that looked low-reference during the
tracked-file cleanup. It is not approval to drop tables or columns. In this
healthcare system, removals require code-reference proof, data checks,
retention review, migration safety, and rollback notes.

## Retirement Rules

- Do not drop audit, archive, auth, idempotency, queue, retention, or PHI
  tables unless a separate compliance review proves they are obsolete.
- Before a drop, verify zero active references across API, worker, app,
  internal, data-access, scripts, seeds, migrations, generated clients, and
  operational docs.
- Check staging and production row counts before writing a destructive
  migration. If rows exist, define export, retention, or backfill behavior.
- Pair every approved removal with a Prisma migration, schema/client
  regeneration, affected tests, and a rollback note.

## Current Candidates

| Model | Current evidence | Disposition |
| --- | --- | --- |
| `NotificationPreferences` | No active delegate references found outside Prisma schema; linked from `User.notificationPreferences`. | Candidate for product review. Do not drop until notification preference UX/API ownership is confirmed. |
| `OcrFeedback` | No active delegate references found outside Prisma schema. | Candidate for OCR feedback feature review and row-count check. |
| `PatientMergeSuggestion` | Only test setup and a JSON-schema type comment referenced it outside Prisma schema. | Candidate for patient-merge roadmap review before removal. |
| `WhatsappFlow` | Only test setup referenced it outside Prisma schema. | Candidate for WhatsApp automation roadmap review before removal. |
| `WhatsappConversation` | Only test setup referenced it outside Prisma schema. | Candidate for WhatsApp inbox/conversation roadmap review before removal. |
| `ClinicAddOn` | Used by billing usage aggregation. | Keep. Active billing behavior. |
| `DeviceToken` | No active delegate references found outside Prisma schema after removing the stale notification-service mock. | Candidate for push-notification roadmap review before removal. |
| `PaymentRetry` | Referenced by a payment-retry backfill script. | Keep until historical migration/backfill need is closed or archived. |
| `AuditLogArchive` | Used by compliance archival and immutability policy. | Keep. Retention/compliance table. |
| `WhatsappLogArchive` | Used by compliance archival. | Keep. Retention/compliance table. |
| `AppointmentArchive` | Used by compliance archival. | Keep. Retention/compliance table. |
| `MetricOption` | Tenant-scope policy and portal metric UI references exist. | Keep until metrics feature ownership changes. |
| `PatientMetricValue` | Tenant-scope policy and shared metric JSON-schema references exist. | Keep. Active metric model. |
| `PatientMetricSelection` | Used by patient metrics repository. | Keep. Active patient metrics behavior. |

## Next Safe DB Cleanup Step

Create a follow-up branch that only targets the candidate-review group:
`NotificationPreferences`, `OcrFeedback`, `PatientMergeSuggestion`,
`WhatsappFlow`, `WhatsappConversation`, and `DeviceToken`. That branch should
first add a non-destructive SQL/data probe for row counts and recent writes,
then decide whether each table is product-owned, archived, or removed.

## Required Probe Shape

For each candidate table, collect:

- total row count;
- newest `createdAt` and `updatedAt` timestamps where those columns exist;
- foreign-key dependents and cascade behavior;
- references from scheduled jobs, seeds, scripts, migrations, and test setup;
- product/compliance owner decision: keep, archive, or retire.

The probe must be read-only and safe to run in staging before any migration is
written. Do not use Prisma schema absence or low grep count as the approval
signal.

## Rollback Note Template

Every approved retirement migration should include a rollback note with:

- the exact migration name and schema objects removed;
- the pre-drop row counts from staging and production;
- the export/archive location if rows existed;
- the restore path: revert migration, regenerate Prisma client, redeploy API
  and worker, then replay exported rows if required;
- the validation commands run after rollback.
