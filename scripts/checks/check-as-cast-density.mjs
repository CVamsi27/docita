#!/usr/bin/env node

/**
 * T1: ratchet `as Type` cast density in application code (excludes `as const`).
 */

import { readFileSync } from "node:fs";
import process from "node:process";
import { listSourceFiles } from "../lib/list-source-files.mjs";

const MAX_CASTS_PER_FILE = 0;
const ALLOW_FILE = "check-as-cast-density: allow-file";
const CAST_RE = /\bas\s+(?!const\b|const\s|satisfies\b)/g;

/** Import/export rename aliases and comment prose are not type assertions. */
function countTypeAssertions(source) {
  const code = stripStrings(source);
  let count = 0;
  let inImportStatement = false;
  let inExportList = false;

  for (const line of code.split("\n")) {
    const trimmed = line.trim();

    if (/^\s*import\b/.test(line)) {
      inImportStatement = true;
    }
    if (inImportStatement) {
      if (/ from ['"]/.test(line)) {
        inImportStatement = false;
      }
      continue;
    }

    if (/^\s*export\s+(?:type\s+)?\{/.test(line)) {
      inExportList = true;
    }
    if (inExportList) {
      if (line.includes("}")) inExportList = false;
      continue;
    }
    if (/^\s*export\s+\*\s+as\s+\w+\s+from\b/.test(line)) {
      continue;
    }

    if (
      trimmed.startsWith("//") ||
      trimmed.startsWith("*") ||
      trimmed.startsWith("/**") ||
      trimmed.startsWith("*/")
    ) {
      continue;
    }

    const codeOnly = line.split("//")[0] ?? line;
    count += codeOnly.match(CAST_RE)?.length ?? 0;
  }

  return count;
}

function stripStrings(source) {
  return source
    .replace(/'[^'\\]*(?:\\.[^'\\]*)*'/g, '""')
    .replace(/"[^"\\]*(?:\\.[^"\\]*)*"/g, '""')
    .replace(/`[^`\\]*(?:\\.[^`\\]*)*`/g, '""')
    .replace(/>([^<>{]*)</g, (_m, text) => `>${"*".repeat(text.length)}<`);
}

const roots = [
  "apps/api/src",
  "apps/app/src",
  "apps/internal/src",
  "apps/landing",
  "packages/data-access/src",
  "packages/hooks/src",
  "packages/utils/src",
];

const files = listSourceFiles(roots);

const findings = [];

for (const file of files) {
  const source = readFileSync(file, "utf8");
  if (source.includes(ALLOW_FILE)) {
    continue;
  }

  const count = countTypeAssertions(source);
  if (count > MAX_CASTS_PER_FILE) {
    findings.push(`${file}: ${count} casts (max ${MAX_CASTS_PER_FILE})`);
  }
}

if (findings.length > 0) {
  process.stderr.write(
    "As-cast density check failed. Reduce casts or add check-as-cast-density: allow-file with rationale.\n\n",
  );
  for (const finding of findings) {
    process.stderr.write(`- ${finding}\n`);
  }
  process.exit(1);
}

process.stdout.write(
  `As-cast density check passed (max ${MAX_CASTS_PER_FILE} per file).\n`,
);
