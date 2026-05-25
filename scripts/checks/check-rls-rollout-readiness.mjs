#!/usr/bin/env node
/**
 * Validates Postgres RLS scaffolding is present before ops flips RLS_ENABLED.
 * Does not connect to a database; see docs/compliance/RLS_ROLLOUT.md.
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();

const requiredPaths = [
  "packages/db/prisma/migrations/20260502143500_add_rls_policies/migration.sql",
  "apps/api/src/shared/modules/rls/rls.service.ts",
  "apps/api/src/shared/modules/rls/rls.module.ts",
  "docs/compliance/RLS_ROLLOUT.md",
];

const missing = requiredPaths.filter(
  (rel) => !fs.existsSync(path.join(repoRoot, rel)),
);

if (missing.length > 0) {
  console.error("RLS rollout readiness check failed. Missing:\n");
  for (const file of missing) {
    console.error(`  - ${file}`);
  }
  process.exit(1);
}

const migrationSql = fs.readFileSync(
  path.join(repoRoot, requiredPaths[0]),
  "utf8",
);

const migrationChecks = [
  ["docita_app role", /CREATE ROLE docita_app/i],
  ["tenant_isolation policy", /CREATE POLICY tenant_isolation/i],
  ["app.rls_enabled gate", /app\.rls_enabled/i],
];

const migrationFailures = migrationChecks
  .filter(([, pattern]) => !pattern.test(migrationSql))
  .map(([label]) => label);

if (migrationFailures.length > 0) {
  console.error("RLS migration is missing expected constructs:\n");
  for (const label of migrationFailures) {
    console.error(`  - ${label}`);
  }
  process.exit(1);
}

const envExample = fs.readFileSync(path.join(repoRoot, ".env.example"), "utf8");
if (!/RLS_ENABLED/i.test(envExample)) {
  console.error(
    "RLS rollout readiness check failed: .env.example must document RLS_ENABLED.",
  );
  process.exit(1);
}

const apiEnvExample = fs.readFileSync(
  path.join(repoRoot, "apps/api/.env.example"),
  "utf8",
);
if (!/RLS_ENABLED/i.test(apiEnvExample)) {
  console.error(
    "RLS rollout readiness check failed: apps/api/.env.example must document RLS_ENABLED.",
  );
  process.exit(1);
}

console.log(
  "RLS rollout readiness check passed (migration + RlsService + env docs).",
);
console.log(
  "Ops: provision DATABASE_URL as docita_app, then set RLS_ENABLED=true per docs/compliance/RLS_ROLLOUT.md.",
);
