#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const requiredHeaders = [
  "Content-Security-Policy",
  "Strict-Transport-Security",
  "X-Content-Type-Options",
  "Referrer-Policy",
  "Permissions-Policy",
];

const checks = [
  {
    label: "App",
    middlewarePath: "apps/app/middleware.ts",
    headersPath: "apps/app/shared/lib/security/security-headers.ts",
    applyToken: "SECURITY_HEADERS",
  },
  {
    label: "Internal",
    middlewarePath: "apps/internal/middleware.ts",
    headersPath: "apps/internal/shared/lib/security/security-headers.ts",
    applyToken: "applyInternalSecurityHeaders",
  },
  {
    label: "Landing",
    middlewarePath: "apps/landing/src/middleware.ts",
    headersPath: "apps/landing/src/lib/security-headers.ts",
    applyToken: "applyLandingSecurityHeaders",
  },
];

const failures = [];

for (const check of checks) {
  const middleware = fs.readFileSync(
    path.join(repoRoot, check.middlewarePath),
    "utf8",
  );
  const headers = fs.readFileSync(
    path.join(repoRoot, check.headersPath),
    "utf8",
  );

  if (!middleware.includes(check.applyToken)) {
    failures.push(
      `${check.label}: ${check.middlewarePath} does not apply ${check.applyToken}.`,
    );
  }

  const missing = requiredHeaders.filter(
    (header) => !middleware.includes(header) && !headers.includes(header),
  );

  for (const header of missing) {
    failures.push(`${check.label}: missing required header ${header}.`);
  }
}

if (failures.length > 0) {
  console.error("Security header check failed.");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Security header check passed.");
