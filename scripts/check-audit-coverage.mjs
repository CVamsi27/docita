#!/usr/bin/env node

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const coverageFile = path.join(
  repoRoot,
  "docs/audits/evidence/2026-05-audit-coverage.md",
);
const reportOnly = process.argv.includes("--report");

if (!fs.existsSync(coverageFile)) {
  console.error(
    "Audit coverage file is missing: docs/audits/evidence/2026-05-audit-coverage.md",
  );
  process.exit(reportOnly ? 0 : 1);
}

const coverage = fs.readFileSync(coverageFile, "utf8");
const files = execSync("git ls-files", { cwd: repoRoot, encoding: "utf8" })
  .split("\n")
  .filter(Boolean);

const missing = files.filter((file) => !coverage.includes(`| \`${file.split("/")[0]}/**\``));

if (missing.length > 0) {
  console.log(
    `Audit coverage report: ${missing.length} tracked file(s) are not matched by a top-level ledger row.`,
  );
  if (!reportOnly) process.exit(1);
  process.exit(0);
}

console.log("Audit coverage check passed.");
