#!/usr/bin/env node

/**
 * T3 / Ψ-adjacent: JSON.parse at runtime must be guarded (try/catch or safeJsonParse).
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import process from "node:process";

const ALLOW_FILE = "check-json-parse-guarded: allow-file";
const ALLOW_LINE = "check-json-parse-guarded: allow";
const PARSE_RE = /\bJSON\.parse\s*\(/g;

/** Deep-clone idiom — not parsing untrusted wire JSON */
const DEEP_CLONE_RE = /JSON\.parse\s*\(\s*JSON\.stringify\s*\(/;

/** @param {string} source @param {number} lineIndex */
function lineInTryBlock(source, lineIndex) {
  const lines = source.split(/\r?\n/);
  let activeTryLine = -1;
  for (let i = 0; i <= lineIndex; i += 1) {
    if (/^\s*try\s*\{/.test(lines[i] ?? "")) {
      activeTryLine = i;
    }
    if (activeTryLine >= 0 && /^\s*\}\s*catch\s*\(/.test(lines[i] ?? "")) {
      activeTryLine = -1;
    }
  }
  return activeTryLine >= 0;
}

/** @param {string} source @param {number} index */
function isDeepCloneParse(source, index) {
  const window = source.slice(index, index + 120);
  return /^JSON\.parse\s*\(\s*JSON\.stringify\s*\(/.test(window);
}

const files = execSync("git ls-files apps packages", { encoding: "utf8" })
  .split("\n")
  .filter(Boolean)
  .filter((file) => /\.(ts|tsx|js|mjs)$/.test(file))
  .filter((file) => !/\.(spec|test)\.[tj]sx?$/.test(file))
  .filter((file) => !file.includes("/test/"))
  .filter((file) => !file.includes("/e2e/"))
  .filter((file) => existsSync(file));

const findings = [];

for (const file of files) {
  const source = readFileSync(file, "utf8");
  if (source.includes(ALLOW_FILE)) {
    continue;
  }
  if (source.includes("safeJsonParse")) {
    continue;
  }

  for (const match of source.matchAll(PARSE_RE)) {
    const index = match.index ?? 0;
    const line = source.slice(0, index).split(/\r?\n/).length;
    const lineText = source.split(/\r?\n/)[line - 1] ?? "";

    if (lineText.includes(ALLOW_LINE)) {
      continue;
    }
    if (DEEP_CLONE_RE.test(lineText) || isDeepCloneParse(source, index)) {
      continue;
    }
    if (lineInTryBlock(source, line - 1)) {
      continue;
    }

    findings.push(`${file}:${line}`);
  }
}

if (findings.length > 0) {
  process.stderr.write(
    "Unguarded JSON.parse detected. Wrap in try/catch, use safeJsonParse, or add check-json-parse-guarded: allow with rationale.\n\n",
  );
  for (const finding of findings) {
    process.stderr.write(`- ${finding}\n`);
  }
  process.exit(1);
}

process.stdout.write("JSON.parse guard check passed.\n");
