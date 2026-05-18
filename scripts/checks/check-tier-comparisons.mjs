#!/usr/bin/env node

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const roots = ["apps", "packages"];
const sourceExtensions = new Set([".ts", ".tsx"]);
const forbidden = [
  />=\s*Tier\.(INTELLIGENCE|FRONT_DESK)\b/,
  /<=\s*Tier\.(INTELLIGENCE|FRONT_DESK)\b/,
  /\bTier\.(INTELLIGENCE|FRONT_DESK)\s*>=/,
  /\bTier\.(INTELLIGENCE|FRONT_DESK)\s*<=/,
];

const files = execSync(`git ls-files ${roots.join(" ")}`, {
  cwd: repoRoot,
  encoding: "utf8",
})
  .split("\n")
  .filter((file) => sourceExtensions.has(path.extname(file)));

const violations = [];

for (const file of files) {
  const absolutePath = path.join(repoRoot, file);
  if (!fs.existsSync(absolutePath)) continue;
  const lines = fs.readFileSync(absolutePath, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    if (!forbidden.some((pattern) => pattern.test(line))) return;
    violations.push({ file, line: index + 1, content: line.trim() });
  });
}

if (violations.length > 0) {
  console.error("Tier comparison check failed.\n");
  console.error(
    "Tier.INTELLIGENCE and Tier.FRONT_DESK must use hasFeatureAccess()/feature gates, not numeric comparisons.",
  );
  for (const violation of violations) {
    console.error(
      `- ${violation.file}:${violation.line} ${violation.content}`,
    );
  }
  process.exit(1);
}

console.log("Tier comparison check passed.");
