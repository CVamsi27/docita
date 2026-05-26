-- Drop the CURRENT_TIMESTAMP default that `20260523140000_audit_compound_indexes`
-- attached to `ClinicSecret.updatedAt` when adding the column as NOT NULL. The
-- backfill is complete; in the Prisma schema this field is `@updatedAt`
-- (app-managed) with no `@default(now())`, so the column must not carry a DB
-- default. Without this fix `prisma migrate diff` reports drift and the
-- "Check for migration drift" CI step fails.

ALTER TABLE "ClinicSecret" ALTER COLUMN "updatedAt" DROP DEFAULT;
