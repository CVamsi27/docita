#!/usr/bin/env node

/**
 * Ψ2: prevent duplicate Prisma migration directory timestamp prefixes.
 */

import { readdirSync, existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const MIGRATIONS_DIR = path.join(
  process.cwd(),
  "packages/db/prisma/migrations",
);

/** Known historical collision — documented in docs/operations/MIGRATION_HISTORY.md */
const TOLERATED_PREFIXES = new Set(["20251123161005"]);

if (!existsSync(MIGRATIONS_DIR)) {
  process.stderr.write(`Migrations directory not found: ${MIGRATIONS_DIR}\n`);
  process.exit(1);
}

const dirs = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

const byPrefix = new Map();

for (const dir of dirs) {
  const prefix = dir.split("_")[0];
  if (!/^\d{14}$/.test(prefix)) {
    continue;
  }
  const matches = byPrefix.get(prefix) ?? [];
  matches.push(dir);
  byPrefix.set(prefix, matches);
}

const collisions = [...byPrefix.entries()].filter(
  ([prefix, matches]) => matches.length > 1 && !TOLERATED_PREFIXES.has(prefix),
);

if (collisions.length > 0) {
  process.stderr.write(
    "Duplicate Prisma migration timestamp prefixes detected. Use a unique prefix for each new migration.\n\n",
  );
  for (const [prefix, matches] of collisions) {
    process.stderr.write(`${prefix}:\n`);
    for (const dir of matches) {
      process.stderr.write(`  - ${dir}\n`);
    }
  }
  process.exit(1);
}

process.stdout.write("Migration prefix collision check passed.\n");
