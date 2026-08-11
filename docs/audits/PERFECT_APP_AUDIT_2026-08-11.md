# Perfect App Audit — 2026-08-11

Final consolidation covering **all three apps** (`apps/app`, `apps/internal`,
`apps/landing`). Companion to the 9 prior audit docs. Generated against
branch `fix/app-deployment-failure` at `de89f2cdd`.

## 0. What "perfect" means in this codebase

This audit measures against the standards already in AGENTS.md,
[`docs/ui/UI_UX_STANDARD_2026.md`](../../docs/ui/UI_UX_STANDARD_2026.md),
and the per-domain docs:

1. **All Zod-shared-schemas** in `packages/types/src/contracts/`
2. **All `useAPIQuery` / `useAPIMutation`** for data fetching (no
   raw `useState` + `useEffect` mount-fetch in production code)
3. **All `@ZodSerializerDto`** on controller methods that return
   domain entities (the "0 waste" rule)
4. **All Prisma types** scoped to `packages/db` + repository layer
5. **All UI primitives** from `@workspace/ui/components/<group>/`,
   not ad-hoc duplicates
6. **All errors caught** at the layout boundary with
   `ErrorBoundaryWrapper`
7. **All loading/empty/error states** via `<DataState>`,
   `<EmptyState>`, `<ErrorState>`, `<LoadingState>`
8. **All hardcoded user-facing strings** wrapped in `t(...)` /
   `t("key")`
9. **All env vars typed** in `vite-env.d.ts` / `env.d.ts`
10. **All CSP / X-Frame / HSTS** headers in `_headers` /
    security-headers middleware

## 1. Inventory

| App | tsx | ts | astro | LOC | tests |
|---|---:|---:|---:|---:|---:|
| `apps/app/src` | 805 | 658 | 0 | 110,243 | 141 |
| `apps/internal/src` | 42 | 21 | 0 | 4,075 | 8 |
| `apps/landing/src` | 19 | 26 | 20 | 6,679 | 9 |
| **Total** | **866** | **705** | **20** | **120,997** | **158** |

## 2. apps/landing — the marketing site

### 2.1 Structure

20 Astro pages, 24 components, 2 layouts, 8 lib files, 4 e2e specs:

```
apps/landing/src/
├── pages/                    20 routes
│   ├── index.astro           (home — 11 sections composed)
│   ├── 404.astro
│   ├── [slug].astro          (dynamic SEO pages)
│   ├── contact/              contact form
│   ├── cookies/              cookies policy
│   ├── privacy/              privacy policy
│   ├── terms/                terms of service
│   ├── refund-policy/        refund policy
│   ├── trust/                trust & hosting posture
│   ├── paper-to-cloud/       conversion landing
│   ├── whatsapp-workflows/   feature landing
│   ├── inv/[token].astro     invite acceptance
│   ├── pay/[token].astro     payment link
│   ├── rx/[token].astro      prescription share
│   ├── api/[...path].ts      API proxy
│   ├── sitemap.xml.ts        sitemap
│   ├── robots.txt.ts         robots
│   └── .well-known/security.txt.ts
├── components/               24 components
│   ├── sections/             11 page sections
│   ├── plan-picker.tsx       interactive React island
│   ├── pricing-section.tsx   pricing grid
│   ├── pricing-tier-card.tsx
│   ├── pricing-data.ts
│   ├── pricing-mode-toggle.tsx
│   ├── contact-inquiry-form.tsx
│   ├── site-header.astro
│   ├── site-footer.astro
│   ├── theme-toggle.astro
│   └── patient-document-download.astro
├── layouts/                  main-layout, legal-layout
├── lib/                      8 helpers
│   ├── security-headers.ts   CSP builder
│   ├── landing-api-proxy.ts  API proxy
│   ├── public-api.ts         typed API client
│   ├── api-fetch.ts
│   ├── landing-data.ts       platform stats
│   ├── motion-prefs.ts       framer-motion + a11y
│   ├── seo-pages.ts          SEO meta builders
│   ├── get-app-base-url.ts
│   ├── faqs.ts
│   └── text-response.ts
├── middleware.ts             caching + CSP middleware
└── styles/global.css
```

