# Migration Notes

## 2026-05-15: HospitalRole and Specialization Soft Deprecation

Owner: platform architecture.

The Prisma schema is locked for additive-only changes, so enum values are not removed from the database. Instead:

- `HospitalRole` remains readable for existing rows, but write-side API DTOs now use `SUPPORTED_HOSPITAL_ROLES`, currently an empty set. New writes cannot set a hospital role until a real operational consumer exists.
- `ACTIVE_SPECIALIZATIONS` limits new specialization choices to the current active product set: `DENTAL`, `OTHER`, `CARDIOLOGY`, `ENT`, `OPHTHALMOLOGY`, `DERMATOLOGY`, `GYNECOLOGY`, `PSYCHIATRY`, `GENERAL_PRACTICE`, and `PEDIATRICS`.
- Existing rows with deprecated specialization or hospital role values should continue to render as stored values.

Before any future removal or migration, run the read-only data quality queries listed in `docs/UpcomingPlans/security-and-performance-audit-merry-lobster.md` WS-17.
