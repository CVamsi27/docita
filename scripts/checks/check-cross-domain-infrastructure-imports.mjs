#!/usr/bin/env node

/**
 * Extends AJ4 to domain infrastructure: no imports of another domain's
 * core/services (use application ports instead).
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import process from "node:process";

const enforce = process.argv.includes("--enforce");

const CORE_SERVICES_IMPORT_RE =
  /from ['"]@\/domains\/([a-z0-9-]+)\/core\/services\/[^'"]+['"]/g;

function sourceDomain(filePath) {
  const match = filePath.match(/domains\/([a-z0-9-]+)\/infrastructure\//);
  return match?.[1] ?? null;
}

const files = execSync(
  "git ls-files 'apps/api/src/domains/**/infrastructure/**/*.ts'",
  { encoding: "utf8" },
)
  .split("\n")
  .filter(Boolean);

const findings = [];

for (const file of files) {
  if (!existsSync(file)) continue;
  const fromDomain = sourceDomain(file);
  if (!fromDomain) continue;

  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(CORE_SERVICES_IMPORT_RE)) {
    const targetDomain = match[1];
    if (targetDomain === fromDomain) continue;
    findings.push(
      `${file}: imports \`${targetDomain}/core/services\` from \`${fromDomain}/infrastructure\``,
    );
  }
}

if (findings.length > 0) {
  console.error(
    enforce
      ? "Cross-domain infrastructure import check failed.\n"
      : "Cross-domain infrastructure import report:\n",
  );
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(enforce ? 1 : 0);
}

console.log("Cross-domain infrastructure import check passed.");
