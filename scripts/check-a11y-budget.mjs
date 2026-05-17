#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const baselinePath = path.join(repoRoot, "artifacts/a11y-baseline.json");
const reportOnly = process.argv.includes("--report");

if (!fs.existsSync(baselinePath)) {
  console.error("A11y baseline is missing: artifacts/a11y-baseline.json");
  process.exit(reportOnly ? 0 : 1);
}

const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
const violations = Array.isArray(baseline.violations)
  ? baseline.violations
  : [];
const seriousOrCritical = violations.filter((violation) =>
  ["serious", "critical"].includes(String(violation.impact)),
);

if (seriousOrCritical.length > 0) {
  console.error(
    `A11y baseline contains ${seriousOrCritical.length} serious/critical violation(s).`,
  );
  process.exit(reportOnly ? 0 : 1);
}

console.log("A11y baseline budget check passed.");
