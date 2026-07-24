# Patients list &mdash; Last visit / Next visit column

**Created:** 2026-07-13, on branch `fix/clean-code` during the four-phase UI/UX uplift (Phase 3 candidate #1 from `docs/audits/UI_UX_AUDIT_2026-07-13.md`).

Surfaced during the per-feature audit. Not implemented in the audit commit because it requires a multi-layer change (schema migration + API + contracts + UI). This file is the implementation spec so a future session can land it as a focused PR.

## Goal

Add a `Last visit` and `Next visit` column to the patients list (`/patients`) so the doctor can see at a glance who they last saw and who they are about to see, without opening each patient. The single biggest doctor-time-saved win identified in the audit.

## Why this needs a focused PR, not a one-line tweak

The `Patient` table does not currently carry `lastVisitAt` or `nextVisitAt`. The data lives on `Appointment` rows that join back to the patient. To surface these on the list, the API response shape must change, the Zod contract must change, the frontend `Patient` type must change, and the table component must add a column with a mobile-card variant. Each of those layers has its own tests, and the value depends on the data being accurate for existing patients &mdash; so a backfill is required. Trying to ship this in the audit pass would have produced a half-implemented change with broken types.

## Data model

Add two denormalized columns on `Patient` (in `packages/db/prisma/schema.prisma`):

```prisma
lastVisitAt  DateTime?  @db.Timestamptz(3)
nextVisitAt  DateTime?  @db.Timestamptz(3)
```

Both nullable. Add composite indexes only if query plans need them; the existing `(clinicId, createdAt)` index covers list ordering and the appointment-driven population is point-lookup by patient id, so no new index is required for the read path.

### Why denormalize instead of computing in the list query

- List page size is small (20 by default) so a join is feasible, but a join forces the API to also filter on `Appointment.clinicId`, `status` (completed / scheduled), and an ORDER BY + LIMIT 1 per patient. That's six round-trips of mental overhead for a derived value that updates on every appointment write.
- Denormalized columns are O(1) read on the list path and O(1) write on appointment transitions &mdash; both happen often.
- The columns are nullable so existing patients start with `null` and get backfilled once.

## API surface

### Repository

In `apps/api/src/domains/patients/infrastructure/persistence/prisma-patient.repository.ts`:

1. Extend `PATIENT_PERSISTENCE_SELECT` to include `lastVisitAt` and `nextVisitAt`.
2. In `findAll`, leave the existing `findMany` as-is &mdash; it does not need to compute these; it just returns the columns.
3. Add a `refreshVisitAggregates(clinicId, patientId)` method on the repository that, for a single patient, runs:
   ```sql
   -- last visit
   SELECT MAX("startTime") FROM "Appointment"
     WHERE "patientId" = $1 AND "clinicId" = $2
       AND status IN ('completed', 'in-progress');
   -- next visit
   SELECT MIN("startTime") FROM "Appointment"
     WHERE "patientId" = $1 AND "clinicId" = $2
       AND status IN ('scheduled', 'confirmed');
   ```
   and writes the results back to the row. This is a focused read-then-write, not a list scan.

### Service

In `apps/api/src/domains/patients/application/services/patient-command.service.ts` (or a new `patient-visit-aggregates.service.ts` for clean separation):

- Wire `refreshVisitAggregates` into the appointment write path in `apps/api/src/domains/appointments/`. Concretely, on every Appointment create / status transition / cancel, call `refreshVisitAggregates(clinicId, patientId)`. This is a few extra lines in the existing command service and a single transaction boundary.

### Domain entity + Zod contract

In `apps/api/src/domains/patients/core/entities/patient.entity.ts` and `packages/types/src/contracts/patients.ts`:

```ts
lastVisitAt: Date | null;
nextVisitAt: Date | null;
```

Update the `Patient` Zod schema and the `PatientListResponse` contract. The data-access `usePatients` hook will pick up the new fields without changes because the Zod-inferred type flows through `@workspace/data-access`.

### Backfill

Add a one-shot backfill script at `packages/db/src/scripts/backfill-patient-visit-aggregates.ts` (or `apps/api/src/scripts/...` &mdash; follow the existing pattern in `packages/db/scripts/`). The script:

1. Streams all non-deleted patients in batches of 500.
2. For each, runs the same two MIN/MAX queries as the refresh method.
3. Writes back the values in batches.
4. Logs `total: N, updated: M, skipped: K` at the end.

Run on staging before prod, then on prod during a low-traffic window. The script must be idempotent &mdash; rerunning it must not change the result.

## Frontend

### Types

No change beyond the contract flow-through. `Patient` will have the two nullable fields.

### Patients table

In `apps/app/features/patients/components/list/patients-table.tsx`:

- Add two new columns between `gender` and `actions`:
  - `lastVisit`: human-readable "12 Apr" or "—" if null. Hidden on mobile (use `hiddenOnMobile: true`).
  - `nextVisit`: human-readable "28 May · 11:30" or "—" if null. Hidden on mobile.
- Update `columns` array. Update the `mobile-card` variant in `patients-table-sections.tsx` (`PatientMobileCard`) to show the two values as small footer lines below the patient name.
- Add a small `MicroLabel` legend or header hint explaining the columns.
- Sortable? Defer to a follow-up. Both fields are denormalized timestamps so a sort would require a DB-side index. Initial column sort should be off (no header sort affordance) to keep this PR focused.

### Empty / never-seen patients

Patients with `lastVisitAt === null` should show "Never" in the `lastVisit` column. Patients with `nextVisitAt === null` should show "—" in the `nextVisit` column. Never make the column blank &mdash; blank reads as a missing-data bug.

## Tests

| Layer | Test |
| --- | --- |
| Prisma migration | Verify schema includes the two columns and the migration is reversible. |
| Repository | `prisma-patient.repository.spec.ts` &mdash; `findAll` returns the new fields; `refreshVisitAggregates` updates both fields from appointment writes. |
| Service | `patient-command.service.spec.ts` &mdash; appointment transitions call `refreshVisitAggregates` exactly once. |
| API contract | `patients.controller.spec.ts` &mdash; `GET /patients` response includes the new fields with the right nullability. |
| Backfill script | Re-run idempotency: a second run produces zero diffs. |
| Frontend list | `PatientsPageUI.test.tsx` &mdash; column visible; null renders as "Never" / "&mdash;"; mobile card variant shows the footer lines. |
| e2e | `patients.spec.ts` &mdash; seeded patient with appointment shows the rendered dates. |

## Rollout

Per `AGENTS.md` 9.4 ("Existing-user compatibility"), this is a backfill + new optional column, so no clinic-associated user lands in onboarding. The `User.clinicId` workflow is unaffected.

1. **Expand** &mdash; add nullable columns, leave the API response unchanged.
2. **Backfill** &mdash; run the script. Validate sample data.
3. **Wire writes** &mdash; turn on `refreshVisitAggregates` in the appointment service.
4. **Surface in API** &mdash; add to `PATIENT_PERSISTENCE_SELECT` and the Zod contract.
5. **Surface in UI** &mdash; ship the column behind a feature flag (`?visitColumn=1` or an `experiments` flag) so it can be toggled without a release.
6. **Enforce** &mdash; remove the flag once stable.

## Out of scope

- Sorting / filtering by last-visit or next-visit.
- An appointment-recency badge ("3 days overdue", "Follow-up due in 5 days"). A separate follow-up.
- Surfacing the same data on the dashboard's recent-patients card.
- A "patient has not visited in N days" advisor card on the patient detail rail (also a separate follow-up).

## Files this PR will touch (rough estimate)

- `packages/db/prisma/schema.prisma` &mdash; add 2 columns.
- `packages/db/prisma/migrations/<timestamp>_patient_visit_aggregates/` &mdash; generated.
- `packages/db/src/scripts/backfill-patient-visit-aggregates.ts` (new) &mdash; backfill.
- `packages/types/src/contracts/patients.ts` &mdash; extend `Patient` schema.
- `apps/api/src/domains/patients/core/entities/patient.entity.ts` &mdash; add 2 fields.
- `apps/api/src/domains/patients/infrastructure/persistence/prisma-patient.repository.ts` &mdash; extend select; add `refreshVisitAggregates`.
- `apps/api/src/domains/patients/application/services/patient-command.service.ts` (or new visit-aggregates service) &mdash; expose refresh.
- `apps/api/src/domains/appointments/...` &mdash; wire refresh into the appointment write path.
- `apps/app/features/patients/components/list/patients-table.tsx` &mdash; new columns.
- `apps/app/features/patients/components/list/patients-table-sections.tsx` &mdash; mobile card variant.
- `apps/app/features/patients/components/list/PatientsPageUI.test.tsx` &mdash; tests.
- `apps/app/e2e/patients.spec.ts` &mdash; e2e.
- `docs/audits/UI_UX_AUDIT_2026-07-13.md` &mdash; mark candidate #1 done.
