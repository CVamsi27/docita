#!/usr/bin/env node
// Allowlists localStorage / sessionStorage usage in the Vite apps
// (apps/app-vite, apps/internal-vite).
// New usage outside the allowlist is blocked because:
//   - PHI must not land in browser storage (DPDP risk).
//   - Cross-tab leakage and stale-state bugs are common.
//   - Cookie-based session storage is the migration target (resolved item 1).
//
// SYSTEM_DESIGN_AND_PATTERNS.md §28.2 item 10.

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import process from "node:process";

const ROOTS = ["apps/app-vite", "apps/internal-vite"];
const PATTERN = /\b(?:window\.)?(?:localStorage|sessionStorage)\b/g;

// Files that are allowed to use client storage today. Each entry must be
// reviewed at PR time; new entries require sign-off from the privacy reviewer.
// Note: apps/app and apps/internal have been replaced by Vite equivalents.
// Vite app allowlist entries will be added as storage usage is confirmed.
const ALLOWLIST = new Set([
  // apps/internal-vite — theme, auth context, navigation history
  "apps/internal-vite/src/lib/monitoring/sentry.client.config.ts",
  "apps/internal-vite/src/lib/monitoring/client-error-reporter.ts",
  "apps/internal-vite/src/lib/stores/internal-filters-store.ts",
]);

const TEST_FILE_RE = /\.(?:spec|test)\.[jt]sx?$/;
const FILE_RE = /\.[jt]sx?$/;

const files = ROOTS.flatMap((root) =>
  execSync(`git ls-files '${root}'`, { encoding: "utf8" })
    .split("\n")
    .filter(Boolean),
).filter((f) => FILE_RE.test(f));

const findings = [];

for (const file of files) {
  if (TEST_FILE_RE.test(file)) continue;
  if (ALLOWLIST.has(file)) continue;
  let source;
  try {
    source = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  if (PATTERN.test(source)) {
    findings.push(file);
  }
}

if (findings.length === 0) {
  process.stdout.write("[client-storage-usage] OK\n");
  process.exit(0);
}

process.stderr.write(
  `[client-storage-usage] ${findings.length} file(s) use localStorage/sessionStorage and are NOT in the allowlist:\n`,
);
for (const file of findings) {
  process.stderr.write(`  - ${file}\n`);
}
process.stderr.write(
  "Either remove the usage (prefer React state, query cache, or cookies) or add the file to the ALLOWLIST in scripts/checks/check-client-storage-usage.mjs with a one-line rationale in the PR.\n",
);
process.exit(1);
