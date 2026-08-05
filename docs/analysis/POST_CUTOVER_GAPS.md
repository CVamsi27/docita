# Post-Cutover Gaps & Improvements

Point-in-time: **2026-08-05**. Owner: this doc supersedes the
post-cutover/deferred items that were previously scattered across
[`REPO_GAPS_AND_IMPROVEMENTS.md`](../REPO_GAPS_AND_IMPROVEMENTS.md) rows
37, 39, 40, the [`EXECUTION_PLAN.md`](EXECUTION_PLAN.md) "OPEN" P3.3 step
9, and the open tail of P4.4/P4.5.

> Every item in this doc has a target window and an exit command. Items older
> than the window without progress are auto-promoted to a `P?` row in
> `EXECUTION_PLAN.md`.

---

## 1. jscpd intentional-structure clones (22 pairs / 33 ignore entries)

**Source**: REPO_GAPS row 37; tracked in
[`SUPPRESSION_LEDGER.md`](SUPPRESSION_LEDGER.md) §4. These are the
"intentional-structure" clones that jscpd flags but `.jscpd.json` excludes
because the duplication is by design (sibling dialogs, mirrored views,
sectioned forms). 22 pairs of 11–20 lines each.

| Bucket                                 | Pairs | Fix                                                                              | Target  |
| -------------------------------------- | ----: | -------------------------------------------------------------------------------- | ------- |
| Sibling dialog sections                |     7 | Extract `<TwoColumnDialogSections>` to `@workspace/ui` (sections/header/footer slots) | P5.4a   |
| Mirrored list/table views              |     9 | Extract `<ResponsiveDataTable sections>` primitive (header/row/empty slots)      | P5.4b   |
| Sectioned forms (`*-form-sections-shared.tsx`) | 8 | Extract `<FormSections>` (section/field/error slots)                              | P5.4c   |
| Consultation specialty sections        |     5 | **Keep** — clinical mirror is intentional; rename to `*-specialty-sections.tsx` for clarity | P5.4d   |
| Page-skeleton + loaders                |     3 | **Keep** — already in `components/loaders/page-skeleton.tsx`                     | —       |
| Boilerplate (logger, sentry, errors)   |     8 | Promote logger/sentry/error helpers to `@workspace/utils`                        | P5.4e   |

**Exit**: `pnpm check:duplication` exits 0 with `.jscpd.json` `ignore` count
≤ **25** (from 45). Each primitive extraction drops 5–10 ignore entries and
saves 100–200 lines of duplicated JSX.

---

## 2. JSX-literal-density growth (129 literals, 238 files)

**Source**: REPO_GAPS row 37 (continued); `pnpm check:jsx-literal-density`
baseline regenerated 2026-08-04 to **872 literals / 238 files**. The 129-literal
growth vs the Next-era baseline (743 / 2026-07-20) is un-translated copy in
the ported components.

**Plan**:

1. Audit each literal: is it a known i18n key, a hard-coded brand string, or a
   date/number format?
2. Brand strings (`SUPPORT_EMAIL`, `BRAND_NAME`, app constants) → import from
   `@workspace/types` or `lib/constants`.
3. UI copy → en.json/hi.json + `useTranslation()`. Both locales must grow
   together (`check:i18next-parity` enforces equality).
4. Date/number formats → `Intl.DateTimeFormat` / `Intl.NumberFormat` (no new
   literal).
5. Test fixtures → `*.test.tsx` files (excluded from the gate already).

**Target**: drive 872 → **≤800** literals (P5.7) by replacing the
un-translated copy in the 50 highest-density feature files. Each file is a
single PR; `check:jsx-literal-density --enforce` ratchets on the new baseline.

**Exit**: `pnpm check:jsx-literal-density --enforce` exits 0; the 129-literal
debt is gone; `check:i18n-coverage` still passes.

---

## 3. Web Vitals enforcement (P4.5 OPEN)

**Source**: `EXECUTION_PLAN.md` P4.5; the Next-era collector was rewritten to
scan `dist/assets` and a new `scripts/perf/check-web-vitals.mjs` exists, but
the runtime reporter is not yet wired and the budget is not enforced.

**Current state**:

- `apps/app-vite/src/lib/monitoring/web-vitals.ts` (modified in dirty tree) and
  `apps/internal-vite/src/lib/monitoring/web-vitals.ts` exist.
- `apps/app-vite/src/lib/monitoring/web-vitals-payload.ts` (new, uncommitted)
  defines the report payload shape.
- `scripts/perf/check-web-vitals.mjs` (new, uncommitted) validates the
  payload format.
- No budget value; no `verify:standard` wiring; no Sentry sink.

