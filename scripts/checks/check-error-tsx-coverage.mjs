#!/usr/bin/env node

/**
 * Σ''1: protected and root app routes must expose segment error boundaries.
 */

import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const REQUIRED = [
  "apps/app/app/error.tsx",
  "apps/app/app/(protected)/error.tsx",
];

const missing = REQUIRED.filter(
  (relativePath) => !existsSync(path.join(process.cwd(), relativePath)),
);

if (missing.length > 0) {
  process.stderr.write("Protected error.tsx coverage check failed.\n\n");
  for (const file of missing) {
    process.stderr.write(`- missing ${file}\n`);
  }
  process.exit(1);
}

process.stdout.write("Protected error.tsx coverage check passed.\n");
