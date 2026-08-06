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
| Consultation specialty sections        |     5 | **Keep** — clinical mirror is intentional; **P5.4d DONE 2026-08-05**: renamed to `*-specialty-sections.tsx` (cardiology/dermatology/gynecology/psychiatry exam sections + investigations) for clarity; no extraction, the 5 ignores stay with rationale | P5.4d   |
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

**DONE 2026-08-05 (P5.7, ≤800 target HIT)**: the legal feature's three
documents (privacy policy, SLA, DPA) moved into the `Legal` en/hi i18n
namespace — 160 leaves, English-only values preserved via `fallbackLng: "en"`
(the documented English-only legal-text design; only the transport changed).
`check:jsx-literal-density` current **755** vs baseline 872 (−117); the
`i18n-coverage` allowlist is emptied; `check:i18next-parity` 2,032 = 2,032
leaves. The remaining literal debt (755 − target floor) is spread across the
long-tail of feature files and tracked as steady-state i18n work, not a
release blocker.

### 2a. Dead i18n namespaces (found 2026-08-06 during the locale-switcher fix)

The EN/हिंदी toggle was switching the i18next language but not the UI: the
i18n init registered a single flat `translation` namespace while every
consumer addresses message sections via `useTranslation("Section")` (284
sites). Fixed by registering each top-level and nested section as its own
i18next namespace (`apps/app/src/i18n/index.ts` `buildResources`; the
`isMessageTree` guard moved to `i18n/locale-utils.ts` to share with the test
mock). The regression is locked by
`apps/app/src/i18n/__tests__/namespace-registration.test.ts`, which scans
every `useTranslation("…")` call in source and requires it to resolve in
both en and hi.

**RESOLVED 2026-08-06 — all 13 dead `Settings.*` namespaces and the hardcoded
auth literals are now translated.** The `Settings.{Appearance, security,
teamMemberForm, invite, doctorAvailability, timeAway, TeamManagement,
manageMember, joinRequestReview, manageTeamMemberDoctorPanel, doctorProfile,
queueHoursFields, applyLeaveDialog}` message sections (169 keys) were added
to en.json and hi.json (parity enforced, 2,292 = 2,292 leaves), and the auth
step UIs (`AuthEmailStepUI`/`AuthLoginStepUI`/`AuthSignupStepUI` + shared
fields: back-email, password-strength, owner-role, password-fields) were
converted from hardcoded English to `useTranslation("Auth")` with 45 new
`signIn.*` keys. The `Settings.Appearance` component and auth components now
render translated copy in both locales; the namespace-registration test's
dead-namespace allowlist was removed so every `useTranslation` namespace is
strictly required to resolve.

---

## 3. Web Vitals enforcement (P4.5 — **DONE 2026-08-06, P5.8**)

**Source**: `EXECUTION_PLAN.md` P4.5; the Next-era collector was rewritten to
scan `dist/assets` and a new `scripts/perf/check-web-vitals.mjs` exists, but
the runtime reporter is not yet wired and the budget is not enforced.

**Current state**:

- `apps/app/src/lib/monitoring/web-vitals.ts` (modified in dirty tree) and
  `apps/internal/src/lib/monitoring/web-vitals.ts` exist.
- `apps/app/src/lib/monitoring/web-vitals-payload.ts` (new, uncommitted)
  defines the report payload shape.
- `scripts/perf/check-web-vitals.mjs` (new, uncommitted) validates the
  payload format.
- No budget value; no `verify:standard` wiring; no Sentry sink.

**Plan (P5.8)**:

1. Land the uncommitted web-vitals files — **done (P5.4e RUM consolidation)**.
2. Reporter posts to the same-origin `monitoring/web-vitals` proxy — **done**
   (`packages/data-access/src/lib/monitoring/web-vitals.ts`, `sendBeacon`
   + keepalive fallback; both app wrappers thin).
3. Budgets: **LCP/INP/CLS per route in `ROUTE_WEB_VITALS` + TTFB ≤ 800ms**
   (added 2026-08-06) — **done**.
4. `pnpm check:web-vitals:enforce` in `verify:standard` — **done** as a
   hermetic baseline ratchet: reads committed `artifacts/web-vitals-baseline.json`
   (a11y-baseline pattern), skips exit 0 until a baseline is measured from
   live data (`pnpm perf:web-vitals:baseline` against a running app/Chrome).

**Exit**: budget defined ✓, reporter live ✓, Sentry sink connected ✓,
`check:web-vitals:enforce` wired ✓, **baseline measured + committed-ready
2026-08-06** ✓ (live dev server + Chrome, warm-up pass, median-of-3:
`/login` LCP 308 ms / TTFB 2 ms, `/book/:referralCode` LCP 300 ms / TTFB 2 ms
— both ≪ budgets; gate now actively validates and passed inside
`verify:standard`). Note: the first baseline attempt measured a stale dev
server serving a Vite error overlay (module graph corrupted after
`packages/ui` edits — the committed tree builds clean); readings were
re-measured against a fresh server, which also unblocked the a11y audit
(full public-route axe run now **12/12 green**, incl. the P5.17 login
surface, after installing the missing WebKit binary for the iPad tablet
project). Root-cause hardening: the `@workspace/ui` exports map now also
exports `./styles/globals.css` (both Vite apps import that spelling; landing
uses `./globals.css`) — `require.resolve` now succeeds where it previously
threw `ERR_PACKAGE_PATH_NOT_EXPORTED`. The API-latency half (§4) still awaits
its staging soak.

