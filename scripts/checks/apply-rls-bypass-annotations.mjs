#!/usr/bin/env node

/**
 * One-off helper: insert // RLS-BYPASS comments before runUnrestricted() calls.
 * Safe to re-run; skips lines that already have RLS-BYPASS in the lookback window.
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import process from "node:process";
import { rationaleForFile } from "./lib/rls-bypass-rationales.mjs";

const CALL_RE = /^(\s*)(.*\.runUnrestricted\s*\()/;
const ANNOTATION = "RLS-BYPASS:";
const LOOKBACK = 8;
const SKIP_FILES = new Set([
  "apps/api/src/prisma/prisma.service.ts",
]);

const files = execSync("git ls-files apps/api/src", { encoding: "utf8" })
  .split("\n")
  .filter(Boolean)
  .filter((file) => /\.ts$/.test(file))
  .filter((file) => !/\.(spec|test)\.[tj]sx?$/.test(file))
  .filter((file) => existsSync(file))
  .filter((file) => !SKIP_FILES.has(file));

let inserted = 0;

for (const file of files) {
  const source = readFileSync(file, "utf8");
  if (source.includes("check-rls-bypass-annotation: allow-file")) {
    continue;
  }

  const lines = source.split(/\r?\n/);
  const reason = rationaleForFile(file);
  const comment = `// ${ANNOTATION} ${reason}`;
  let changed = false;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const match = line.match(CALL_RE);
    if (!match) {
      continue;
    }

    let annotated = false;
    for (let j = i; j >= 0 && j > i - LOOKBACK; j -= 1) {
      if (lines[j]?.includes(ANNOTATION)) {
        annotated = true;
        break;
      }
    }
    if (annotated) {
      continue;
    }

    const indent = match[1] ?? "";
    lines.splice(i, 0, `${indent}${comment}`);
    inserted += 1;
    i += 1;
    changed = true;
  }

  if (changed) {
    writeFileSync(file, `${lines.join("\n")}\n`, "utf8");
  }
}

process.stdout.write(`Inserted ${inserted} RLS-BYPASS annotation(s).\n`);
