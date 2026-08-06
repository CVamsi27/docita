#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const reportDir = path.join(repoRoot, "apps/app/accessibility-reports");
const outputPath = path.join(repoRoot, "artifacts/a11y-baseline.json");

function latestReportFile() {
  if (!fs.existsSync(reportDir)) {
    return null;
  }
  const candidates = fs
    .readdirSync(reportDir)
    .filter((name) => name.startsWith("baseline-app-") && name.endsWith(".json"))
    .map((name) => path.join(reportDir, name))
    .filter((filePath) => fs.statSync(filePath).isFile())
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return candidates[0] ?? null;
}

function flattenViolations(report) {
  const pages = report.pages ?? {};
  const violations = [];
  for (const page of Object.values(pages)) {
    const pageViolations = Array.isArray(page?.violations) ? page.violations : [];
    for (const violation of pageViolations) {
      violations.push(violation);
    }
  }
  return violations;
}

const sourcePath = latestReportFile();
if (!sourcePath) {
  console.log(
    "No apps/app/accessibility-reports/baseline-app-*.json found. Run pnpm audit:app first.",
  );
  process.exit(0);
}

const report = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const violations = flattenViolations(report);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(
  outputPath,
  `${JSON.stringify({ violations, source: path.basename(sourcePath) }, null, 2)}\n`,
);

const seriousOrCritical = violations.filter((violation) =>
  ["serious", "critical"].includes(String(violation.impact)),
);

console.log(
  `Wrote ${violations.length} violation(s) to artifacts/a11y-baseline.json from ${path.basename(sourcePath)}.`,
);
if (seriousOrCritical.length > 0) {
  console.log(
    `Warning: ${seriousOrCritical.length} serious/critical violation(s) remain in the baseline.`,
  );
}