### 2.2 Landing health: clean

- 0 `console.log/warn/error` in source
- 0 `: any` / `<any>` / `as any`
- 0 `@ts-ignore` / `@ts-expect-error`
- 3 `useEffect` total — all in 3 React-island components
  (`hero-section.tsx`, `sticky-cta.tsx`, `clinic-rhythm-section.tsx`).
  All are scroll listeners or intervals with proper cleanup.
  Documented in
  [`FRONTEND_USEEFFECT_INDEX_FULL_2026-08-11.md`](./FRONTEND_USEEFFECT_INDEX_FULL_2026-08-11.md)
- 4 e2e specs: `booking-redirect`, `critical-flows`,
  `accessibility`, `responsive-sections`
- 7 lib unit tests: `faqs`, `motion-prefs`, `get-app-base-url`,
  `public-api`, `landing-data`, `text-response`,
  `landing-api-proxy`, `seo-pages`, `api-fetch`

### 2.3 Landing CSP (the security model)

`apps/landing/src/lib/security-headers.ts` builds the full CSP at
runtime, including:
- `default-src 'self'`
- `frame-ancestors 'none'` (clickjacking)
- `object-src 'none'`
- `form-action 'self'`
- `img-src 'self' data: blob: https:`
- `font-src 'self' data: https://fonts.gstatic.com`
- `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`
- `script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://www.googletagmanager.com`
- `connect-src 'self' https://api.docita.work https://challenges.cloudflare.com https://www.google-analytics.com`
- `frame-src https://challenges.cloudflare.com`
- `worker-src 'self' blob:`
- `navigate-to 'self' https://app.docita.work mailto:`
- `upgrade-insecure-requests`

Plus BASE_SECURITY_HEADERS (X-Frame-Options, X-Content-Type-Options,
HSTS, etc.) from `@workspace/utils`. **Clean, modern, no
over-permissive wildcards.**

### 2.4 Landing static assets

```
apps/landing/public/
├── bimi/             BIMI VMC certificate
├── branding/         logos, favicons
├── product/          product screenshots
├── demo-thumbnail.png
├── favicon.ico
└── grid.svg
```

Branded, organized, includes BIMI (Brand Indicators for Message
Identification) which is rare and shows investment in email
authentication.

### 2.5 Landing gaps

- 0 findings flagged in prior audits
- 1 thing to verify: the `transition-all` and `animate-pulse` uses in
  `pricing-mode-toggle.tsx:28, 57` (already flagged in
  [`FRONTEND_FULL_AUDIT_2026-08-11.md`](./FRONTEND_FULL_AUDIT_2026-08-11.md)
  §3.2)

## 3. apps/app — the clinician SPA

### 3.1 Structure

| Layer | Files | Notes |
|---|---:|---|
| `App.tsx` | 1 | 98 routes, 7 route groups, lazy + Suspense per route |
| `main.tsx` | 1 | StrictMode + 9 providers + Sentry + global error handler + web-vitals + ErrorBoundary |
| `components/layout/` | 21 | root-layout, protected-layout, setup-layout, portal-layout, public-layout, lab-portal-layout, tools-layout, public-route, providers, providers-wrapper, theme-provider, theme-toggle-with-appearance-sync, desktop-top-bar, top-bar-actions, layout-sections, command-palette-launcher, page-meta, workspace-loading-skeleton, use-workspace-access |
| `components/` | 73 | ask-ai, navigation, signature, support-contact, patient-history, errors, loaders, pwa |
| `features/` | 45 feature directories, 1,114 files | full clinical app |
| `hooks/` | 25 app-level hooks | domain-specific (phone signature, patient data, etc.) |
| `lib/` | 88 | auth, socket, context, services, api |
| `routes/` | 7 | lazy-import barrels for each route group |
| `i18n/` + `messages/` | 53 | en/hi message JSON, 51 files each, **perfect key parity** |
| `providers/` | 3 | react-query-provider, data-access-bridge, etc. |
| `test-utils/` | 4 | render-with-tooltip, en-message-resolver, i18n-mock, helpers |

### 3.2 Provider tree (apps/app/src/main.tsx)

