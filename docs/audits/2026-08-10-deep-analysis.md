# 2026-08-10 Deep Analysis

> **Status:** Audit complete; cleanup branch `fix/cleanup-deep-analysis-2026-08-10` is local-only (4 commits, all gates green). Full evidence and session timeline in [`2026-08-10-session-notes.md`](2026-08-10-session-notes.md). The deep-analysis source report lived at `.fallow/deep-analysis-2026-08-10.md` (gitignored fallow cache; not part of the committed tree).

## Method

General-purpose subagent ran a structured deep-dive across the whole monorepo on 2026-08-10:

- Read `AGENTS.md` and the two most recent prior audits (`2026-05-comprehensive-audit.md`, `2026-06-10-full-repo-audit.md`) to avoid re-flagging already-covered items.
- Re-ran every gate that the audit-script landscape exposes (`pnpm check:controller-cqs`, `check:file-size-budget`, `check:sensitive-logging`, `check:as-cast-density`, `check:button-primitive`, `check:colors`, `check:a11y-budget`, `check:jsx-escape-literals`, `check:cron-heartbeat-coverage`, `check:duplication`, `perf:budget:warn`, `pnpm --filter @docita/api run test` — 416 suites, 3254 tests).
- Targeted grep scans: `console.*` (apps + worker + landing), `as any`, `@ts-ignore`, `TODO/FIXME/XXX`, hardcoded secrets, `Date.now()/new Date()` in domain, unbounded `findMany`, `Promise<unknown>`, `text-[Npx]`, `rgba(`, `#xxxxxx`, `\uXXXX`, native `title=` on non-Dialog, raw `<button>`, raw `<select>`, `<input type="date">`, `window.confirm/alert/prompt`, RBAC-decorator usage, `@Public()` endpoints, multi-tenant repository access.
- Per-file deep-dive (≤100 lines each) on the 9 `text-[Npx]` files, 17 `\uXXXX` files, plus key service / repository / controller files in compliance, feedback, payments, scheduling, whatsapp, and the internal pricing-admin path.

## Headline

**Codebase is in genuinely good shape.** All ~80 `verify:standard` checks pass on `main` at session start; the API test suite is green; knip is clean; jscpd reports 0 clones; the 26 `KNOWN_LEGACY_PRISMA_SERVICE_LEAKS` items are tracked in the `check:prisma-boundary` allowlist (no new violations). Tenant isolation, RBAC, ABAC, and PHI-logging are all enforced by automated checks.

**Positives worth recording:** zero `as any` in source, zero `console.*` in `app`/`internal`, zero `@ts-ignore` / `@ts-expect-error`, zero `TODO`/`FIXME` in source, zero `Date.now()` / `new Date()` in `apps/api/src/domains/**` (IClock fully adopted), all RBAC decorators on controllers (the codebase uses class-level access guards rather than per-method `@Roles()`).

## Top 5 issues by impact

1. **Missing automated check for hardcoded font sizes** — 9 surviving `text-[10px]/[11px]/[13px]` violations of `AGENTS.md §4.3 / UI_UX_STANDARD_2026 §1` in clinical surface files. Fixed in cleanup branch via new `scripts/checks/check-token-typography.mjs` + 9 file edits swapping to `var(--fs-2xs)` / `var(--fs-sm)` tokens.
2. **`apps/api/src/domains/billing/application/services/razorpay-invoice-webhook.service.spec.ts` had 1 test** for a money-moving webhook handler. Fixed in cleanup branch: now 5 tests covering signature mismatch, idempotency replay, missing session, payment_link.paid, and the unsupported-event ignored branch.
3. **`Promise<unknown>` in 19 places** in domain services. Fixed in cleanup branch where it leaked Prisma row types across boundaries (compliance + feedback + doctor-profile). The 8 remaining are intentional — generic runtime utilities or open Prisma types where `unknown` is the correct type for an opaque boundary.
4. **17 `\uXXXX` escape sequences** in string literals (the JSX-position fix from commit `35da076b2` had not extended to string literals). Fixed in cleanup branch: replaced with the literal Unicode characters.
5. **3 duplicated `shadow-[0_1px_2px_0_rgb(0_0_0/0.04)]` shadows** in consultation chrome. Fixed in cleanup branch: replaced with the existing `shadow-xs` Tailwind utility.

## What was done in the cleanup branch

| Area | Before | After |
|---|---|---|
| `text-[Npx]` violations in clinical surfaces | 9 | 0 (gated by new `check:token-typography.mjs`) |
| Duplicated inline shadow | 3 sites | 0 (all use `shadow-xs`) |
| `\uXXXX` escapes in string literals | 17 | 0 (1 intentional `\u0000` left) |
| `Promise<unknown>` in domain services | 19 | 11 (8 intentionally left as generic runtime boundaries) |
| Phone numbers in logs | full PII | `***<last 4 digits>` via `truncatePhone()` |
| Razorpay webhook signature compare | silent fail on crypto error | logged, then `false` |
| Partner-auth Zod failures | 401 (misleading) | 400 (correct) |
| Pricing service cache invalidation | 5-min TTL | event-driven, fires on `updatePricingTier` |
| Razorpay invoice webhook test coverage | 1 test | 5 tests |
| Lab workflow test coverage | 1 test | 3 tests |
| Medical coding repository test coverage | 1 test | 4 tests |
| Internal pricing admin test coverage | 0 specs | 2 specs (new file) |
| New gate scripts | — | `scripts/checks/check-token-typography.mjs` |
| `ApplicationEvents` enum | 19 entries | 20 (added `TIER_PRICING_UPDATED`) |

