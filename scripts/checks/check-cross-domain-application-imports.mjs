#!/usr/bin/env node

/**
 * AJ4: application services must not import another domain's infrastructure
 * or repository interfaces. Cross-domain integration uses application ports,
 * facades, or events.
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import process from "node:process";

const enforce = process.argv.includes("--enforce");

const INFRASTRUCTURE_IMPORT_RE =
  /from ['"]@\/domains\/([a-z0-9-]+)\/infrastructure\/[^'"]+['"]/g;

const CORE_REPOSITORY_IMPORT_RE =
  /from ['"]@\/domains\/([a-z0-9-]+)\/core\/repositories\/[^'"]+['"]/g;

const CORE_SERVICES_IMPORT_RE =
  /from ['"]@\/domains\/([a-z0-9-]+)\/core\/services\/[^'"]+['"]/g;

function sourceDomain(filePath) {
  const match = filePath.match(
    /domains\/([a-z0-9-]+)\/(application|presentation)\//,
  );
  return match?.[1] ?? null;
}

function collectCrossDomainImports(file, fromDomain, source, pattern) {
  const collected = [];
  for (const match of source.matchAll(pattern)) {
    const targetDomain = match[1];
    const fullImport = match[0];
    if (targetDomain === fromDomain) continue;
    collected.push(
      `${file}: imports \`${targetDomain}\` from \`${fromDomain}\` via ${fullImport}`,
    );
  }
  return collected;
}

const files = execSync(
  "git ls-files 'apps/api/src/domains/**/application/**/*.ts' 'apps/api/src/domains/**/presentation/**/*.ts'",
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
  findings.push(
    ...collectCrossDomainImports(
      file,
      fromDomain,
      source,
      INFRASTRUCTURE_IMPORT_RE,
    ),
  );
  findings.push(
    ...collectCrossDomainImports(
      file,
      fromDomain,
      source,
      CORE_REPOSITORY_IMPORT_RE,
    ),
  );
  findings.push(
    ...collectCrossDomainImports(
      file,
      fromDomain,
      source,
      CORE_SERVICES_IMPORT_RE,
    ),
  );
}

if (findings.length > 0) {
  console.error(
    enforce
      ? "Cross-domain application import check failed.\n"
      : "Cross-domain application import report:\n",
  );
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(enforce ? 1 : 0);
}

console.log("Cross-domain application import check passed.");
