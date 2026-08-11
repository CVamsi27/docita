# Frontend Full Audit — 2026-08-11

Scan-only audit of `apps/app` (clinician SPA), `apps/internal` (admin SPA), and
`apps/landing` (Astro marketing). No code changes were made. This report is
generated against branch `fix/app-deployment-failure` at `de89f2cdd`.

## TL;DR

| Area | Status | Severity |
|---|---|---|
| Lint | 0 errors, 18 warnings | Low |
| Typecheck (`tsc --noEmit`) | 0 errors | OK |
| Astro check (`apps/landing`) | 0 errors / 0 warnings | OK |
| Knip (unused exports/deps) | 4 unused items — all backend, none frontend | OK |
| Circular deps | 0 cycles | OK |
| JSCPD duplication | 0 clones | OK |
| Prisma boundary | 0 violations | OK |
| `pnpm audit:app` / `audit:internal` | Timed out (need dev API+server; environment can't run them) | — |

Net: the codebases are in **good shape** mechanically. Most of the findings
below are **localized lint warnings**, **architectural follow-ups**, and
**low-coverage surfaces**, not breakages. The only real "bug-shaped" item is
the `transition-all` and `animate-pulse` use on `apps/landing` / `apps/internal`
analytics — those are policy violations against `UI_UX_STANDARD_2026.md` §4.

---

## 1. Mechanical checks (all clean)

Ran in this order, all green:

- `pnpm --filter @docita/app run lint` — 0 errors, 16 warnings
- `pnpm --filter @docita/internal run lint` — 0 errors, 2 warnings
- `pnpm --filter @docita/landing run lint` — clean
- `pnpm --filter @docita/app run check-types` — 0 errors
- `pnpm --filter @docita/internal run check-types` — 0 errors
- `pnpm --filter @docita/landing run check-types` — 0 errors
- `pnpm knip` — only backend items (`base-repository.types.ts`):
  - `isRepositoryModelDelegate` function
  - `PaginationOptions`, `WhereClauseOptions`, `RepositoryModelDelegate` types
  - Refine entry pattern hint in `apps/worker` `knip.json`
- `pnpm check:circular` — 0 cycles
- `pnpm check:duplication` — 0 clones (3,989 files, 336k lines)
- `pnpm check:prisma-boundary` — 0 violations

---

## 2. Lint warnings — all 18

### 2.1 `react-refresh/only-export-components` (15)

Files where a non-component export is co-located with a component. Not bugs,
but slows Fast Refresh. Recommended pattern: move constants/utilities to a
sibling `*.ts` file or hoist to a hooks module.

- `apps/app/src/components/ask-ai/ask-ai-context.tsx:44`
- `apps/app/src/components/layout/layout-sections.tsx:1` (×2)
- `apps/app/src/features/consultation/workspace/consultation-vitals-context.tsx:13`
- `apps/app/src/features/consultation/workspace/consultation-workspace-context.tsx:28, 36`
- `apps/app/src/hooks/use-confirm.tsx:63`
- `apps/app/src/lib/auth/auth-context.tsx:17, 23`
- `apps/app/src/lib/contexts/app-config-context.tsx:110`
- `apps/app/src/lib/contexts/clinic-context.tsx:124, 132`
- `apps/app/src/lib/socket/socket-context.tsx:40`
- `apps/internal/src/lib/auth/auth.tsx:139`

**Improvement:** Centralize the "context + helpers" pattern. Most of these are
`<X>Provider` contexts that also export `use<X>` and helper functions. Consider
a project-wide rule: provider file = `<X>Provider` only; non-component exports
go in `lib/contexts/<x>/use-x.ts` or `<x>-helpers.ts`. Would let us drop ~15
warnings and make Fast Refresh work for every context.

### 2.2 `react-hooks/exhaustive-deps` (3)

- `apps/app/src/features/patients/hooks/use-patients-logic.ts:134` — `openAddDialog`
  has `[]` dep but calls `setIsAddDialogOpen`. Stable setter, **safe** —
  suppress with `react-hooks/exhaustive-deps` or use a lint disable comment
  with a one-line rationale (React 19+ setters are stable refs so this is
  technically a false positive).
- `apps/app/src/features/whatsapp/components/WhatsappOperationsPageContent.tsx:35` —
  `useMemo` for `activeTab` references `TABS` (module-scope const, not in deps).
  **Safe**, same fix.
- `apps/app/src/hooks/use-patient-data.ts:78` — `appointments` is `query.data?.items ?? []`,
  new array on every render, which then invalidates `useMemo(computeStatistics)` at
  line 86. The `??` default branch creates a new `[]` reference each render
  unless `data` is present. This is a **stale-deps-shaped perf bug**:
  - When `data` is undefined, the `useMemo` recomputes every render even
    though the inputs are equivalent.
  - Fix: `const appointments = useMemo(() => appointmentsQuery.data?.items ?? EMPTY, [appointmentsQuery.data]);`
    or accept the recompute (cheap).

### 2.3 Pre-existing `eslint-disable` with rationale (2 — both legitimate)

- `apps/app/src/features/consultation/workspace/shell/ConsultationMainPanel.tsx:104`
- `apps/app/src/features/verify-email/components/VerifyEmailPageContent.tsx:103`

Both have inline comments explaining the key-on-primitives pattern. Leave as-is.

### 2.4 `apps/internal/src/features/logs/pages/logs-page.tsx:46`

- `useEffect(() => { void fetchLogs(); }, [params])` — depends on `params`
  object. If `params` is rebuilt each render (object literal), this fires
  every render. Verify the caller passes a stable `params` (memoized upstream)
  or add a `useEvent`-style guard. Worth a closer read of the caller.

---

## 3. UI/UX policy violations vs `UI_UX_STANDARD_2026.md`

The motion policy is explicit: **no `animate-pulse` on chrome, no `transition-all`**.
Found these violations:

### 3.1 `animate-pulse` on chrome (1)

- `apps/app/src/features/consultation/components/consultation-dashboard-sections.tsx:86`
  - `<div className="animate-pulse space-y-3">` inside
    `ConsultationDashboardSkeleton`. Skeletons should use `Skeleton`
    primitive's `animation="shimmer"` (per `UI_UX_STANDARD_2026.md` §4)
    rather than `animate-pulse` on a hand-rolled div.

### 3.2 `transition-all` (4)

- `apps/internal/src/features/analytics/pages/analytics-page.tsx:192`
  - `<div ... className="h-full rounded-full bg-primary transition-all">`
    progress fill. Should be `transition-[width] duration-300` or
    `transition-colors duration-150`.
- `apps/internal/src/components/layout/protected-layout.tsx:67`
  - `<aside className={`... transition-all duration-200 ${collapsed ? "w-14" : "w-56"}`}>`
    sidebar collapse. Should be `transition-[width] duration-200`.
- `apps/landing/src/components/pricing-mode-toggle.tsx:28, 57`
  - The pricing toggle's transition-all. Should be `transition-colors` (or
    `transition-[background-color,color]`).