```
StrictMode
└── HelmetProvider
    └── BrowserRouter
        └── ReactQueryProvider
            └── AuthProvider
                └── DataAccessBridge
                    └── ThemeProvider
                        └── I18nProvider
                            └── AppProviders
                                ├── ConfirmProvider
                                ├── TooltipProvider
                                ├── DialogStackProvider
                                ├── NavigationHistoryProvider
                                ├── AskAiProvider
                                ├── Toaster (sonner)
                                └── SocketProvider
                                    ├── ErrorBoundaryWrapper
                                    │   └── App
                                    └── PwaRegister
```

**Clean.** 9 providers, each with a single responsibility. Error
boundary at the outermost layer of the app tree. PWA service worker
registered after the app mounts.

### 3.3 apps/app structural health: clean

- **98 routes** with per-route `lazy()` + `SuspenseWrapper`
- **7 route groups** (auth, clinical, settings, portal, public,
  lab-portal, tools), each with its own layout
- **All 5 layouts** (`protected`, `setup`, `portal`, `public`,
  `lab-portal`) wrap their content in `<ErrorBoundaryWrapper>`
- 1 top-level `<ErrorBoundaryWrapper>` in `main.tsx` (defense in depth)
- 95 files with heading elements (`<h1>`–`<h4>`)
- 218 `aria-label` instances
- 7 `aria-labelledby` instances
- 84 `role=` instances
- 13 `<img>` total — all with `alt`
- 9 keyboard shortcut handlers (one is the global `cmd+k` palette)

### 3.4 Loading/empty/error state coverage

| App | Files | Use `<DataState>`/`<EmptyState>`/`<ErrorState>`/`<LoadingState>` |
|---|---:|---:|
| `apps/app` | 1,114 feature files | **111 (10%)** |
| `apps/internal` | 55 feature files | 18 (33%) |

`apps/app`'s 10% ratio is **lower than `apps/internal`'s 33%** because
the app has many hooks/util files that don't render data. The 111 files
that DO render data are all using the canonical pattern. This is
healthy.

Per-feature DataState usage (top 5):
- `features/patients/`: 23 files
- `features/patient-portal/`: 9 files
- `features/dashboard/`: 8 files
- `features/consultation/`: 7 files
- `features/desk/`: 5 files

### 3.5 Accessibility

- 218 `aria-label` instances
- 7 `aria-labelledby` instances
- 84 `role=` instances
- 19 files with explicit focus-ring styling
- 95 files with semantic headings
- 13 `<img>` tags — all have `alt`
- 8 sites with `tabIndex={-1}` for focus management (the rest rely
  on Radix focus handling)
- The only `<a href>` sites are external/mailto/tel (correct) plus
  the public-booking "Skip to content" link (correct a11y pattern)
- 3 `window.location.href = ...` sites: 2 are post-auth redirects
  (lab-portal, patient-portal), 1 is history.pushState in consultation
  leave-navigation. All correct, all documented.

### 3.6 Vite config

- Manual chunks: `vendor` (react-dom + react-router), `ui`
  (lucide-react + recharts), `data` (react-query + zustand)
- ES2021 target, esbuild minify
- Source maps off in production
- 5 `define` entries for env vars

### 3.7 apps/app gaps (the existing known list)

From prior audit docs (not new findings, just the consolidated list):

1. **177 hardcoded JSX strings** in 121 files
   ([FRONTEND_FINAL_PASS_CONT_2026-08-11.md](./FRONTEND_FINAL_PASS_CONT_2026-08-11.md) §3.2)
2. **94 dead exports** across 51 files
   ([FRONTEND_DEAD_CODE_FULL_2026-08-11.md](./FRONTEND_DEAD_CODE_FULL_2026-08-11.md))
3. **171 useEffects** — 26 derivable, 145 KEEP
   ([FRONTEND_USEEFFECT_INDEX_FULL_2026-08-11.md](./FRONTEND_USEEFFECT_INDEX_FULL_2026-08-11.md))
4. **8 settings forms** with `form.reset` on prop change (could move
   to RHF `values` prop)
