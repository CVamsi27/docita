#!/usr/bin/env node

/**
 * Ω3/Ω4: outbound HTTP in the API must use fetchWithTimeout (or documented allow).
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import process from "node:process";

const ALLOW_FILE = "check-external-http-timeouts: allow-file";
const ALLOW_LINE = "check-external-http-timeouts: allow";
const FETCH_RE = /\bfetch\s*\(/g;

const files = execSync("git ls-files apps/api/src", { encoding: "utf8" })
  .split("\n")
  .filter(Boolean)
  .filter((file) => /\.ts$/.test(file))
  .filter((file) => !/\.(spec|test)\.ts$/.test(file))
  .filter((file) => existsSync(file));

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
