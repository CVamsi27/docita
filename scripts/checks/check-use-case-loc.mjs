#!/usr/bin/env node
// Advisory: application use-case files should orchestrate, not implement
// business rules inline. Files over the soft cap likely embed too much
// logic that belongs in a domain rule or repository.
//
// SYSTEM_DESIGN_AND_PATTERNS.md §28.4 item 29.

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import process from "node:process";

const ROOT = "apps/api/src/domains";
const SOFT_CAP = 150;

const files = execSync(`git ls-files '${ROOT}'`, { encoding: "utf8" })
  .split("\n")
  .filter(Boolean)
  .filter((f) => /\/application\/use-cases\/[^/]+\.use-case\.ts$/.test(f))
  .filter((f) => !/\.(spec|test)\.ts$/.test(f));

const findings = [];

for (const file of files) {
  let source;
  try {
    source = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  const loc = source
    .split("\n")
    .filter((line) => line.trim() && !line.trim().startsWith("//")).length;
  if (loc > SOFT_CAP) {
    findings.push(`${file}: ${loc} lines (soft cap ${SOFT_CAP})`);
  }
}

if (findings.length === 0) {
  process.stdout.write(
    `[use-case-loc] OK — ${files.length} use-cases under ${SOFT_CAP} LOC.\n`,
  );
  process.exit(0);
}

const enforce = process.argv.includes("--enforce");
process.stderr.write(
  `[use-case-loc] ${enforce ? "FAILED" : "ADVISORY"}: ${findings.length} use-case file(s) over ${SOFT_CAP} lines:\n`,
);
for (const finding of findings) {
  process.stderr.write(`  - ${finding}\n`);
}
process.stderr.write(
  "Consider extracting business rules to domain helpers or pure calculators. Use-cases should orchestrate repositories + domain logic.\n",
);
process.exit(enforce ? 1 : 0);
