/**
 * Canonical API latency SLOs (single source of truth).
 *
 * The published contract lives in `docs/operations/SLOS.md`; this module is
 * the machine-readable copy consumed by `check-api-latency-budget.mjs`. Keep
 * the two in lockstep — changing one without the other is a review blocker
 * (AGENTS.md §3.1).
 *
 * Values are p95 in milliseconds per endpoint class (p99 where defined).
 * Measured against the staging soak; real-world verification comes from the
 * synthetic probes (`scripts/monitoring/synthetic/`) and API RUM.
 */
export const API_LATENCY_SLOS = {
  /** login, refresh, logout */
  auth: { p95: 300 },
  /** patients, appointments, invoices create/update/read */
  crud: { p95: 200, p99: 500 },
  /** paginated search/list */
  search: { p95: 400 },
  /** reports / PDF generation (async with progress UX) */
  reports: { p95: 1500 },
  /** webhook ingress: signature verify + dedupe only; processing is async */
  webhooks: { p95: 100 },
};

/**
 * The gate fails when a measured p95 exceeds its budget by more than this
 * factor (25%). Readings between budget and budget * tolerance are reported
 * as warnings, not failures — a single slow tail sample should not page.
 */
export const LATENCY_EXCEEDANCE_TOLERANCE = 1.25;
