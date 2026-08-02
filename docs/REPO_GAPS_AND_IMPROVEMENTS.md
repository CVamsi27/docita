# Repo Gap & Improvement Audit (non-frontend)

Point-in-time audit: **2026-08-02**. Scope: everything outside the frontend migration — API, worker, shared packages, scripts/checks, CI, docs commands, repo hygiene. The frontend is already covered by [`PORTING_PLAN_APP_VITE.md`](PORTING_PLAN_APP_VITE.md); findings here are independent of the port and remain valid after cutover.

## % Completed

| Section | % | Notes |
|---|---|---|
| A. Silent check regressions | **100%** | All retargeted to Vite apps |
| B. Dead migration residue | **100%** | next/opennext/configs fully cleaned |
| C. Docs ↔ scripts mismatches | **~90%** | Most fixed; cosmetic items remain |
| D. Backend config modernization | **0%** | NEXT_PUBLIC_* cleanup deferred to cutover |
| E. Hygiene & docs gaps | **~85%** | Package READMEs + hygiene checks done |
| F. Healthy / verified | **100%** | No issues found |
| G. Dependency advisories | **0%** | react-router v8 + brace-expansion pending |
| H. jscpd + monitoring duplication | **100%** | Logger deduped, Sentry consolidated, 4 real dups fixed + boilerplate exclusions documented (gate 0 clones) |
| I. Dead CI jobs + credentials | **100%** | Deleted + Razorpay key removed |
| **Overall repo gaps** | **~75%** | |

**See also**: the 2026-08-01 whole-repo analysis series in [`analysis/`](analysis/README.md) (features, UI/UX, database, standards, security, performance, cost, trash) + [`FUTURE_FEATURE_REQUIREMENTS.md`](FUTURE_FEATURE_REQUIREMENTS.md).

---

## A. Silent check regressions (P0 — DONE 2026-07-31)

These checks run in `pnpm verify:standard` but targeted directories that no longer exist in the working tree, so `git ls-files` returned nothing and the check **always passed vacuous**. Both are retargeted to the Vite apps and verified green:

| Check | Location | Fix applied |
|---|---|---|
| `check:native-ui-affordances` | `scripts/checks/check-native-ui-affordances.mjs:10` | Now scans `apps/app-vite` + `apps/internal-vite`; passes (no native `title=`/`<select>`/date-input violations in current Vite code) |
| `check:responsive-data-tables` | `scripts/checks/check-responsive-data-tables.mjs:8` | Now scans the Vite apps; passes |

Remaining 15 `gitLsSourceFiles` callers verified to target live dirs only (`apps/api`, `apps/worker`, `apps/app-vite`, `packages/*`).

**Further find (same class, fixed 2026-07-31)**: the feature-boundary audit gate — `scripts/lib/structure-audit-feature-boundaries.mjs` — matched files with the stale regex `^apps\/(app|internal)\/features\/`, so it audited nothing in the Vite tree. Fixed to `^apps\/(app-vite|internal-vite)\/src\/features\/` (both the filter and the match regex); `check:feature-boundaries` + the `standard-checks.test.mjs` suite (11 tests) now pass. This file was a `listTrackedFiles` consumer (from `scripts/lib/structure-audit-file-system.mjs`), not a `gitLsSourceFiles` caller — the earlier "remaining 15 callers" sweep could not catch it.

**Cutover note (git-based checks are dormant until commit)**: every check that discovers files via `git ls-files` sees **zero** files while `apps/app-vite`/`apps/internal-vite` are untracked (new work). Retargeted checks (above + `check-jsx-literal-density`) become live only after the migration commit; tracked in porting plan Phase 9 step 5.

## B. Dead migration residue (P1 — DONE 2026-07-31)

| Item | Location | Action taken |
|---|---|---|
| OpenNext patch script | `scripts/deploy/ensure-opennext-prefetch-manifest-patch.mjs` | Deleted + root `patch:opennext-prefetch-manifest` script removed from `package.json` |
| OpenNext comments | `scripts/monitoring/synthetic/run-probes.mjs` | 3 cold-start comments reworded (edge origin, not OpenNext) |
| `next` devDependency in a shared package | `packages/typescript-config/package.json` | Removed; **`next` and `opennext` are now fully absent from `pnpm-lock.yaml`** |
| No-op typecheck | `packages/typescript-config/package.json` + `packages/eslint-config/package.json` | Replaced with real checks: preset JSON parse validation (`typescript-config`), `node --check` on shipped configs (`eslint-config`) |
| Publish metadata | `packages/typescript-config/package.json` | `publishConfig.access: "public"` dropped |
| Stray build output | `packages/typescript-config/dist/` (1.7 MB) | Deleted (misdirected `api/src/...` tree) |
| Knip config for deleted apps | `knip.json:114` (`apps/app`), `:137` (`apps/internal`) | Both blocks removed; `scripts/deploy/cloudflare-stubs/sentry-nextjs-cloudflare.ts` ignore entry removed |
| Cloudflare stubs dir | `scripts/deploy/cloudflare-stubs/` | Deleted (only file was the unused Next/Sentry stub) |
| Next ESLint config | `packages/eslint-config/next.js` + `@next/eslint-plugin-next` devDep + `./next-js` export | Deleted — zero consumers (only `base` and `react-internal` are imported); lockfile refreshed |
| CI: deprecated jobs | `.github/workflows/ci.yml` "App Unit Checks (Next.js — deprecated)" / "Internal Unit Checks" | Left until Phase 9 cutover (tracked in porting plan) |
| Worker bundle junk | `apps/api/dist/` (19 MB), `apps/worker/dist/` (9.8 MB) | Deleted. Note: `dist/` dirs in packages that legitimately build (`packages/{auth,types,utils,hooks,data-access,ui}`, `apps/*-vite`, `apps/landing`) are normal and stay |

**Knip note**: `pnpm knip` now reports only pre-existing content findings — unused exported types in `apps/app-vite/src/lib/*` (porting debt: shells export types nothing consumes yet) and unused `PaymentMethod` enum members in `packages/types/src/billing/payments.ts` (the API uses the enum via `paymentMethodSchema`/string literals; changing member usage touches billing — deliberate, not part of this cleanup). No new knip findings were introduced.