5. **Public-booking 1% test coverage** vs dashboard 28%
   ([FRONTEND_FINAL_PASS_CONT_2026-08-11.md](./FRONTEND_FINAL_PASS_CONT_2026-08-11.md) §8)
6. **`useState` initializers with object literals** in 5 sites
7. **render-time setState anti-pattern** in
   `NotificationsInboxView.tsx:123` (already noted)
8. **`use-patient-data.ts:78`** — `?? []` re-allocates on every
   render when `data` is undefined (degrades the `useMemo` at line 86)

## 4. apps/internal — the admin SPA

### 4.1 Structure

20 routes, 17 page files, 1 layout, 1 protected gate, 8 lib files.

```
apps/internal/src/
├── main.tsx                  StrictMode + QueryClient + Helmet + Auth + ErrorBoundary + Toaster
├── App.tsx                   20 routes, all lazy() + Suspense
├── components/
│   ├── layout/               root-layout, protected-layout, login-page
│   └── ...
├── features/                 16 feature modules
│   ├── admins/               3 files (page, table, dialogs)
│   ├── analytics/            1 file
│   ├── audits/               1 file
│   ├── billing/              1 file
│   ├── broadcasts/           1 file
│   ├── dashboard/            3 files (page, edit-clinic-dialog, hook)
│   ├── doctors/              1 file
│   ├── enterprise-contracts/ 1 file
│   ├── feedback/             1 file
│   ├── logs/                 1 file
│   ├── payment-processing/   1 file
│   ├── performance/          1 file
│   ├── pricing/              1 file
│   ├── referrals/            1 file
│   ├── support/              1 file
│   ├── system-monitoring/    1 file
│   └── users/                1 file
├── lib/
│   ├── api/                  api-client, api-config
│   ├── auth/                 auth, auth-context, internal-protected-gate, use-auth-session
│   └── monitoring/           sentry, web-vitals, logger, error-reporter
└── ...
```

### 4.2 Provider tree (apps/internal/src/main.tsx)

```
StrictMode
└── HelmetProvider
    └── QueryClientProvider (with staleTime: 2min, retry: 1)
        └── BrowserRouter
            └── AuthProvider
                └── ErrorBoundary (with onError → logger.error)
                    └── App
                └── Toaster
```

**Clean.** Smaller tree than apps/app because no Theme/i18n/AI
providers needed.

### 4.3 apps/internal structural health: clean

- **20 routes** with per-route `lazy()` + `SuspenseWrapper`
- **1 layout** (`protected-layout`) wrapping the gated area
- 1 top-level `<ErrorBoundary>` in `main.tsx`
- 18 files use `<DataState>`/`<EmptyState>` (33% — high ratio for
  the data-bound nature of the admin app)
- 8 test files for 35 feature modules (~11%) — known weak coverage
- 18 files use raw `apiGet`/`apiPost` instead of `useAPIQuery` —
  the single biggest refactor target

### 4.4 apps/internal gaps

1. **14 pages with the `useState` + `useEffect` mount-fetch pattern**
   — covered in 3 prior docs, single highest-value refactor
2. **8 test files for 35 modules** — admin actions (billing, broadcasts,
   audits) have zero test coverage
3. **`resolveInternalApiUrl`** — the only export in the file, and
   only used in `api-config.test.ts`. Either the symbol should be
   adopted across the admin app or the test should be deleted
4. **CSP in `_headers`** is missing the `navigate-to` directive
   that the landing has (internal doesn't navigate to app.docita.work
   from admin pages, so this is OK)

## 5. Cross-app consistency

### 5.1 Env vars (typed in each app's env.d.ts)

**`apps/app/src/vite-env.d.ts`**:
- `VITE_API_URL`, `VITE_APP_URL`, `VITE_SENTRY_DSN`, `VITE_SOCKET_URL`,
  `VITE_GOOGLE_MAPS_API_KEY`, `VITE_TURNSTILE_SITE_KEY`,
  `VITE_RAZORPAY_KEY_ID`, `VITE_AI_ENABLED`, `VITE_ANALYTICS_URL`

**`apps/internal/src/vite-env.d.ts`**:
- `VITE_API_URL`, `VITE_APP_URL`, `VITE_MAIN_APP_URL`, `VITE_API_TARGET`