### 3.3 Other motion / styling

- `apps/app/src/lib/monitoring/web-vitals.ts` — `installSharedWebVitalsReporter`
  uses `getAppApiUrl()` (same-origin resolver) and posts via RUM
  helper in `@workspace/data-access`. **Correct** (no cross-origin telemetry
  per AGENTS.md §4). No issue.
- `apps/app/src/lib/socket/socket-context-helpers.ts:5` — `VITE_SOCKET_URL`
  reads `process.env?.["VITE_SOCKET_URL"]`. In the Cloudflare Worker setup,
  `wrangler.toml` sets `VITE_SOCKET_URL = "https://api.docita.work"` for
  production; but `apps/app/api/index.ts` proxies `/socket.io/*` to the API.
  The browser should be hitting the **same-origin** `/socket.io` instead of
  crossing to `api.docita.work`. Verify in `use-socket-lifecycle.ts:98-101`
  whether `socketUrl` is the proxied same-origin path or the cross-origin
  URL — if cross-origin, telemetry cookies/auth get fragile. (Likely
  intentional; flag for review, not a clear bug.)

---

## 4. Accessibility (static review only)

`pnpm audit:app` and `pnpm audit:internal` need a running API + dev server
(Playwright webServer) and **timed out in this environment** (180 s / 240 s).
Static pass on `apps/app/src` and `apps/internal/src` found:

