#!/usr/bin/env node

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const sourceExtensions = new Set([".ts", ".tsx"]);

const PLAN_SKUS = [
  "STARTER",
  "FRONT_DESK",
  "ESSENTIAL",
  "PROFESSIONAL",
  "HOSPITAL",
  "ENTERPRISE",
];

const ladderLiteralPatterns = [
  /:\s*TierName\[\]\s*=\s*\[/,
  /as\s+TierName\[\]/,
  /as\s+const\s+satisfies\s+readonly\s+TierName\[\]/,
];

const LEGACY_TIER_SKUS = ["CAPTURE", "CORE", "PLUS", "PRO", "CLINIC"];

const legacyTierMapPatterns = [
  /tier:\s*"(?:CAPTURE|CORE|PLUS|PRO)"/,
  /value="(?:CAPTURE|CORE|PLUS|PRO)"/,
  /(?:CAPTURE|CORE|PLUS|PRO):\s*"/,
];

const allowlist = new Set([
  "packages/types/src/billing/tier.ts",
  "packages/types/src/access/clinic-tier-map.ts",
]);

function listFiles(root) {
  return execSync(`git ls-files ${root}`, {
    cwd: repoRoot,
    encoding: "utf8",
  })
    .split("\n")
    .filter((file) => sourceExtensions.has(path.extname(file)));
}

function countSkusInBlock(text) {
  return PLAN_SKUS.filter((sku) => text.includes(`"${sku}"`)).length;
}

function extractBracketBlocks(content) {
  const blocks = [];
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!ladderLiteralPatterns.some((pattern) => pattern.test(line))) {
      continue;
    }
    let block = line;
    let depth =
      (line.match(/\[/g) ?? []).length - (line.match(/\]/g) ?? []).length;
    let j = i + 1;
    while (depth > 0 && j < lines.length) {
      block += `\n${lines[j]}`;
      depth +=
        (lines[j].match(/\[/g) ?? []).length -
        (lines[j].match(/\]/g) ?? []).length;
      j += 1;
    }
    blocks.push({ startLine: i + 1, text: block });
    i = j - 1;
  }
  return blocks;
}

const files = [
  ...listFiles("apps"),
  ...listFiles("packages"),
].filter((file) => !allowlist.has(file));

const violations = [];

for (const file of files) {
  const absolutePath = path.join(repoRoot, file);
  if (!fs.existsSync(absolutePath)) continue;
  const content = fs.readFileSync(absolutePath, "utf8");
  const blocks = extractBracketBlocks(content);
  for (const block of blocks) {
    const skuCount = countSkusInBlock(block.text);
    if (skuCount < 2) continue;
    violations.push({
      file,
      line: block.startLine,
      skus: PLAN_SKUS.filter((sku) => block.text.includes(`"${sku}"`)),
      kind: "inline-ladder",
    });
  }

  if (!file.startsWith("apps/internal/")) {
    continue;
  }

  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (!legacyTierMapPatterns.some((pattern) => pattern.test(line))) {
      return;
    }
    const legacyHits = LEGACY_TIER_SKUS.filter((sku) =>
      line.includes(`"${sku}"`),
    );
    if (legacyHits.length === 0) {
      return;
    }
    violations.push({
      file,
      line: index + 1,
      skus: legacyHits,
      kind: "legacy-tier-sku",
    });
  });
}

if (violations.length > 0) {
  console.error("Tier ladder drift check failed.\n");
  console.error(
    "Use PUBLISHED_PLAN_LADDER from @workspace/types (and PUBLISHED_TIER_LADDER from @workspace/utils) instead of local TierName[] plan ladders.",
  );
  for (const violation of violations) {
    const label =
      violation.kind === "legacy-tier-sku"
        ? "legacy tier SKU in apps/internal"
        : "inline ladder";
    console.error(
      `- ${violation.file}:${violation.line} ${label} (${violation.skus.join(", ")})`,
    );
  }
  process.exit(1);
}

console.log("Tier ladder drift check passed.");
