#!/usr/bin/env node
/**
 * Static guard: a new clinicId-bearing table must arrive with RLS coverage.
 *
 * The runtime matrix (`pnpm --filter @workspace/db run db:check-tenant-isolation`)
 * proves coverage on a live database. This check catches the same regression at
 * review time, without a database, so a PR that adds a tenant table cannot merge
 * with the table silently outside the policy matrix.
 *
 * Rule: any migration newer than the newest "sweep" migration must enable row
 * level security for every table it creates with a clinicId column.
 *
 * A sweep migration is one that re-applies the policy loop dynamically, e.g.
 * 20260502143500_add_rls_policies and
 * 20261003000000_complete_rls_policy_coverage. Those loops cover every existing
 * clinicId table, so only migrations after the last sweep need to be checked —
 * and each of those must cover its own tables.
 *
 * See docs/compliance/RLS_ROLLOUT.md.
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const migrationsDir = path.join(repoRoot, "packages/db/prisma/migrations");

// The loop form used by every sweep migration. Detecting the construct rather
// than a hardcoded filename list means a future sweep is picked up for free.
const SWEEP_MARKER = /EXECUTE format\(\s*'ALTER TABLE %s ENABLE ROW LEVEL SECURITY'/;

/** @param {string} sql */
function createdClinicIdTables(sql) {
  const tables = new Set();

  // CREATE TABLE "Name" ( ... "clinicId" ... ) — same migration.
  const createTableRe =
    /CREATE TABLE (?:IF NOT EXISTS )?"([^"]+)"\s*\(([\s\S]*?)\n\s*\);/g;
  let match;
  while ((match = createTableRe.exec(sql)) !== null) {
    const [, table, body] = match;
    if (/"clinicId"/.test(body)) tables.add(table);
  }

  // ALTER TABLE "Name" ADD COLUMN "clinicId" — the tenant column added later.
  const addColumnRe =
    /ALTER TABLE (?:IF EXISTS )?"([^"]+)"[\s\S]{0,400}?ADD COLUMN (?:IF NOT EXISTS )?"clinicId"/g;
  while ((match = addColumnRe.exec(sql)) !== null) tables.add(match[1]);

  return tables;
}

/** @param {string} sql */
function literallyCoveredTables(sql) {
  const covered = new Set();
  const enableRe =
    /ALTER TABLE (?:IF EXISTS )?"([^"]+)"\s*ENABLE ROW LEVEL SECURITY/g;
  let match;
  while ((match = enableRe.exec(sql)) !== null) covered.add(match[1]);
  return covered;
}

if (!fs.existsSync(migrationsDir)) {
  console.error(
    `RLS table coverage check failed: ${migrationsDir} does not exist.`,
  );
  process.exit(1);
}

const migrations = fs
  .readdirSync(migrationsDir)
  .filter((name) => fs.statSync(path.join(migrationsDir, name)).isDirectory())
  .sort()
  .map((name) => {
    const sqlPath = path.join(migrationsDir, name, "migration.sql");
    return { name, sql: fs.existsSync(sqlPath) ? fs.readFileSync(sqlPath, "utf8") : null };
  })
  .filter((migration) => migration.sql !== null);

const lastSweep = [...migrations]
  .reverse()
  .find((migration) => SWEEP_MARKER.test(migration.sql));

if (!lastSweep) {
  console.error(
    "RLS table coverage check failed: no migration contains the dynamic tenant_isolation policy loop. Expected 20260502143500_add_rls_policies or a later sweep.",
  );
  process.exit(1);
}

const findings = [];
let checkedTables = 0;

for (const migration of migrations) {
  if (migration.name <= lastSweep.name) continue;

  const created = createdClinicIdTables(migration.sql);
  if (created.size === 0) continue;

  const covered = literallyCoveredTables(migration.sql);
  for (const table of [...created].sort()) {
    checkedTables += 1;
    if (!covered.has(table)) findings.push({ table, migration: migration.name });
  }
}

if (findings.length > 0) {
  console.error(
    `RLS table coverage check failed. ${findings.length} table(s) created after the last policy sweep (${lastSweep.name}) own a clinicId column but do not enable row level security in the same migration, so they have no database-level tenant backstop:\n`,
  );
  for (const finding of findings) {
    console.error(`  - ${finding.table} (${finding.migration})`);
  }
  console.error(
    "\nAdd `ALTER TABLE \"<table>\" ENABLE ROW LEVEL SECURITY` plus the tenant_isolation policy to that migration (see packages/db/prisma/migrations/20261003000000_complete_rls_policy_coverage), then verify with:\n" +
      "  pnpm --filter @workspace/db run db:check-tenant-isolation\n",
  );
  process.exit(1);
}

console.log(
  `RLS table coverage check passed (last sweep ${lastSweep.name}; ${checkedTables} table(s) checked in newer migrations).`,
);