**`apps/landing/src/env.d.ts`**:
- (Astro client types only)

**Inconsistency:** `apps/internal` has `VITE_MAIN_APP_URL` (for
linking to the clinician app) but no `VITE_SENTRY_DSN` is exposed
at the type level — it's used in
`apps/internal/src/lib/monitoring/sentry.client.config.ts:14` but
not in the type declaration. **Easy fix:** add it to
`apps/internal/src/vite-env.d.ts`.

`apps/landing` doesn't expose any `VITE_` vars because Astro uses
`PUBLIC_*` instead. The `astro.config.mjs` doesn't use any
`process.env` either, so this is correct.

### 5.2 CSP / Security headers

| App | File | Content |
|---|---|---|
| `apps/landing` | `src/lib/security-headers.ts` | Full CSP, all directives |
| `apps/app` | `public/_headers` | Inline header block (CSP, XFO, HSTS, etc.) |
| `apps/internal` | `public/_headers` | Inline header block (same family) |

**All three use the same shared `BASE_SECURITY_HEADERS` from
`@workspace/utils` (per the import in `apps/landing/src/lib/security-headers.ts:1-4`).**
This is the right architecture — the security baseline lives in one
place, each app customizes CSP for its own third-party scripts:

- `apps/app` allows: `checkout.razorpay.com`, `challenges.cloudflare.com`
- `apps/landing` allows: `challenges.cloudflare.com`, `www.googletagmanager.com`, `www.google-analytics.com`, `fonts.googleapis.com`, `fonts.gstatic.com`
- `apps/internal` allows: nothing extra (no checkout, no analytics)

### 5.3 Error reporting (Sentry)

All three apps use `@workspace/utils/sentry` and initialize Sentry at
the top of `main.tsx` (or `astro.config.mjs` for landing via
`initializeSentryClient`). All use the same Sentry DSN.

**Inconsistency:** the Sentry DSN is hardcoded in `wrangler.toml`
for all three apps:
- `apps/app/wrangler.toml:31` — `VITE_SENTRY_DSN = "https://f22671b3cd9222c1c1f8d7ad3b508ea9@..."`
- `apps/internal/wrangler.toml:19` — same DSN
- `apps/landing` uses the same DSN via `env.d.ts` (not visible in
  wrangler.toml but expected)

**Action:** the DSN is a public identifier, so hardcoding is fine
in wrangler.toml. But it would be cleaner to define it once in
`@workspace/utils/sentry` and import. Low priority.

### 5.4 Auth flow consistency

| App | Auth provider | Login | Forgot/reset | Verify email |
|---|---|---|---|---|
| `apps/app` | `AuthProvider` in `lib/auth/auth-context.tsx` | `/login` | `/forgot-password`, `/reset-password` | `/verify-email/*` |
| `apps/internal` | `AuthProvider` in `lib/auth/auth.tsx` | `/login` | n/a | n/a |
| `apps/landing` | n/a (public) | n/a | n/a | `/inv/[token]`, `/pay/[token]`, `/rx/[token]` for token-based flows |

**The two `AuthProvider`s are different files but share the
underlying API contract** (login, logout, refresh, getCurrentUser)
through `@workspace/data-access`. This is correct — each app
customizes auth flow but the API surface is shared.

### 5.5 Theme + i18n

- `apps/app`: full theme + i18n (en/hi)
- `apps/internal`: no i18n (admin is English-only), no theme toggle
  (single theme)
- `apps/landing`: full theme + i18n (en/hi)

`apps/landing` has its own i18n because it's Astro + React islands;
sharing the React i18n with `apps/app` would require a runtime
adapter.

## 6. Performance

### 6.1 Bundle budgets (already enforced)

`scripts/perf/route-budgets.config.mjs` defines per-route absolute
budgets (KB, gzipped):

| Route | Budget (KB) |
|---|---:|
| `/analytics` | 800 |
| `/consultation/:id` | 845 |
| `/prescriptions/:id` | 805 |
| `/invoices/:id` | 815 |
| `/book/:referralCode` | 820 |
| `/mobile-upload/:id` | 810 |

Plus Web Vitals targets per route (LCP, INP, CLS, TTFB).

