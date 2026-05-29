#!/usr/bin/env node
/**
 * Repair appointment rows stored as clinic-wall digits without UTC conversion.
 * Default: dry-run. Pass --apply to write fixes.
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const requireUtils = createRequire(resolve(ROOT, 'packages/utils/package.json'));
const requireDb = createRequire(resolve(ROOT, 'packages/db/package.json'));
const pg = requireDb('pg');
const {
  clinicWallDatetimeLocalToUtcIso,
  DEFAULT_TIMEZONE,
  formatUtcInstantAsClinicPickerIso,
} = requireUtils('@workspace/utils');

function loadEnv() {
  if (process.env.DATABASE_URL) return;
  for (const rel of ['.env', 'apps/api/.env']) {
    const envPath = resolve(ROOT, rel);
    if (!existsSync(envPath)) continue;
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
      const match = line.match(/^DATABASE_URL\s*=\s*["']?([^"'\n]+)["']?/);
      if (match) {
        process.env.DATABASE_URL = match[1].trim();
        return;
      }
    }
  }
}

const apply = process.argv.includes('--apply');

async function main() {
  loadEnv();
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  const pool = new pg.Pool({
    connectionString,
    options: '-c TimeZone=UTC',
  });

  const { rows } = await pool.query(`
    SELECT a.id, a."startTime", a."endTime", c.timezone
    FROM "Appointment" a
    JOIN "Clinic" c ON c.id = a."clinicId"
    WHERE a.status IN ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS')
  `);

  let candidateCount = 0;
  let fixedCount = 0;

  for (const row of rows) {
    const timezone = row.timezone?.trim() || DEFAULT_TIMEZONE;
    const start = new Date(row.startTime);
    const end = new Date(row.endTime);

    /** Treat stored UTC digit components as if they were clinic-wall naive times. */
    const wallStart = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}-${String(start.getUTCDate()).padStart(2, '0')}T${String(start.getUTCHours()).padStart(2, '0')}:${String(start.getUTCMinutes()).padStart(2, '0')}`;
    const wallEnd = `${end.getUTCFullYear()}-${String(end.getUTCMonth() + 1).padStart(2, '0')}-${String(end.getUTCDate()).padStart(2, '0')}T${String(end.getUTCHours()).padStart(2, '0')}:${String(end.getUTCMinutes()).padStart(2, '0')}`;

    const correctedStartIso = clinicWallDatetimeLocalToUtcIso(wallStart, timezone);
    const correctedEndIso = clinicWallDatetimeLocalToUtcIso(wallEnd, timezone);
    if (!correctedStartIso || !correctedEndIso) continue;

    const correctedStart = new Date(correctedStartIso);
    const correctedEnd = new Date(correctedEndIso);
    const startDelta = correctedStart.getTime() - start.getTime();
    const endDelta = correctedEnd.getTime() - end.getTime();

    const digitDate = wallStart.slice(0, 10);
    const storedPickerDay = formatUtcInstantAsClinicPickerIso(start, timezone);
    const correctedPickerDay = formatUtcInstantAsClinicPickerIso(
      correctedStart,
      timezone,
    );

    /** Fix rows where UTC digits were stored as Z but belong on the digit calendar day in clinic TZ. */
    const looksLikeWallAsUtc =
      startDelta !== 0 &&
      endDelta !== 0 &&
      startDelta === endDelta &&
      startDelta < 0 &&
      storedPickerDay !== correctedPickerDay &&
      correctedPickerDay === digitDate;

    if (!looksLikeWallAsUtc) continue;

    candidateCount += 1;
    console.log(
      `[${apply ? 'apply' : 'dry-run'}] ${row.id}: ${row.startTime.toISOString()} -> ${correctedStartIso}`,
    );

    if (apply) {
      await pool.query(
        `UPDATE "Appointment" SET "startTime" = $1, "endTime" = $2 WHERE id = $3`,
        [correctedStart, correctedEnd, row.id],
      );
      fixedCount += 1;
    }
  }

  console.log(
    `Scanned ${rows.length} active appointments; ${candidateCount} candidates; ${apply ? fixedCount : 0} updated.`,
  );
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
