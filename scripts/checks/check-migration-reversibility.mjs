#!/usr/bin/env node

/**
 * Ρ2: irreversible migration SQL must be marked one-way.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const MIGRATIONS_DIR = path.join(
  process.cwd(),
  "packages/db/prisma/migrations",
);
const ONE_WAY_MARKER = "check-migration-reversibility: one-way";
const ALLOW_FILE = "check-migration-reversibility: allow-file";

const IRREVERSIBLE_RE =
  /\bDROP\s+TABLE\b|\bDROP\s+COLUMN\b|\bDROP\s+TYPE\b|\bALTER\s+TABLE\b[^;]*\bDROP\s+COLUMN\b/i;

if (!existsSync(MIGRATIONS_DIR)) {
  process.stderr.write(`Migrations directory not found: ${MIGRATIONS_DIR}\n`);
  process.exit(1);
}

const dirs = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

const findings = [];

for (const dir of dirs) {
  const file = path.join(MIGRATIONS_DIR, dir, "migration.sql");
  if (!existsSync(file)) {
    continue;
  }

  const source = readFileSync(file, "utf8");
  if (source.includes(ALLOW_FILE)) {
    continue;
  }
  if (!IRREVERSIBLE_RE.test(source)) {
    continue;
  }
  if (source.includes(ONE_WAY_MARKER)) {
    continue;
  }

  findings.push(
    `${dir}/migration.sql: irreversible SQL requires "${ONE_WAY_MARKER}" in the file header`,
  );
}

if (findings.length > 0) {
  process.stderr.write(
    "Migration reversibility check failed. Mark destructive migrations as one-way or add allow-file with rationale.\n\n",
  );
  for (const finding of findings) {
    process.stderr.write(`- ${finding}\n`);
  }
  process.exit(1);
}

process.stdout.write("Migration reversibility check passed.\n");
