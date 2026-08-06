#!/usr/bin/env node
/**
 * Synthetic Web Vitals enforcement (LCP / INP / CLS).
 *
 * Measures Core Web Vitals in a real Chromium against the app dev server
 * and compares against the absolute per-route targets in
 * `scripts/perf/route-budgets.config.mjs` (ROUTE_WEB_VITALS).
 *
 * Scope: public, DB-free routes only (`/login`, `/book/:referralCode`) so the
 * check runs without Postgres fixtures. Authenticated routes need seeded
 * accounts and belong in the staging/CI RUM flow, not this gate.
 *
 * INP caveat: headless Chromium does not populate the Event Timing API
 * (`interactionId` entries) even for trusted Playwright clicks, so the
 * synthetic INP reading is always 0 and the INP budget is effectively
 * unenforced here. INP is enforced from real-user RUM via
 * `POST /api/v1/monitoring/web-vitals` (see the app reporters) and the API
 * monitoring GET surface.
 *
 * Modes (env `PERF_ROUTE_BUDGET_MODE`):
 *   - warn (default) — print findings, exit 0.
 *   - fail — exit 1 when a measured metric exceeds its target.
 *
 * Env:
 *   APP_URL                 — base URL of the running app (default http://localhost:3000)
 *   PERF_WEB_VITALS_MODE    — warn | fail (default warn)
 *   PERF_WEB_VITALS_SAMPLES — samples per route (default 3; median wins)
 *   PERF_WEB_VITALS_CHANNEL — "chrome" uses the system Google Chrome install
 *                             (default); "chromium" uses the Playwright-bundled
 *                             browser. CI images usually have the bundled
 *                             browser, so set CHANNEL=chromium there.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { chromium } from "@playwright/test";
import { ROUTE_WEB_VITALS } from "./route-budgets.config.mjs";

const APP_URL = process.env["APP_URL"] || "http://localhost:3000";
const BROWSER_CHANNEL = process.env["PERF_WEB_VITALS_CHANNEL"] || "chrome";
const MODE = (process.env["PERF_WEB_VITALS_MODE"] ?? "warn").toLowerCase();
const SHOULD_FAIL = MODE === "fail";
const SAMPLES = Number(process.env["PERF_WEB_VITALS_SAMPLES"] ?? 3);

// `--write-baseline` persists the measured medians so the hermetic
// `check:web-vitals:enforce` ratchet (see check-web-vitals-budget.mjs) can
// validate them without a live server. Default path is the committed
// artifacts file consumed by that gate.
const WRITE_BASELINE = process.argv.includes("--write-baseline");
const baselineArgIndex = process.argv.indexOf("--baseline");
const BASELINE_ARG =
  baselineArgIndex !== -1 && process.argv[baselineArgIndex + 1]
    ? process.argv[baselineArgIndex + 1]
    : path.join(process.cwd(), "artifacts", "web-vitals-baseline.json");
const BASELINE_PATH = WRITE_BASELINE ? BASELINE_ARG : null;

/** Public routes measurable without DB fixtures (must not 404 without auth). */
const MEASURED_ROUTES = {
  "/login": "/login",
  "/book/:referralCode": "/book/demo",
};

async function measurePage(page, url) {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  // Trigger a real interaction so INP has a sample: script-dispatched events
  // are NOT counted by the event-timing API (no interactionId), so use a
  // Playwright-driven mouse click on an interactive element. Fall back to a
  // click on the page corner when no button/link/input exists.
  try {
    const interactive = page.locator(
      "button, a[href], input, select, textarea, [role=button]",
    );
    if ((await interactive.count()) > 0) {
      await interactive.first().click({ force: true });
    } else {
      await page.mouse.click(5, 5);
    }
  } catch {
    await page.mouse.click(5, 5);
  }
  await page.waitForTimeout(250);

  const result = await page.evaluate(() => {
    const entries = performance.getEntriesByType("event");
    let inp = 0;
    for (const entry of entries) {
      const e = entry;
      if (typeof e.interactionId === "number" && e.interactionId > 0) {
        const delay = e.processingStart - e.startTime;
        if (delay > inp) inp = delay;
      }
    }

    const nav = performance.getEntriesByType("navigation")[0];
    let lcp = 0;
    const lcpEntries = performance.getEntriesByType("largest-contentful-paint");
    if (lcpEntries.length > 0) {
      lcp = lcpEntries[lcpEntries.length - 1].startTime;
    }

    let cls = 0;
    for (const entry of performance.getEntriesByType("layout-shift")) {
      if (!entry.hadRecentInput) cls += entry.value;
    }

    const ttfb = nav ? nav.responseStart : 0;

    return {
      LCP: lcp || (nav ? nav.loadEventEnd : 0),
      INP: inp,
      CLS: cls,
      TTFB: ttfb,
    };
  });

  return result;
}

