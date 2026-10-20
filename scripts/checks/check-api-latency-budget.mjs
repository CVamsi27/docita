#!/usr/bin/env node

/**
 * API latency budget ratchet (P5.9; backlog R02).
 *
 * Compares the committed staging-soak latency baseline
 * (`artifacts/api-latency-baseline.json`) against the published SLO budgets
 * (`api-latency-slos.mjs` / `docs/operations/SLOS.md`).
 *
 * Modes:
 * - default: reports findings, never fails on absence (developer check).
 * - `--enforce`: fails when a measured p95/p99 exceeds its budget beyond the
 *   documented tolerance; an absent baseline still skips with exit 0.
 * - `--require-baseline`: the gate for a release that declares an API
 *   performance budget. Fails when the baseline is absent, unparsable,
 *   missing `generatedAt` provenance, older than `--max-age-days` (default
 *   30), or missing a p95 reading for any SLO class. Implies `--enforce`.
 *
 * The gate is hermetic: it never calls the API. The baseline is written by
 * whoever runs the staging soak and converted with
 * `--write-baseline <soak-metrics.json>` (see `pnpm perf:api-latency:baseline`),
 * then committed so the merge/release gate can ratchet against it.
 *
 * Baseline shape:
 * {
 *   "generatedAt": "2026-08-06T00:00:00.000Z",
 *   "source": "soak-metrics.json",
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
import { captureTimingIssues } from "../perf/api-latency-capture-integrity.mjs";

import {
  API_LATENCY_SLOS,
  LATENCY_EXCEEDANCE_TOLERANCE,
} from "./api-latency-slos.mjs";

const DEFAULT_REQUIRED_MAX_AGE_DAYS = 30;
/**
 * Minimum measured samples per endpoint class for a soak to be convertible.
 * Percentiles over a handful of requests are not evidence.
 */
const minSamplesForConversion = 20;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const repoRoot = process.cwd();
/**
 * Flags that consume the following token as their value.
 *
 * `--write-baseline` is deliberately absent: the token after it *is* the soak
 * path this function exists to find, so it must not be skipped.
 */
const VALUE_FLAGS = new Set(["--baseline", "--max-age-days"]);

/**
 * Arguments that are not a flag or a flag's value.
 *
 * @param {string[]} args
 * @returns {string[]}
 */
function readPositionalArgv(args) {
  const positionals = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg.startsWith("--")) {
      positionals.push(arg);
      continue;
    }
    if (VALUE_FLAGS.has(arg)) i += 1;
  }
  return positionals;
}

/**
 * `pnpm run x -- file` forwards a literal `--` to the script, which the
 * documented workflow uses for the soak path. Stripping the separator keeps
 * `pnpm perf:api-latency:baseline -- ./soak-metrics.json` working; without it
 * the path resolved to `--` and the conversion failed with ENOENT.
 */
const argv = process.argv.slice(2).filter((arg) => arg !== "--");

const baselineArgIndex = argv.indexOf("--baseline");
const defaultBaseline = path.join(
  repoRoot,
  "artifacts",
  "api-latency-baseline.json",
);
const baselinePath =
  baselineArgIndex !== -1 && argv[baselineArgIndex + 1]
    ? argv[baselineArgIndex + 1]
    : defaultBaseline;
const requireBaseline = argv.includes("--require-baseline");
// A release that requires baseline evidence also enforces the budgets it
// carries; `--require-baseline` alone is enough at the call site.
const enforce = argv.includes("--enforce") || requireBaseline;
const writeBaseline = argv.includes("--write-baseline");

const maxAgeArgIndex = argv.indexOf("--max-age-days");
let maxAgeDays = DEFAULT_REQUIRED_MAX_AGE_DAYS;
if (maxAgeArgIndex !== -1) {
  const rawMaxAge = argv[maxAgeArgIndex + 1];
  const parsedMaxAge = Number(rawMaxAge);
  if (
    rawMaxAge === undefined ||
    rawMaxAge.startsWith("--") ||
    !Number.isInteger(parsedMaxAge) ||
    parsedMaxAge <= 0
  ) {
    console.error(
      `--max-age-days expects a positive integer, received "${rawMaxAge ?? ""}".`,
    );
    process.exit(1);
  }
  maxAgeDays = parsedMaxAge;
}

