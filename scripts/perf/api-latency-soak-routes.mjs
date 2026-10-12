/**
 * Canonical routes for the API latency staging soak (backlog R02).
 *
 * The soak is the *only* source of `artifacts/api-latency-baseline.json`, which
 * `check-api-latency-budget.mjs --require-baseline` gates releases on. That
 * makes this manifest part of the evidence chain, not a convenience list:
 *
 * - Every entry is a real customer route. A probe list made of
 *   `/health/live` would measure the probe's own ~1ms and collapse the
 *   distribution, which is exactly the failure `docs/operations/SLOS.md`
 *   forbids ("a fast health-check response cannot satisfy a booking or
 *   invoice endpoint budget").
 * - `class` must match a key of `API_LATENCY_SLOS`; the capture tool refuses a
 *   manifest that leaves a class unmeasured, because partial evidence cannot
 *   satisfy the required gate.
 * - `expectedStatuses` lists the statuses that count as a *measured sample*.
 *   A route that answers something else (401 from an expired token, 404 from a
 *   renamed route) is recorded as unexpected and fails the run instead of
 *   silently producing a fast number.
 * - `minIntervalMs` keeps the probe inside the endpoint's own throttle. The
 *   global limiter allows 100 requests/minute per IP in production
 *   (`apps/api/src/app.module.ts`), so login (5/min) and register/check-email
 *   (10/min) routes cannot be sampled at the same rate as a patient read.
 *
 * Route drift is caught in CI: `check:unserved-endpoint` scans this manifest
 * against every `@Controller` route in `apps/api`, so a renamed controller
 * fails the build rather than producing a 404-shaped baseline.
 *
 * Placeholders resolved by `capture-api-latency-soak.mjs`:
 *   `{today}` — the current UTC date as `YYYY-MM-DD`.
 */

/** @typedef {"auth" | "crud" | "search" | "reports" | "webhooks"} SoakClass */

export const SOAK_ROUTES = [
  {
    class: "auth",
    method: "GET",
    path: "/api/v1/auth/validate",
    auth: true,
    expectedStatuses: [200],
    minIntervalMs: 1_000,
    rationale:
      "Session validation: JWT verification plus the session lookup that every " +
      "authenticated page load performs. Login is deliberately not probed: it " +
      "is capped at 5/min, requires a Turnstile token and writes a session, so " +
      "sampling it would measure the anti-bot provider rather than the API.",
  },
  {
    class: "crud",
    method: "GET",
    path: "/api/v1/patients?limit=1",
    auth: true,
    expectedStatuses: [200],
    minIntervalMs: 750,
    rationale:
      "Patient list read: the tenant-scoped query, the policy check and the " +
      "PHI read-audit write that a clinician list view costs. `limit=1` keeps " +
      "the response small without shrinking the query path.",
  },
  {
    class: "crud",
    method: "GET",
    path: "/api/v1/appointments?date={today}&limit=20&page=1",
    auth: true,
    expectedStatuses: [200],
    minIntervalMs: 750,
    rationale:
      "Appointment list read for today — the schedule page's primary query. " +
      "A date-bounded window is representative and avoids an unbounded scan.",
  },
  {
    class: "search",
    method: "GET",
    path: "/api/v1/patients?search=soak&page=1&limit=20",
    auth: true,
    expectedStatuses: [200],
    minIntervalMs: 1_500,
    rationale:
      "Paginated search, the widest read path in the app. The probe term is " +
      "intentionally one that matches nothing so the soak records no patient " +
      "data; the query shape is identical, but a clinic whose dataset makes " +
      "this term match would measure a heavier result set.",
  },
  {
    class: "reports",
    method: "GET",
    path: "/api/v1/analytics/revenue?period=daily&days=30",
    auth: true,
    expectedStatuses: [200],
    minIntervalMs: 2_000,
    rationale:
      "Revenue trend aggregation — the query behind the dashboard's heaviest " +
      "read, and the representative route for the report/PDF class.",
  },
  {
    class: "webhooks",
    method: "POST",
    path: "/api/v1/webhooks/payments/razorpay",
    auth: false,
    expectedStatuses: [401],
    minIntervalMs: 1_000,
    body: {
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "soak_probe",
            amount: 1,
            currency: "INR",
            status: "captured",
            order_id: "soak_probe",
          },
        },
      },
    },
    headers: { "x-razorpay-signature": "soak_invalid_signature" },
    rationale:
      "Webhook ingress with a schema-valid payload and an invalid signature. " +
      "This measures the ingress path the SLO describes — HMAC verification " +
      "and dedupe — without creating a payment, enqueueing work or touching " +
      "PHI. The recorded sample is the 401 reject path, which is honest but " +
      "slightly cheaper than an accepted delivery; the artifact records the " +
      "status so the limitation travels with the number.",
  },
];