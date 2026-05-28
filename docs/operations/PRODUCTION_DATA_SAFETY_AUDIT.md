# Production Data Safety Audit

This runbook is the stop-ship data gate for Prisma and SQL changes before
production. It records only metadata and aggregate counts; never paste PHI,
row payloads, patient names, phone numbers, emails, prescriptions, notes, or
raw logs into PR comments or audit notes.

## Required Target

Use a disposable database restored from the latest production backup. An empty
local database proves only SQL syntax and is not enough for production data
safety.

## Current Branch Checks

The current branch adds two additive migrations:

- `20260527100000_add_optimistic_lock_versions`: adds `version INTEGER NOT NULL DEFAULT 1` to `DoctorTimeOff`, `Prescription`, `MedicationDose`, and `StaffLeave`.
- `20260527100100_add_outbox_event`: creates `OutboxEvent` plus primary key, idempotency, polling, clinic, and event-name indexes.

The version columns are monotonic tracking fields. Mutable API paths increment
them, and clients may start sending the current version for conflict checks.
Hard conflict enforcement is only enabled where the request path supplies a
version today.

## Restored Backup Procedure

1. Restore the latest production backup into a disposable database.
2. Point `DATABASE_URL` at the disposable database.
3. Capture pre-migration evidence:

   ```sh
   pnpm --filter @workspace/db run db:prod-data-safety -- pre
   ```

4. Run the safe migration path:

   ```sh
   pnpm --filter @workspace/db exec prisma migrate status
   pnpm --filter @workspace/db run db:migrate:dry-run
   pnpm --filter @workspace/db run db:migrate:safe
   ```

5. Capture post-migration evidence:

   ```sh
   pnpm --filter @workspace/db run db:prod-data-safety -- post
   pnpm --filter @workspace/db run db:diff
   pnpm --filter @workspace/db run db:check-integrity
   pnpm --filter @workspace/db run db:guardrail
   ```

## Stop-Ship Conditions

Stop the release if any restored-backup check reports:

- failed Prisma migration status or drift;
- missing `version` column/default/non-null enforcement;
- null or below-1 version values after migration;
- missing `OutboxEvent` table, primary key, idempotency index, or polling indexes;
- failed integrity or guardrail checks;
- destructive SQL without the one-way marker and a row-level data outcome in
  `docs/operations/MIGRATION_NOTES.md`.

## Rollback Posture

These migrations are additive. Prefer code rollback if application behavior
needs to be reverted. Do not drop the new columns or `OutboxEvent` table during
routine rollback. Restore the production backup only if a restored-backup
rehearsal missed actual data corruption; treat that as an incident.