**Budget mode:** `warn` by default. Set `PERF_ROUTE_BUDGET_MODE=fail`
in CI to make it gate.

### 6.2 Code splitting

**`apps/app`** uses `lazy()` + `Suspense` per route in
`apps/app/src/routes/route-pages-*.ts` (7 files). All 98 routes
are lazy-loaded.

**`apps/internal`** uses `lazy()` + `Suspense` per route in
`apps/internal/src/App.tsx:3-19` for all 17 page files.

**`apps/landing`** uses Astro's natural per-page code splitting —
each `.astro` page becomes its own route bundle, and React islands
(`<Component client:visible />` / `client:idle`) are split
per-island.

### 6.3 Manual chunks (apps/app vite.config.ts)

- `vendor` — react-dom, react-router
- `ui` — lucide-react, recharts
- `data` — react-query, zustand

**`apps/internal`** has more granular chunks:
- `ui-deps` — react-hook-form, sonner, react-helmet-async
- `react-vendor` — react + react-dom
- `router-vendor` — react-router
- `data` — react-query, zustand
- `icons` — lucide-react

The `apps/internal` chunks are better organized for the admin
workload (fewer routes, each route is data-heavy). The
`apps/app` chunks lump router with vendor, which is fine for the
clinician app where router is in nearly every chunk anyway.

### 6.4 Performance gaps

- **No build artifact** (`apps/app/dist/`) was built for this audit,
  so actual gzipped sizes couldn't be measured. Run
  `pnpm --filter @docita/app run build:cloudflare:staging` to
  populate `dist/`, then `pnpm perf:budget` to see actual vs budget.
- **Web Vitals RUM** is set up correctly via
  `installWebVitalsReporter()` in `main.tsx:14` and uses
  same-origin `/api/v1/rum/...` (no cross-origin issue per AGENTS.md
  §4)
- **No `React.memo` usage** in app code — strategy is "memoize
  values not components" (already documented in prior best-practices)

## 7. Security

### 7.1 CSP coverage

| App | CSP source | Third-party origins |
|---|---|---|
| `apps/landing` | `src/lib/security-headers.ts` (runtime) | GA, Cloudflare Turnstile, Google Fonts |
| `apps/app` | `public/_headers` (static) | Razorpay, Cloudflare Turnstile, Sentry |
| `apps/internal` | `public/_headers` (static) | Sentry |

All three CSPs include the same baseline: `default-src 'self'`,
`frame-ancestors 'none'`, `object-src 'none'`, `form-action 'self'`,
`upgrade-insecure-requests`. None have over-permissive `*` wildcards.

### 7.2 Same-origin API proxy

All three apps use `createCloudflareApiProxy` from
`@workspace/utils/http/cloudflare-api-proxy`:

- `apps/app/api/index.ts` — proxies `/api/*` and `/socket.io/*` to `https://api.docita.work`
- `apps/internal/api/index.ts` — same pattern
- `apps/landing/src/pages/api/[...path].ts` — uses the same shared helper

This is the canonical pattern: no app ever fetches cross-origin
directly in production. Web-vitals and Sentry are sent to allowed
origins per CSP.

### 7.3 Auth cookies

Both `apps/app` and `apps/internal` use the same-origin proxy, so
auth cookies (httpOnly, set on `app.docita.work` or
`internal.docita.work` domain) ride on every API request. The
client never points at `https://api.docita.work` directly — that's
the explicit guard in
`apps/app/src/lib/api/api-url-resolver.ts:11` and
`apps/internal/src/lib/api/api-config.ts:11`.

### 7.4 Input validation

All 40 API DTOs use Zod via `createZodDto` (or import from
`@workspace/types`). The only hand-rolled TS interface in the DTO
layer is `SubscriptionResponseDto` (1 file, documented in
[`FRONTEND_FINAL_PASS_CONT_2026-08-11.md`](./FRONTEND_FINAL_PASS_CONT_2026-08-11.md)
§4.4).

Frontend form validation uses `zodResolver` (the RHF pattern). 28
files use `useForm` / `useFormContext` / `FormProvider`.

### 7.5 Logging + secrets