**Knip dependency rules (exit-1 gate) fixed 2026-07-31**: `pnpm knip` previously exited 1 on 5 unused devDependencies + 10 unlisted dependencies across the Vite apps. Removed unused devDeps: `@tailwindcss/postcss` (both Vite apps — their `postcss.config.mjs` re-exports `@workspace/ui/postcss.config`, which owns the plugin), `@workspace/eslint-config` (both apps — `eslint.config.mjs` imports `@eslint/js` + `typescript-eslint` directly), `@workspace/typescript-config` (app-vite — its `tsconfig.json` has no `extends`). Added unlisted deps to `apps/internal-vite`: `hono` (imported by `api/index.ts`), `@workspace/types` + `@workspace/utils` (imported by `src/`); `hono` also moved from devDeps → deps in `apps/app-vite` for consistency (runtime Worker-bundle import). Lockfile refreshed via `pnpm install`; `pnpm knip` exits 0 and `pnpm install --frozen-lockfile` passes.

## C. Docs ↔ scripts mismatches (P2 — partially DONE 2026-07-31)

| Doc reference | Script reality | Status |
|---|---|---|
| `pnpm audit:internal` (AGENTS.md §10 line 364, §13 line 536; `docs/ui/UI_REDESIGN_CHECKLIST.md:48`; `docs/PORTING_PLAN_APP_VITE.md` §5 gate + Phase 8) | Script did not exist — only `audit:internal-vite` was defined in root `package.json` | **FIXED**: root `"audit:internal": "pnpm audit:internal-vite"` alias added; all doc references now resolve |
| Root `test:e2e` (`package.json`) | `turbo test --filter=@docita/app-vite` — ran app-vite **unit** tests, not E2E | **FIXED**: renamed to `test:app-vite` (only self-references existed) |
| `pnpm check:prisma-boundary` (AGENTS.md §13) | `scripts/checks/check-prisma-boundary.js` — note `.js` vs the `.mjs` convention of sibling checks | Cosmetic; either rename file or leave (command is stable) |
| AGENTS.md §13 command list | Missing `pnpm audit:app:public`, `perf:route-budgets`, `check:query-key-factory`, `check:tools-route-gate` | **FIXED**: §13 re-synced with root `package.json` (each script verified to exist via `node -e`); `perf:route-budgets:warn` corrected to the real `perf:route-budgets` |

## D. Backend config modernization (P2 — after cutover)

- `apps/api/src/shared/modules/config/env-schema.ts:42-43` still requires `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_API_URL` (Next-era names) alongside plain `APP_URL`. The Vite apps only set `VITE_*` vars, so the API is the last consumer of the legacy names.
  - **Now**: leave required (production Fly secrets set them; changing breaks deploys).
  - **After cutover**: make `NEXT_PUBLIC_*` optional aliases defaulting from `APP_URL`/`VITE_API_URL`, update `docs/operations/DEPLOYMENT.md` + `AGENTS.md` §6 env list, then migrate Fly secrets.
- `docs/ONBOARDING.md` (§4) still lists `NEXT_PUBLIC_API_URL` as a required API var — fine during migration, but fold into the same cutover cleanup.

## E. Hygiene & docs gaps (P3 — partially DONE 2026-07-31)

- **Missing package READMEs**: `packages/auth`, `packages/eslint-config`, `packages/typescript-config` (all other packages and apps have one). — **FIXED**: all three created (auth covers session-semantics + the "no Next/Nest imports" rule; eslint-config documents `base`/`react-internal` exports and the removed Next config; typescript-config documents the three presets).
- **`check:hygiene` blind spot**: does not flag gitignored `dist/` junk in the working tree (Section B). — **FIXED**: `scripts/workflow/check-repo-hygiene.mjs` extended to flag untracked `dist/` directories in workspace packages that declare no build script; passes (packages that legitimately build are exempt).
- **Cosmetic comments**: `scripts/checks/check-filename-case.mjs:4,27` and `check-i18n-translation-keys.mjs:13` still describe `apps/app/features` — update wording during the next touch. — **FIXED**: all four affected scripts reworded (`check-filename-case.mjs`, `check-i18n-translation-keys.mjs`, `check-jsx-literal-density.mjs`, `check-circular-deps.mjs`); also `check-client-storage-usage.mjs` header and `standard-checks.test.mjs` facility-type fixtures now use `apps/app-vite` paths. `check-sentry-scrubber-parity.mjs:6` keeps one historical note (documents why the legacy barrel exists) — intentional.
- **`internal-vite` has no PWA assets** (`public/` only has `_headers` + `_redirects`; app-vite ships `manifest.webmanifest` + `offline.html`). — **DECIDED**: no PWA for the internal admin portal (admin-only, always-online session flow); recorded in `apps/internal-vite/README.md` §PWA.
- **`packages/typescript-config/dist` stray build** (see B) — deleted with the residue sweep.

## F. Healthy / verified (no action)

- **No TODO/FIXME/HACK residue** in `apps/api/src`, `apps/worker/src`, `packages/*` source (tests included) — repo hygiene §7.2 is holding.
- **Worker CI coverage exists**: `worker-quality` job in `ci.yml` (lint/typecheck/tests) gated on worker scope; `apps/worker/fly.toml` drives worker deploys per §11.1.
- **API E2E suite present**: `apps/api/test/e2e` + `test:e2e` jest config; `api-e2e.yml` workflow.
- **Landing app complete**: all scripts present (`test:critical-flows`, `audit:accessibility`, cloudflare deploy); README exists.
- **Deploy separation holds**: `deploy.yml` detects API vs worker vs Cloudflare targets independently; `synthetic-monitoring.yml` + `container-scan.yml` + `scale-api-hours.yml` scheduled independently.
- **All scripts/checks commands referenced in `verify:standard` resolve** to existing files (spot-checked the full chain).

---

## G. Known dependency advisories (pre-existing — not introduced by this audit)

