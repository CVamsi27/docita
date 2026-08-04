# Codebase Cleanup Plan — Removal Inventory

Point-in-time: **2026-08-03**. This document owns deletion and consolidation decisions; release sequencing and operational gates live in [`analysis/EXECUTION_PLAN.md`](analysis/EXECUTION_PLAN.md).

The single inventory for removing unwanted stuff from the repo: dead files, dead code, unused functions, unused dependencies, stale configs, obsolete CI jobs, and legacy docs. It consolidates the removal targets already scattered across [`PORTING_PLAN_APP_VITE.md`](PORTING_PLAN_APP_VITE.md) ("Do not port" rules + Phase 9), [`REPO_GAPS_AND_IMPROVEMENTS.md`](REPO_GAPS_AND_IMPROVEMENTS.md) (sections B/H/I), and live tooling output (`pnpm knip`).

## % Completed

| Bucket                             | %                       | Notes                                                                                                 |
| ---------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------- |
| A. Already removed                 | **100%**                | next/opennext/design-tokens/env-rename/logger-dedup done                                              |
| B. Safe to delete now              | **partial**             | 24 confirmed orphans removed; remaining exports/types require symbol-by-symbol review                 |
| C. Product decision (port-or-drop) | **decisions recorded**  | Drops/deferrals are documented; route and dependency validation remains                               |
| D. Cutover-gated                   | **in progress**         | Vite tree tracked; baselines, remaining exclusions, rename, deploy, and reference sweep remain        |
| E. After cutover                   | **open**                | `NEXT_PUBLIC_*` cleanup, secret migration, and canonical rename follow the compatibility-safe sequence |
| F. Dependency decisions            | **open**                | react-router, brace-expansion, and other audit findings require an owned resolution                   |
| G. Keep — verified in use          | **100%**                | All items verified                                                                                    |
| **Overall cleanup**                | **not a release score** | Use the execution plan's phase gates and evidence, not a weighted percentage                          |

**Last inventory refresh: 2026-08-03** (Vite trees are tracked on the migration branch; `apps/app` and `apps/internal` are absent from the branch tip; app-vite remains at the 1,404-file audit snapshot / 802 TSX components / 121,121 lines, with post-P0–P2 evidence recorded in `EXECUTION_PLAN.md`).

**Context**: full measurements behind these decisions are in the [`analysis/`](analysis/README.md) series (features, UI/UX, database, standards, security, performance, cost, trash); product prioritization is in [`FUTURE_FEATURE_REQUIREMENTS.md`](FUTURE_FEATURE_REQUIREMENTS.md).

Each entry is classified into one bucket:

| Bucket                                 | Meaning                                                  | Who clears it   |
| -------------------------------------- | -------------------------------------------------------- | --------------- |
| **A. Already removed**                 | Done 2026-07-31 — do not redo                            | —               |
| **B. Safe to delete now**              | No product decision, no cutover dependency               | Any PR          |
| **C. Product decision (port-or-drop)** | Needs product sign-off before deletion                   | Product + eng   |
| **D. Cutover-gated (Phase 9)**         | Delete only when the Next apps are gone / Vite committed | Cutover PR      |
| **E. After cutover**                   | Deferred cleanup once the Vite apps own the names        | Post-cutover PR |
| **F. Dependency decisions**            | Upgrade/remove decisions, not pure deletion              | Eng decision    |
| **G. Keep — verified in use**          | Do NOT delete; checked and confirmed live                | —               |

## Cleanup safety contract

Cleanup is complete only when removal improves the codebase without weakening behavior or safety. Every deletion or consolidation must include:

- a zero-consumer check across both Vite apps, dynamic imports, route metadata, E2E helpers, and relevant historical source when the port is incomplete;
- a product decision for dropped routes and a replacement or redirect for user-facing flows;
- a check that shared Zod contracts, tenant/RBAC guards, audit events, PHI redaction, upload validation, webhook behavior, and migrations are unchanged;
- the smallest relevant typecheck, lint, unit/integration suite, structure/hygiene gate, and `pnpm knip` refresh;
- a reversible commit with the deleted path and reason recorded in the inventory.

Tool output is evidence, not authority: a zero exit code can still be vacuous when a git-based scanner sees no tracked files, and a Knip finding can be a deliberate public re-export. The cutover PR must re-run all git-based checks after the Vite tree is committed.

---

## A. Already removed (2026-07-31 — do not redo)

