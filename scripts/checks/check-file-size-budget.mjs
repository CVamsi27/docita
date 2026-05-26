#!/usr/bin/env node

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const enforce = process.argv.includes("--enforce");

/** Patterns excluded from size budgets — test/spec files legitimately grow large. */
const EXCLUDED_PATTERN = /\.(test|spec)\.(ts|tsx)$/;

const budgets = [
  {
    root: "apps/api/src/domains",
    pattern: /\/services\/.*\.service\.ts$/,
    exclude: EXCLUDED_PATTERN,
    max: 400,
    label: "API domain service",
  },
  {
    root: "apps/app/features",
    pattern: /\.(ts|tsx)$/,
    exclude: EXCLUDED_PATTERN,
    max: 400,
    label: "frontend feature file",
  },
];

const findings = [];

for (const budget of budgets) {
  const files = execSync(`git ls-files ${budget.root}`, {
    cwd: repoRoot,
    encoding: "utf8",
  })
    .split("\n")
    .filter(Boolean)
    .filter((file) => budget.pattern.test(file))
    .filter((file) => !budget.exclude.test(file));

  for (const file of files) {
    const absolutePath = path.join(repoRoot, file);
    if (!fs.existsSync(absolutePath)) continue;
    const lineCount = fs
      .readFileSync(absolutePath, "utf8")
      .split(/\r?\n/).length;
    if (lineCount <= budget.max) continue;
    findings.push({ ...budget, file, lineCount });
  }
}

if (findings.length > 0) {
  const intro = enforce
    ? "File size budget check failed."
    : "File size budget report:";
  console.error(`${intro}\n`);
  for (const finding of findings) {
    console.error(
      `- ${finding.file}: ${finding.lineCount} lines (${finding.label} budget ${finding.max})`,
    );
  }
  if (enforce) process.exit(1);
}

if (findings.length === 0) {
  console.log("File size budget check passed.");
} else {
  console.log(
    `File size budget reported ${findings.length} oversized file(s). Use --enforce to fail.`,
  );
}
