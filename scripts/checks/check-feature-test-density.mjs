#!/usr/bin/env node

/**
 * Θ1/Θ2/Θ4: each app feature folder should include at least one colocated test (ratchet allowlist).
 *
 * Scans apps/app and apps/internal feature folders. A feature without a
 * colocated .test/.spec file is a finding unless it is listed in that app's
 * ratchet allowlist. New features must ship with tests; covered features are
 * pruned from the allowlist when their tests land.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const TEST_FILE_RE = /\.(spec|test)\.(ts|tsx)$/;

const APP_CONFIGS = [
  {
    label: "apps/app/src/features",
    dir: path.join(process.cwd(), "apps/app/src/features"),
    allowlistPath: path.join(
      process.cwd(),
      "scripts/checks/allowlists/feature-test-density-zero.json",
    ),
  },
  {
    label: "apps/internal/src/features",
    dir: path.join(process.cwd(), "apps/internal/src/features"),
    allowlistPath: path.join(
      process.cwd(),
      "scripts/checks/allowlists/feature-test-density-zero-internal.json",
    ),
  },
];

const findings = [];

for (const config of APP_CONFIGS) {
  if (!existsSync(config.dir)) {
    process.stdout.write(
      `Features directory not found: ${config.dir} — skipping (Vite app not created yet).\n`,
    );
    continue;
  }

  const allowZero = new Set(
    JSON.parse(readFileSync(config.allowlistPath, "utf8")),
  );

  for (const entry of readdirSync(config.dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }
    if (allowZero.has(entry.name)) {
      continue;
    }

    const featureDir = path.join(config.dir, entry.name);
    if (!walkForTests(featureDir)) {
      findings.push(
        `${config.label}/${entry.name}: no .test/.spec files (add tests or remove allowlist entry)`,
      );
    }
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
