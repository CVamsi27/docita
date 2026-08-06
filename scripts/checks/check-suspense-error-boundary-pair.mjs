#!/usr/bin/env node

/**
 * Λ1: client Suspense boundaries must declare a fallback (paired with route/error coverage).
 */

import { readFileSync } from "node:fs";
import process from "node:process";
import { listSourceFiles } from "../lib/list-source-files.mjs";

const ALLOW_FILE = "check-suspense-error-boundary-pair: allow-file";
const SUSPENSE_RE = /<Suspense\b/g;

/** App routes and feature shells render under app/error.tsx or (protected) ErrorBoundaryWrapper. */
const COVERED_PREFIXES = [
  "apps/app/src/features/",
  "apps/internal/src/features/",
];

const files = listSourceFiles(["apps/app/src", "apps/internal/src"]);

const findings = [];

for (const file of files) {
  const source = readFileSync(file, "utf8");
  if (source.includes(ALLOW_FILE)) {
    continue;
  }
  if (!SUSPENSE_RE.test(source)) {
    continue;
  }

  if (COVERED_PREFIXES.some((prefix) => file.startsWith(prefix))) {
    continue;
  }
  if (/ErrorBoundary/.test(source)) {
    continue;
  }

  for (const match of source.matchAll(SUSPENSE_RE)) {
    const index = match.index ?? 0;
    const window = source.slice(index, index + 400);
    if (!/\bfallback\s*=/.test(window)) {
      const line = source.slice(0, index).split(/\r?\n/).length;
      findings.push(`${file}:${line}: <Suspense> missing fallback prop`);
    }
  }
}

if (findings.length > 0) {
  process.stderr.write(
    "Suspense/error-boundary check failed. Add a fallback, ErrorBoundary, or check-suspense-error-boundary-pair: allow-file.\n\n",
  );
  for (const finding of findings) {
    process.stderr.write(`- ${finding}\n`);
  }
  process.exit(1);
}

process.stdout.write("Suspense/error-boundary check passed.\n");
