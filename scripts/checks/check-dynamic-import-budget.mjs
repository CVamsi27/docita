#!/usr/bin/env node

/**
 * Β1: large client components should use next/dynamic for code-splitting.
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import process from "node:process";

const ALLOW_FILE = "check-dynamic-import-budget: allow-file";
const MIN_LINES = 401;
const ROOT = "apps/app";

const files = execSync(`git ls-files '${ROOT}'`, { encoding: "utf8" })
  .split("\n")
  .filter(Boolean)
  .filter((file) => /\.tsx$/.test(file))
  .filter((file) => !/\.(spec|test)\.tsx$/.test(file))
  .filter((file) => existsSync(file));

const findings = [];

for (const file of files) {
  const source = readFileSync(file, "utf8");
  if (source.includes(ALLOW_FILE)) {
    continue;
  }
  if (!source.includes('"use client"')) {
    continue;
  }

  const lineCount = source.split(/\r?\n/).length;
  if (lineCount < MIN_LINES) {
    continue;
  }
  if (/from\s+["']next\/dynamic["']/.test(source) || /\bimport\s*\(/.test(source)) {
    continue;
  }

  findings.push(
    `${file}: ${lineCount} lines (max ${MIN_LINES - 1} without next/dynamic)`,
  );
}

if (findings.length > 0) {
  process.stderr.write(
    "Dynamic import budget check failed. Split with next/dynamic or add check-dynamic-import-budget: allow-file.\n\n",
  );
  for (const finding of findings) {
    process.stderr.write(`- ${finding}\n`);
  }
  process.exit(1);
}

process.stdout.write(
  `Dynamic import budget check passed (client .tsx >= ${MIN_LINES} lines require next/dynamic).\n`,
);
