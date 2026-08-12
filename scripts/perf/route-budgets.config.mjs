/**
 * Per-route bundle and Web Vitals budgets.
 *
 * SYSTEM_DESIGN_AND_PATTERNS.md §28.2 item 15, §28.3 item 25.
 *
 * Budgets are specified as **absolute targets** for the high-traffic
 * critical-path routes. Lesser routes inherit the global delta budget
 * (PERF_MAX_ROUTE_SIZE_DELTA_PERCENT, default 15%) from check-perf-budget.mjs.
 *
 * Since the Vite cutover (2026-08), measurements come from
 * `collectAppRouteBundleSizes` in `scripts/lib/perf-metrics.mjs`, which reads
 * `dist/assets/*.js` and reports the gzipped **upper-bound first-load proxy**
 * per route (the full shared core + the route's own chunks). The absolute caps
 * below are a bloat alarm; route regressions are caught by the per-route delta
 * check (`perf:budget:enforce`) against `logs/performance/baseline.json`.
 * Routes use the React Router paths of `apps/app/src/App.tsx` (`:id`
 * param syntax).
 *
 * Update when a route's budget intentionally changes; treat unintended
 * regressions as bugs.
 */

/**
 * First-load JS proxy target per route, in KB (gzipped).
 *
 * Re-baselined 2026-08-05 (P5.19): the shared core grew ~10% after the
 * web-vitals RUM reporter + I18nProvider mount landed in main.tsx (both are
 * core-chunk imports, so every route's first-load proxy grew). The previous
 * 2026-08-04 budgets (720-760) were set from the pre-RUM core; the new values
 * are the measured post-RUM sizes + ~10% headroom. These absolute caps are a
 * bloat alarm — real route regressions are caught by the per-route delta gate
 * (`perf:budget:enforce` against logs/performance/baseline.json).
 */
export const ROUTE_BUNDLE_KB = {
  "/login": 805,
  "/dashboard": 810,
  "/patients": 820,
  "/patients/:id": 805,
  "/appointments": 840,
  "/analytics": 800,
  "/consultation/:id": 845,
  "/prescriptions/:id": 805,
  "/invoices/:id": 815,
  "/book/:referralCode": 820,
  "/mobile-upload/:id": 810,
};

/** Web Vitals targets per route bucket. */
export const ROUTE_WEB_VITALS = {
  "/login":            { LCP: 1500, INP: 200, CLS: 0.05, TTFB: 800 },
  "/dashboard":        { LCP: 1800, INP: 200, CLS: 0.05, TTFB: 800 },
  "/patients":         { LCP: 2000, INP: 200, CLS: 0.05, TTFB: 800 },
  "/patients/:id":     { LCP: 2200, INP: 250, CLS: 0.05, TTFB: 800 },
  "/consultation/:id": { LCP: 2200, INP: 250, CLS: 0.05, TTFB: 800 },
  "/book/:referralCode": { LCP: 1800, INP: 200, CLS: 0.05, TTFB: 800 },
  "/mobile-upload/:id": { LCP: 1800, INP: 200, CLS: 0.05, TTFB: 800 },
};

/**
 * Budget mode:
 *   - "warn"  — print findings, do not fail CI.
 *   - "fail"  — fail CI when budget exceeded.
 *
 * Set via env `PERF_ROUTE_BUDGET_MODE`. Default `warn` to avoid
 * surprise CI breaks. Promote to `fail` once baseline measurements
 * are clean.
 */
export const BUDGET_MODE = (
  process.env.PERF_ROUTE_BUDGET_MODE ?? "warn"
).toLowerCase();