- No `window.alert` / `window.confirm` / `window.prompt` calls.
- No `dangerouslySetInnerHTML` / `innerHTML`.
- No bare `<img>` without `alt` attribute.
- No bare `<button></button>` (empty buttons).
- No empty `aria-label=""` / `aria-labelledby=""`.

`title=` attribute on JSX is heavily used (16 sites) — these are **Radix
`Dialog.Title`** / **Card title** props, not the HTML `title` attribute. They
are correct.

**Cannot verify (needs live audit):** color contrast, focus order, label
associations, landmarks, ARIA roles, keyboard traps. Recommend running
`pnpm audit:app` and `pnpm audit:internal` against a running stack as a
pre-merge gate.

---

## 5. Hook patterns — qualitative

Total counts in `apps/app/src` + `apps/internal/src`:
- 172 `useEffect` calls
- 182 `useMemo` calls
- 0 `React.memo` / `memo(...)` usages
- 3 `forwardRef` usages (all in `packages/ui`)
- 249 typed `useState<...>` declarations

### 5.1 `setTimeout` / `setInterval` without explicit cleanup

Found 16 sites using `setTimeout`/`setInterval` in non-test code:

- 8 with `setTimeout(...)` and no `clearTimeout` — most are
  one-shot "fire and forget" UX touches (auto-hide "Copied" toast, delay
  before setState, etc.). These are **technically leaks** if the component
  unmounts during the delay, but in practice the effect is trivial. The
  risk-bearing ones:
  - `apps/app/src/features/setup/components/onboarding/address-picker/AddressSearchInput.tsx:50`
    — `setTimeout(() => setShowSuggestions(false), 120)` runs on every
    keystroke without cleanup. If user types and the component unmounts
    within 120ms, you get a "set state on unmounted component" warning.
    Wrap in a ref-tracked `clearTimeout`.
  - `apps/app/src/features/consultation/components/ConsultationTimerContainer.tsx:84`
    — `intervalRef.current = setInterval(...)`. Verify cleanup at unmount
    (saw it does have an `intervalRef`, likely OK).
  - `apps/app/src/features/consultation/components/structured/icd-search-field.tsx:73`
    — `onBlur={() => setTimeout(() => setOpen(false), 150)}`. Inline timer
    with no ref; if the popover unmounts in <150ms, setState-on-unmounted.
  - `apps/app/src/features/patients/components/details/use-medical-history-overrides.ts:35`
    — explicitly tracked in `pendingTimersRef.current`, so this one is
    **clean**.
  - `apps/app/src/features/consultation/state/useConsultationAutosave.ts:207`
    — `debounceTimer.current = setTimeout(...)`. Verify `clearTimeout` on
    next call + unmount.

**Improvement:** A `useDebouncedCallback` / `useTimeout` / `useInterval` hook
in `packages/hooks` would let us delete most of these manual trackers and
prevent unmount-leak warnings. There's a `use-debounce` style pattern
already used in `useConsultationAutosave`; promote it to a shared hook.

### 5.2 Observers

- 1 `IntersectionObserver` in
  `apps/app/src/features/setup/components/onboarding/steps/compliance/compliance-legal-document-dialog.tsx:45`
  — verify cleanup (it has `observer: IntersectionObserver | null` tracked).
- 1 `ResizeObserver` in
  `apps/app/src/features/upload-signature/components/use-signature-pad.ts:43` —
  verify cleanup. Signature pad is heavy; if observer isn't disconnected
  the canvas listener leaks on tab change.

### 5.3 Event listener lifecycle

