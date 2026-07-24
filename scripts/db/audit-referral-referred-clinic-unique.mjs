// fallow-ignore-file unused-file
//
// Operator-run audit script (not imported by any code path). Run via
// `pnpm tsx scripts/db/audit-referral-referred-clinic-unique.mjs` after
// staging/prod data is ready for the one-per-clinic unique constraint.
#!/usr/bin/env node
/**
 * Audit `Referral.referredClinicId` to confirm the data is suitable for
 * adding a one-per-clinic unique constraint (deferred plan item 2.6).
 *
 * Background
 * ----------
 * The clinic-to-clinic referral path creates a Referral row keyed by
 * (referrerClinicId, referredClinicId, referralCode). The capture function
 * is guarded against double-linking a clinic, so the application layer
 * should already enforce one-per-clinic. We want a DB-level unique to
 * catch any future bug. But before adding the constraint we need to
 * verify that legacy data doesn't already violate it.
 *
 * Usage
 * -----
 *   pnpm tsx scripts/db/audit-referral-referred-clinic-unique.mjs
 *
 * Reads `DATABASE_URL` from the environment or `.env`. Exits non-zero if any
 * clinic appears as the referredClinicId on more than one Referral row.
 *
 * The matching query returns the offending (clinicId, count) pairs so a
 * human can decide how to reconcile them (the safest path is to keep the
 * earliest row and explicitly close the others with status REJECTED +
 * rejectionReason = "duplicate historical referral; oldest kept").
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envPath = resolve(ROOT, '.env');
  if (!existsSync(envPath)) {
    throw new Error('DATABASE_URL is not set and .env does not exist');
  }
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^DATABASE_URL\s*=\s*["']?([^"'\n]+)["']?/);
    if (match) return match[1].trim();
  }
  throw new Error('DATABASE_URL not found in .env');
}

const url = loadDatabaseUrl();
const { default: pg } = await import('pg').catch(() => ({ default: null }));
if (!pg) {
  throw new Error('pg client not available — install with `pnpm add -D pg`');
}
const client = new pg.Client({ connectionString: url });
await client.connect();

const sql = `
  SELECT "referredClinicId" AS clinic_id, COUNT(*) AS row_count
  FROM "Referral"
  WHERE "referredClinicId" IS NOT NULL
  GROUP BY "referredClinicId"
  HAVING COUNT(*) > 1
  ORDER BY row_count DESC, "referredClinicId" ASC;
`;

try {
  const { rows } = await client.query(sql);
  if (rows.length === 0) {
    console.log(
      'OK — every non-null Referral.referredClinicId appears on at most one row. The unique constraint is safe to add.',
    );
    process.exit(0);
  }

  console.error(
    `FAIL — ${rows.length} clinic(s) appear as Referral.referredClinicId on more than one row. The unique constraint cannot be added without reconciliation.`,
  );
  for (const row of rows) {
    console.error(`  - clinic ${row.clinic_id}: ${row.row_count} rows`);
  }
  process.exit(1);
} finally {
  await client.end();
}