**Plan (P5.8)**:

1. Land the uncommitted web-vitals files (currently dirty in working tree).
2. Wire the reporter to the same-origin `/api/internal/telemetry/web-vitals`
   endpoint (browser-side telemetry must use the app proxy, not cross-origin
   per `check:browser-telemetry-same-origin`).
3. Set budgets: **LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1, TTFB ≤ 800ms** at the
   75th percentile over a 7-day window.
4. Add `pnpm check:web-vitals:enforce` to `verify:standard` with a baseline
   measured from the first week of production data.

**Exit**: budget defined, reporter live, Sentry sink connected,
`check:web-vitals:enforce` exits 0 in CI.

---

## 4. API latency SLOs (P4.5 OPEN)

**Source**: `EXECUTION_PLAN.md` P4.5. The API has no published SLOs and no
latency budget enforcement.

**Plan (P5.9)**:

1. Define per-endpoint SLOs from the p95/p99 of the staging soak:
   - Auth: **p95 ≤ 300ms** (login, refresh, logout)
   - CRUD (patients, appointments, invoices): **p95 ≤ 200ms**, **p99 ≤ 500ms**
   - Search/list (paginated): **p95 ≤ 400ms**
   - Reports/PDF: **p95 ≤ 1500ms** (acceptable for async, with progress UX)
   - Webhooks: **p95 ≤ 100ms** (signature verify + dedupe only; processing async)
2. Wire `check:api-latency-budget` (new) to compare staging p95 vs budget; the
   gate fails if any endpoint exceeds budget by >25%.
3. Document the SLOs in `docs/operations/SLOS.md`; add alert ownership.

**Exit**: SLOs defined, gate wired, staging soak passes, alerts owned.

---

## 5. CSP checkout smoke (P4.4 OPEN)

**Source**: `EXECUTION_PLAN.md` P4.4. CSP review needs a real Razorpay
checkout smoke to verify the policy doesn't break the iframe + Razorpay
JS SDK load.

**Plan (P5.10)**:

1. Draft CSP for `apps/app-vite/public/_headers` and
   `apps/internal-vite/public/_headers` (script-src, frame-src, connect-src,
   img-src).
2. Add Razorpay (`https://checkout.razorpay.com`) to `frame-src` and
   `script-src`; `https://api.razorpay.com` to `connect-src`.
3. Run a real checkout against the staging API; verify no console CSP
   violation.
4. Add the smoke to `scripts/smoke/checkout-csp-smoke.mjs`; add to
   `verify:standard` once the staging API + Razorpay test account are
   available (currently **BLOCKED** on credentials).

**Exit**: CSP deployed, checkout smoke green, gate wired.

---

## 6. Internal-vite admin/users endpoint gaps (10 OPEN API gaps)

**Source**: REPO_GAPS row 40; the 2026-08-04 internal-vite route-parity sweep
found 10 pages calling non-existent internal endpoints. Pricing, dashboard,
feedback, support, billing reminder, payment-processing, system-monitoring,
performance, doctors, referrals are all fixed. Two pages still surface an
explicit error state because the backing endpoint does not exist:

| Page                          | Path                                  | Missing endpoint                              | Status   |
| ----------------------------- | ------------------------------------- | --------------------------------------------- | -------- |
| `admins` all-list             | `/internal/admins`                    | `GET /api/internal/admins`                    | **OPEN** |
| `admins` create               | `/internal/admins/new`                | `POST /api/internal/admins`                   | **OPEN** |
| `users` all-list              | `/internal/users`                     | `GET /api/internal/users` (across all clinics) | **OPEN** |

**Plan (P5.11)**:

1. Decide product surface: tenant-scoped `admins` vs cross-clinic `users`.
2. If tenant-scoped: reuse the existing `clinic-scoped admin` query; add
   `GET /api/internal/admins?clinicId=…` to the existing controller.
3. If cross-clinic: add a new `InternalAdminService` with explicit tenant
   guard; the cross-clinic surface is a P5.x privacy decision (requires ABAC
   attribute).
4. Wire both pages to the new endpoints + remove the error state.

**Exit**: all 3 endpoints live, both pages render, RBAC/tenant tests pass,
`pnpm verify:standard` 0.

---

## 7. CSRF webhook exemption regression test (P4.3 fixed; regression coverage)

**Source**: P4.3 closing batch 2026-08-04. The CSRF interceptor
`/webhooks/*` POST exemption was added + 2 unit fixtures added. The exemption
must not regress.

**Plan (P5.12)**:

1. Add an e2e test that POSTs to a webhook with a CSRF cookie but no
   signature → must 401 (signature check fires first) and must NOT 403 (CSRF
   exemption works).