---

## 4. API latency SLOs (P4.5 — **DONE 2026-08-06, P5.9**)

**Source**: `EXECUTION_PLAN.md` P4.5. The API has no published SLOs and no
latency budget enforcement.

**Plan (P5.9)**:

1. Define per-endpoint SLOs from the p95/p99 of the staging soak:
   - Auth: **p95 ≤ 300ms** (login, refresh, logout)
   - CRUD (patients, appointments, invoices): **p95 ≤ 200ms**, **p99 ≤ 500ms**
   - Search/list (paginated): **p95 ≤ 400ms**
   - Reports/PDF: **p95 ≤ 1500ms** (acceptable for async, with progress UX)
   - Webhooks: **p95 ≤ 100ms** (signature verify + dedupe only; processing async)
2. Wire `check:api-latency-budget` — **done**: hermetic ratchet reading the
   committed `artifacts/api-latency-baseline.json`; warns over budget, fails
   (`--enforce`, wired into `verify:standard`) when any endpoint exceeds its
   budget by **>25%** or breaches a p99 budget.
3. Document the SLOs in `docs/operations/SLOS.md`; add alert ownership —
   **done** (published contract + ownership table).

**Exit**: SLOs defined ✓, gate wired ✓ (staging soak baseline commit pending a
live soak), alerts owned ✓.

---

## 5. CSP checkout smoke (P4.4 — **PARTIAL 2026-08-06, P5.10; live run BLOCKED**)

**Source**: `EXECUTION_PLAN.md` P4.4. CSP review needs a real Razorpay
checkout smoke to verify the policy doesn't break the iframe + Razorpay
JS SDK load.

**Plan (P5.10)**:

1. Draft CSP for both `_headers` files — **done** (deployed; Razorpay
   `checkout.razorpay.com` in `script-src`/`frame-src`, `api.razorpay.com` in
   `connect-src`, Turnstile `challenges.cloudflare.com` allowed).
2. Razorpay allowances — **done** (in both app `_headers`).
3. Real checkout against staging — **BLOCKED** on Razorpay test credentials.
4. Smoke script — **done**: `scripts/smoke/checkout-csp-smoke.mjs`
   (`pnpm smoke:checkout-csp`) loads `checkout.js`, opens the modal with a
   test order, fails on any CSP violation/page error; **skips exit 0 without
   `RAZORPAY_SMOKE_KEY_ID` + `RAZORPAY_SMOKE_ORDER_ID`**. Not wired into
   `verify:standard` until a live staging run goes green.

**Exit**: CSP deployed ✓, checkout smoke **pending credentials** (script ready),
gate wiring pending live green run.

---

## 6. Internal-vite admin/users endpoint gaps (10 OPEN API gaps)

**Source**: REPO_GAPS row 40; the 2026-08-04 internal route-parity sweep
found 10 pages calling non-existent internal endpoints. Pricing, dashboard,
feedback, support, billing reminder, payment-processing, system-monitoring,
performance, doctors, referrals are all fixed. Two pages still surface an
explicit error state because the backing endpoint does not exist:

| Page                          | Path                                  | Missing endpoint                              | Status   |
| ----------------------------- | ------------------------------------- | --------------------------------------------- | -------- |
| `admins` all-list             | `/internal/admins`                    | `GET /api/internal/admins`                    | **DONE 2026-08-06** |
| `admins` create               | `/internal/admins/new`                | `POST /api/internal/admins`                   | **DONE 2026-08-06** |
| `users` all-list              | `/internal/users`                     | `GET /api/internal/users` (across all clinics) | **DONE 2026-08-06** |

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

**E2E locally verified 2026-08-06**: 4/4 green against the docker test
Postgres (`docita_test` on :5434); the full API e2e suite is 25/25 suites /
151/151 tests. Unblocked by fixing a pre-existing TS 6.0.3 regression in
`apps/api/test/jest-e2e.json` (inline ts-jest tsconfig lacked `rootDir`,
TS5011 failed every e2e spec locally and would have failed the CI `api-e2e`
job) — `"rootDir": "./test"` added.

