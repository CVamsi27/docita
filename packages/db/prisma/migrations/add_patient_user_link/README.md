# Superseded — do not add migrations without a timestamp prefix

This folder is the original `add_patient_user_link` migration. It lacks the
`YYYYMMDDHHMMSS_` prefix, so it sorts lexicographically **after** every
timestamped migration ("a" > "2"), which made fresh-deploy apply order diverge
from the recorded history order as new migrations were added.

It is superseded by `20260705120000_add_patient_user_link/`, which contains the
identical (idempotent) SQL in a deterministic position. This folder is kept so
environments that already recorded `add_patient_user_link` in
`_prisma_migrations` keep a consistent history — deleting it would make Prisma
flag those environments as having an unknown applied migration.

Operational details: `docs/operations/MIGRATION_RENAME_RUNBOOK.md`.
