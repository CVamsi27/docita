#!/usr/bin/env node

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import process from "node:process";

const files = execSync("git ls-files apps packages", {
  encoding: "utf8",
})
  .split("\n")
  .filter(Boolean)
  .filter((file) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file))
  .filter((file) => !/\.(spec|test)\.[tj]sx?$/.test(file))
  .filter((file) => !file.includes("/test/"))
  .filter((file) => !file.includes("/e2e/"))
  .filter((file) => !file.includes("/dist/"))
  .filter((file) => !file.includes("/.next/"))
  .filter((file) => existsSync(file));

const findings = [];
const emptyCatchPattern = /catch\s*(?:\([^)]*\))?\s*\{\s*\}/g;

for (const file of files) {
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(emptyCatchPattern)) {
    const line = source.slice(0, match.index).split(/\r?\n/).length;
    findings.push(`${file}:${line}`);
  }
}

if (findings.length > 0) {
  process.stderr.write(
    "Empty catch blocks detected. Log, monitor, rethrow, or document an intentional fallback.\n\n",
  );
  for (const finding of findings) {
    process.stderr.write(`- ${finding}\n`);
  }
  process.exit(1);
}

process.stdout.write("Empty catch check passed.\n");
