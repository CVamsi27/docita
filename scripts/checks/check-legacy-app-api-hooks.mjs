#!/usr/bin/env node

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import process from "node:process";

const enforce = process.argv.includes("--enforce");

const LEGACY_HOOK_DIR = "apps/app/shared/hooks/api";

const files = execSync(`git ls-files "${LEGACY_HOOK_DIR}"`, {
  encoding: "utf8",
})
  .split("\n")
  .filter(Boolean)
  .filter((file) => /\.tsx?$/.test(file))
  .filter((file) => !/\.(spec|test)\.[tj]sx?$/.test(file));

const findings = [];

const REEXPORT_ONLY =
  /^\s*["']use client["'];?\s*export\s*\{[\s\S]*\}\s*from\s*["']@workspace\/data-access["'];?\s*$/;

for (const file of files) {
  const source = readFileSync(file, "utf8");
  if (
    source.includes("fetch-with-session") ||
    source.includes("fetchJsonWithSession")
  ) {
    findings.push(
      `${file}: uses direct session fetch; migrate to @workspace/data-access`,
    );
    continue;
  }
  if (REEXPORT_ONLY.test(source)) {
    continue;
  }
  if (
    source.includes("@/lib/api/api-core") ||
    source.includes("@/lib/api/api-client") ||
    source.includes("@/features/patients/api/patients.api")
  ) {
    findings.push(
      `${file}: imports app API layer; migrate hooks to @workspace/data-access`,
    );
  }
}

if (findings.length > 0) {
  console.error(
    enforce
      ? "Legacy app API hooks check failed.\n"
      : "Legacy app API hooks report:\n",
  );
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(enforce ? 1 : 0);
}

console.log("Legacy app API hooks check passed.");