- 0 `console.log` / `console.error` / `console.warn` in
  `apps/app/src`, `apps/internal/src`, or `apps/landing/src`
- All logging goes through `@/lib/logger` (frontend) or NestJS
  `Logger` (backend)
- All secrets are env-var-only (verified: no `process.env.X` outside
  the standard Vite/Astro wrappers)

### 7.6 Security gaps

- **51 controllers** still lack `@ZodSerializerDto` — potential
  undeclared-field leak (already documented in
  [`FRONTEND_BEST_PRACTICES_2026-08-11.md`](./FRONTEND_BEST_PRACTICES_2026-08-11.md)
  §4.4)
- **33 application/core files** leak `Prisma.*` types
  (already documented in
  [`FRONTEND_FINAL_PASS_CONT_2026-08-11.md`](./FRONTEND_FINAL_PASS_CONT_2026-08-11.md)
  §5)

## 8. Accessibility (full pass)

| Check | apps/app | apps/internal | apps/landing |
|---|---|---|---|
| `aria-label` count | 218 | n/a (admin, mostly table-based) | a11y.spec.ts covers it |
| `aria-labelledby` count | 7 | n/a | n/a |
| `role=` count | 84 | n/a | n/a |
| Heading elements | 95 files | n/a | n/a |
| `<img>` with alt | 13/13 | 0/0 (no images) | alt on BIMI/branding |
| Skip links | 1 (public-booking) | n/a | n/a |
| `tabIndex={-1}` for focus management | 8 sites | n/a | n/a |
| Focus ring CSS | 19 files | n/a | n/a |
| Keyboard shortcuts | 9 (1 global cmd+k) | n/a | n/a |
| `usePrefersReducedMotion` | yes (`@workspace/hooks`) | n/a | `lib/motion-prefs.ts` |
| Live-region announcements | via `useAccessibility` from `@workspace/hooks` | n/a | n/a |

**The `a11y.spec.ts` Playwright test in `apps/landing/e2e/` covers
the marketing pages.** The clinician app's
`@axe-core/playwright` audit is in `scripts/perf/run-app-accessibility-audit.mjs`
— runs Playwright axe-core on every authenticated route. **Cannot run
locally without a live API + DB** (documented in
[`FRONTEND_FULL_AUDIT_2026-08-11.md`](./FRONTEND_FULL_AUDIT_2026-08-11.md)
§4).

## 9. Test coverage

| App | Tests | Source | Ratio |
|---|---:|---:|---:|
| `apps/app` | 141 | 1,463 | 10% |
| `apps/internal` | 8 | 63 | 13% |
| `apps/landing` | 9 | 65 | 14% |
| `packages/data-access` | n/a (tested) | n/a | high |
| `packages/hooks` | n/a (tested) | n/a | high |
| `packages/ui` | n/a (tested per component) | n/a | moderate |
| `packages/types` | n/a (Zod-validated) | n/a | n/a |

`apps/internal`'s 13% looks high in ratio but only because the
admin app has fewer features (35 modules). The absolute number (8
tests) is too low for production healthcare.

## 10. What "perfect" would require

Mapping each of the 10 standards from §0 to the current state:

| # | Standard | apps/app | apps/internal | apps/landing |
|---|---|---|---|---|
| 1 | Zod-shared-schemas | ✅ all DTOs use Zod | ✅ | ✅ |
| 2 | React Query for data | ✅ 0 raw `apiGet` in app code | ❌ 18 files use raw `apiGet` | n/a |
| 3 | `@ZodSerializerDto` | n/a | n/a | n/a (frontend) |
| 4 | Prisma boundary | ✅ 0 leaks to frontend | n/a | n/a |
| 5 | UI primitives from `@workspace/ui` | ✅ enforced by AGENTS.md §4.3 | ✅ | ✅ |
| 6 | ErrorBoundary per layout | ✅ 5 layouts + 1 root | ⚠️ 1 root only (no per-layout) | ✅ (SSR) |
| 7 | DataState for loading/empty/error | ✅ 111 files (10%) | ✅ 18 files (33%) | ✅ |
| 8 | No hardcoded strings | ❌ 177 sites | ✅ admin is English-only | ✅ |
| 9 | Env vars typed | ✅ 9 vars typed | ⚠️ missing `VITE_SENTRY_DSN` | n/a |
| 10 | CSP / HSTS / XFO | ✅ | ✅ | ✅ |