Reference: REPO_GAPS sections B + H. Key deletions:

- `scripts/deploy/ensure-opennext-prefetch-manifest-patch.mjs` + root script; `next`/`opennext` fully gone from `pnpm-lock.yaml`.
- `packages/typescript-config/dist/` (1.7 MB stray build), `apps/api/dist/` (19 MB), `apps/worker/dist/` (9.8 MB) — untracked `dist/` junk (hygiene check now flags the class).
- `scripts/deploy/cloudflare-stubs/`, `packages/eslint-config/next.js` + `@next/eslint-plugin-next` devDep.
- `knip.json` blocks for `apps/app` / `apps/internal`.
- 30 stale `"use client"` directives stripped from `apps/app-vite/src` (7 `.ts` + 23 `.tsx`).
- `NEXT_PUBLIC_*` → `VITE_*` env rename across `wrangler.toml`/`.env.example`/`turbo.json` (fixes a live prod config bug).
- Logger pair deduped into `packages/utils/src/monitoring/client-logger.ts`; Sentry configs consolidated; `PatientFormFields` extracted; `invalidateIpdQueries` extracted.
- Both Hono workers adopted `proxyUpstreamApiRequest` (the "adopt" path — `upstream-api-proxy` no longer has zero consumers).

## B. Safe to delete now

### B.1 Dead Cloudflare deploy jobs (also removes a hardcoded live credential) — DONE 2026-08-01

`.github/workflows/deploy.yml`:

- Job `deploy-app` (was lines 257–286, `name: Deploy app (Cloudflare — deprecated)`, `if: false`) — ran `pnpm --filter @docita/app run deploy:cloudflare:production`; the `@docita/app` package no longer exists. **Line 285 embedded the live Razorpay key `rzp_live_SPNm7w8Ig24OSX`** as a fallback var — deleting the job removed it from the repo.
- Job `deploy-internal` (was lines 316–341, `name: Deploy internal (Cloudflare — deprecated)`, `if: false`) — same class, referenced deleted `@docita/internal`.

`.github/workflows/ci.yml`:

- "App Unit Checks (Next.js — deprecated)" (was lines 132–137) and "Internal Unit Checks (Next.js — deprecated)" (was lines 140–145) — no-op echo jobs for deleted apps.

Also removed the orphaned `app:` / `internal:` output declarations from the `changes` job in both files (the detect script stopped emitting them; nothing consumed them).

**Removed 2026-08-01**; both files re-validated as YAML; `check-standard-gate-wiring` passes. REPO_GAPS §I rows 1–2 resolved.

### B.2 Knip findings: 278 unused exports + 287 unused exported types

`pnpm knip` exits 0 (no unused files, no unused deps), but ~565 unused exports/types remain, concentrated in app-vite. Regenerate the exhaustive list with `pnpm knip`. Pre-batch-1 distribution (approximate; live numbers in [`analysis/TRASH_ANALYSIS.md`](analysis/TRASH_ANALYSIS.md) §1):

