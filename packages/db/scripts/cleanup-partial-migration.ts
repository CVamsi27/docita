/**
 * Cleanup partial migration state from failed attempts.
 *
 * When `prisma migrate resolve --rolled-back` is used, the migration record
 * is marked as rolled back but the SQL changes are NOT reverted. If a migration
 * partially applied (e.g. CREATE TYPE + ALTER TABLE succeeded but DROP TYPE
 * failed), the database is left in a hybrid state that blocks re-application.
 *
 * This script reverts known partial states so the migration can be re-applied
 * cleanly. It is idempotent — safe to run multiple times.
 */
import { Pool } from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  process.stderr.write("DATABASE_URL is required.\n");
  process.exit(1);
}

const CLEANUP_SQL = `
-- 1. Revert partial ClinicTier_new recreation.
--    If ClinicTier_new exists, tables may already reference it. Convert them
--    back to ClinicTier so the migration can start fresh.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClinicTier_new') THEN
    ALTER TABLE "Clinic" ALTER COLUMN "tier" DROP DEFAULT;
    ALTER TABLE "Clinic"
      ALTER COLUMN "tier" TYPE "ClinicTier"
      USING "tier"::text::"ClinicTier";
    ALTER TABLE "Clinic" ALTER COLUMN "tier" SET DEFAULT 'STARTER';

    ALTER TABLE "Subscription" ALTER COLUMN "plan" DROP DEFAULT;
    ALTER TABLE "Subscription"
      ALTER COLUMN "plan" TYPE "ClinicTier"
      USING "plan"::text::"ClinicTier";
    ALTER TABLE "Subscription" ALTER COLUMN "plan" SET DEFAULT 'STARTER';

    ALTER TABLE "TierPricing" ALTER COLUMN "tier" DROP DEFAULT;
    ALTER TABLE "TierPricing"
      ALTER COLUMN "tier" TYPE "ClinicTier"
      USING "tier"::text::"ClinicTier";

    DROP TYPE "ClinicTier_new";
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'cleanup: skipped ClinicTier_new revert (%)', SQLERRM;
END $$;
`;

async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  try {
    const client = await pool.connect();
    try {
      await client.query(CLEANUP_SQL);
      process.stdout.write("Cleanup completed successfully.\n");
    } finally {
      client.release();
    }
  } catch (err) {
    process.stderr.write(`Cleanup failed: ${err}\n`);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
