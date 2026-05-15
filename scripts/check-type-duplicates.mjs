#!/usr/bin/env node

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const enforce = process.argv.includes("--enforce");

const appRoots = [
  "apps/app/lib",
  "apps/app/features",
  "apps/internal/lib",
  "apps/internal/features",
].filter((root) => fs.existsSync(path.join(repoRoot, root)));

const packageTypeFiles = execSync("git ls-files packages/types/src", {
  cwd: repoRoot,
  encoding: "utf8",
})
  .split("\n")
  .filter(Boolean)
  .filter((file) => /\.(ts|tsx)$/.test(file));

const sharedNames = new Set();
const declarationPattern =
  /\bexport\s+(?:declare\s+)?(?:interface|type)\s+([A-Z][A-Za-z0-9_]*)\b/g;

for (const file of packageTypeFiles) {
  const source = fs.readFileSync(path.join(repoRoot, file), "utf8");
  for (const match of source.matchAll(declarationPattern)) {
    sharedNames.add(match[1]);
  }
}

const appFiles = appRoots.flatMap((root) =>
  execSync(`git ls-files ${root}`, { cwd: repoRoot, encoding: "utf8" })
    .split("\n")
    .filter(Boolean)
    .filter((file) => /\.(ts|tsx)$/.test(file)),
);

const findings = [];

for (const file of appFiles) {
  const lines = fs
    .readFileSync(path.join(repoRoot, file), "utf8")
    .split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const match of line.matchAll(declarationPattern)) {
      const name = match[1];
      if (sharedNames.has(name)) {
        findings.push({ file, line: index + 1, name });
      }
    }
  });
}

if (findings.length > 0) {
  console.error(
    enforce
      ? "Type duplicate check failed.\n"
      : "Type duplicate boundary report:\n",
  );
  console.error(
    "App-local exported types should not mirror names already exported from packages/types.",
  );
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line} ${finding.name}`);
  }
  if (enforce) process.exit(1);
  console.log(
    `Type duplicate check reported ${findings.length} finding(s). Use --enforce to fail.`,
  );
  process.exit(0);
}

console.log("Type duplicate check passed.");
