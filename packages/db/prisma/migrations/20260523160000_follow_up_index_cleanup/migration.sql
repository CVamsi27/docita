-- Drop redundant FollowUp clinicId-only index; (clinicId, status) prefix covers clinic-scoped lookups.
DROP INDEX IF EXISTS "FollowUp_clinicId_idx";