| Area                             | Count | Notes                                                                                                                                                                       |
| -------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/features/` (app-vite)       | 210   | Largest: consultation (63), invoices (24), subscription (18), dashboard (16), documents (15), appointments (13), public-booking (12), legal (10), lab-tests (10), desk (10) |
| `src/lib/` (app-vite)            | 85    | Porting-debt exports: shells/types nothing consumes yet                                                                                                                     |
| `src/components/` (app-vite)     | 33    | e.g. `useTier`/`useIsFeatureLocked`/`useRequiredTier` in `feature-gate.tsx`, locale-switcher helpers                                                                        |
| `src/hooks/` + `src/test-utils/` | 9     | e.g. `use-razorpay` result types                                                                                                                                            |
| `e2e/` (app-vite)                | ~10   | `patient-helpers.ts` exports the 3 ported specs do not import (e.g. `API_URL`, `TEST_PASSWORD`, `setupAuthUser`, `fetchPatientByApi`)                                       |
| `src/` (internal-vite)           | 4     | `user-facing-errors.ts` context type                                                                                                                                        |

### Deep analysis: dead code signals

| Signal                   | Count   | Action                                                |
| ------------------------ | ------- | ----------------------------------------------------- |
| Files with zero imports  | **118** | Batch cleanup — verify each has no dynamic references |
| Unused barrel `index.ts` | **46**  | Convert to pure re-exports or delete                  |
| Features without tests   | **7**   | Add tests or mark as intentionally untested           |
| Features without hooks   | **18**  | Many are SHELL features — no action until ported      |

**Verified 2026-08-02**: knip findings re-confirmed non-blocking (`pnpm knip` exit 0). Spot-check of the "safe" targets showed they are **not** dead: the `use-razorpay.ts:23` re-export (`RazorpayCheckoutResult` / `RazorpayResponse`) is consumed via the hooks module by `setup/hooks/use-plan-selection-action.ts`, `setup/hooks/clinic-registration-helpers.ts`, and `setup/hooks/onboarding-plan-checkout.ts` — a knip false positive on re-export heuristics. `e2e/utils/patient-helpers.ts` exports flagged unused (`TEST_PASSWORD`, `createUniqueClientIp`, `fetchPatientByApi`, `reuseSharedFrontDeskClinicUser`, …) need per-symbol two-tree verification before deletion per the rules below; deferred. **Conclusion**: each item in this bucket needs individual verification — no batch deletion without checking both trees.

**Batch 1 done 2026-08-01** (verified dead in both the Vite tree and the git-HEAD Next tree before deleting):

- `useTier`, `useIsFeatureLocked`, `useRequiredTier` + the `LockedFeatureIndicator` re-export in `apps/app-vite/src/components/auth/feature-gate.tsx`; `LockedFeatureIndicator` in `feature-gate-sections.tsx` (had zero consumers in Next too); dropped the now-unused `Lock`/`Tooltip` imports.
- `export type { UserFacingErrorContext }` re-export removed from `apps/{app-vite,internal-vite}/src/lib/errors/user-facing-errors.ts` (type still used locally; zero external importers).
- Converted unused prop-type exports (`FeatureGateProps`, `TierGateProps`, `FeatureTierBadgeProps`, `TierBadgeProps`, `LockedFeatureCardProps`) to local types (zero consumers in both trees; `FeatureGateProps`/`TierGateProps` remain as local annotations).
- Result: knip findings 203→**198** exports, 212→**209** types (pre-Batch-1 counts); current measured: **278 exports, 287 types** (more thorough scan after feature ports landed); app-vite `check-types` green (only the pre-existing `MemberManagementUI` settings error remains — mid-port).

**Deletion rules for this bucket** (per porting standards):

- Only delete exports with zero consumers in **both** Vite trees, route metadata, dynamic imports, and the ported E2E specs. The Next apps are absent from the current branch tip, so use the recorded migration inventory or historical Git revisions only when a legacy consumer question remains. Example: `getSafeUserMessage` (internal-vite) stays when its current consumers or documented parity contract require it.
- **Keep, do not delete**: `locale-switcher` helpers (`LOCALES`, `DEFAULT_LOCALE`, `isLocale`, `readStoredLocale`, `persistLocale`) — required by Phase 1 locale-switcher UI; `browserRequest` (used by login/upload flows); any symbol the porting plan names as "parity carryover" until its port lands.
- Re-run `pnpm knip` after each batch; the goal is 0 findings for app-vite `src/`.

### B.3 Intentionally-unused i18n key — DONE 2026-08-01

`table.medsCount` in `apps/app-vite/src/messages/{en,hi}.json` (was line 1726) — the porting plan records it as intentionally unused (plain i18next renders the count). **Deleted from both locales 2026-08-01**; `check:i18n-translation-keys --enforce` passes.

### B.4 Unused `PaymentMethod` enum members

`packages/types/src/billing/payments.ts:10-17` — the API consumes the enum via `paymentMethodSchema` (native enum) and string literals; `PaymentMethod.WALLET` / `PaymentMethod.NET_BANKING` have no direct consumers. Verify no `PaymentMethod.WALLET`/`.NET_BANKING` references exist in `apps/api/src` + `apps/worker/src`, then drop the members (or move the enum to the string-literal union the schema already constrains). REPO_GAPS §B note: flagged as deliberate pre-cleanup; touching billing needs a review.

## C. Product decision (port-or-drop review — decisions recorded 2026-08-02)

Default per the porting plan: **drop, don't port** anything unconfirmed as live business. The decisions below are recorded in `PORTING_PLAN_APP_VITE.md` Phase 6; remaining work is route/dependency validation, not another product-sign-off loop.

| Item                                         | Next footprint               | Decision                                     | Required cleanup/validation                                                                                              |
| -------------------------------------------- | ---------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Excel bulk import (`/import/excel`)          | 12 files                     | **DROP**                                     | Route/constants removed; imports hub CTA opens the supported bulk-import wizard; verify no E2E or nav dependency.        |
| OCR upload (`/import/ocr`)                   | 31 files                     | **DROP**                                     | Placeholder route/constants removed; retain only the future `Feature.OCR_BASIC` type contract if intentionally planned.  |
| Feedback                                     | 4 files (app) + 9 (internal) | **DROP from app; internal feature retained** | Verify app has no route/CTA; do not remove the real internal feedback surface.                                           |
| Guided tour                                  | 17 files                     | **DROP**                                     | No files remain; onboarding wizard is the supported first-run guidance.                                                  |
| Dev-tools `/tools`                           | 10 files                     | **KEEP AS SHELL**                            | Keep only `VisualTestPage`/`E2ESessionSeedPage`; retain the tools-route gate and document dev-only exposure.             |
| Specialty modules (dental charts)            | via ipd/referrals            | **KEEP / DEFER**                             | Do not delete; validate the real content rendered through current shells and record dedicated-page follow-up separately. |
| IPD beds / specialty pages                   | 13 files                     | **KEEP / DEFER**                             | Current routes render ported content; no re-routing or deletion without a new product decision.                          |
| `/reports` route + `AdvancedMetricsCharts`   | analytics                    | **CLOSED**                                   | `/reports` is wired and feature-gated; dead chart files were removed in the P1 batch.                                    |
| `inventoryApi`                               | inventory                    | **CLOSED**                                   | Dead carryover and rules were removed; UI uses `@workspace/data-access`; zero remaining imports.                         |
| `patient-portal` prescription/consent extras | —                            | **KEEP pending product scope**               | Validate current portal behavior in the real route matrix before trimming any extras.                                    |

Exit: `pnpm check:tools-route-gate`, `pnpm check:e2e-nav-routes`, route inventory, and targeted staging smoke pass with no dangling route, CTA, access target, or E2E dependency.

## D. Cutover-gated (Phase 9 — delete in the cutover change set)

1. **Delete `apps/app` + `apps/internal`** — **DONE at the current branch tip**; keep only intentional historical references in audit/migration records.
2. **Lift the jscpd exclusion** in `.jscpd.json` (`apps/app-vite/`, `apps/internal-vite/`) and fix the real clones it hides: the byte-identical `api/index.ts` Hono routing shell pair (dedupe into a shared worker or document the per-app split). Gate: `pnpm check:duplication` (0 clones) without the exclusion.
3. **Regenerate the JSX-literal-density baseline** — `scripts/checks/baselines/jsx-literal-density.json` still keys on deleted `apps/app` paths (743 literals, 2026-07-20): `node scripts/checks/check-jsx-literal-density.mjs --baseline`.
4. **Re-arm the git-based checks** — the Vite apps are now tracked, so re-run `check:native-ui-affordances`, `check:responsive-data-tables`, `check:feature-boundaries`, and `check:jsx-literal-density` against the current tree; regenerate path-sensitive baselines before closing the cutover.
5. **Flip or archive the historical Next-referencing docs** (Phase 9 step 3 list): `SYSTEM_DESIGN_AND_PATTERNS` (61 refs), `DESIGN_PRINCIPLES_AND_PATTERNS` (10), `SINGLE_SOURCE_OF_TRUTH` (1), `AUTH_HARDENING` (3), `WHATSAPP_FIRST_CLINIC_OS`, `CUSTOM_PACKAGES`, `abdm-milestone-plan`, `DESIGN_SYSTEM` (3), `UI_UX_CONTRACT` (1), `PAGE_STANDARDIZATION_CHECKLIST` (1). Then the zero-reference grep: `grep -rn "apps/app\b\|apps/internal\b" . --include="*.md" --include="*.yml" --include="*.ts" --include="*.mjs"` must hit only intentional history/audit notes.
6. **Regenerate `docs/PAGES_AND_FEATURES.md`**.
7. **Delete the B.1 CI jobs if not already done** (batch them into the cutover PR if they missed the "safe now" batch).

## E. After cutover

1. **`NEXT_PUBLIC_*` API env cleanup** — `apps/api/src/shared/modules/config/env-schema.ts:42-43` still requires `NEXT_PUBLIC_APP_URL`/`NEXT_PUBLIC_API_URL`; the Vite apps only set `VITE_*`. Make them optional aliases defaulting from `APP_URL`/`VITE_API_URL`, update `docs/operations/DEPLOYMENT.md` + AGENTS.md §6, then migrate Fly secrets (REPO_GAPS §D).
2. **`docs/ONBOARDING.md` §4** still lists `NEXT_PUBLIC_API_URL` as a required API var — fold into the same cleanup.
3. **Rename `app-vite`/`internal-vite` → `app`/`internal`** (Phase 9 step 8) and sweep all references — this is where the bulk of "remove the `-vite` suffix" work lands.

## F. Dependency decisions

| Dependency                                         | Issue                                                 | Decision needed                                                               |
| -------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------- |
| `react-router` 7.18.2 (`apps/app-vite`)            | RSC-mode CSRF bypass; patched only in v8.3.0+ (major) | Verify v7→v8 API compatibility for the 89-route tree, then bump. REPO_GAPS §G |
| `brace-expansion` ≤5.0.7 (transitive, dev tooling) | DoS; patch at 5.0.8                                   | Bump the owning dev tool (or add an override) when next touching dev deps     |

No other dependency removals are pending: `pnpm knip` reports zero unused deps, and `pnpm audit --audit-level=high` shows only the two pre-existing advisories above.

## G. Keep — verified in use (do not delete)

- `dist/` dirs in packages/apps that legitimately build: `packages/{auth,types,utils,hooks,data-access,ui}`, `apps/*-vite`, `apps/landing` (REPO_GAPS §B).
- `VITE_*` env names in `wrangler.toml`/`turbo.json`/`.env.example` — the config-sync rule (§16.2) requires them; `NEXT_PUBLIC_API_URL`/`NEXT_PUBLIC_APP_URL` stay in turbo because the API server config + landing consume them (until §E.1).
- Hardcoded Sentry DSNs in `apps/app-vite/wrangler.toml` + `apps/internal-vite/wrangler.toml` — flagged (REPO_GAPS §H item 8) to move to Cloudflare Worker Secrets; **keep until secrets exist** (a build that references an unset DSN would disable Sentry).
- `PaymentMethod` enum itself — consumed via `paymentMethodSchema` (`z.nativeEnum`); only the unused members in B.4 are candidates.
- Legacy symbols named in AGENTS.md §15.8 (removed `FRONT_DESK*` tiers, `workspaceProfile`, 9-state invoice model, 1-value `DiscountType`) — enforced by checks; do not reintroduce, nothing to delete.

## Cleanup release gates

Before the cleanup PR is considered mergeable:

1. Run the relevant package checks for every changed area; for cross-cutting deletion batches run `pnpm lint`, `pnpm turbo check-types --continue`, `pnpm test`, `pnpm check:hygiene`, and `pnpm verify:standard`.
2. Re-run `pnpm knip` and distinguish actionable findings from intentional barrels, public re-exports, dynamic imports, and parity carryovers.
3. Re-run `pnpm check:circular:enforce`, `pnpm check:package-boundaries`, `pnpm check:feature-boundaries`, `pnpm check:prisma-boundary`, and the relevant PHI/audit/tenant checks whenever a shared or backend-facing module changes.
4. After the Vite tree is committed, lift the remaining migration exclusions and re-run all git-based checks. A pre-commit pass is not evidence for a check that scans `git ls-files`.
5. Keep deletion batches small enough to revert independently; attach the removed-file inventory, product decision, command results, and any release-risk note to the PR.

The cleanup is not the release gate by itself. The final branch must also satisfy the authenticated E2E, accessibility, performance, Cloudflare, secret, observability, and rollback requirements in [`analysis/EXECUTION_PLAN.md`](analysis/EXECUTION_PLAN.md).

## How to regenerate every list

```bash
pnpm knip                                   # unused exports/types (B.2), unused files, unused deps
pnpm check:duplication                      # clones after jscpd lift (D.2)
node scripts/checks/check-jsx-literal-density.mjs --baseline   # rebuild baseline (D.3)
node scripts/checks/check-standard-gate-wiring.mjs             # after CI job edits (B.1)
node scripts/checks/check-feature-boundaries.mjs --enforce     # after feature dir deletions (C)
grep -rn "apps/app\b\|apps/internal\b" . --include="*.md" --include="*.yml" --include="*.ts" --include="*.mjs"   # zero-reference check (D.5)
pnpm verify:standard && pnpm knip && pnpm check:hygiene        # full gate after any cleanup batch
```