2. Add the test to `apps/api/test/e2e/webhooks/` (already created in P4.3
   batch).
3. Add a `check:webhook-csrf-exemption` static check that asserts the
   exemption's path pattern in `csrf.interceptor.ts` matches `/webhooks/*` POST
   only.

**Exit**: e2e test green, static check green, gate wired.

---

## 8. As-cast-density dirty tree fix (immediate)

**Source**: working tree 2026-08-05. `pnpm check:as-cast-density` is failing
on `apps/api/src/shared/modules/imports/xlsx-load-boundary.ts:18` (1 cast,
max 0). The cast is legitimate (`buffer.buffer.slice(...) as ArrayBuffer`
because exceljs's `Buffer extends ArrayBuffer` interface is incompatible with
`@types/node`'s generic `Buffer<ArrayBufferLike>` under TS 6.0).

**Action**:

1. Add `// check-as-cast-density: allow-file — exceljs Buffer<ArrayBufferLike> ↔ ArrayBuffer coercion at the load boundary` to
   `apps/api/src/shared/modules/imports/xlsx-load-boundary.ts`.
2. Add the entry to [`SUPPRESSION_LEDGER.md`](SUPPRESSION_LEDGER.md) §2
   (Prisma/AWS/JSON bucket — same rationale family).
3. Re-run `pnpm check:as-cast-density` → exits 0.

**Owner**: migration PR (must land before push). **Window**: today.

---

## 9. Misc OPEN items (consolidated, sourced)

These are pulled forward from `EXECUTION_PLAN.md` and `REPO_GAPS` and given
explicit owners and windows.

| Item                                                                     | Source             | Owner / target |
| ------------------------------------------------------------------------ | ------------------ | -------------- |
| 22 jscpd intentional-structure pairs → ≤25 jscpd ignore count            | REPO_GAPS row 37   | P5.4 (above)   |
| 129 JSX-literal growth → ≤800 baseline                                   | REPO_GAPS row 37   | P5.7 (above)   |
| Web Vitals reporter + budget enforcement                                 | EXECUTION P4.5     | P5.8 (above)   |
| API latency SLOs + budget gate                                           | EXECUTION P4.5     | P5.9 (above)   |
| CSP checkout smoke (Razorpay iframe)                                    | EXECUTION P4.4     | P5.10 (above)  |
| internal-vite admins/users endpoints                                     | REPO_GAPS row 40   | P5.11 (above)  |
| CSRF webhook regression test                                             | EXECUTION P4.3     | P5.12 (above)  |
| `as-cast-density` dirty tree fix                                         | Working tree 2026-08-05 | Done 2026-08-05 |
| `check:client-storage-usage` allowlist (`web-vitals.ts` session-dedupe)  | Working tree 2026-08-05 | Done 2026-08-05 |
| Route-budget absolute overage (4 routes 1-5 KB over 2026-08-04 budget)   | Working tree 2026-08-05 | P5.19 (NEW)    |
| `check:repo-on-module-init-cache` ratchet                                | EXECUTION P4.1     | P5.13          |
| `check:ad-hoc-service-cache` ratchet                                     | EXECUTION P4.1     | P5.14          |
| `check:audit-coverage` baseline (audit events by service file)            | EXECUTION P4.4     | P5.15          |
| `apps/worker` automated-canary rollout                                   | `RUNBOOKS.md`      | P5.16          |
| React Router 8 data-router migration (loader/action ergonomics)          | Future             | P6.x (deferred to feature work) |
| TS 7.0 + NestJS native compiler API compatibility                        | Dependency tracker | P6.x (deferred) |

---

## 10. Refresh procedure

```bash
# 1. jscpd ignore count
node -e "console.log(require('./.jscpd.json').ignore.length)"

# 2. JSX literal baseline
pnpm check:jsx-literal-density --baseline

# 3. As-cast allow-file count
grep -rE "check-as-cast-density: allow-file" apps packages \
  --include="*.ts" --include="*.tsx" 2>/dev/null \
  | grep -v node_modules | grep -v "/dist/" | wc -l

# 4. NNA allow-file count
grep -rE "check-non-null-assertion: allow-file" apps packages \
  --include="*.ts" --include="*.tsx" 2>/dev/null \
  | grep -v node_modules | grep -v "/dist/" | wc -l

# 5. Zod-parity allowlist count
cat scripts/checks/allowlists/zod-interface-parity.json \
  | python3 -c "import json,sys; print(len(json.load(sys.stdin)))"
```

Ratchet these counts down per the P5.x targets; re-baseline every 4 weeks.
