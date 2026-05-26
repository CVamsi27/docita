#!/usr/bin/env node
// Enforces per-route absolute budgets defined in `route-budgets.config.mjs`.
// Complements `check-perf-budget.mjs` (which enforces % delta vs baseline)
// with absolute caps for high-traffic critical paths.

import path from "node:path";
import { collectAppRouteBundleSizes, formatBytes } from "../lib/perf-metrics.mjs";
import {
  ROUTE_BUNDLE_KB,
  ROUTE_WEB_VITALS,
  BUDGET_MODE,
} from "./route-budgets.config.mjs";

const SHOULD_FAIL = BUDGET_MODE === "fail";

async function main() {
  const repoRoot = process.cwd();
  const appDir = path.join(repoRoot, "apps/app");
  const current = await collectAppRouteBundleSizes(appDir);
  if (!current.routeSizes) {
    console.warn(
      "[route-budgets] no app bundle metrics found; run `pnpm build` first.",
    );
    process.exit(SHOULD_FAIL ? 1 : 0);
  }

  const findings = [];
  for (const [route, budgetKb] of Object.entries(ROUTE_BUNDLE_KB)) {
    const bytes = current.routeSizes[route];
    if (typeof bytes !== "number") {
      console.log(`[route-budgets] no measurement for ${route}; skipping.`);
      continue;
    }
    const budgetBytes = budgetKb * 1024;
    if (bytes > budgetBytes) {
      findings.push({
        route,
        actual: bytes,
        budget: budgetBytes,
      });
    }
  }

  if (findings.length === 0) {
    console.log(
      `[route-budgets] OK — ${Object.keys(ROUTE_BUNDLE_KB).length} routes within absolute budgets.`,
    );
    console.log(
      `[route-budgets] Web Vitals targets defined for ${
        Object.keys(ROUTE_WEB_VITALS).length
      } route(s); LCP/INP/CLS enforcement TBD (see route-budgets.config.mjs).`,
    );
    return;
  }

  const heading = SHOULD_FAIL ? "FAIL" : "WARN";
  console.warn(`[route-budgets] ${heading}: ${findings.length} route(s) over budget`);
  for (const { route, actual, budget } of findings) {
    console.warn(
      `  ${route}  actual=${formatBytes(actual)}  budget=${formatBytes(budget)}`,
    );
  }
  console.warn(
    "Edit scripts/perf/route-budgets.config.mjs to raise the budget intentionally, or split the route to drop the first-load bundle.",
  );
  process.exit(SHOULD_FAIL ? 1 : 0);
}

main().catch((err) => {
  console.error("[route-budgets] failed:", err);
  process.exit(2);
});
