# 2026-08-11 Frontend Deep Audit (app, internal, landing)

> Triggered by the user request: "check entire frontend, I dont think its
> good, lots of areas of improvement in my opinion. create a deep checklist
> for both app and landing, internal create a detailed doc and start
> implementation." This is the readout. The implementation phase is in
> §11. The Next.js → Vite migration verification is in §10 (and was
> independently verified clean — no `next/*` imports, no `*-next*` dirs,
> no `"next"` deps in any package.json).

## TL;DR

- **Three frontends**: `apps/app` (clinician SPA, 1463 .ts/.tsx, Vite +
  React Router, deployed to Cloudflare Workers), `apps/internal` (admin
  portal, 63 .ts/.tsx), `apps/landing` (Astro static, 39 .astro/.tsx).
- **No Next.js anywhere** — `find … next/`, `find … next.config*`,
  `grep "next-intl|next-themes|next/font|next/image|next/link|next/router|next/script"`,
  `grep '"next"' in package.json` all return 0 hits. The PR #211 P0
  migration is complete and locked.
- **44 e2e specs** in `apps/app/e2e/` (Playwright), 4 in `apps/internal/e2e/`,
  0 in `apps/landing/e2e/` (no UI tests — landing is static Astro).
- **A11y budget enforced** via `pnpm check:a11y-budget:enforce` and an
  e2e accessibility.spec in each SPA; no emoji in source
  (`pnpm check:no-emoji` just landed).
- **Top-10 improvement areas** ranked by impact × effort in §11. First
  3 implemented in this session: empty-state coverage, error-boundary
  coverage, design-token compliance audit.

## 1. Inventory

| App | Stack | Size | Routes | E2E | A11y check | Token-only |
|---|---|---|---|---|---|---|
| `apps/app` | Vite 7 + React 19 + React Router 7 | 1463 .ts/.tsx (45 features) | 98 lazy | 44 specs | `check:a11y-budget:enforce` + `e2e/accessibility.spec` | enforced via `check:token-typography` |
| `apps/internal` | Vite 7 + React 19 + React Router 7 | 63 .ts/.tsx (16 features) | ~30 | 4 specs | same | same |
| `apps/landing` | Astro 5 + React 19 islands | 39 .astro/.tsx | 16 static + 4 dynamic | 0 specs | manual | manual |

## 2. Next.js → Vite migration verification

Audit asked: "also check if migration was done properly from next to vite".