All changes pass:
- `pnpm lint` (0 errors, prettier auto-fix rewrap only)
- `pnpm --filter @docita/api run check-types` (0 errors)
- `pnpm check:token-typography` (the new gate)
- `pnpm check:application-event-constants` (the gate that was failing before the event constant was added)
- 41/41 feedback service tests, 11/11 compliance tests, 101/101 whatsapp/razorpay/partner-auth/pricing tests, 5/5 razorpay invoice webhook tests, 3/3 lab workflow tests, 4/4 medical coding tests, 2/2 internal pricing admin tests

## What was NOT done (deferred)

- **Partner-portal e2e** — ✅ **DONE (2026-08-10, campaign branch)**: `apps/api/test/e2e/partner-portal/partner-portal.e2e-spec.ts` covers `request-otp / verify-otp / GET /partner/me / refresh` plus negatives (13 tests). Building it exposed a **latent production bug from PR #209**: `PartnerPortalController` was reachable only through its own `PartnerAuthGuard`, but was missing `@Public()`, so the global `JwtAuthGuard` rejected every partner token with 401 "User not found" — the whole portal surface was dead on main. Fixed on the campaign branch: `@Public()` on the controller (so the staff-session guards skip) + `PartnerAuthGuard` no longer honors the public-route skip (it is the surface's only auth; skipping left the request context empty and every handler 500'd). Same posture as `PublicBookingController` (own-auth surface).
- **Repository specs for 42 `*.repository.ts` files** — repos are tested through their service/use-case specs, which the deep analysis report flagged as "fine in principle". Adding sibling `repository.spec.ts` files is a 1-day mechanical sweep; out of scope for this PR.
- **File-size budget creep** — 15 service files at 350-399/400 lines (one new feature = a CI break). The current threshold is 400 lines per `check:file-size-budget`; nothing is over. Each is a 1-PR refactor; tracked debt.
- **26 `KNOWN_LEGACY_PRISMA_SERVICE_LEAKS`** — already in the allowlist tracked by `check:prisma-boundary`. The 7 in `core/` (subscription / partner-auth / referral services) are listed in the allowlist for migration behind `I*Repository` seams. Not a regression.
- **Clinical / coding repository spec sweep** — the `prisma-medical-coding` spec we added covers the four highest-value methods; the rest of the repository is exercised through the `medical-code-sync` service spec.

## Pre-existing issues found in passing (each is a 1-PR fix)

| # | Issue | File | Effort |
|---|---|---|---|
| 1 | `@next/eslint-plugin-next` not in `node_modules` despite being in `pnpm-lock.yaml`. Lint task in `apps/app` fails with `ERR_MODULE_NOT_FOUND` because the Vite SPA's `eslint.config.mjs` still spreads `nextJsConfig` from `@workspace/eslint-config/next-js`. | `apps/app/eslint.config.mjs:21,30` | trivial (remove the spread) |
| 2 | `@workspace/utils` `seed-identity` exports are missing from the dist that the API test runner resolves. `seed-constants.spec.ts` (4 tests) fails because `seedPatientPhone` and `SEED_PATIENT_PHONE_NUMBER_E164` are `undefined` at import. Likely a turbo task-ordering issue. | `apps/api/package.json` or `turbo.json` | small (force a `build` before `test`) |
| 3 | `apps/app/dist/` and `apps/internal/dist/` are untracked on a fresh checkout (build artifacts not in `.gitignore`). `apps/landing/dist/` is the same and has been working fine. | `apps/app/.gitignore`, `apps/internal/.gitignore` | trivial |
| 4 | Two stale remote branches (`fix/cron-specs`, `fix/tier-factory-fail-loud`) from already-merged PRs; AGENTS.md §11.3 caps the remote at 2 open feature branches. | n/a | trivial (`git push origin --delete ...`) |
| 5 | `core.bare` keeps getting set to `true` in `.git/config` — pnpm's git fsmonitor machinery or worktree bookkeeping flips it. Every command needs `git config --local --unset core.bare` to restore normal git semantics. | `.git/config` | trivial (set explicitly to `false`) |

## See also

- [`2026-08-10-session-notes.md`](2026-08-10-session-notes.md) — full session timeline, conflict-resolution saga, all decisions made
- [`2026-06-10-full-repo-audit.md`](2026-06-10-full-repo-audit.md) — previous round, items already covered not re-flagged
- [`2026-05-comprehensive-audit.md`](2026-05-comprehensive-audit.md) — earliest round, fully remediated