function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

async function preflightServer() {
  try {
    const response = await fetch(`${APP_URL}/login`, { method: "GET" });
    if (!response.ok) return false;
  } catch {
    return false;
  }
  return true;
}

async function main() {
  if (!(await preflightServer())) {
    process.stderr.write(
      `[web-vitals] app not reachable at ${APP_URL}. Start it with \`pnpm --filter @docita/app run dev\` (or set APP_URL).\n`,
    );
    process.exit(2);
  }

  const browser = await chromium.launch({
    channel: BROWSER_CHANNEL === "chromium" ? undefined : BROWSER_CHANNEL,
  });
  const failures = [];
  const summary = [];
  const results = {};

  try {
    for (const [route, url] of Object.entries(MEASURED_ROUTES)) {
      const budget = ROUTE_WEB_VITALS[route];
      if (!budget) {
        summary.push(`${route}: no budget configured; skipping.`);
        continue;
      }

      // Warm-up pass: first navigation pays the dev-server transform + asset
      // fetch cost. Enforcement should reflect steady-state performance, so
      // discard this run before collecting samples.
      {
        const warmContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const warmPage = await warmContext.newPage();
        try {
          await warmPage.goto(`${APP_URL}${url}`, { waitUntil: "networkidle" });
          await warmPage.waitForTimeout(500);
        } finally {
          await warmContext.close();
        }
      }

      const samples = [];
      for (let i = 0; i < SAMPLES; i += 1) {
        const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const page = await context.newPage();
        try {
          samples.push(await measurePage(page, `${APP_URL}${url}`));
        } finally {
          await context.close();
        }
      }

      const measured = {
        LCP: median(samples.map((s) => s.LCP)),
        INP: median(samples.map((s) => s.INP)),
        CLS: median(samples.map((s) => s.CLS)),
        TTFB: median(samples.map((s) => s.TTFB)),
      };

      results[route] = measured;

      const over = [];
      for (const metric of ["LCP", "INP", "CLS", "TTFB"]) {
        const target = budget[metric];
        if (typeof target !== "number") continue;
        const actual = measured[metric];
        // INP is 0 in headless Chromium (no interactionId entries); never
        // flag a 0 reading — it means "unavailable", not "instant".
        if (metric === "INP" && actual === 0) continue;
        if (actual > target) {
          over.push(`${metric}=${actual.toFixed(actual >= 1 ? 0 : 3)}ms(over ${target})`);
        }
      }

      if (over.length > 0) {
        failures.push({ route, detail: over.join(", ") });
      }
      summary.push(
        `${route}: LCP=${measured.LCP.toFixed(0)}ms INP=${measured.INP.toFixed(0)}ms CLS=${measured.CLS.toFixed(3)} TTFB=${measured.TTFB.toFixed(0)}ms (targets LCP=${budget.LCP} INP=${budget.INP} CLS=${budget.CLS} TTFB=${budget.TTFB})`,
      );
    }
  } finally {
    await browser.close();
  }

  for (const line of summary) {
    process.stdout.write(`[web-vitals] ${line}\n`);
  }

  if (WRITE_BASELINE) {
    fs.writeFileSync(
      BASELINE_PATH,
      `${JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          channel: BROWSER_CHANNEL,
          samplesPerRoute: SAMPLES,
          routes: results,
        },
        null,
        2,
      )}\n`,
    );
    process.stdout.write(
      `[web-vitals] baseline written to ${BASELINE_PATH}\n`,
    );
  }

  if (failures.length === 0) {
    process.stdout.write(
      "[web-vitals] OK — all measured routes within Web Vitals budgets.\n",
    );
    return;
  }

  const heading = SHOULD_FAIL ? "FAIL" : "WARN";
  for (const { route, detail } of failures) {
    process.stderr.write(`[web-vitals] ${heading}: ${route} ${detail}\n`);
  }

  if (SHOULD_FAIL) {
    process.stderr.write(
      "[web-vitals] Web Vitals budget exceeded; raise the target in route-budgets.config.mjs intentionally, or fix the regression.\n",
    );
    process.exit(1);
  }

  process.stdout.write(
    `[web-vitals] Warning: ${failures.length} route(s) exceeded Web Vitals targets (warn mode; set PERF_ROUTE_BUDGET_MODE=fail to gate CI).\n`,
  );
}

main().catch((error) => {
  process.stderr.write(
    `[web-vitals] failed: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exit(2);
});