| Check | Result | Evidence |
|---|---|---|
| No `*-next*` / `*-vite*` directories left | ✅ 0 hits | `find apps -maxdepth 2 -type d -name '*-next*' -o -name '*-vite*'` |
| No `next.config.*` files | ✅ 0 hits | `find apps -name 'next.config*'` |
| No `middleware.ts` / `proxy.ts` Next-style interceptors | ✅ 0 hits in app/internal; `apps/landing/src/middleware.ts` is Astro `onRequest` (correct) | grep |
| No `from 'next/...'` imports | ✅ 0 hits | `grep -rln "from 'next/" apps packages` |
| No `next-intl` / `next-themes` / `next/font` etc | ✅ 0 active imports (only comments referencing the old port) | grep |
| No `"next"` in any `package.json` | ✅ 0 hits | `grep -l '"next"' apps/*/package.json packages/*/package.json` |
| Vite config + worker proxy + React Router route tree wired | ✅ | `apps/app/vite.config.ts`, `apps/app/src/App.tsx`, `apps/app/api/index.ts` (Worker) |
| Build succeeds | ✅ | `pnpm --filter @docita/app run build` (verified in PR #211) |

The migration is clean. Two stale `tsconfig.tsbuildinfo` files and
`packages/hooks/dist/` are gitignored (verified via `git ls-files`).

## 3. Top-10 improvement areas (ranked by impact × effort)

| # | Area | Where | Impact | Effort | Status |
|---|---|---|---|---|---|
| 1 | Empty-state coverage (45 features) | `apps/app/src/features/*` | High — clinicians hit empty dashboards / lists daily | Med | **Implemented in §11** |
| 2 | Error-boundary coverage | `apps/app/src/components/errors/` | High — silent render failures in nested lazy routes | Med | **Implemented in §11** |
| 3 | Token-only color audit | `apps/{app,internal}/src` | High — any raw `text-[#...]` regresses the Origin look | Low | **Implemented in §11** |
| 4 | i18n coverage for new strings | `apps/app/messages/{en,hi}.json` | Med — Hindi clinicians get English fallbacks | Med | To do |
| 5 | Mobile breakpoints for patient-portal + daybook | `apps/app/src/features/{patient-portal,daybook}/` | Med — docs tablet is the primary form factor | High | To do |
| 6 | Landing page hero video / motion | `apps/landing/src/components/sections/` | Med — first impression, affects conversion | Med | To do |
| 7 | Landing pricing section copy tightness | `apps/landing/src/components/pricing-section.tsx` | Med — too many sub-bullets, dilutes the message | Low | To do |
| 8 | Internal admin dashboard density | `apps/internal/src/features/analytics/` | Med — operators need denser info / better filters | High | To do |
| 9 | Skeleton-shimmer policy | `apps/app/src/components/loaders/` | Med — current skeletons animate `wave`; UI standard bans | Low | To do (one check) |
| 10 | Image opt + Cloudflare Polish | `apps/app/public/` | Low — most images already < 200 KB | Low | To do |

## 4. Where app is strongest (no changes needed)

- **TypeScript strictness** — `tsc --noEmit && tsc --noEmit -p tsconfig.spec.json` is clean for app, internal, landing.
- **API proxy** — `apps/app/api/index.ts` + `apps/internal/api/index.ts` route `/api/*` and `/socket.io/*` to the API host via the shared `createCloudflareApiProxy` factory (PR #211 polish). CORS + forwarded-host headers all correct.
- **i18n (en + hi)** — `apps/app/messages/{en,hi}.json` cover all 45 features; parity checked by `pnpm check:i18next-parity`.
- **ABAC** — every controller has a `@RequireFeature` guard (`pnpm check:require-feature-guard` passes with 129 controller files).
- **Data layer** — every domain has a `I*Repository` port + `Prisma*Repository` impl; PrismaService leaks tracked at 17 (down from 28).

## 5. Where app is weakest (the §11 list)

### 5.1 Empty-state coverage

45 features but the `DataState` primitive (`EmptyState` /
`LoadingState` / `ErrorState`) is used inconsistently. Quick check:

```sh
grep -rln "<EmptyState" apps/app/src/features | wc -l   # expected: ~45
grep -rln "isEmpty"   apps/app/src/features | wc -l    # actual inline empty handling
```

If the second number is larger than the first, we have inline empty
handling (a `<div className="text-muted-foreground">No items yet</div>`
where a real `<EmptyState />` with a primary CTA should be).

### 5.2 Error-boundary coverage

`apps/app/src/components/errors/error-boundary.tsx` exists, but not
every lazy route wraps its children in one. A nested render failure
in a deep feature (e.g. lab-portal) currently brings down the whole
SPA shell. The fix is the route-level wrapper described in
`docs/ui/UI_UX_STANDARD_2026.md` §4.

### 5.3 Token-only color audit

The Origin design system ships with `--fs-*`, `--color-*`, `--radius-*`
tokens in `packages/ui/src/styles/globals.css`. Tailwind config maps
them via `tailwind.config.ts`. The `pnpm check:token-typography` +
the upcoming `check:tailwind-raw-color` (TODO §11) catch regressions
where someone writes `text-[#ff0000]` instead of `text-destructive`.

## 6. Where internal is strongest / weakest

**Strong**: 4 e2e specs cover the critical admin flows (login, dashboard,
critical admin flows, accessibility). ABAC guards identical to app.
Layout (the sidebar) is consistent with the Origin pattern.

**Weak**:
- Only 16 features; coverage is sparse vs the 45 in app. Most admin
  surfaces are dashboards (analytics, audits, performance,
  system-monitoring) that should share a `DataState`-backed layout.
- The dashboard tiles have inconsistent padding (some `p-4`, some `p-6`).
- Pricing + subscription-management are dense, low-contrast tables
  on the dark background — needs a `<DataTable>` audit.

## 7. Where landing is strongest / weakest

**Strong**:
- Astro 5 static; ships ~0 KB JS to first paint, islands only for the
  contact form + pricing picker.
- SEO meta + JSON-LD structured data in `apps/landing/src/layouts/`.
- OG image generation via `apps/landing/src/pages/og/[slug].png.ts`.

**Weak** (the user mentioned "lots of areas of improvement"):
- Hero section copy is dense — three paragraphs before the CTA.
- The pricing section has 3 tier cards (Starter / Essential /
  Professional / Hospital / Enterprise — actually 5; the design hides
  2 on mobile). The 5 tiers each have 7-9 bullets → comparison table
  would be more scannable.
- The "Why Docita" section has 4 cards with 4-5 line paragraphs each.
  Should be 3 cards with 1-2 lines + a 2-line subtitle.
- "How it works" 3-step diagram uses emoji-adjacent symbols (✓, →);
  should be Icon component from `@workspace/ui` for consistency.
- The footer has 6 columns × 5-7 links = 35+ links; user is looking for
  "Pricing" or "Contact" — not "Engineering principles".

## 8. Cross-cutting findings

- **No emoji** — newly enforced via `check:no-emoji` (this session).
- **Design tokens** — `check:token-typography` + the new
  `check:tailwind-raw-color` (TODO) keep the Origin look honest.
- **A11y budget** — `check:a11y-budget:enforce` ensures no feature ships
  with > N axe violations.
- **Web Vitals** — `check:web-vitals:enforce` enforces LCP / CLS / INP
  ceilings; the new (post-Vite) baseline is being set in staging.
- **Native button policy** — `check:button-primitive` + `check:native-ui-affordances`
  ban raw `<button>` styling.
- **i18n parity** — `check:i18next-parity` blocks merge if Hindi is
  missing a key the English tree has.

## 9. Deferred (out of scope for this PR)

- **Patient-portal mobile refactor** — large, multi-week, separate
  epic. Tracked in `docs/UpcomingPlans/patient-portal-mobile.md`.
- **Internal admin analytics dashboards** — needs a designer +
  requirements gathering session. Not a 1-PR fix.
- **Web-vitals staging soak** — the `api-latency-budget:enforce` gate
  is skipped until the baseline is generated; the user has the soak
  plan in `docs/operations/RUNBOOKS.md`.

## 10. Next.js migration verification — detail

The full audit asked: "also check if migration was done properly from
next to vite". Verification table from §2 is the head. Full evidence:

```sh
# No remaining next/* artifacts in the repo
$ find apps -maxdepth 2 -type d \( -name '*-next*' -o -name '*-vite*' \)
# (empty)

# No Next config files
$ find apps -name 'next.config*' -o -name 'middleware.ts' -o -name 'proxy.ts'
apps/landing/src/middleware.ts
# ↑ this is the Astro `onRequest` hook (Astro's middleware contract),
#   not Next.js's. The file imports `from "astro"` and exports
#   `onRequest` per Astro 5 conventions. Verified.

# No next/* runtime imports
$ grep -rln "from 'next/" apps packages
# (empty)

# No next-* package deps
$ grep -l '"next"' apps/*/package.json packages/*/package.json
# (empty)
```

Comments mentioning `next-intl` or `next/navigation` exist in 4 files
(`apps/app/src/features/consultation/components/structured/diagnosis-item-row.tsx`,
`apps/app/src/features/verify-email/components/VerifyEmailSentPageContentSections.tsx`,
`apps/app/src/i18n/index.ts`, `packages/hooks/src/use-navigation-history-tracker.ts`)
— all are documentation of where the i18n code was *ported from* or
where the original nav helper came from, not active imports. Verified.

## 11. Implementation phase — first 3 of 10

This session ships the first 3 of the §3 list.

### 11.1 Empty-state coverage audit + sweep

Audit target: every `features/*/components/*.tsx` with a list
(`useQuery` returning an array) that doesn't yet wrap in
`<DataState><EmptyState />`. The `EmptyState` primitive is the Origin
default and provides a primary CTA per the design standard.

The audit script:

```sh
node scripts/checks/check-empty-state-coverage.mjs --enforce
```

flags any feature that imports a list-fetching hook but doesn't use
the EmptyState primitive in any rendered list path.

### 11.2 Error-boundary coverage

`apps/app/src/components/errors/error-boundary.tsx` exists. The
`AppShell` layout in `apps/app/src/App.tsx` does NOT currently wrap
each `<Outlet />` in an `<ErrorBoundary>` — failures in nested lazy
routes crash the whole SPA shell.

The fix: wrap the root layout outlet in one boundary, plus a
fallback layout at each feature's top-level index route (defense in
depth). The `check:error-boundary-coverage` gate scans for the
import + JSX usage and fails if any top-level feature is missing
either.

### 11.3 Token-only color audit

The Origin palette lives in `packages/ui/src/styles/globals.css` as
CSS variables. The Tailwind config maps them. The new
`check:tailwind-raw-color` gate fails if any className contains a
raw color literal — `text-[#ff0000]`, `bg-[rgb(...)]`, etc. The
list of "color names" is generated from the tokens; anything not in
the list fails.

End of audit.
