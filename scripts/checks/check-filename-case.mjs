#!/usr/bin/env node

/**
 * O1: top-level feature directories in apps/app/src/features use kebab-case.
 */

import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const FEATURES_DIR = path.join(process.cwd(), "apps/app/src/features");
const KEBAB_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

if (!existsSync(FEATURES_DIR)) {
  process.stderr.write(`Features directory not found: ${FEATURES_DIR}\n`);
  process.exit(1);
}

const findings = [];

for (const entry of readdirSync(FEATURES_DIR, { withFileTypes: true })) {
  if (!entry.isDirectory()) {
    continue;
  }
  if (!KEBAB_RE.test(entry.name)) {
    findings.push(
      `apps/app/src/features/${entry.name}: feature folder must be kebab-case`,
    );
  }
}

if (findings.length > 0) {
  process.stderr.write("Feature filename-case check failed.\n\n");
  for (const finding of findings) {
    process.stderr.write(`- ${finding}\n`);
  }
  process.exit(1);
}

process.stdout.write("Feature filename-case check passed.\n");
