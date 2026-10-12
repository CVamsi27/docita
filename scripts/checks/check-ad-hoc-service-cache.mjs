#!/usr/bin/env node

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import process from "node:process";

import { trackedFileExists } from "../lib/check-runner.mjs";

const enforce = process.argv.includes("--enforce");

/** In-memory session stores allowed until replaced with CacheService / Redis. */
const ALLOWLIST = new Set([
  "apps/api/src/domains/clinics/application/services/onboarding/onboarding-data.service.ts",
]);

const INSTANCE_MAP = /^\s*(?:private|protected)\s+(?:readonly\s+)?\w+\s*=\s*new Map\s*\(/m;

const files = execSync(
  'git ls-files "apps/api/src/domains/*/application/services/**/*.ts"',
  { encoding: "utf8" },
)
  .split("\n")
  .filter(Boolean)
  .filter(trackedFileExists)
  .filter((file) => !/\.(spec|test)\.[tj]sx?$/.test(file))
  .filter((file) => !file.endsWith(".registry.ts"));

const findings = [];

for (const file of files) {
  if (ALLOWLIST.has(file)) {
    continue;
  }
  const source = readFileSync(file, "utf8");
  if (INSTANCE_MAP.test(source)) {
    findings.push(
      `${file}: instance-level Map cache; use CacheService or a scoped registry`,
    );
  }
}

if (findings.length > 0) {
  console.error(
    enforce
      ? "Ad-hoc service cache check failed.\n"
      : "Ad-hoc service cache report:\n",
  );
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(enforce ? 1 : 0);
}

console.log("Ad-hoc service cache check passed.");
