#!/usr/bin/env node

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const enforce = process.argv.includes("--enforce");
const allowedPatterns = [
  /^apps\/app\/app\/api\//,
  /^apps\/app\/lib\/api-client\.ts$/,
  /^apps\/app\/lib\/fetch-with-session\.ts$/,
  /^apps\/app\/lib\/browser-session\.ts$/,
  /^apps\/app\/lib\/browser-request\.ts$/,
  /\.test\.[tj]sx?$/,
  /\.spec\.[tj]sx?$/,
];

const files = execSync("git ls-files apps/app", {
  cwd: repoRoot,
  encoding: "utf8",
})
  .split("\n")
  .filter(Boolean)
  .filter((file) => /\.(ts|tsx)$/.test(file))
  .filter((file) => !allowedPatterns.some((pattern) => pattern.test(file)));

const violations = [];

for (const file of files) {
  const lines = fs
    .readFileSync(path.join(repoRoot, file), "utf8")
    .split(/\r?\n/);
  lines.forEach((line, index) => {
    if (!/\bfetch\s*\(/.test(line)) return;
    violations.push({ file, line: index + 1, content: line.trim() });
  });
}

if (violations.length > 0) {
  console.error(
    enforce
      ? "Frontend fetch boundary check failed.\n"
      : "Frontend fetch boundary report:\n",
  );
  console.error(
    "Client features must use packages/data-access hooks or the approved app API wrappers.",
  );
  for (const violation of violations) {
    console.error(`- ${violation.file}:${violation.line} ${violation.content}`);
  }
  if (enforce) process.exit(1);
  console.log(
    `Frontend fetch boundary reported ${violations.length} existing finding(s). Use --enforce to fail.`,
  );
  process.exit(0);
}

console.log("Frontend fetch boundary check passed.");
