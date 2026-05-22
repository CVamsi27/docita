#!/usr/bin/env node

/**
 * Ψ4: application-layer methods with multiple persistence writes must use
 * $transaction so read-then-write sequences stay atomic.
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import process from "node:process";

const MIN_MUTATIONS = 3;
const ALLOW_FILE = "check-multi-write-transaction: allow-file";
const ALLOW_METHOD = "check-multi-write-transaction: allow";

const MUTATION_RE =
  /(?:this\.(?:persistence|prisma)|\btx)\.\w+\.(?:create|update|upsert|delete|createMany|updateMany|deleteMany)\s*\(/g;

const ASYNC_METHOD_RE = /^\s+async\s+(\w+)\s*\(/gm;

/** @param {string} source @param {number} fromIndex */
function extractMethodBody(source, fromIndex) {
  let index = fromIndex;
  while (index < source.length && source[index] !== "{") {
    index += 1;
  }
  if (index >= source.length) {
    return null;
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

  return source.slice(bodyStart, index - 1);
}

/** @param {string} source */
function listAsyncMethods(source) {
  const methods = [];
  let match;

  while ((match = ASYNC_METHOD_RE.exec(source)) !== null) {
    const body = extractMethodBody(source, match.index);
    if (!body) continue;
    const line = source.slice(0, match.index).split(/\r?\n/).length;
    methods.push({ name: match[1], line, body });
  }

  return methods;
}

const files = execSync(
  "git ls-files 'apps/api/src/domains/*/application/**/*.ts'",
  { encoding: "utf8" },
)
  .split("\n")
  .filter(Boolean)
  .filter((file) => existsSync(file))
  .filter((file) => !/\.(spec|test)\.[tj]sx?$/.test(file))
  .filter((file) => /\/(services|use-cases)\//.test(file));

const findings = [];

for (const file of files) {
  const source = readFileSync(file, "utf8");
  if (source.includes(ALLOW_FILE)) {
    continue;
  }

  for (const { name, line, body } of listAsyncMethods(source)) {
    if (body.includes(ALLOW_METHOD)) {
      continue;
    }

    const mutations = body.match(MUTATION_RE) ?? [];
    if (mutations.length < MIN_MUTATIONS) {
      continue;
    }

    if (!body.includes("$transaction")) {
      findings.push(
        `${file}:${line} async ${name}() — ${mutations.length} persistence writes without $transaction`,
      );
    }
  }
}

if (findings.length > 0) {
  process.stderr.write(
    "Multi-write transaction check failed. Wrap persistence mutations in $transaction, or add check-multi-write-transaction: allow with rationale.\n\n",
  );
  for (const finding of findings) {
    process.stderr.write(`- ${finding}\n`);
  }
  process.exit(1);
}

process.stdout.write("Multi-write transaction check passed.\n");