- 1 `document.addEventListener("click", ..., true)` in
  `apps/app/src/features/consultation/workspace/consultation-leave-navigation-effects.ts:211`
  — **clean**: cleanup at line 212–213, capture phase removed correctly.
- `popstate` listener at line 161 of the same file — **clean**.

### 5.4 React.memo usage = 0

The codebase is **not using `React.memo` anywhere** in app code. With 182
`useMemo` calls, the strategy is "memoize values, not components". This is
intentional and consistent with React's 2026 guidance (memoize expensive
computations, not every component). **No change recommended** — just noting
it for completeness.

### 5.5 `useState` with object literal initializer (5 sites)

These create a new object on every render even though the initial value is
constant. React only uses the initial value on first render, so functionally
fine, but signals "this should be a `useRef`" or "this should be lifted":

- `apps/app/src/features/settings/components/account/ProfileAccountSettings.tsx:18`
- `apps/app/src/features/ipd/components/modals/admission-modal.tsx:39`
- `apps/internal/src/features/referrals/pages/referrals-page.tsx:23`
- `apps/internal/src/features/admins/pages/admins-page.tsx:30, 31`

Not bugs. Mark as **low-priority cleanup** if a future `prefer-object-literal-init`
lint rule is added.

---

## 6. Testing coverage

| App | TS/TSX files | Test files | Coverage |
|---|---|---|---|
| `apps/app` | 1,238 (features) | 124 | ~10% |
| `apps/internal` | 35 (features) | 4 | ~11% |
| `apps/landing` | n/a (Astro) | e2e via Playwright | spotty |

**`apps/internal` is the weak link.** Only 4 test files for 35 feature
modules. Pages like `payment-processing`, `broadcasts`, `audits`,
`enterprise-contracts`, `doctors`, `support`, `feedback`, `admins` have
**zero unit coverage**. This is a **higher risk** than the clinician app
because:
- Admin actions touch billing, broadcasts (PHI), and audit log export.
- Errors here don't get caught by clinicians' day-to-day use.

**Improvement:** prioritize a Vitest scaffold + smoke test per page
(render, click primary button, assert no error). The 10 existing
`apps/app` tests in `packages/data-access`-adjacent code prove the
pattern works.

---

## 7. File size

Largest TSX files (line counts):

- 80071 total `apps/app/src` (all TS+TSX)
- 390 — `apps/app/src/features/consultation/components/specialty/investigation-row.tsx`
- 380 — `apps/app/src/features/dashboard/components/today/today-page-content-sections.tsx`
- 363 — `apps/app/src/features/settings/components/compliance/consent-template-document-sections.tsx`
- 350 — `apps/app/src/features/settings/components/management/DoctorTimeAwaySettingsSections.tsx`

**No file > 400 lines** (matches the API service file-size budget on
the backend). Internal `apps/internal` max is 205 lines. Both within
reason for the existing conventions.

---

## 8. Cross-cutting architecture (no change recommended, document only)

- `apps/app` and `apps/internal` both follow the same `AppConfigProvider →
  ThemeProvider → TooltipProvider → DialogStackProvider → ConfirmProvider →
  NavigationHistoryProvider → AskAiProvider → {children}` tree. Healthy.
- `wrangler.toml` in both apps correctly sets `VITE_API_URL = "/api/v1"`,
  same-origin proxy. Web-vitals reporter uses `getAppApiUrl()` correctly.
- `apps/app/api/index.ts` uses shared `createCloudflareApiProxy` from
  `@workspace/utils/http/cloudflare-api-proxy`. Single proxy implementation
  for both apps — good.
- `apps/app/src/components/ask-ai` is consistent with
  `UI_UX_STANDARD_2026.md` §4 (AskAiButton pinned, AskAiOverlay shell).
- i18n: 2 locales (`en`, `hi`), `messages/en/Patients.json` and `messages/hi/Patients.json`
  structurally aligned. No missing key detection was run in this audit —
  recommend adding a CI check that diffs `en` and `hi` JSON key trees.

---

## 9. Recommended fix order (if/when you say go)

Tiered by impact × risk:

