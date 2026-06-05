#!/usr/bin/env node

import { readFileSync } from "node:fs";
import process from "node:process";

const APP_WEB_VITALS =
  "apps/app/shared/components/layout/web-vitals-reporter.tsx";
const APP_CLIENT_ERRORS =
  "apps/app/shared/lib/monitoring/client-error-reporting.ts";
const INTERNAL_WEB_VITALS =
  "apps/internal/shared/components/internal-web-vitals-reporter.tsx";
const APP_PACKAGE = "apps/app/package.json";
const INTERNAL_PACKAGE = "apps/internal/package.json";

function read(path) {
  return readFileSync(path, "utf8");
}

const findings = [];
const appWebVitals = read(APP_WEB_VITALS);
const appClientErrors = read(APP_CLIENT_ERRORS);
const internalWebVitals = read(INTERNAL_WEB_VITALS);

if (
  !appWebVitals.includes(
    'WEB_VITALS_REPORTING_PATH = "/api/v1/monitoring/web-vitals"',
  )
) {
  findings.push(`${APP_WEB_VITALS}: web-vitals endpoint must stay same-origin`);
}

for (const [path, source] of [
  [APP_WEB_VITALS, appWebVitals],
  [APP_CLIENT_ERRORS, appClientErrors],
  [INTERNAL_WEB_VITALS, internalWebVitals],
]) {
  if (/https:\/\/(?:staging-)?api\.docita\.work/i.test(source)) {
    findings.push(`${path}: browser telemetry must not post to an API origin`);
  }
}

for (const path of [APP_PACKAGE, INTERNAL_PACKAGE]) {
  const source = read(path);
  for (const target of ["build:cloudflare:production", "build:cloudflare:staging"]) {
    const script = JSON.parse(source).scripts[target];
    if (!script?.includes("NEXT_PUBLIC_API_URL=/api/v1")) {
      findings.push(`${path}: ${target} must inline NEXT_PUBLIC_API_URL=/api/v1`);
    }
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