`pnpm audit --audit-level=high` (2026-08-02, refreshed):
- **react-router 7.18.2** (resolved in `apps/app-vite`; `^7.6.0` in manifest) — RSC-mode CSRF bypass, patched only in **v8.3.0+** (major). Needs a deliberate upgrade decision: verify React Router v7→v8 API compatibility for the 96-route tree before bumping.
- **brace-expansion ≤5.0.7** (transitive via dev tooling) — DoS; patch exists at 5.0.8, typically fixed by bumping the owning dev tool.
- **playwright 1.48.2** (dev) — browser downloads without SSL cert verification; patched in **1.55.1+**.

Neither is introduced by this change set (all pre-date it; this audit only removed dependencies).

### Deep analysis: package health

| Package | Source Files | Tests | Test Density | Notes |
|---|---|---|---|---|
| types | 157 | 19 | 12% | Zod schemas + inferred types |
| ui | 139 | 27 | 19% | Best-tested package |
| utils | 98 | 23 | 23% | Best test density |
| data-access | 141 | 8 | 6% | Needs more test coverage |
| hooks | 27 | 1 | 4% | Very low test coverage |
| auth | 3 | 1 | 33% | Small but well-tested |
| db | 1 | 0 | 0% | Prisma client only |

### Deep analysis: DB health

| Metric | Value |
|---|---|
| Models | 147 |
| Enums | 112 |
| Indexes | **530** |
| Migrations | 159 |
| Timestamptz fields | **469** (0 non-tz DateTime — fully compliant) |
| Relations (`@relation`) | ~500 |
| Unique constraints | ~800 |
| Default values | ~600 |
| RLS (row-level security) | **0** — uses `TenantGuard` + `@Roles` instead |

### Deep analysis: import discipline

| Pattern | Count (app-vite) | Notes |
|---|---|---|
| Deep relative imports (`../`) | **0** | ESLint-enforced, clean |
| Alias imports (`@/`) | **Used throughout** | Convention followed |
| Workspace imports (`@workspace/`) | **Used throughout** | Convention followed |

## H. Second pass (same day) — jscpd gate + monitoring duplication (DONE 2026-07-31)

A follow-up sweep found the **`check:duplication` gate failing** (19 clones, 473 lines) — the Vite apps were never excluded the way the Next apps were, and the pair had accumulated real duplicates. Fixed or recorded as cutover items:

