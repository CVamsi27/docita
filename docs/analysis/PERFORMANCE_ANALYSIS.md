# Performance Analysis — Bundles, Budgets, Probes, Hot Paths

Point-in-time: **2026-08-01**. Sources: `scripts/perf/`, `scripts/checks/check-n-plus-1.mjs`, `apps/app-vite/wrangler.toml`, manual `dist` measurements.

## 1. Frontend bundle (app-vite `dist/`, measured 2026-08-02)

| Asset | Raw | Gzip |
|---|---|---|
| esm-… (vendor-lazy chunk) | 447 KB | **147 KB** |
| vendor-… | 232 KB | 74 KB |
| index-… (entry) | 165 KB | 49 KB |
| **Total (171 assets)** | **2.6 MB** | **816 KB** |

98 lazy + 2 eager route imports (98% lazy-loaded). Route-level gzip matters more than the total (see budgets).

## 2. Route budgets (enforced, `scripts/perf/route-budgets.config.mjs`)

| Route | Budget (KB) |
|---|---|
| /login | 180 |
| /dashboard | 260 |
| /patients | 280 |
| /patients/[id] | 320 |
| /appointments | 280 |
| /consultation/[id] | 360 |
| /prescriptions/[id] | 300 |
| /invoices/[id] | 300 |
| /book/[referralCode] | 200 |
| /mobile-upload/[id] | 200 |

**Web Vitals (LCP/INP/CLS): 1500 ms / 200 ms / 0.05.** `pnpm perf:baseline`, `perf:budget:warn`, `perf:budget:enforce`, `perf:route-budgets`, plus `scripts/perf/` audits and `monitor:synthetic` (3×/business day synthetic probes of prod API + app). `check:performance-metrics` participates in `verify:standard`.

## 3. Frontend runtime posture (§12.5)

- React Query: `staleTime`/`gcTime` sized per surface (5 min default window for clinical lists; shorter for daybook/today), query-key factory (`check:query-key-factory`), optimistic updates on check-in/cancel paths.
- Server state only via `packages/data-access` hooks — no inline `fetch` (`check:frontend-fetch`); unauthenticated fetch impossible after tenant middleware (no browser→API fan-out).
- PWA static assets cached via CF worker `_headers`; `/socket.io/*` proxied by the Hono worker (no Next.js middleware/proxy).
- Code-split heavy routes at the route module level; **no lazy-loading of rare panels yet** (e.g. excel/ocr in-flight).

## 3.5 Frontend Complexity Profile — measured 2026-08-02

| Metric | Count |
|---|---|
| React components (TSX) | **802** (features + shared components) |
| Custom hook files | **194** (170+ `use-*` named) |
| Context providers | **12** |
| React Query hook files | **25** |
| Feature directories | **47** |
| Source files (TS + TSX) | **1,404** |
| Total source lines (app-vite) | **121,121** |
| Total source lines (api) | **200,492** |
| Files >200 lines | **96** (2 >400: App.tsx 478, test 544) |
| Avg file size | **~101 lines** |
| Dead code signals | 118 no-import files, 46 unused barrels |

Top complexity features (components + TS + hooks): settings (94+17+6=117), consultation (67+78+25=170), patients (75+37+19=131), appointments (42+61+25=128), subscription (42+33+9=84), public-booking (38+23+15=76), patient-portal (36+36+3=75), dashboard (35+44+3=82).

Context provider count (12) is a potential rerender surface — monitor with React DevTools profiler before adding more.

**API complexity**: 200K lines across 29 domains + 34 shared modules. 10 controllers >200 lines (largest: ai.controller 247). 3 services >400 lines (database-control 474). Top domains by code volume: whatsapp (13 controllers, 49 routes), clinics (9 controllers, 52 routes), patients (8 controllers, 47 routes), doctors (7 controllers, 41 routes).

## 4. Backend hot paths (measured patterns, not profiles)

- Bound query cost: pagination everywhere (`check:pagination-required`), selective `select`/`include` in repositories; **no unbounded `findMany` in request paths**; 200-row read cap on audit queries.
- **N+1 guard**: `check-n-plus-1` enforces join/inclusion discipline; Prisma extension + `PrismaClient` query logging in staging (but no `full` query logging in prod — no PHI in logs).
- Caching: CACHE_BACKEND=memory (API), keyed by tenant + URL with TTL; `check:ad-hoc-service-cache` blocks inline cache implementations; external calls all carry timeouts + retry w/ backoff (`check-external-http-timeouts`), idempotency for idempotency-recorded endpoints.
- Appointment scheduling: wall-time→UTC conversion at boundary (`normalizeAppointmentInstant`), recurring hours as HH:mm + clinic timezone resolved at runtime — avoids per-minute clock math in queries.
- **Async fan-out**: OutboxEvent + `OutboxWorker` (25/10 max retries), idempotent jobs (`check-job-idempotency`), no in-memory queues for outbound providers.

## 5. Runtime economics (perf-relevant)

- API 2 GB / 1 machine, worker 512 MB / 1 machine (Fly); `min_machines_running = 0` + `scale-api-hours` (1→0 off IST business hours) — cold start is the cost of scale-to-zero, bounded by synthetic probes which wake the app.
- DB `db.t4g.micro` — no index/plan guardrail run yet against a production snapshot; `db:check-query-plans` is the gate for hot-path changes.

## 6. Gaps & next actions

1. Re-run `perf:baseline` + `perf:route-budgets` **after** the port completes (current baselines are pre-port).
2. Add lazy-loading for rare panels (excel/ocr/feedback when ported).
3. Profile the two heaviest hot paths once prod traffic > 20 clinics: daybook/dashboard read and the audit/telemetry write path (both touch big append tables).
4. Watch Web Vitals from synthetic probes; INP 200 ms is tight for the consultation surface — re-baseline after settings/consultation PARTIAL features land.
5. Consider caching `IcdCode`/`CptCode`/`LoincCode` lookups (catalog reads are the most-repeated query in prescription flows).
