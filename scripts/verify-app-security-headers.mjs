#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const middlewarePath = path.join(repoRoot, "apps/app/middleware.ts");
const securityHeadersPath = path.join(
  repoRoot,
  "apps/app/lib/security-headers.ts",
);

const middleware = fs.readFileSync(middlewarePath, "utf8");
const headers = fs.readFileSync(securityHeadersPath, "utf8");

const requiredHeaders = [
  "Content-Security-Policy",
  "Strict-Transport-Security",
  "X-Content-Type-Options",
  "Referrer-Policy",
  "Permissions-Policy",
];

const missing = requiredHeaders.filter(
  (header) => !middleware.includes(header) && !headers.includes(header),
);

if (!middleware.includes("SECURITY_HEADERS") || missing.length > 0) {
  console.error("App security header check failed.");
  if (!middleware.includes("SECURITY_HEADERS")) {
    console.error("- apps/app/middleware.ts does not apply SECURITY_HEADERS.");
  }
  for (const header of missing) {
    console.error(`- Missing required header: ${header}`);
  }
  process.exit(1);
}

console.log("App security header check passed.");