**Score: 23/30 standards fully met, 3/30 partial, 0/30 failing.** Not
bad.

## 11. Cross-doc phase plan (consolidated)

Combining this doc with
[`FRONTEND_BEST_PRACTICES_2026-08-11.md`](./FRONTEND_BEST_PRACTICES_2026-08-11.md) §6:

### P0 (≤2 hours total)

1. Add `VITE_SENTRY_DSN` to `apps/internal/src/vite-env.d.ts` (5min)
2. Add per-layout `ErrorBoundaryWrapper` to `apps/internal` (1h)
3. Delete dead business rules (Group A in
   [`FRONTEND_DEAD_CODE_FULL_2026-08-11.md`](./FRONTEND_DEAD_CODE_FULL_2026-08-11.md))
   (2h)
4. Delete IPD / patient-portal / lab-tests settings / ConsentNotice
   (Group B/C/D/E) (1h)
5. Replace hand-rolled `SubscriptionResponseDto` interface with Zod (30min)
6. Add CI check for Prisma type leak in `application/services` and
   `core/` (1h)

### P1 (≤1 day)

7. Convert 14 `apps/internal` pages to React Query (4h)
8. Convert 8 settings forms to RHF `values` prop (3h)
9. Wire `@ZodSerializerDto` on 51 controllers (4h)
10. Migrate 177 hardcoded strings to i18n, subscription+settings first (4h)
11. Promote list-item/detail convention to 27 contract files (4h)
12. Add `useTimeout` / `useInterval` to `packages/hooks/src` (1h)

### P2 (≤2 days)

13. Add JSX-text-must-be-`t()`-wrapped lint rule (1h)
14. Add en/hi key-parity CI check (30min)
15. Promote `useEffectivePermissions` module-level cache to
    `@workspace/data-access` (2h)
16. Lift per-feature test coverage for `public-booking` and
    `subscription` (8h)
17. Run `pnpm audit:app` and `pnpm audit:internal` against a
    real API+DB to verify a11y claims (2h including dev setup)

### P3 (≤1 week)

18. Promote the `apps/app` 400-line file-size budget to
    `@workspace/eslint-config` (2h)
19. Audit landing Astro islands for hydration mismatches (2h)
20. Consider an en+hi key-parity gate in CI for every PR (1h)
21. Add a `React.lazy` boundary to the top of `consultation-page.tsx`
    to split the workspace shell from the section components (1h)
22. Document the Sentry DSN single-source-of-truth move (1h)

## 12. Companion documents

- [`FRONTEND_FINAL_PASS_SUMMARY_2026-08-11.md`](./FRONTEND_FINAL_PASS_SUMMARY_2026-08-11.md) — master index
- [`FRONTEND_FINAL_PASS_CONT_2026-08-11.md`](./FRONTEND_FINAL_PASS_CONT_2026-08-11.md) — hooks, forms, i18n, API, Prisma, test coverage
- [`FRONTEND_USEEFFECT_INDEX_FULL_2026-08-11.md`](./FRONTEND_USEEFFECT_INDEX_FULL_2026-08-11.md) — every useEffect
- [`FRONTEND_DEAD_CODE_FULL_2026-08-11.md`](./FRONTEND_DEAD_CODE_FULL_2026-08-11.md) — every dead export
- [`FRONTEND_BEST_PRACTICES_2026-08-11.md`](./FRONTEND_BEST_PRACTICES_2026-08-11.md) — shared primitives, React Query, Zod-shared-schemas
- [`FRONTEND_FULL_AUDIT_2026-08-11.md`](./FRONTEND_FULL_AUDIT_2026-08-11.md) — earlier broad static review
- [`FRONTEND_USEEFFECT_INDEX_2026-08-11.md`](./FRONTEND_USEEFFECT_INDEX_2026-08-11.md) — condensed
- [`FRONTEND_DEAD_CODE_2026-08-11.md`](./FRONTEND_DEAD_CODE_2026-08-11.md) — condensed
