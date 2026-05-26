/**
 * Per-route bundle and Web Vitals budgets.
 *
 * SYSTEM_DESIGN_AND_PATTERNS.md §28.2 item 15, §28.3 item 25.
 *
 * Budgets are specified as **absolute targets** for the high-traffic
 * critical-path routes. Lesser routes inherit the global delta budget
 * (PERF_MAX_ROUTE_SIZE_DELTA_PERCENT, default 15%) from check-perf-budget.mjs.
 *
 * Update when a route's budget intentionally changes; treat unintended
 * regressions as bugs.
 */

/** First-load bundle target per route, in KB (gzipped, observed). */
export const ROUTE_BUNDLE_KB = {
  "/login": 180,
  "/dashboard": 260,
  "/patients": 280,
  "/patients/[id]": 320,
  "/appointments": 280,
  "/consultation/[id]": 360,
  "/prescriptions/[id]": 300,
  "/invoices/[id]": 300,
  "/book/[referralCode]": 200,
  "/mobile-upload/[id]": 200,
};

/** Web Vitals targets per route bucket. */
export const ROUTE_WEB_VITALS = {
  "/login":            { LCP: 1500, INP: 200, CLS: 0.05 },
  "/dashboard":        { LCP: 1800, INP: 200, CLS: 0.05 },
  "/patients":         { LCP: 2000, INP: 200, CLS: 0.05 },
  "/patients/[id]":    { LCP: 2200, INP: 250, CLS: 0.05 },
  "/consultation/[id]":{ LCP: 2200, INP: 250, CLS: 0.05 },
  "/book/[referralCode]":{ LCP: 1800, INP: 200, CLS: 0.05 },
  "/mobile-upload/[id]":{ LCP: 1800, INP: 200, CLS: 0.05 },
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
