import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

/**
 * Regression suite for the RLS table coverage guard (backlog S01).
 *
 * The guard must fail when a migration newer than the last dynamic policy sweep
 * creates a clinicId-bearing table without enabling row level security, and it
 * must not fail for tables the sweep already covers. The check runs against a
 * fixture migrations directory so these tests never depend on repo state.
 */
const scriptPath = fileURLToPath(
  new URL("./check-rls-table-coverage.mjs", import.meta.url),
);

const SWEEP_SQL = `DO $$
BEGIN
  FOR rec IN SELECT table_name FROM information_schema.tables LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', rec.table_name);
  END LOOP;
END
$$;
`;

function makeRepo(migrations) {
  const root = mkdtempSync(path.join(os.tmpdir(), "rls-coverage-"));
  for (const [name, sql] of Object.entries(migrations)) {
    const dir = path.join(root, "packages/db/prisma/migrations", name);
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "migration.sql"), sql);
  }
  return root;
}

function runCheck(cwd) {
  return spawnSync(process.execPath, [scriptPath], { cwd, encoding: "utf8" });
}

test("passes when no migration exists after the last sweep", () => {
  const root = makeRepo({
    "20260502143500_add_rls_policies": SWEEP_SQL,
  });
  const result = runCheck(root);
  rmSync(root, { recursive: true, force: true });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /passed/i);
});

test("fails when a later migration creates an uncovered clinicId table", () => {
  const root = makeRepo({
    "20260502143500_add_rls_policies": SWEEP_SQL,
    "20260601120000_add_tenant_thing": `CREATE TABLE "TenantThing" (
      "id" TEXT NOT NULL,
      "clinicId" TEXT NOT NULL,
      CONSTRAINT "TenantThing_pkey" PRIMARY KEY ("id")
    );
    `,
  });
  const result = runCheck(root);
  rmSync(root, { recursive: true, force: true });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /TenantThing/);
  assert.match(result.stderr, /no database-level tenant backstop/);
});

test("passes when the later migration enables row level security", () => {
  const root = makeRepo({
    "20260502143500_add_rls_policies": SWEEP_SQL,
    "20260601120000_add_tenant_thing": `CREATE TABLE "TenantThing" (
      "id" TEXT NOT NULL,
      "clinicId" TEXT NOT NULL,
      CONSTRAINT "TenantThing_pkey" PRIMARY KEY ("id")
    );
    ALTER TABLE "TenantThing" ENABLE ROW LEVEL SECURITY;
    CREATE POLICY tenant_isolation ON "TenantThing" FOR ALL TO PUBLIC USING (true);
    `,
  });
  const result = runCheck(root);
  rmSync(root, { recursive: true, force: true });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /1 table\(s\) checked/);
});

test("a later sweep clears the requirement for tables it covers", () => {
  const root = makeRepo({
    "20260502143500_add_rls_policies": SWEEP_SQL,
    "20260601120000_add_tenant_thing": `CREATE TABLE "TenantThing" (
      "id" TEXT NOT NULL,
      "clinicId" TEXT NOT NULL
    );
    `,
    "20261003000000_complete_rls_policy_coverage": SWEEP_SQL,
  });
  const result = runCheck(root);
  rmSync(root, { recursive: true, force: true });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /complete_rls_policy_coverage/);
});

test("catches a clinicId column added to an existing table", () => {
  const root = makeRepo({
    "20260502143500_add_rls_policies": SWEEP_SQL,
    "20260601120000_add_clinic_scope_column": `ALTER TABLE "LegacyThing"
      ADD COLUMN "clinicId" TEXT NOT NULL;
    `,
  });
  const result = runCheck(root);
  rmSync(root, { recursive: true, force: true });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /LegacyThing/);
});

test("ignores tables that do not own a clinicId column", () => {
  const root = makeRepo({
    "20260502143500_add_rls_policies": SWEEP_SQL,
    "20260601120000_add_global_thing": `CREATE TABLE "GlobalThing" (
      "id" TEXT NOT NULL,
      "name" TEXT NOT NULL
    );
    `,
  });
  const result = runCheck(root);
  rmSync(root, { recursive: true, force: true });

  assert.equal(result.status, 0, result.stderr);
});

test("fails when no sweep migration exists at all", () => {
  const root = makeRepo({
    "20260601120000_add_something": `CREATE TABLE "Something" ("id" TEXT NOT NULL);`,
  });
  const result = runCheck(root);
  rmSync(root, { recursive: true, force: true });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /no migration contains the dynamic tenant_isolation policy loop/i);
});
