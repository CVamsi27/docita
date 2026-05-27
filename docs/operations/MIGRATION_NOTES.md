# Migration Notes

## Schema-lock exceptions

The Prisma schema has been locked for additive-only changes since 2026-03-22. Destructive migrations are blocked by `scripts/checks/check-migration-reversibility.mjs` unless the file carries an explicit `-- check-migration-reversibility: one-way` marker. Every such exception MUST be recorded in this section.

| Timestamp  | Migration                                          | Why it was allowed                                                                                                                                                                                                                                                                    | Data outcome                                                                                                                                                             | Approver                                                                                                                    |
| ---------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-08 | `20260408193000_replace_super_admin_with_internal` | The legacy `SUPER_ADMIN` enum value was renamed to `INTERNAL` to align with the [0408 RBAC consolidation](../architecture/SYSTEM_DESIGN_AND_PATTERNS.md). Prisma cannot rename enum values, so the migration recreates the `Role` type and maps the existing rows via a `USING` cast. | Existing `SUPER_ADMIN` users are remapped to `INTERNAL`; no row deletion. The complementary additive migration `20260408192900_add_internal_to_role_enum` shipped first. | Platform architecture (out-of-band review at the time; recorded retroactively as part of the 2026-05 prod-readiness audit). |

For future destructive migrations, the rule is: add the `-- check-migration-reversibility: one-way` marker, document the row-level effect in this table BEFORE merging, and capture the approver inline.

## Production data safety evidence

For production-bound Prisma/SQL changes, rehearse against a disposable restore
of the latest production backup and follow
[`PRODUCTION_DATA_SAFETY_AUDIT.md`](./PRODUCTION_DATA_SAFETY_AUDIT.md). Use
`pnpm --filter @workspace/db run db:prod-data-safety -- pre` before applying
migrations and `pnpm --filter @workspace/db run db:prod-data-safety -- post`
afterwards. The script emits only aggregate counts and metadata.

## 2026-05-15: HospitalRole and Specialization Soft Deprecation

Owner: platform architecture.

The Prisma schema is locked for additive-only changes, so enum values are not removed from the database. Instead:

- `HospitalRole` remains readable for existing rows, but write-side API DTOs now use `SUPPORTED_HOSPITAL_ROLES`, currently an empty set. New writes cannot set a hospital role until a real operational consumer exists.
- `ACTIVE_SPECIALIZATIONS` limits new specialization choices to the current active product set: `DENTAL`, `OTHER`, `CARDIOLOGY`, `ENT`, `OPHTHALMOLOGY`, `DERMATOLOGY`, `GYNECOLOGY`, `PSYCHIATRY`, `GENERAL_PRACTICE`, and `PEDIATRICS`.
- Existing rows with deprecated specialization or hospital role values should continue to render as stored values.

Before any future removal or migration, run the read-only data quality queries listed in `docs/UpcomingPlans/security-and-performance-audit-merry-lobster.md` WS-17.