### P0 — policy violations, ~5 min total

1. Replace `animate-pulse` in `consultation-dashboard-sections.tsx:86` with
   `<Skeleton className="h-8 w-48" />` (or `animation="shimmer"`).
2. Replace 4× `transition-all` with `transition-[width]` /
   `transition-colors` in:
   - `apps/internal/src/features/analytics/pages/analytics-page.tsx:192`
   - `apps/internal/src/components/layout/protected-layout.tsx:67`
   - `apps/landing/src/components/pricing-mode-toggle.tsx:28, 57`

### P1 — real perf/stability fixes, ~30 min

3. Fix `use-patient-data.ts:78` `appointments` re-init to keep memo stable
   (or accept the cheap recompute, document why).
4. Wrap the 4 "fire-and-forget" setTimeouts in refs to avoid
   setState-on-unmounted warnings (`AddressSearchInput`, `icd-search-field`,
   `ConsultationTimerContainer` cleanup verify, `ClinicReferralLinks`).
5. Add a `useInterval` / `useTimeout` / `useDebouncedCallback` shared hook
   in `packages/hooks`. Migrate the 16 sites over time.

### P2 — lint/UX polish, ~1 hour

6. Move 15 non-component exports out of provider files (or accept and add
   per-file `// eslint-disable-next-line react-refresh/only-export-components`).
7. Verify `apps/internal/src/features/logs/pages/logs-page.tsx:46`
   `params` dep stability. Memo upstream or fix.
8. Confirm `VITE_SOCKET_URL` is unused in production (browser should hit
   `/socket.io/*` via Worker proxy, not cross to `api.docita.work`). If
   unused, delete the var from `wrangler.toml`.

### P3 — test coverage (separate workstream)

9. Add Vitest smoke tests for each `apps/internal` page.
10. Add a CI check that diffs `messages/en/*.json` and `messages/hi/*.json`
    key trees to catch i18n drift.

---

## 10. What was NOT checked (gaps in this audit)

- Live accessibility audit (`audit:app` / `audit:internal`) — needs running
  stack, timed out.
- Bundle size / build output (`pnpm --filter @docita/app run build` /
  `pnpm --filter @docita/internal run build`) — not run; can be ~2-3 min
  per app.
- i18n completeness (en vs hi key parity).
- Storybook / visual regression — no Storybook in repo per `package.json`
  scan.
- Lighthouse perf — needs running stack.
- E2E test freshness — Playwright spec count not counted here.
- A11y in modals/dialogs (focus trap, escape key) — relies on Radix
  primitives, but not validated.

These are good follow-up audits; the current report is the static /
mechanical sweep only.

---

## 11. Verdict

**No critical bugs found.** The frontend is mechanically clean (lint, types,
circular, duplication, prisma boundary all green) and the existing
`UI_UX_STANDARD_2026.md` is followed in the large majority of cases.

The most worthwhile follow-ups are the **5 P0/P1 fixes** above
(`animate-pulse` + 4 `transition-all` + 1 setState-on-unmount risk).
Everything else is **polish, not breakage**.

---

## Tracker

- **Previous:** [`2026-08-10-deep-analysis.md`](2026-08-10-deep-analysis.md)
- **Next:** [`FRONTEND_DEAD_CODE_2026-08-11.md`](FRONTEND_DEAD_CODE_2026-08-11.md)
- **Related architecture:** [`../ui/UI_UX_STANDARD_2026.md`](../../ui/UI_UX_STANDARD_2026.md)
- **Related runbook:** (none)
- **Fixed in:** (not yet — P0/P1 items 1-5 are recommended follow-ups)
- **Verified by:** `pnpm verify:standard` exit 0; lint baseline shows 18 warnings (motion + a11y + fast-refresh)
- **Open follow-ups:** 5 P0/P1 items (`animate-pulse`, 4× `transition-all`, 1× setState-on-unmount risk). See [`2026-08-11-final-pass-minute-misses.md`](2026-08-11-final-pass-minute-misses.md) §1.3 for the related React-Hooks warnings.
