#!/usr/bin/env node

/**
 * Θ1/Θ2/Θ4: each app feature folder should include at least one colocated test (ratchet allowlist).
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const FEATURES_DIR = path.join(process.cwd(), "apps/app/features");
const ALLOWLIST_PATH = path.join(
  process.cwd(),
  "scripts/checks/allowlists/feature-test-density-zero.json",
);

const TEST_FILE_RE = /\.(spec|test)\.(ts|tsx)$/;

const allowZero = new Set(
  JSON.parse(readFileSync(ALLOWLIST_PATH, "utf8")),
);

if (!existsSync(FEATURES_DIR)) {
  process.stderr.write(`Features directory not found: ${FEATURES_DIR}\n`);
  process.exit(1);
}

const findings = [];

for (const entry of readdirSync(FEATURES_DIR, { withFileTypes: true })) {
  if (!entry.isDirectory()) {
    continue;
  }
  if (allowZero.has(entry.name)) {
    continue;
  }

  const featureDir = path.join(FEATURES_DIR, entry.name);
  const hasTest = walkForTests(featureDir);
  if (!hasTest) {
    findings.push(
      `apps/app/features/${entry.name}: no .test/.spec files (add tests or allowlist entry)`,
    );
  }
}

/** @param {string} dir */
function walkForTests(dir) {
  for (const child of readdirSync(dir, { withFileTypes: true })) {
    const childPath = path.join(dir, child.name);
    if (child.isFile() && TEST_FILE_RE.test(child.name)) {
      return true;
    }
    if (child.isDirectory() && walkForTests(childPath)) {
      return true;
    }
  }
  return false;
}

if (findings.length > 0) {
  process.stderr.write("Feature test density check failed.\n\n");
  for (const finding of findings) {
    process.stderr.write(`- ${finding}\n`);
  }
  process.exit(1);
}

process.stdout.write("Feature test density check passed.\n");
