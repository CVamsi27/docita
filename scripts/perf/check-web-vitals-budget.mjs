#!/usr/bin/env node

/**
 * Hermetic Web Vitals budget ratchet for `verify:standard`.
 *
 * The live Chromium measurement (`pnpm perf:web-vitals:enforce`, run against a
 * deployed/staging app or locally with `pnpm dev`) writes its median per-route
 * readings to `artifacts/web-vitals-baseline.json` via `--write-baseline`. This
 * gate only READS that committed file and validates it against the
 * `ROUTE_WEB_VITALS` budgets — it never launches a browser or needs a server,
 * so it stays hermetic inside the merge gate (same pattern as
 * `check-a11y-budget`).
 *
 * The baseline is a drift monitor, not live telemetry: real-user enforcement
 * happens via the RUM pipeline (`POST /api/v1/monitoring/web-vitals`) and the
 * staging soak. This gate exists to stop a committed baseline from silently
 * regressing past the published budgets.
 *
 * When `artifacts/web-vitals-baseline.json` is absent (e.g. fresh checkout
 * before the first measurement), the gate skips with exit 0 — a live
 * measurement cannot be fabricated, so absence is reported, not faked.
 *
 * Flags:
 *   --enforce — exit 1 when a measured route exceeds its budget.
 *   --baseline <path> — override the baseline file (default artifacts/…).
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { ROUTE_WEB_VITALS } from "./route-budgets.config.mjs";

const repoRoot = process.cwd();
const baselineArgIndex = process.argv.indexOf("--baseline");
const baselinePath =
  baselineArgIndex !== -1 && process.argv[baselineArgIndex + 1]
    ? process.argv[baselineArgIndex + 1]
    : path.join(repoRoot, "artifacts", "web-vitals-baseline.json");
const enforce = process.argv.includes("--enforce");

if (!fs.existsSync(baselinePath)) {
  console.log(
    "Web Vitals budget check skipped: artifacts/web-vitals-baseline.json is not present. " +
      "Generate it from a live measurement with `pnpm perf:web-vitals:baseline` " +
      "(requires a running app + Chrome) and commit the file.",
  );
  process.exit(0);
}

let baseline;
try {
  baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
} catch (error) {
  console.error(`Web Vitals baseline at ${baselinePath} is not valid JSON.`);
  console.error(error instanceof Error ? error.message : error);
  process.exit(enforce ? 1 : 0);
}

const routes = baseline.routes;
if (!routes || typeof routes !== "object") {
  console.error(
    `Web Vitals baseline at ${baselinePath} is missing the "routes" object.`,
  );
  process.exit(enforce ? 1 : 0);
}

const violations = [];

for (const [route, measured] of Object.entries(routes)) {
  const budget = ROUTE_WEB_VITALS[route];
  if (!budget) {
    violations.push(
      `${route}: measured but has no budget in route-budgets.config.mjs`,
    );
    continue;
  }
  for (const metric of ["LCP", "INP", "CLS", "TTFB"]) {
    const target = budget[metric];
    const actual = measured?.[metric];
    if (typeof target !== "number") continue;
    if (typeof actual !== "number") {
      violations.push(`${route}: missing ${metric} reading in baseline`);
      continue;
    }
    // INP is 0 in headless Chromium (no interactionId entries) — a 0 reading
    // means "unavailable", not "instant", so it never fails the ratchet.
    if (metric === "INP" && actual === 0) continue;
    if (actual > target) {
      violations.push(
        `${route}: ${metric}=${actual.toFixed(actual >= 1 ? 0 : 3)} exceeds budget ${target}`,
      );
    }
  }
}

if (violations.length === 0) {
  console.log(
    `Web Vitals budget check passed (baseline ${baselinePath.split("/").pop()}, generated ${baseline.generatedAt ?? "unknown"}).`,
  );
  process.exit(0);
}

console.error(
  `Web Vitals budget check FAILED — ${violations.length} violation(s) against the committed baseline:`,
);
for (const violation of violations) {
  console.error(`  - ${violation}`);
}
console.error(
  "Re-measure with `pnpm perf:web-vitals:baseline` and re-commit the baseline, " +
    "or raise the target in route-budgets.config.mjs only as an intentional decision.",
);
process.exit(enforce ? 1 : 0);
