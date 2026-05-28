# Audit-event export and per-tenant retention policy

> **Status**: design only. SYSTEM_DESIGN_AND_PATTERNS.md §28.1 item 6;
> revises and corrects §27.5.

## Today's state

- [`apps/api/src/shared/modules/compliance/archival.service.ts`](../../apps/api/src/shared/modules/compliance/archival.service.ts)
  and [`data-retention.scheduler.ts`](../../apps/api/src/shared/modules/compliance/data-retention.scheduler.ts)
  implement scheduled archival of `AuditEvent` rows beyond a default
  retention window.
- The window is **global**, not per-tenant.
- There is no regulator-facing export job (read-only PDF/CSV bundle for
  a given date range and tenant).

## What we need

### Per-tenant retention policy

- A `ClinicSettings.auditRetentionDays` column (Prisma) with sensible
  defaults (180 days for tier-controlled features; 365 days for billing
  events; unlimited for compliance-flagged events).
- An admin UI in `apps/internal` under
  `apps/internal/features/clinics/compliance/` so support staff can
  override per clinic when required by their regulator.
- Scheduler reads the override at run time.

### Regulator export job

A queue job (`audit-export.processor.ts` in `apps/worker`) that:

1. Accepts `{ clinicId, fromDate, toDate, format: 'csv' | 'json' }`.
2. Streams audit rows from Postgres (cursor pagination).
3. PHI-scrubs values using the canonical scrubber from
   `@workspace/utils/monitoring/phi-scrubber`.
4. Writes the result to R2 under a tenant-scoped prefix with envelope
   encryption (DEK rewrapped by the requesting clinic's KEK).
5. Emits a signed, single-use download URL via the patient-portal-style
   URL signer (Stream A item 3 — bind to requester session).
6. Records the export as a `DpdpAuditEvent` (separate audit stream).

### API surface

- `POST /api/internal/audit-export` — internal admin only. Body =
  `{ clinicId, fromDate, toDate, format }`.
- `GET /api/internal/audit-export/:id` — returns status + signed
  download URL when ready.

### Frontend (apps/internal)

- Clinics → Compliance → "Export audit events" with date-range picker.
- Lists past exports with status (pending / ready / expired).

## Open items

- Decide CSV column schema with a compliance reviewer.
- Wire the export job into the queue with idempotency key
  `audit-export:<clinicId>:<from>:<to>` so duplicate clicks are safe.
- Add a check that asserts every export carries a `DpdpAuditEvent`.