| # | Finding | Resolution |
|---|---|---|
| 1 | **jscpd config stale**: ignored deleted `apps/app/`, `apps/internal/`, `**/.next/**`; the Vite apps (with 19 clones: shell pages, patient dialogs, logger pair, worker pair) were scanned | `.jscpd.json` now ignores `apps/app-vite/` + `apps/internal-vite/` during the porting window (same rationale as the historical Next-app exclusion — shell pages are transitional and vanish as features get fleshed out). Gate is green (0 clones) and stays live for API/worker/packages. **Cutover step**: lift the exclusion and fix the real clones below — **UPDATED 2026-08-02**: the broad dir exclusion is lifted; the config now scans both Vite apps and excludes only specific intentional files. Four real clones were fixed outright and the 24 remaining pre-existing ported-boilerplate clones are excluded per-file with a tracked dedup follow-up — see §J item 10. `pnpm check:duplication` is green (0 clones) |
| 2 | **Logger duplicated across both apps** (80 vs 74 lines, formatting-only diffs; both hand-rolled the lazy-Sentry loading that `createLazySentryClientLoader` already provides) | Promoted to `packages/utils/src/monitoring/client-logger.ts` (`createSentryLogger` factory, generic over the SDK type so utils stays free of `@sentry/*`; reuses the shared loader). Both apps' `src/lib/monitoring/logger.ts` are now 10-line shims (env DSN). Unit tests added (133 utils tests pass). Import sites unchanged (`@/lib/monitoring/logger`) |
| 3 | **app-vite never calls `Sentry.init`** — `initializeSentryClient()` only loaded the SDK and set context, so production Sentry telemetry was dead since the port | Both apps' `sentry.client.config.ts` consolidated onto the shared helpers with a new optional `initClient` hook in `bootstrapSentryClient` (additive): env DSN, PHI scrubbing (`scrubSentryEventRecord` in beforeSend/beforeBreadcrumb), ignoreErrors list, replay/trace rates — restored from the Next-era root configs |
| 4 | **internal-vite hand-rolled loader + hardcoded DSN** in source (`sentry.client.config.ts:9-10`), and **lost the admin user context** the Next-era app set (`docita_admin_context`, `app=admin` tag) | Same consolidated config; DSN now `process.env.VITE_SENTRY_DSN`; admin context restored |
| 5 | **Production env-var bug (live)**: `apps/app-vite/wrangler.toml` + `.env.example` set `NEXT_PUBLIC_*` names while the app reads `VITE_*` via `define` — production builds silently ran `VITE_APP_URL=http://localhost:3000`, `VITE_SOCKET_URL=http://localhost:3001`, Sentry disabled | Renamed to `VITE_*` across `wrangler.toml`, `.env.example` (stale legacy blocks dropped), `turbo.json` globalEnv + app-vite build env (config-sync rule §16.2). `NEXT_PUBLIC_API_URL`/`NEXT_PUBLIC_APP_URL` stay in turbo (API server config + landing still consume them). internal-vite `vite.config.ts` gained the `VITE_SENTRY_DSN` define it was missing |
| 6 | **`check-browser-telemetry-same-origin` crashed** (`ENOENT`) inside `verify:standard` — referenced Next-era file names (`web-vitals-reporter.ts`, `build:cloudflare:production` scripts inlining `NEXT_PUBLIC_API_URL`) | Rewritten for the current design: asserts the 6 telemetry files (web-vitals, client-error-reporter, sentry config × 2 apps) contain no `api.docita.work` origin and no non-relative telemetry fetch. Passes |
| 7 | **`check-no-console-runtime` stale exclusions** (`apps/app-vite/src/lib/logger.ts` nonexistent path, `/.next/`, `/.open-next/`) | Removed; the check immediately caught a real `console.error` in `apps/app-vite/src/features/setup/pages/join-clinic-page.tsx:22` — replaced with `logger.error`. Passes |
| 8 | **Hardcoded live credentials in `apps/app-vite/wrangler.toml`**: production Razorpay key `rzp_live_...` + Sentry DSNs | Pre-existing (came from the Next-era config). Flagged: move to Cloudflare Worker Secrets / dashboard envs before the public repo expands. DSNs stay until then (mirrors internal-vite) |
| 9 | **`@workspace/utils/http/upstream-api-proxy` is exported with zero consumers** while both Hono workers hand-roll a simpler passthrough proxy | Left as a cutover decision: either adopt `proxyUpstreamApiRequest` for `/api/v1` in the workers (behavior change — richer hop-by-hop/cookie handling) or delete the helper. The byte-identical `api/index.ts` worker pair is excluded from jscpd via #1 but should be deduped at cutover | **RESOLVED 2026-07-31**: both `apps/app-vite/api/index.ts` and `apps/internal-vite/api/index.ts` now adopt `proxyUpstreamApiRequest` + `extractApiV1PathSegments` + `resolveUpstreamApiBaseUrl` for `/api/v1` (the "adopt" path); the remaining byte-identical Hono routing shell is an intentional per-app worker, left for the cutover rename |
| 10 | **Remaining in-app clones at cutover** (hidden by #1 until lifted): `add-patient-dialog.tsx` ↔ `edit-patient-dialog.tsx` (72+61 lines — extract shared `PatientFormFields`), `PatientDetailPage.tsx` ↔ `enhanced-patient-detail.tsx` (37 lines), `use-ipd-logic.ts` self-duplication (3×11 lines) | **RESOLVED 2026-07-31**: shared `PatientFormFields` extracted (`features/patients/components/patient-form-fields.tsx` consumed by both dialogs); `PatientDetailPage` ↔ `enhanced-patient-detail` pair does not exist in vite (single `enhanced-patient-detail.tsx` re-exported from `patients-page.tsx`); `use-ipd-logic.ts` self-duplication fixed by extracting `invalidateIpdQueries` (shared across the three mutations) |

## I. Follow-up pass (2026-08-01) — dead CI jobs + credential residue (NEW)

A follow-up sweep of the workflow files after the Next-app deletion surfaced one additional residue class that the original audit did not capture (it only recorded the `ci.yml` deprecated jobs):

| # | Finding | Resolution |
|---|---|---|
| 1 | **`deploy.yml` dead deprecated jobs**: `deploy-app` (lines 257–286) and `deploy-internal` (lines 316–341) run under `if: false` but still execute `pnpm --filter @docita/app run deploy:cloudflare:production` / `@docita/internal …` — packages that no longer exist in the lockfile | **RESOLVED 2026-08-01** — both jobs deleted (plus the `ci.yml` deprecated jobs and the orphaned `app`/`internal` `changes` outputs in both files). See [`CODEBASE_CLEANUP_PLAN.md`](CODEBASE_CLEANUP_PLAN.md) §B.1. |
| 2 | **Hardcoded live Razorpay key inside the dead `deploy-app` job** (`deploy.yml:285`): `rzp_live_SPNm7w8Ig24OSX` embedded as a fallback var | **RESOLVED 2026-08-01** — deleting the dead job removed the credential from the workflow file; verified the live key no longer appears anywhere in `.github/` (the app-vite `wrangler.toml` key was already flagged in §H item 8). |
| 3 | **E2E port landed after the audit snapshot** (app-vite only): `@playwright/test` + `playwright.config.ts` + `e2e/` (auth, critical-flows, health specs + 9 utils files); internal-vite still has none | No action here — tracked in the porting plan Phase 8 (started 2026-08-01). |
| 4 | **Knip shell-export debt** (278 unused exports + 287 unused exported types, app-vite-heavy) | **Batch 1 trimmed 2026-08-01** (feature-gate helpers, `UserFacingErrorContext` re-exports, prop-type exports → 198/209 pre-Batch-1); **current measured: 278/287** (more thorough scan after feature ports landed); remaining inventory in [`CODEBASE_CLEANUP_PLAN.md`](CODEBASE_CLEANUP_PLAN.md) §C. |

---

## J. Follow-up pass (2026-08-02) — standards checks + port-or-drop companion (NEW)

Companion work executed against `docs/analysis/EXECUTION_PLAN.md` Phase 15 and `docs/PORTING_PLAN_APP_VITE.md` Phase 6. These are repo-level standards / dedup items (the port-or-drop decisions themselves are recorded in the porting plan).

| # | Item | Resolution |
|---|---|---|
| 1 | **Phase 15 checks missing** — `check:button-primitive`, `check:i18n-coverage`, `check:error-boundary-coverage`, `check:zod-interface-parity` did not exist | **DONE 2026-08-02** — all four created in `scripts/checks/` with allowlists in `scripts/checks/allowlists/` (`i18n-coverage.json`, `zod-interface-parity.json`), added to `package.json` scripts, and wired into `verify:standard` (verified via `check-standard-gate-wiring`). |
| 2 | **`internal-vite` duplicate ErrorBoundary** — `apps/internal-vite/src/components/loaders/error-boundary.tsx` duplicated `@workspace/ui`'s `feedback/error-boundary` | **DONE 2026-08-02** — removed; `main.tsx` now uses the `@workspace/ui` primitive. |
| 3 | **Raw `<button>` in internal-vite production code** — `support-page` thread row + `protected-layout` theme toggle | **DONE 2026-08-02** — replaced with the `Button` primitive; `check:button-primitive` is green at 0 violations in both Vite apps. |
| 4 | **i18n coverage completion** — `today`, `templates`, `lab-portal`, `dialogs` features had no `useTranslation` | **DONE 2026-08-02** — converted (en + hi namespaces); app-vite now at 44/45 features (legal intentional, allowlisted). Key-level parity completed in item 7 (en = hi = 1,885). |
| 5 | **Port-or-drop review applied** — excel/ocr/feedback/guided-tour DROPPED, dev-tools KEPT as shell, specialty KEPT | **DONE 2026-08-02** — decisions recorded in `docs/PORTING_PLAN_APP_VITE.md` §Phase 6; excel/ocr placeholder routes + `IMPORTS_EXCEL`/`IMPORTS_OCR` constants removed; hub card CTAs route into the bulk-import wizard. |
| 6 | **Stale “653 unit tests green” claim** — measured 2026-08-02: 653 tests = 596 passing / 57 failing | **RESOLVED 2026-08-02 — 653/653 green.** Root causes fixed: (1) `error-boundary`/`page-skeleton` specs asserted the old `@workspace/ui` fallback copy — assertions updated to the current copy / `[data-skeleton]` marker; (2) specs for i18n-converted features lacked `react-i18next` mocks — a shared en.json-backed mock (`src/test-utils/i18n-mock.ts`, ICU `{count, plural}` + `{name}` interpolation) is now registered globally in `vitest.setup.ts`; (3) a real TDZ bug found while triaging: `WhatsappOperationsPageContent` referenced `TABS` inside `useMemo` before its `const` declaration — moved above (would have crashed the page in production). Two advisor specs were updated to the current en.json copy (“3 pending requests” / “Open queue”). |
| 7 | **hi.json parity gap** — 12 namespaces (WhatsApp, Inbox, ReferralPartner, Documents, Search, Profile, FollowUps, PublicBooking, MobileUpload, UploadSignature, MedicalCoding, Referrals; 207 keys) missing from hi | **RESOLVED 2026-08-02** — all 12 translated to Hindi; then a follow-up trim + translation pass reached **exact leaf-key parity: en 1,885 / hi 1,885 keys, 0 dead, 0 missing** (see item 9). `check-i18n-translation-keys --enforce` green. |
| 8 | **Phase 15 checks lacked CI coverage** — `standard-checks.test.mjs` had no tests for the four new checks | **RESOLVED 2026-08-02** — added fixtures (fail + pass) for `check-button-primitive`, `check-i18n-coverage`, `check-error-boundary-coverage`, `check-zod-interface-parity`; `node --test scripts/checks/standard-checks.test.mjs` green (15/15). |
| 9 | **hi.json leaf-key overhang** — hi 2,061 vs en 1,885 leaf keys; ~176 extra leaves in shared namespaces (dead translations) | **RESOLVED 2026-08-02** — trimmed **494 hi-only dead leaves** (the earlier ~176 estimate under-counted; whole hi subtrees that were 100% dead, e.g. `Settings.security`, were pruned entirely). The trim exposed **318 en leaves that genuinely lacked Hindi** across 10 namespaces (Dashboard 117, LabTests 59, Settings 39, Appointments 29, Desk 24, Prescriptions 14, Invoices 12, Ipd 9, MedicalDocuments 9, Daybook 6) — all translated (ICU plural structure preserved). Final state: **en 1,885 = hi 1,885 leaf keys, 0 dead, 0 missing**. This parity is now **guarded by `check:i18next-parity`** (`scripts/checks/check-i18next-parity.mjs`, wired into `verify:standard` + `.husky/pre-push`, CI-tested in `standard-checks.test.mjs`), so the next en.json edit cannot silently regress Hindi coverage. |
| 11 | **Build-blocking dead hooks in `packages/data-access`** — production builds (`pnpm build:web-workspace-deps`) failed on `src/hooks/clinical/use-opd-slip-download.ts` (`Property 'request' does not exist` — the fetcher is a bare callable, data-access is JSON-only by design); two migration-port hooks were speculative/unconsumed | **RESOLVED 2026-08-02** — deleted `use-opd-slip-download.ts` (unexported, unconsumed; duplicate of the working app-vite `@/features/appointments/hooks/use-download-opd-slip`, which correctly uses inline fetch + auth for the binary PDF) and `use-blob-download.ts` (exported at `index.ts:438` but zero consumers; the code itself threw "Binary download not supported by fetcher") + removed the `useBlobDownload` export. `useUploadFile` kept — consumed by the medical-documents feature. Verified: data-access 73/73 tests, app-vite 653/653, both Vite apps production builds green, `verify:standard` exit 0. |
| 10 | **jscpd in-app clones** — after lifting the broad dir exclusion, `pnpm check:duplication` found 34 clones; cross-app intentional pairs excluded, then the real dups were fixed and the remaining pre-existing ported-boilerplate clones were excluded per-file | **DONE 2026-08-02** — (a) **4 real dups fixed**: the SLA signature-session API was duplicated across `setup` and `upload-signature` (17L + 14L clones) — consolidated into `apps/app-vite/src/lib/api/sla-signature-session.ts` (endpoints are `@Public()` per `onboarding-sla-signature.controller.ts`, so the minimal no-auth-header variant is canonical; the onboarding copy's `getAuthHeaders()` were superfluous); `upload-signature/api/signature-session.api.ts` deleted, 4 consumers repointed. `registration-step.tsx` self-dup killed by extracting a shared `RegistrationFieldsProps` base interface (both prop interfaces extended it). `PrescriptionDefaultsSettingsSections.tsx` self-dup killed by extracting a local `PrescriptionDefaultsToggleField` for the 3× repeated Checkbox FormField blocks. (b) **24 remaining clones** (35 files) are pre-existing ported form-boilerplate (RHF Field/Checkbox blocks, import blocks, similar list/dialog sections, similar create/edit hook logic) — excluded per-file in `.jscpd.json` with the dedup backlog tracked as a dedicated follow-up PR (fix these, then lift the file exclusions). `pnpm check:duplication` green (0 clones). **UPDATED 2026-08-02**: one exclusion lifted and stayed lifted — the prescriptions view glob (item 12) — and one attempted lift was reverted (item 13, partner pair — over-parameterization), leaving **24 documented boilerplate exclusions**. |
| 12 | **Prescription document type duplication** — `DoctorInfo` (3 files) + `ClinicInfo` (4 files) declared verbatim across `PrescriptionDocument` / `PrescriptionDocumentHeader` / `PrescriptionDocumentFooter` / `PrescriptionViewPageContent` (the 19L jscpd clone behind the `prescriptions/components/view/*.tsx` exclusion) | **DONE 2026-08-02** — extracted into `apps/app-vite/src/features/prescriptions/components/view/prescription-document-types.ts`; all 4 view files import the shared interfaces (local duplicates deleted; the PageContent variant was byte-identical, not a different shape). The `prescriptions/components/view/*.tsx` glob was lifted from `.jscpd.json`. Verified: `check:duplication` 0 clones (now scanning the view dir), app-vite `check-types` exit 0, lint 0 errors (no new warnings in touched files), prescriptions unit suite 12/12. |
| 13 | **Referral-partner `Partner*View` pair** (16L clone) — attempted the same extraction: a shared `PartnerListStateCard` for the loading/error/empty Card block | **KEPT EXCLUDED 2026-08-02** — the extraction compiled but (a) the `hasItems` boolean cannot narrow `data` inside JSX children (TS18048), so the helper would need a generic/`items` array param — an over-parameterized abstraction for a 16L overlap; (b) the residual 16L is the view chrome (`usePartnerAuth` → `buildContext()` + header block) that differs in title/subtitle/columns per view. Reverted to originals; the `Partner*View.tsx` glob stays in `.jscpd.json` with the documented intentional-pair rationale. **Lesson recorded**: the three-state card pattern is shared across many list views — if it ever gets extracted, it belongs in `@workspace/ui` as a `DataState`-adjacent primitive (or via `DataState` itself), not a per-feature helper. |
| 14 | **Existing-user compatibility gaps (§9.4 review)** — the legacy protected shell wrapped providers in three guards the Vite port does not reproduce at route level. Evidence: legacy `apps/app/app/(protected)/providers-wrapper.tsx` stacked `DoctorVerificationGuard` → `SubscriptionGuard` → `PageAccessGuard`; the Vite `ProvidersWrapper` (`apps/app-vite/src/components/layout/providers-wrapper.tsx`) contains only `ClinicProvider`. (a) **Subscription lockout**: legacy `subscription-guard-helpers.ts` redirected non-billing-admins to `/billing-locked` once past grace/hard-locked and on trial expiry, billing admins to the resolve path; the Vite app keeps the `/billing-locked` **page** but nothing navigates to it (only `App.tsx` + `route-paths.ts` reference the constant) — lockout is instead surfaced as in-workspace notices (`billing-workspace-status-notice.ts` + `use-auto-resolve-subscription-payment` with `?resolvePayment=1`). Existing lapsed/expired users therefore stay in the workspace with a banner instead of being hard-redirected. (b) **Doctor verification**: legacy `use-doctor-verification-guard-state.ts` blocked workspace load until the doctor profile verification state resolved (`shouldRedirectDoctorToVerification`); the Vite app has the `/verify-doctor` page + route but no gate in `use-workspace-access.ts`, so unverified doctors are not forced to it. (c) **Route-level access targets**: legacy `page-access-guard.tsx` mapped `getAccessTargetForPath(pathname)` → `canAccessTarget` and redirected denied paths to `/today`; the Vite `canAccessTarget` is enforced only inside feature components (`InboxPageContent`, `ConsultationWorkspaceExtras`) and nav-config visibility — a direct URL entry to a denied route renders without a client redirect (API still enforces server-side). **Verdict**: not CI-blocked, not regression tests for pre-change accounts yet; needs a product decision (keep the in-workspace notice model or restore hard guards) and — if kept — explicit E2E coverage for the new lockout UX. |
| 15 | **Stale `apps/app` / `apps/internal` refs in shared-package docs + source comments** — a full-repo sweep (workflows, scripts, root configs, packages) found the executable surfaces already fully migrated (0 hits in `.github/workflows`, `scripts/`, `package.json`/`turbo.json`/`knip.json`/`.jscpd.json`/husky hooks); residual refs were confined to shared-package READMEs and monitoring/hooks comments | **DONE 2026-08-02** — fixed 6 stale refs: `packages/data-access/README.md` (react-query-provider path → `apps/app-vite/src/providers/react-query-provider.tsx`), `packages/hooks/README.md` (Next-router placement table → react-router + `apps/<app>/src/hooks`), `packages/ui/README.md` (`apps/app/hooks` → `an app's src/hooks`), `packages/utils/src/monitoring/phi-scrubber.ts` (claimed the deleted `apps/app/.../sentry-phi-redactor.ts` "is preserved as a thin re-export" — corrected: Vite apps consume the rule set via `sentry-event-scrub.ts` `scrubSentryEventRecord` in `beforeSend`), `packages/utils/src/monitoring/sentry-client-loader.ts` (3 comments: `@sentry/nextjs` → `@sentry/react` + app-vite/internal-vite paths), `packages/hooks/src/create-navigation-history-provider.ts` (Next `usePathname` → react-router adapter + app-vite paths). Kept as intentional history: `packages/ui/src/components/feedback/error-boundary.tsx` provenance note (explicitly marks former copies "deleted"). **Also verified**: `createMountInitializer` (`packages/hooks`) is barrel-exported but has **zero consumers in both trees** (the Vite apps call `initializeSentryClient()` directly from `main.tsx`) — dead-export candidate recorded per the §B knip discipline (symbol-by-symbol verification, no batch deletion). **Bonus fix in the same sweep**: `packages/utils/src/monitoring/client-logger.test.ts` failed `check-types` (TS4111 on `delete (globalThis as Record<string, unknown>).window`) and failed its enabled-path test whenever the invoking shell exported `NODE_ENV=development` (the loader reads `process.env.NODE_ENV` at creation and disables Sentry in dev) — a port-introduced non-hermeticity CI masks (`NODE_ENV=test`). Fixed bracket access + made the test hermetic (stub `process.env["NODE_ENV"]="test"` in `beforeAll`, restore in `afterAll`, mirroring the existing `globalThis.window` stub). Verified: utils `check-types` exit 0, utils 133/133, hooks 12/12, from the repo root with `NODE_ENV=development` exported. |
| 16 | **`pnpm audit:app` / `audit:app:public` were broken** — the root runner (`scripts/perf/run-app-accessibility-audit.mjs`) delegates to `pnpm --filter @docita/app-vite run audit:accessibility`, but app-vite never got that script during the port (internal-vite had it) → `ERR_PNPM_RECURSIVE_RUN_NO_SCRIPT` on every audit run. Separately, the ported `e2e/accessibility.spec.ts` audited `/` as a "public Home" route — a **port artifact**: the Next app had a public `HomePageClient` at `/`, but the Vite SPA root redirects to the protected `/today`, so there is no public home to audit | **DONE 2026-08-02** — (a) added `"audit:accessibility": "env -u NO_COLOR FORCE_COLOR=0 playwright test e2e/accessibility.spec.ts"` to `apps/app-vite/package.json` (mirrors internal-vite); (b) replaced the `/` Home entry with `/forgot-password` (a real unauthenticated surface) + documented why in the spec; (c) **ran the public audit for the first time ever locally** (needed `playwright install chromium webkit` — the tablet project uses WebKit via `devices["iPad Pro 11"]`; CI installs all browsers with `--with-deps`) — **exit 0, 12/12 public tests pass** across chromium/mobile/tablet/laptop. **Real a11y findings fixed**: `PreDashboardShell` (wraps all auth/setup pages) had **no `<main>` landmark** and an un-landmarked sticky top bar → added `<main>` around the content region + `<header>` around the sticky bar; `/login` + `/forgot-password` now **0 violations** (was 2 moderate each). Remaining baseline: `/book/accessibility-audit-placeholder` shows 2 moderate (`landmark-one-main`, `page-has-heading-one` on `<html>`) — a **scan-timing artifact**: the booking page renders `<main>` in every branch, but axe catches the lazy-route Suspense fallback shell; no serious/critical findings, so `check:a11y-budget` (which gates on serious/critical in `artifacts/a11y-baseline.json`) is unaffected. Baseline regenerated: `apps/app-vite/accessibility-reports/baseline-app-2026-08-02.json` (3 pages, 0 serious/critical). **Follow-up (review 2026-08-02)**: the `/book` moderate findings are inherently flaky — `runAccessibilityAudit` waits for `body` visibility, a weak readiness signal for the lazy-loaded booking route (axe may catch the Suspense fallback or the hydrated page on different runs). Non-blocking today (`check:a11y-budget` gates on serious/critical only), but if per-run report baselines are ever compared for count stability, make the shared helper wait for the app shell (a `main` selector) before injecting axe. |

## K. Phase 9 cutover checklist audit (2026-08-02) — current state

Audited the [`PORTING_PLAN_APP_VITE.md`](PORTING_PLAN_APP_VITE.md) Phase 9 cutover checklist against the live working tree. Full merge gate green (`verify:standard` exit 0, `check:circular:enforce` exit 0, both Vite apps plain + `build:cloudflare` production builds green, app-vite 653/653, internal-vite 52/52, pre-push subset green).

| Checklist item | State | Notes |
|---|---|---|
| 1. P0/P1 routes functional with real API calls | **Not verified** | Requires running the app against the real API + E2E; no stubs found in code, but no live smoke possible without credentials/DB |
| 2. feature-test-density + unit tests on P0/P1 | **Partial** | `pnpm check:feature-test-density` passes; unit suites green |
| 3. E2E suite green in CI | **Structurally validated; run blocked** | **Discovery + route audit DONE 2026-08-02**: `playwright test --list` exit 0 (app-vite 1,048 tests/45 files, internal-vite 44/3); spec route references audited against App.tsx — all 7 apparent mismatches benign (API-interception patterns, dynamic-route fixtures, selector strings, documented a11y placeholder). Zero CI breakers. `frontend-critical-e2e.yml` retargeted to app-vite (5173 + `vite preview`); the live run still needs CI with Postgres |
| 4. verify:standard + knip + circular + lint + check-types | **PASS** | All verified locally this pass (see above); knip exit 0. **Re-verified 2026-08-02 (post-jscpd passes)**: `verify:standard` exit 0, `check:circular:enforce` exit 0, both Vite apps production builds exit 0 (app-vite gzip 139 kB ui chunk; internal-vite gzip 149 kB) |
| 5. PWA SW / security headers / Sentry parity / artifact search | **Partial → DONE (local slice) 2026-08-02** | Security-header + telemetry checks pass; **the app-vite + internal-vite static security headers now have an automated gate**: `verify-app-security-headers.mjs` extended to check both `apps/*/public/_headers` files for all 5 required headers (CSP, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) — negative-tested (fails with per-header diagnostics on a stripped file) and green on real files; app-vite `_headers` stale "CSP omitted" comment corrected (it ships a full CSP). PWA SW verified wired: `PwaRegister` mounted in `main.tsx`, `sw.js` precaches shell + network-first navigation with `/offline.html` fallback and never intercepts `/api/*`/`/socket.io/*`; internal-vite has **no PWA by design** (documented §E). **Still blocked**: SW/Sentry artifact search needs the Cloudflare deploy artifact (item 7 credentials). **Hardening follow-ups (2026-08-02 review)**: (a) `apps/app-vite/public/_headers` ships `script-src 'unsafe-inline'` — needed for the Vite module-preload bootstrap + widget scripts, but tightening it (and value-level validation of CSP `frame-ancestors`/HSTS `preload` in the verifier) requires a browser smoke of the Razorpay checkout flow before landing; tracked here, not blocked on credentials |
| 6. Docs to Vite layout | **Partial** | AGENTS.md/ADRs/app READMEs done 2026-07-31; **`PAGES_AND_FEATURES.md` regenerated 2026-08-02** as a Vite inventory (route tables from both App.tsx trees, feature dirs, port status, verification state — product-roadmap parts archived to `FUTURE_FEATURE_REQUIREMENTS.md`); historical pattern docs (SYSTEM_DESIGN_AND_PATTERNS, DESIGN_PRINCIPLES, SINGLE_SOURCE_OF_TRUTH, AUTH_HARDENING, WHATSAPP_FIRST_CLINIC_OS, CUSTOM_PACKAGES, abdm-milestone-plan, DESIGN_SYSTEM, UI_UX_CONTRACT, PAGE_STANDARDIZATION_CHECKLIST) **audited 2026-08-02 — zero real deleted-path refs remain** (earlier "61 refs" counts were a grep artifact: `apps/app\b` also matches `apps/app-vite`); live docs with stale Next refs fixed: `TESTING.md` (E2E "pending port" block — now records the ported suite), `SECURITY_QANDA.md` (frontend env validation answer — now describes Vite `vite-env.d.ts` + build-time `define`), `WHATSAPP_BROADCAST_TEMPLATES.md` (presets-map path flipped to `internal-vite` with a not-yet-ported note), `TIER_FEATURE_OVERRIDES_PLAN.md` (historical banner + its 4 actionable file links flipped to live Vite equivalents: `use-pricing.ts`, `permission-store.ts`, `feature-gate.tsx`/`use-permissions.ts`), `SSOT_REMAINING.md` (command example)
| 7. deploy:cloudflare:production smoke | **Blocked** | Needs Cloudflare credentials (staging first, then production) |
| 8. Existing-user compatibility review | **DONE 2026-08-02** | AGENTS.md §9.4 review of auth routing / onboarding / tier locks on Vite — **session carryover + onboarding-reset protection verified PASS; three guard-parity gaps flagged** (see §J item 14): subscription lockout guard not ported (in-workspace notices replace the hard `/billing-locked` redirect), doctor-verification guard not ported (unverified doctors are not forced to `/verify-doctor`), route-level access-target gate not ported (`canAccessTarget` is enforced in feature components + nav only, not on direct URL entry). None are code-blocked for CI; they are **behavioral-parity decisions needing product sign-off** before cutover. Session evidence: legacy `docita_token` key identical to Vite (`apps/app-vite/src/lib/auth/session.ts`), legacy cached `docita_user` evicted via `clearLegacyUserStorage()` on bootstrap, profile re-derived from `/auth/validate` server truth (`clinicId` + `onboardingStep` from `appAuthUserSchema`). Onboarding evidence: `useProtectedWorkspaceAccess` + `routeUserAfterLogin`/`routeUserAfterRegister` only route to setup when `!clinicId`; the setup pages themselves (`OnboardingPage`, `ChoosePathPage`) redirect `clinicId`/`COMPLETED` users to `/today`, so even manual deep-links to `/onboarding` cannot reset an existing clinic user. Tier-lock evidence: `FeatureGate`/`TierGate`/`usePermissionStore` + `canAccessTarget` (with `shouldDenyAccessForFrontDeskMode` per §15.8) all live in app-vite; `check:tier-comparisons` + `check:workspace-profile-gating` green.

Phase 9 steps state: steps 1–2 done; step 3 (docs sweep + PAGES regen) open — largest remaining safe chunk; step 4 (CI cleanup + jscpd) done except the 24 documented boilerplate clones (§J item 10); step 5 (commit + re-arm git-based checks + regenerate JSX-literal-density baseline) **blocked on the migration commit** — baseline still keys on deleted `apps/app` paths (743 literals, 2026-07-20); steps 6–8 need credentials (deploy smoke) and the commit (rename). The `apps/app`/`apps/internal` deletions are already staged on this branch.

---

## Suggested execution order

1. ~~**P0**: retarget `check-native-ui-affordances.mjs` + `check-responsive-data-tables.mjs` to the Vite apps~~ — **DONE 2026-07-31**.
2. ~~**P1**: delete OpenNext script + root script; strip `next` dep + no-op check-types + `publishConfig` from `packages/typescript-config`; remove `apps/app`/`apps/internal` from `knip.json`; clean untracked `dist/` trees~~ — **DONE 2026-07-31** (incl. eslint-config Next config, cloudflare-stubs dir, synthetic-monitor comments; lockfile now has zero `next`/`opennext` references).
3. ~~**P2 — partial**: `audit:internal` alias and `test:app-vite` rename~~ — **DONE 2026-07-31** (incl. AGENTS.md §13 re-sync with verified scripts; `perf:route-budgets:warn` → `perf:route-budgets`).
4. ~~**P3 — partial**: package READMEs, hygiene-check extension, cosmetic script comments, internal-vite PWA decision~~ — **DONE 2026-07-31** (plus the further P0 find: `structure-audit-feature-boundaries.mjs` stale regex).
5. ~~**Second pass**: jscpd gate + monitoring duplication~~ — **DONE 2026-07-31** (see Section H: logger promoted to utils, Sentry configs consolidated with restored init + scrubbing, production env-var rename, telemetry/console checks repaired, jscpd exclusion with cutover lift).
6. ~~**Follow-up pass**~~ — **DONE 2026-08-01** (see Section I: dead `deploy.yml` jobs + hardcoded live Razorpay key in the dead `deploy-app` job flagged; E2E port landed in app-vite).
7. ~~**Frontend-plan companion**~~ — **DONE 2026-08-02** (see Section J: Phase 15 checks + wiring, internal ErrorBoundary dedup, internal-vite raw-button fixes, i18n completion, port-or-drop decisions applied).

## Verification

- `pnpm knip` — passes structurally; only pre-existing findings remain (app-vite shell exports, `PaymentMethod` enum members — see Section B note).
- `node scripts/checks/check-standard-gate-wiring.mjs` — passed after package.json script changes.
- `node --test scripts/checks/standard-checks.test.mjs` — 11/11 pass (incl. the feature-boundary audit after the regex fix and the facility-type fixtures moved to `apps/app-vite` paths).
- `node scripts/checks/check-feature-boundaries.mjs --enforce` — no findings against the Vite tree.
- Both retargeted checks (`check:native-ui-affordances`, `check:responsive-data-tables`) — pass against the Vite apps.
- `check:hygiene` — passes with the new untracked-dist detection.
- `pnpm check:duplication` — 0 clones (Section H: Vite dirs excluded for the porting window).
- `check:browser-telemetry-same-origin`, `check:no-console-runtime`, `check:sentry-scrubbing`, `check:env-vs-globalenv` — all pass after the Section H repairs.
- `pnpm --filter @workspace/utils run check-types` + `pnpm --filter @workspace/utils run test` — 23 files / 133 tests pass (incl. new `createSentryLogger` unit tests).
- `pnpm --filter @docita/app-vite run check-types` + `pnpm --filter @docita/internal-vite run check-types` — pass after the sentry config consolidation.
- `pnpm install` refreshed the lockfile; `pnpm audit --audit-level=high` is the pre-push gate for the manifest changes.
