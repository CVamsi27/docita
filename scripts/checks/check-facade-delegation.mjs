#!/usr/bin/env node

/**
 * AH1: application *Service facades should delegate; business logic belongs in
 * command/query/use-case layers. Flags large services without a facade contract
 * or with heavy direct persistence usage.
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { loadDocumentedFacadeServiceNames } from "../lib/documented-facade-services.mjs";

const enforce = process.argv.includes("--enforce");
const DOCUMENTED_FACADES = loadDocumentedFacadeServiceNames();

const SKIP_FILE =
  /(query|command|use-case|policy|processor|orchestrator|calculator|registry|resolver|dispatch|composer|listener|validator|aggregator|mapper|helper|metrics|diagnosis|activation|checkout|pricing|snapshot|ingress|webhook|settings|scheduler|token|upload|availability|workflow|compliance|creation|submit|slots|generation|verification|admin|notification|history|tracking|aggregation|template|message|automation|resend|approval|messaging|definition|facade|pdf)\.service\.ts$/i;

const MIN_LINES = 200;
const MIN_PRISMA_CALLS = 6;
const MIN_DELEGATION_RATIO = 0.45;

function delegationRatio(source) {
  const asyncMethods = (source.match(/^\s+async\s+\w+/gm) ?? []).length;
  if (asyncMethods === 0) {
    return 1;
  }
  const delegations = (source.match(/return\s+this\.\w+\./g) ?? []).length;
  return delegations / asyncMethods;
}

function prismaCallCount(source) {
  return (source.match(/this\.prisma\./g) ?? []).length;
}

function lineCount(file) {
  return readFileSync(file, "utf8").split(/\r?\n/).length;
}

const files = execSync(
  "git ls-files 'apps/api/src/domains/*/application/services/*.service.ts'",
  { encoding: "utf8" },
)
  .split("\n")
  .filter(Boolean)
  .filter((file) => !SKIP_FILE.test(path.basename(file)));

const findings = [];

for (const file of files) {
  if (!existsSync(file)) continue;
  const source = readFileSync(file, "utf8");
  const lines = lineCount(file);
  if (lines < MIN_LINES) continue;
  const className = source.match(/export class (\w+)/)?.[1];
  if (className && DOCUMENTED_FACADES.has(className)) continue;

  const prismaCalls = prismaCallCount(source);
  const ratio = delegationRatio(source);

  if (prismaCalls >= MIN_PRISMA_CALLS) {
    findings.push(
      `${file}: ${lines} lines, ${prismaCalls} direct prisma calls — not a documented facade`,
    );
    continue;
  }

  if (ratio < MIN_DELEGATION_RATIO) {
    findings.push(
      `${file}: ${lines} lines, delegation ratio ${(ratio * 100).toFixed(0)}% — add command/query split or document facade`,
    );
  }
}

if (findings.length > 0) {
  console.error(
    enforce
      ? "Facade delegation check failed.\n"
      : "Facade delegation report:\n",
  );
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(enforce ? 1 : 0);
}

console.log("Facade delegation check passed.");
