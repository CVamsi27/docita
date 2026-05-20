#!/usr/bin/env node

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import process from "node:process";

const SCHEDULER_PATH_RE =
  /(?:\/(?:scheduler|schedulers)\/|scheduler\.service\.ts$|-scheduler\.service\.ts$|\.scheduler\.ts$)/;

const ASYNC_WORK_IN_LOOP_RE = /\bawait\s+this\.(?!logger\b)/;

const files = execSync("git ls-files apps/api/src", { encoding: "utf8" })
  .split("\n")
  .filter(Boolean)
  .filter((file) => SCHEDULER_PATH_RE.test(file))
  .filter((file) => /\.ts$/.test(file))
  .filter((file) => !/\.(spec|test)\.[tj]sx?$/.test(file))
  .filter((file) => existsSync(file));

/** @param {string} source */
function extractForLoopBodies(source) {
  const bodies = [];
  const forPattern = /\bfor\s*\(/g;
  let match;

  while ((match = forPattern.exec(source)) !== null) {
    let index = match.index + match[0].length;
    let parenDepth = 1;

    while (index < source.length && parenDepth > 0) {
      const char = source[index];
      if (char === "(") parenDepth += 1;
      else if (char === ")") parenDepth -= 1;
      index += 1;
    }

    while (index < source.length && /\s/.test(source[index])) {
      index += 1;
    }

    if (source[index] !== "{") {
      continue;
    }

    const bodyStart = index + 1;
    let braceDepth = 1;
    index += 1;

    while (index < source.length && braceDepth > 0) {
      const char = source[index];
      if (char === "{") braceDepth += 1;
      else if (char === "}") braceDepth -= 1;
      index += 1;
    }

    bodies.push({
      line: source.slice(0, match.index).split(/\r?\n/).length,
      body: source.slice(bodyStart, index - 1),
    });
  }

  return bodies;
}

const findings = [];

for (const file of files) {
  const source = readFileSync(file, "utf8");
  if (source.includes("check-n-plus-1: allow-file")) {
    continue;
  }

  for (const { line, body } of extractForLoopBodies(source)) {
    if (body.includes("check-n-plus-1: allow")) {
      continue;
    }
    if (ASYNC_WORK_IN_LOOP_RE.test(body)) {
      findings.push(`${file}:${line}`);
    }
  }
}

if (findings.length > 0) {
  process.stderr.write(
    "Sequential for/await work detected in scheduler code. Batch with Promise.all / Promise.allSettled, or add check-n-plus-1: allow with rationale.\n\n",
  );
  for (const finding of findings) {
    process.stderr.write(`- ${finding}\n`);
  }
  process.exit(1);
}

process.stdout.write("Scheduler N+1 (for/await) check passed.\n");
