#!/usr/bin/env node

/**
 * Ω3/Ω4: outbound HTTP in the API must use fetchWithTimeout (or documented allow).
 */

import { readFileSync } from "node:fs";
import process from "node:process";
import { listSourceFiles } from "../lib/list-source-files.mjs";

const ALLOW_FILE = "check-external-http-timeouts: allow-file";
const ALLOW_LINE = "check-external-http-timeouts: allow";
const FETCH_RE = /\bfetch\s*\(/g;

const files = listSourceFiles(["apps/api/src"]).filter((file) => /\.ts$/.test(file));

const findings = [];

for (const file of files) {
  const source = readFileSync(file, "utf8");
  if (source.includes(ALLOW_FILE)) {
    continue;
  }

  for (const match of source.matchAll(FETCH_RE)) {
    const index = match.index ?? 0;
    const line = source.slice(0, index).split(/\r?\n/).length;
    const lineText = source.split(/\r?\n/)[line - 1] ?? "";

    if (lineText.includes(ALLOW_LINE)) {
      continue;
    }
    if (lineText.includes("fetchWithTimeout")) {
      continue;
    }
    if (/\.\s*fetch\s*\(/.test(lineText) || /\)\.fetch\s*\(/.test(lineText)) {
      continue;
    }
    if (/\babstract\s+fetch\s*\(/.test(lineText)) {
      continue;
    }
    if (/\bfetch\s*\(\s*\{/.test(lineText)) {
      continue;
    }
    if (/\basync\s+fetch\s*\(/.test(lineText)) {
      continue;
    }
    if (/\bfetch\s*\(\s*params\b/.test(lineText)) {
      continue;
    }

    findings.push(`${file}:${line}: use fetchWithTimeout for outbound HTTP`);
  }
}

if (findings.length > 0) {
  process.stderr.write(
    "External HTTP timeout check failed. Use fetchWithTimeout or add check-external-http-timeouts: allow.\n\n",
  );
  for (const finding of findings) {
    process.stderr.write(`- ${finding}\n`);
  }
  process.exit(1);
}

process.stdout.write("External HTTP timeout check passed.\n");
