#!/usr/bin/env node

/**
 * Λ3: flag optional chains with four or more links.
 */

import { readFileSync } from "node:fs";
import process from "node:process";
import { listSourceFiles } from "../lib/list-source-files.mjs";

const ALLOW_FILE = "check-deep-optional-chain: allow-file";
const ALLOW_LINE = "check-deep-optional-chain: allow";
const DEEP_OPT_RE = /(?:\?\.[\w$]+|\?\[[^\]]+\]){4,}/g;

const roots = [
  "apps/api/src",
  "apps/app",
  "apps/internal",
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

  for (const match of source.matchAll(DEEP_OPT_RE)) {
    const index = match.index ?? 0;
    const line = source.slice(0, index).split(/\r?\n/).length;
    const lineText = source.split(/\r?\n/)[line - 1] ?? "";
    if (lineText.includes(ALLOW_LINE)) {
      continue;
    }
    findings.push(`${file}:${line}: ${match[0]}`);
  }
}

if (findings.length > 0) {
  process.stderr.write(
    "Deep optional chain check failed. Narrow types or add check-deep-optional-chain: allow with rationale.\n\n",
  );
  for (const finding of findings) {
    process.stderr.write(`- ${finding}\n`);
  }
  process.exit(1);
}

process.stdout.write("Deep optional chain check passed.\n");
