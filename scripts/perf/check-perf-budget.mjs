import path from "node:path";
import {
  collectAppRouteBundleSizes,
  formatBytes,
  readJsonIfExists,
} from "../lib/perf-metrics.mjs";

const MAX_ROUTE_SIZE_DELTA_PERCENT = Number(
  process.env["PERF_MAX_ROUTE_SIZE_DELTA_PERCENT"] ?? 15,
);
const MODE = (process.env["PERF_BUDGET_MODE"] ?? "warn").toLowerCase();
const SHOULD_FAIL = MODE === "fail";

function toPercent(delta, base) {
  if (base <= 0) {
    return 0;
  }
  return (delta / base) * 100;
}

function emitLine(message) {
  process.stdout.write(`${message}\n`);
}

function emitError(message) {
  process.stderr.write(`${message}\n`);
}

async function main() {
  const repoRoot = process.cwd();
  const appDir = path.join(repoRoot, "apps/app");
  const baselinePath = path.join(repoRoot, "artifacts/perf-baseline.json");

  const baseline = await readJsonIfExists(baselinePath);
  if (!baseline?.appBundleMetrics?.routeSizes) {
    emitLine(
      `No baseline found at ${baselinePath}; skipping perf budget evaluation.`,
    );
    process.exit(0);
  }

  const current = await collectAppRouteBundleSizes(appDir);
  const baselineSizes = baseline.appBundleMetrics.routeSizes;
  const routeFailures = [];

  for (const [route, currentBytes] of Object.entries(current.routeSizes)) {
    const baselineBytes = baselineSizes[route];
    if (
      typeof currentBytes !== "number" ||
      typeof baselineBytes !== "number" ||
      baselineBytes <= 0
    ) {
      continue;
    }

    const delta = currentBytes - baselineBytes;
    const deltaPercent = toPercent(delta, baselineBytes);
    const exceedsBudget = deltaPercent > MAX_ROUTE_SIZE_DELTA_PERCENT;

    const line = `${route}: baseline=${formatBytes(baselineBytes)}, current=${formatBytes(currentBytes)}, delta=${deltaPercent.toFixed(2)}%`;

    if (exceedsBudget) {
      routeFailures.push(line);
    } else {
      emitLine(`[perf-ok] ${line}`);
    }
  }

  if (routeFailures.length === 0) {
    emitLine("Performance bundle budget check passed.");
    return;
  }

  for (const failure of routeFailures) {
    emitError(`[perf-regression] ${failure}`);
  }

  if (SHOULD_FAIL) {
    emitError(
      `Performance budget failed: ${routeFailures.length} route(s) exceed +${MAX_ROUTE_SIZE_DELTA_PERCENT}% growth.`,
    );
    process.exit(1);
  }

  emitLine(
    `Performance budget warning: ${routeFailures.length} route(s) exceed +${MAX_ROUTE_SIZE_DELTA_PERCENT}% growth.`,
  );
}

main().catch((error) => {
  emitError(error instanceof Error ? error.message : "Unexpected error");
  process.exit(1);
});