// Convert a raw soak metrics file ({ "<class>": { p95, p99 } }) into the
// committed baseline artifact. Usage:
//   node scripts/checks/check-api-latency-budget.mjs --write-baseline ./soak.json
if (writeBaseline) {
  const inputArgIndex = argv.indexOf("--write-baseline");
  // The token right after `--write-baseline` is the soak path in the plain
  // `node script --write-baseline ./soak.json` form, but the documented pnpm
  // form (`pnpm perf:api-latency:baseline -- --baseline <out> <soak>`) puts
  // other flags in between. Positional parsing that knows which flags take a
  // value handles both without guessing.
  const inputPath = readPositionalArgv(argv)[0] ?? argv[inputArgIndex + 1];
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
  // A capture tool (`pnpm perf:api-latency:soak`) marks incomplete evidence
  // `complete: false` and exits 1. Refusing to convert it keeps a truncated or
  // mis-targeted run from becoming a committed baseline that later "passes"
  // the release gate.
  if (metrics.complete !== true) {
    console.error(
      `Refusing to write a baseline from an incomplete soak (${inputPath}).`,
    );
    for (const reason of metrics.incompleteReasons ?? ["no reason recorded"]) {
      console.error(`  - ${reason}`);
    }
    console.error(
      "Re-run `pnpm perf:api-latency:soak` until it reports COMPLETE, then convert it.",
    );
    process.exit(1);
  }
  const timingIssues = captureTimingIssues(metrics.target);
  if (timingIssues.length > 0) {
    console.error(
      `Refusing to write a baseline with invalid capture timing: ${timingIssues.join("; ")}.`,
    );
    process.exit(1);
  }
  const capturedEndpoints = metrics.endpoints ?? metrics;
  const thinClasses = Object.keys(API_LATENCY_SLOS).filter((className) => {
    const measured = capturedEndpoints[className];
    if (!measured || typeof measured !== "object") return true;
    if (typeof measured.samples !== "number") return true;
    return measured.samples < minSamplesForConversion;
  });
  if (thinClasses.length > 0) {
    console.error(
      `Refusing to write a baseline from a soak with thin evidence: ` +
        `${thinClasses.join(", ")} (minimum ${minSamplesForConversion} sample(s) per class).`,
    );
    process.exit(1);
  }
  fs.writeFileSync(
    baselinePath,
    `${JSON.stringify(
      {
        generatedAt: metrics.target.finishedAt,
        source: inputPath,
        capture: metrics.target,
        endpoints: capturedEndpoints,
      },
      null,
      2,
    )}\n`,
  );
  console.log(`API latency baseline written to ${baselinePath}.`);
  process.exit(0);
}

if (!fs.existsSync(baselinePath)) {
  if (requireBaseline) {
    console.error(
      `API latency budget check FAILED: no baseline at ${baselinePath}. ` +
        "A release declaring an API performance budget must commit a measured " +
        "staging-soak baseline. Generate it with " +
        "`pnpm perf:api-latency:baseline -- <soak-metrics.json>` and commit the file.",
    );
    process.exit(1);
  }
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

if (requireBaseline) {
  const generatedAtMs =
    typeof baseline.generatedAt === "string"
      ? Date.parse(baseline.generatedAt)
      : Number.NaN;
  if (Number.isNaN(generatedAtMs)) {
    console.error(
      `API latency budget check FAILED: ${baselinePath} has no parseable ` +
        '"generatedAt" provenance, so its freshness cannot be established.',
    );
    process.exit(1);
  }
  const ageDays = (Date.now() - generatedAtMs) / MS_PER_DAY;
  if (ageDays > maxAgeDays) {
    console.error(
      `API latency budget check FAILED: baseline is stale (generated ${ageDays.toFixed(1)} ` +
        `days ago, maximum ${maxAgeDays}). Re-run the staging soak and regenerate the baseline.`,
    );
    process.exit(1);
  }
}

const failures = [];
const warnings = [];

for (const [className, slo] of Object.entries(API_LATENCY_SLOS)) {
  const measured = endpoints[className];
  if (!measured || typeof measured.p95 !== "number") {
    const message = `${className}: no p95 reading in baseline (SLO p95 ≤ ${slo.p95}ms)`;
    // An absent reading is a warning for the optional developer check, but a
    // required release gate must not pass on partial evidence.
    if (requireBaseline) {
      failures.push(message);
    } else {
      warnings.push(message);
    }
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
    `API latency budget check passed (baseline ${baselinePath.split("/").pop()}, generated ${baseline.generatedAt ?? "unknown"}${requireBaseline ? `, max age ${maxAgeDays}d` : ""}).`,
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
