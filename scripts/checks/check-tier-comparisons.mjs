#!/usr/bin/env node

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const sourceExtensions = new Set([".ts", ".tsx"]);

const intelligenceTierPatterns = [
  />=\s*Tier\.(INTELLIGENCE|FRONT_DESK)\b/,
  /<=\s*Tier\.(INTELLIGENCE|FRONT_DESK)\b/,
  /\bTier\.(INTELLIGENCE|FRONT_DESK)\s*>=/,
  /\bTier\.(INTELLIGENCE|FRONT_DESK)\s*<=/,
];

const appTierOrdinalPatterns = [
  /\bcurrentTier\s*>=/,
  /\bcurrentTierValue\s*>=/,
  /\bsubscription\.tier\s*>=/,
  /\btier\s*>=\s*requiredTier\b/,
];

const allowlist = new Set([
  "packages/utils/src/billing/tier-rules.ts",
]);

function listFiles(root) {
  return execSync(`git ls-files ${root}`, {
    cwd: repoRoot,
    encoding: "utf8",
  })
    .split("\n")
    .filter((file) => sourceExtensions.has(path.extname(file)));
}

const files = [
  ...listFiles("apps"),
  ...listFiles("packages"),
].filter((file) => !allowlist.has(file));

const violations = [];

for (const file of files) {
  const absolutePath = path.join(repoRoot, file);
  if (!fs.existsSync(absolutePath)) continue;
  const isAppFile = file.startsWith("apps/");
  const lines = fs.readFileSync(absolutePath, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*")) return;

    const patterns = isAppFile
      ? [...intelligenceTierPatterns, ...appTierOrdinalPatterns]
      : intelligenceTierPatterns;

    if (!patterns.some((pattern) => pattern.test(line))) return;
    violations.push({ file, line: index + 1, content: line.trim() });
  });
}

if (violations.length > 0) {
  console.error("Tier comparison check failed.\n");
  console.error(
    "Use hasFeatureAccess() / meetsMinimumTier() from @workspace/utils instead of numeric tier comparisons.",
  );
  for (const violation of violations) {
    console.error(
      `- ${violation.file}:${violation.line} ${violation.content}`,
    );
  }
  process.exit(1);
}

console.log("Tier comparison check passed.");
