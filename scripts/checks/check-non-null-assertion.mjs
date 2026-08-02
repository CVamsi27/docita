#!/usr/bin/env node

/**
 * T2: ratchet postfix non-null assertions (`!` before `.`, `,`, `;`, `)`, `]`).
 * Excludes logical `!`, `!=`, `!==`, and `!!`.
 */

import { readFileSync } from "node:fs";
import process from "node:process";
import { listSourceFiles } from "../lib/list-source-files.mjs";

const MAX_ASSERTIONS_PER_FILE = 0;
const ALLOW_FILE = "check-non-null-assertion: allow-file";
/** Postfix `!` on expressions (not logical negation). */
const NN_RE = /(?<!!)(?<![!=<>])!(?=\.[\w$]|[,;\)\]])/g;

const roots = [
  "apps/api/src",
  "apps/app-vite/src",
  "apps/internal-vite/src",
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

  const count = source.match(NN_RE)?.length ?? 0;
  if (count > MAX_ASSERTIONS_PER_FILE) {
    findings.push(
      `${file}: ${count} non-null assertions (max ${MAX_ASSERTIONS_PER_FILE})`,
    );
  }
}

if (findings.length > 0) {
  process.stderr.write(
    "Non-null assertion check failed. Narrow types or add check-non-null-assertion: allow-file with rationale.\n\n",
  );
  for (const finding of findings) {
    process.stderr.write(`- ${finding}\n`);
  }
  process.exit(1);
}

process.stdout.write(
  `Non-null assertion check passed (max ${MAX_ASSERTIONS_PER_FILE} per file).\n`,
);
