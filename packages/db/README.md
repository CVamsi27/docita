# @workspace/db

Prisma schema, migrations, and database client for Docita.

## Datetime convention

All **instant** timestamps (`DateTime` fields in `schema.prisma`) map to PostgreSQL `timestamptz(3)` and represent **UTC instants** at the API boundary.

| Semantic | Storage | Example |
| --- | --- | --- |
| Instant event (appointment start, audit `createdAt`) | `DateTime @db.Timestamptz(3)` | `2026-05-28T08:30:00.000Z` (= 14:00 IST) |
| Recurring wall clock (doctor hours) | `String` HH:mm + `Clinic.timezone` | `"09:00"` on `MONDAY` |

### Connection timezone

All application pools must use UTC session timezone:

- `packages/db/src/index.ts` — `createUtcPoolConfig()` / `withUtcSessionTimezone()`
- `DATABASE_URL?options=-c%20TimeZone%3DUTC` in `.env.example`

### Scheduling writes

- UI forms use clinic-wall `yyyy-MM-dd'T'HH:mm` strings.
- Clients convert to UTC ISO (`Z`) before POST via `clinicWallDatetimeLocalToUtcIso`.
- API re-validates with `normalizeAppointmentInstant` and clinic timezone.

### Migrations

Existing naive `timestamp(3)` values were migrated with:

```sql
ALTER COLUMN "startTime" TYPE timestamptz(3)
  USING "startTime" AT TIME ZONE 'UTC';
```

### Data repair

Mis-saved appointments (wall digits stored as UTC) can be detected and fixed:

```bash
# Dry-run (default — review candidates before writing)
pnpm db:repair-appointments

# Apply fixes (prod: run dry-run first, then apply)
pnpm db:repair-appointments:apply
```

Requires `DATABASE_URL` (loads from repo `.env` or `apps/api/.env` when unset). Uses UTC session timezone on the connection.
