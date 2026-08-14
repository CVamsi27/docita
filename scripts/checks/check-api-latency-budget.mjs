#!/usr/bin/env node

/**
 * API latency budget ratchet (P5.9).
 *
 * Compares the committed staging-soak latency baseline
 * (`artifacts/api-latency-baseline.json`) against the published SLO budgets
 * (`api-latency-slos.mjs` / `docs/operations/SLOS.md`).
 *
 * The gate is hermetic: it never calls the API. The baseline is written by
 * whoever runs the staging soak and converted with
 * `--write-baseline <soak-metrics.json>` (see `pnpm perf:api-latency:baseline`),
 * then committed so the merge gate can ratchet against it.
 *
 * Failure semantics per P5.9: measured p95 above budget is a WARNING; measured
 * p95 above budget * 1.25 (LATENCY_EXCEEDANCE_TOLERANCE) is a FAILURE with
 * `--enforce`. Without `--enforce` failures are reported but exit 0.
 *
 * When the baseline is absent the gate skips with exit 0 — measurements cannot
 * be fabricated, so absence is reported, not faked.
 *
 * Baseline shape:
 * {
 *   "generatedAt": "2026-08-06T00:00:00.000Z",
 *   "endpoints": {
 *     "auth":    { "p95": 120 },
 *     "crud":    { "p95": 180, "p99": 410 },
 *     "search":  { "p95": 220 },
 *     "reports": { "p95": 900 },
 *     "webhooks": { "p95": 40 }
 *   }
 * }
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import {
  API_LATENCY_SLOS,
  LATENCY_EXCEEDANCE_TOLERANCE,
} from "./api-latency-slos.mjs";

const repoRoot = process.cwd();
const baselineArgIndex = process.argv.indexOf("--baseline");
const defaultBaseline = path.join(
  repoRoot,
  "artifacts",
  "api-latency-baseline.json",
);
const baselinePath =
  baselineArgIndex !== -1 && process.argv[baselineArgIndex + 1]
    ? process.argv[baselineArgIndex + 1]
    : defaultBaseline;
const enforce = process.argv.includes("--enforce");
const writeBaseline = process.argv.includes("--write-baseline");

// Convert a raw soak metrics file ({ "<class>": { p95, p99 } }) into the
// committed baseline artifact. Usage:
//   node scripts/checks/check-api-latency-budget.mjs --write-baseline ./soak.json
if (writeBaseline) {
  const inputArgIndex = process.argv.indexOf("--write-baseline");
  const inputPath = process.argv[inputArgIndex + 1];
  if (!inputPath) {
    console.error(
      "--write-baseline requires a path to the raw soak metrics JSON.",
    );
    process.exit(1);
  }
  let metrics;
  try {
    metrics = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  } catch (error) {
    console.error(`Cannot read soak metrics at ${inputPath}:`, error.message);
    process.exit(1);
  }
  fs.writeFileSync(
    baselinePath,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        source: inputPath,
        endpoints: metrics.endpoints ?? metrics,
      },
      null,
      2,
    )}\n`,
  );
  console.log(`API latency baseline written to ${baselinePath}.`);
  process.exit(0);
}

if (!fs.existsSync(baselinePath)) {
  console.log(
    "API latency budget check skipped: artifacts/api-latency-baseline.json is not present. " +
      "Generate it from the staging soak with `pnpm perf:api-latency:baseline -- <soak-metrics.json>` " +
      "and commit the file.",
  );
  process.exit(0);
}

let baseline;
try {
  baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
} catch (error) {
  console.error(`API latency baseline at ${baselinePath} is not valid JSON.`);
  console.error(error.message);
  process.exit(enforce ? 1 : 0);
}

const endpoints = baseline.endpoints;
if (!endpoints || typeof endpoints !== "object") {
  console.error(
    `API latency baseline at ${baselinePath} is missing the "endpoints" object.`,
  );
  process.exit(enforce ? 1 : 0);
}

const failures = [];
const warnings = [];

for (const [className, slo] of Object.entries(API_LATENCY_SLOS)) {
  const measured = endpoints[className];
  if (!measured || typeof measured.p95 !== "number") {
    warnings.push(
      `${className}: no p95 reading in baseline (SLO p95 ≤ ${slo.p95}ms)`,
    );
    continue;
  }
  if (measured.p95 > slo.p95) {
    const over = measured.p95 - slo.p95;
    if (measured.p95 > slo.p95 * LATENCY_EXCEEDANCE_TOLERANCE) {
      failures.push(
        `${className}: p95=${measured.p95}ms exceeds budget ${slo.p95}ms by ${over.toFixed(0)}ms (>${Math.round((LATENCY_EXCEEDANCE_TOLERANCE - 1) * 100)}% tolerance)`,
      );
    } else {
      warnings.push(
        `${className}: p95=${measured.p95}ms over budget ${slo.p95}ms but within tolerance`,
      );
    }
  }
  if (slo.p99 !== undefined && typeof measured.p99 === "number") {
    if (measured.p99 > slo.p99) {
      failures.push(
        `${className}: p99=${measured.p99}ms exceeds budget ${slo.p99}ms`,
      );
    }
  }
}

for (const warning of warnings) {
  console.warn(`[api-latency] WARN: ${warning}`);
}

if (failures.length === 0) {
  console.log(
    `API latency budget check passed (baseline ${baselinePath.split("/").pop()}, generated ${baseline.generatedAt ?? "unknown"}).`,
  );
  process.exit(0);
}

console.error(
  `API latency budget check FAILED — ${failures.length} violation(s):`,
);
for (const failure of failures) {
  console.error(`  - ${failure}`);
}
console.error(
  "Re-measure from the staging soak and re-commit the baseline, or raise the budget in api-latency-slos.mjs / SLOS.md only as an intentional decision.",
);
process.exit(enforce ? 1 : 0);