**DONE 2026-08-06**: the e2e spec `csrf-webhook-exemption.e2e-spec.ts`
(4 focused cases — the plan draft's "6/6" was unspecified and is replaced by
this concrete set: cookie+no-signature → 400 missing-signature error, never
403; cookie+tampered-signature → 401, never 403; cookie+valid-signature →
200 + replay-claim row proving the full pipeline runs; non-webhook
`/auth/logout` negative control with a session cookie + no CSRF header →
403, proving the exemption did not weaken anything else — the spec mounts
`cookieParser()` and sends a single `; `-joined Cookie header so the session
cookie is actually parsed and the strict double-submit path is exercised).
The static gate `scripts/checks/check-webhook-csrf-exemption.mjs` asserts the
exemption is POST-only (`method !== 'POST'` returns false), anchored to
`^/(?:api(?:/v\d+)?/)?webhooks/`, called inside the mutating
web-vitals/booking/webhook exemption branch, and absent from the
auth-bootstrap path — `failAlways` so it cannot silently degrade to a report.
Wired into `verify:standard` (next to `check:webhook-replay-protection`) and
`standard-checks.test.mjs` (19/19; fixture covers accept-canonical,
reject-widened `/webhooks` unanchored, reject-dropped call). The e2e suite
requires the docker-compose test Postgres (port 5434), so it is verified in CI
rather than locally; `pnpm --filter @docita/api run check-types` + the 16-test
`csrf.interceptor.spec.ts` unit suite pass locally.

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
| 129 JSX-literal growth → ≤800 baseline                                   | REPO_GAPS row 37   | P5.7 (above) — **DONE 2026-08-05 (755)** |
| Web Vitals reporter + budget enforcement                                 | EXECUTION P4.5     | P5.8 **DONE 2026-08-06** |
| API latency SLOs + budget gate                                           | EXECUTION P4.5     | P5.9 — **DONE 2026-08-06** |
| CSP checkout smoke (Razorpay iframe)                                    | EXECUTION P4.4     | P5.10 (above) — **PARTIAL; live run BLOCKED** |
| internal admins/users endpoints                                     | REPO_GAPS row 40   | P5.11 — **DONE 2026-08-06** |
| CSRF webhook regression test                                             | EXECUTION P4.3     | P5.12 (above) — **DONE 2026-08-06** |
| `as-cast-density` dirty tree fix                                         | Working tree 2026-08-05 | Done 2026-08-05 |
| `check:client-storage-usage` allowlist (`web-vitals.ts` session-dedupe)  | Working tree 2026-08-05 | Done 2026-08-05 |
| Route-budget absolute overage (4 routes 1-5 KB over 2026-08-04 budget)   | Working tree 2026-08-05 | P5.19 (NEW)    |
| `check:repo-on-module-init-cache` ratchet                                | EXECUTION P4.1     | P5.13 — **DONE 2026-08-06** (gate passes; documented in `RUNBOOKS.md`) |
| `check:ad-hoc-service-cache` ratchet                                     | EXECUTION P4.1     | P5.14 — **DONE 2026-08-06** (gate passes; documented in `RUNBOOKS.md`) |
| `check:audit-coverage` baseline (audit events by service file)            | EXECUTION P4.4     | P5.15 — **DONE 2026-08-06** (baseline file populated; gate measurable) |
| `apps/worker` automated-canary rollout                                   | `RUNBOOKS.md`      | P5.16 — **DONE 2026-08-06** (`worker-canary-deploy.sh` + RUNBOOKS RB-11) |
| reCAPTCHA/Turnstile on the auth surface                                 | SECURITY_HARDENING §3 | P5.17 — **DONE 2026-08-06** (see §10) |
| Doctor verification override audit trail                                | SECURITY_HARDENING §3 | P5.18 — **DONE 2026-08-06** (ticketId + audit row + e2e) |
| React Router 8 data-router migration (loader/action ergonomics)          | Future             | P6.x (deferred to feature work) |
| TS 7.0 + NestJS native compiler API compatibility                        | Dependency tracker | P6.x (deferred) |

---

## 10. Turnstile on the auth surface (**DONE 2026-08-06, P5.17**)

**Source**: SECURITY_HARDENING_CHECKLIST §3 (credential-stuffing row). The
repo already ran Cloudflare Turnstile on public-booking (widget + siteverify +
`TURNSTILE_SECRET_KEY` + `VITE_TURNSTILE_SITE_KEY`); P5.17 extends the same
infrastructure to the auth surface.

**What shipped**:

- `turnstileToken` (optional) added to `loginSchema` / `registerSchema` in
  `packages/types`.
- Turnstile verification promoted to `apps/api/src/shared/modules/turnstile/`
  (client + `TurnstileVerifyService.assertValidToken` — fail-closed 400 when
  `TURNSTILE_SECRET_KEY` is set and the token is missing/invalid; no-op when
  unset, so local dev + non-browser clients keep working).
- Enforced in `AuthLoginController.login` and
  `AuthRegistrationController.register` (not on `check-email`); rate limiter
  (`IpRateLimitGuard` + `@Throttle`) and lockout are **unchanged**.
- `TurnstileWidget` promoted to `@workspace/ui/components/form/turnstile-widget`
  (public-booking re-imports it; the app global `turnstile.d.ts` moved
  into the package) and mounted on the login + signup steps; submit is gated
  with an inline error when `VITE_TURNSTILE_SITE_KEY` is set but the token is
  missing.

**Activation**: set `TURNSTILE_SECRET_KEY` (API) + `VITE_TURNSTILE_SITE_KEY`
(app) in production to start enforcing; until then both surfaces behave
as before.

---

## 11. Refresh procedure

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
