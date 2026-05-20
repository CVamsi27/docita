#!/usr/bin/env node
/**
 * Enforces process.env reads only in approved config/bootstrap paths (N1 / R1).
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const enforce = process.argv.includes("--enforce");

const allowlistPrefixes = [
  "apps/api/src/shared/modules/config/",
  "apps/api/src/instrument.ts",
  "apps/api/src/main.ts",
  "apps/worker/src/",
  "apps/api/test/",
];

const allowlistPatterns = [
  /\.spec\.ts$/,
  /\.processor\.ts$/,
  /cron-env\.ts$/,
  /startup-validation\.service\.ts$/,
  /queue\.worker\.module\.ts$/,
  /worker\.module\.ts$/,
  /app\.module\.ts$/,
  /database-backup\.service\.ts$/,
  /e2e-throttler\.guard\.ts$/,
];

const files = execSync("git ls-files 'apps/api/src/**/*.ts'", {
  cwd: repoRoot,
  encoding: "utf8",
})
  .split("\n")
  .filter(Boolean);

const violations = [];

for (const file of files) {
  if (allowlistPrefixes.some((prefix) => file.startsWith(prefix))) continue;
  if (allowlistPatterns.some((pattern) => pattern.test(file))) continue;
  const absolutePath = path.join(repoRoot, file);
  if (!fs.existsSync(absolutePath)) continue;
  const content = fs.readFileSync(absolutePath, "utf8");
  if (!/process\.env\b/.test(content)) continue;
  const lines = content.split("\n");
  lines.forEach((line, index) => {
    if (/process\.env\b/.test(line)) {
      violations.push({ file, line: index + 1, text: line.trim() });
    }
  });
}

if (violations.length === 0) {
  console.log("check-process-env: no violations.");
  process.exit(0);
}

const label = enforce ? "FAILED" : "WARN";
console.error(`check-process-env ${label}: ${violations.length} process.env read(s) outside config/`);
for (const v of violations.slice(0, 40)) {
  console.error(` - ${v.file}:${v.line} ${v.text}`);
}
if (violations.length > 40) {
  console.error(` - ... ${violations.length - 40} more`);
}

process.exit(enforce ? 1 : 0);
