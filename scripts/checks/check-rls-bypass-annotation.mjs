#!/usr/bin/env node

/**
 * Ψ5: every runUnrestricted() invocation must be justified for security review.
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import process from "node:process";

const ALLOW_FILE = "check-rls-bypass-annotation: allow-file";
const ALLOW_LINE = "check-rls-bypass-annotation: allow";
const ANNOTATION = "RLS-BYPASS:";
const LOOKBACK_LINES = 8;

const SKIP_FILES = new Set([
  "apps/api/src/prisma/prisma.service.ts",
]);

const CALL_RE = /\.runUnrestricted\s*\(/;

/** @param {string} source @param {number} lineIndex */
function hasAnnotation(source, lineIndex) {
  const lines = source.split(/\r?\n/);
  if (lines[lineIndex]?.includes(ALLOW_LINE)) {
    return true;
  }
  for (let i = lineIndex; i >= 0 && i > lineIndex - LOOKBACK_LINES; i -= 1) {
    if (lines[i]?.includes(ANNOTATION)) {
      return true;
    }
  }
  return false;
}

const files = execSync("git ls-files apps/api/src", { encoding: "utf8" })
  .split("\n")
  .filter(Boolean)
  .filter((file) => /\.ts$/.test(file))
  .filter((file) => !/\.(spec|test)\.[tj]sx?$/.test(file))
  .filter((file) => existsSync(file))
  .filter((file) => !SKIP_FILES.has(file));

const findings = [];

for (const file of files) {
  const source = readFileSync(file, "utf8");
  if (source.includes(ALLOW_FILE)) {
    continue;
  }

  const lines = source.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!CALL_RE.test(line)) {
      continue;
    }
    if (line.includes("runUnrestricted<T>") && !line.includes("this.")) {
      continue;
    }
    if (!hasAnnotation(source, i)) {
      findings.push(`${file}:${i + 1}`);
    }
  }
}

if (findings.length > 0) {
  process.stderr.write(
    "RLS bypass annotation check failed. Precede each runUnrestricted() with // RLS-BYPASS: <reason>, or add check-rls-bypass-annotation: allow on the line.\n\n",
  );
  for (const finding of findings) {
    process.stderr.write(`- ${finding}\n`);
  }
  process.exit(1);
}

process.stdout.write("RLS bypass annotation check passed.\n");
