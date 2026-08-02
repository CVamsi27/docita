#!/usr/bin/env node

import { readFileSync } from "node:fs";
import process from "node:process";

const TELEMETRY_FILES = [
  "apps/app-vite/src/lib/monitoring/web-vitals.ts",
  "apps/app-vite/src/lib/monitoring/client-error-reporter.ts",
  "apps/app-vite/src/lib/monitoring/sentry.client.config.ts",
  "apps/internal-vite/src/lib/monitoring/web-vitals.ts",
  "apps/internal-vite/src/lib/monitoring/client-error-reporter.ts",
  "apps/internal-vite/src/lib/monitoring/sentry.client.config.ts",
];

const API_ORIGIN_RE = /https:\/\/(?:staging-)?api\.docita\.work/i;

function read(path) {
  return readFileSync(path, "utf8");
}

const findings = [];
for (const path of TELEMETRY_FILES) {
  const source = read(path);
  if (API_ORIGIN_RE.test(source)) {
    findings.push(
      `${path}: browser telemetry must not post to an API origin; use a same-origin path (see AGENTS.md §4)`,
    );
  }
  if (/fetch\(/i.test(source) && !/"\/api\//.test(source)) {
    findings.push(
      `${path}: telemetry fetch calls must stay same-origin (relative /api/* path)`,
    );
  }
}

if (findings.length > 0) {
  process.stderr.write("Browser telemetry same-origin check failed.\n");
  for (const finding of findings) {
    process.stderr.write(`- ${finding}\n`);
  }
  process.exit(1);
}

process.stdout.write("Browser telemetry same-origin check passed.\n");
