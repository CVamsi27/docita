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
    label: "Landing",
    middlewarePath: "apps/landing/src/middleware.ts",
    headersPaths: [
      "apps/landing/src/lib/security-headers.ts",
      "packages/utils/src/security-headers.ts",
    ],
    applyToken: "applyLandingSecurityHeaders",
  },
];

// Cloudflare static-app `public/_headers` files. These are the only
// header source for the Vite SPA apps (their /api/* + /socket.io/*
// traffic is proxied by the Hono Worker, which sets its own headers).
const headerFileChecks = [
  { label: "App (app-vite)", path: "apps/app-vite/public/_headers" },
  { label: "Internal (internal-vite)", path: "apps/internal-vite/public/_headers" },
];

const failures = [];

for (const check of checks) {
  const middleware = fs.readFileSync(
    path.join(repoRoot, check.middlewarePath),
    "utf8",
  );
  const headerSources = check.headersPaths.map((p) =>
    fs.readFileSync(path.join(repoRoot, p), "utf8"),
  );

  if (!middleware.includes(check.applyToken)) {
    failures.push(
      `${check.label}: ${check.middlewarePath} does not apply ${check.applyToken}.`,
    );
  }

  const missing = requiredHeaders.filter(
    (header) =>
      !middleware.includes(header) &&
      !headerSources.some((s) => s.includes(header)),
  );

  for (const header of missing) {
    failures.push(`${check.label}: missing required header ${header}.`);
  }
}

for (const check of headerFileChecks) {
  const filePath = path.join(repoRoot, check.path);
  if (!fs.existsSync(filePath)) {
    failures.push(`${check.label}: ${check.path} is missing.`);
    continue;
  }
  const content = fs.readFileSync(filePath, "utf8");
  // Match real header lines only — a header name mentioned in a
  // comment (e.g. "we intentionally omit CSP here") must not
  // satisfy the check.
  const headerLines = content.replace(/\/\*[\s\S]*?\*\//g, "");
  const missing = requiredHeaders.filter(
    (header) => !headerLines.includes(header),
  );
  for (const header of missing) {
    failures.push(`${check.label}: ${check.path} missing required header ${header}.`);
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
