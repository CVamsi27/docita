# UI/UX Enhancement Audit — 2026-08-11

Companion to
[`PERFECT_APP_AUDIT_2026-08-11.md`](./PERFECT_APP_AUDIT_2026-08-11.md).
This document catalogs every UI/UX gap, dead code, broken contract, and
concrete enhancement that the codebase would benefit from. Generated
against branch `fix/app-deployment-failure` at `de89f2cdd`.

The design system spec is
[`docs/ui/UI_UX_STANDARD_2026.md`](../../docs/ui/UI_UX_STANDARD_2026.md)
and the color/motion system is in
`packages/ui/src/styles/globals.css` (835 lines, fully token-driven).

## 1. Design system tokens (already shipped)

`packages/ui/src/styles/globals.css` is comprehensive:

### 1.1 Color tokens (OKLCH, perceptually uniform)

- **Light theme**: paper-toned surfaces with `oklch(0.987 0.008 95)`
  background, clinical-blue primary `oklch(0.49 0.14 250)`, status
  colors (pending/processing/completed/cancelled) with semantic
  contrast pairs
- **Dark theme**: deep navy `oklch(0.105 0.02 261.692)`, lifted
  clinical-blue `oklch(0.67 0.13 250)` for WCAG legibility
- **8 user-selectable accents** (`html[data-accent="green|purple|orange|rose|teal|slate|blue"]`)
  with light + dark variants
- **9 tag colors** (`--tag-rose|amber|emerald|teal|sky|indigo|violet|pink|slate`)
  balanced for tag/label use

### 1.2 Typography scale

- 12-step scale: `--fs-2xs (11px)` to `--fs-6xl (56px)`
- 4 line-heights: tight/snug/normal/relaxed
- 4 weights: 400/500/600/700
- 4 font families: sans (Inter), heading (Fraunces), mono (JetBrains),
  wordmark (Nunito)

### 1.3 Motion tokens

- 3 durations: `--motion-fast (120ms)`, `--motion-base (200ms)`,
  `--motion-slow (320ms)`
- 3 easings: standard, ease-in, ease-out
- Density scale: `--density-scale: 1` (default), `0.85` (compact),
  `1.1` (spacious) — controlled by `data-density` attribute

### 1.4 Spacing tokens

- 8-step scale: `--space-0` to `--space-8`
- Control heights: `--control-h-sm/md/lg` (28/36/44px)
- App shell dimensions: `--app-mobile-header-height (3.5rem)`,
  `--consultation-page-header-height (3.5625rem)`

### 1.5 Shadow ramp

4-step shadow ramp (xs/sm/md/lg) — clinical not flashy. **No shadow-xl
in product chrome** per the design standard.

## 2. Motion policy compliance

`docs/ui/UI_UX_STANDARD_2026.md` §4 explicitly forbids:
`animate-pulse` on chrome, `transition-all`, decorative `animate-in
slide-in-from-bottom-*`. Audit results:

### 2.1 `transition-all` violations: **2 sites, both in `apps/internal`**

| File:line | Element |
|---|---|
| `apps/internal/src/features/analytics/pages/analytics-page.tsx:192` | `<div className="... transition-all">` progress fill bar |
| `apps/internal/src/components/layout/protected-layout.tsx:67` | `<aside className="... transition-all duration-200 ${collapsed ? "w-14" : "w-56"}">` sidebar collapse |

**Fix:**
- Line 192: `transition-[width] duration-200` (animates width only)
- Line 67: `transition-[width] duration-200` (animates width only)

**Also in `apps/landing`** (already flagged in
[`FRONTEND_FULL_AUDIT_2026-08-11.md`](./FRONTEND_FULL_AUDIT_2026-08-11.md) §3.2):
- `apps/landing/src/components/pricing-mode-toggle.tsx:28, 57` —
  `transition-all duration-200`

**Total: 4 `transition-all` sites, all should be `transition-[width]`
or `transition-colors`.**

### 2.2 `animate-pulse` violations: **1 site**

| File:line | Element |
|---|---|
| `apps/app/src/features/consultation/components/consultation-dashboard-sections.tsx:86` | `<div className="animate-pulse space-y-3">` inside `ConsultationDashboardSkeleton` |

**Fix:** replace the raw `animate-pulse` divs with the shared
`<Skeleton>` primitive from
`@workspace/ui/components/feedback/skeleton` (already imported in
some files). The `Skeleton` component uses
`animation="shimmer"` (the allowed pattern).

### 2.3 `animate-in slide-in-from-bottom-*`: **0 sites** ✅

No decorative slide-in animations. Clean.

### 2.4 `transition-[Npx]`: 4 sites (allowed)

Used for specific dimension transitions (e.g.
`transition-[width,opacity]`). Per the policy, these are fine
because they target specific properties, not `all`.

### 2.5 Raw `animate-spin` (allowed for loading): many sites

`animate-spin` is the canonical "loading" pattern. Used in refresh
buttons, spinners. No violations.

### 2.6 `framer-motion` (motion/react) usage

`apps/landing/src/components/sections/hero-section.tsx`, `clinic-rhythm-section.tsx`,
`pricing-tier-card.tsx`, and others use `motion` from `motion/react`
for scroll-triggered animations. The library respects
`usePrefersReducedMotion` and disables animations when the user
prefers reduced motion. **Clean.**

## 3. Token discipline

### 3.1 Raw hex colors: **1 site, intentional**

| File:line | Value | Purpose |
|---|---|---|
| `apps/app/src/lib/constants/branding.ts:12` | `BRAND_FOREGROUND_HEX = "#0F172A"` | Brand-asset SVG fill |

This is a single brand-constant. The codebase correctly avoids raw
hex everywhere else — all colors come from CSS variables.

### 3.2 Raw `text-[Npx]`: **0 sites** ✅

All font sizes use the token classes (`text-xs`, `text-sm`, `text-base`,
`text-lg`, `text-xl`, `text-2xl`, `text-3xl`) or the typography scale
classes (`ui-page-title`, `ui-section-title`, `ui-hero-title`, `ui-eyebrow`).

1,269 sites use token-based font sizes. **Clean.**

### 3.3 Arbitrary `w-[Npx]` / `h-[Npx]` / `p-[Npx]` / `m-[Npx]`: **146 files**

This is the largest token-discipline gap. Examples:

| File | Count |
|---|---:|
| `apps/app/src/features/subscription/components/pricing/comparison-table-desktop.tsx` | 7 |
| `apps/app/src/features/subscription/components/billing/billing-history-invoice-table.tsx` | 6 |
| `apps/app/src/features/consultation/components/specialty/cardiology-specialty-sections.tsx` | 6 |
| `apps/app/src/features/patients/components/details/PatientDetailPageContent.tsx` | 4 |
| `apps/app/src/features/consultation/components/specialty/investigation-row.tsx` | 4 |
| `apps/app/src/features/consultation/components/ConsultationDetailPageSections.tsx` | 4 |

The most common pattern is `min-h-[50vh]` (page-content min-height)
and `max-w-[50%]` (truncation). These are reasonable uses — there
isn't a token for "50vh" or "truncation" — but they bypass the design
system's spacing scale.

**Recommendation:** add `--page-content-min-height: 50vh` and a
`<PageContent>` wrapper to the design system. Until then, the
arbitrary values are acceptable per AGENTS.md §4 ("real limits
require real values").

### 3.4 `inline style={{ backgroundColor: ... }}`: 3 sites

| File:line | Use |
|---|---|
| `apps/app/src/features/patients/components/details/patient-tag-color-pickers.tsx:39, 70` | Tag color picker swatch |
| `apps/app/src/features/patients/components/details/patient-tag-current-tab.tsx:114` | Tag color preview |

All 3 sites use `resolveTagColor(color)` which returns one of the
9 tag tokens (rose, amber, emerald, teal, sky, indigo, violet, pink,
slate) or a custom color. The inline style is **necessary** because
the tag color is data-driven. **Clean.**

## 4. Layout / scaffolding compliance

The `AppPageScaffold` + `PageHeader` + `PageContainer` pattern is the
canonical page structure. Audit results:

| Pattern | Files using |
|---|---:|
| `AppPageScaffold` | 63 |
| `PageHeader` | 57 |
| `PageContainer` | 7 |
| `ui-page-title` / `ui-section-title` / `ui-hero-title` / `ui-eyebrow` | 57 |

`PageContainer` is underused (only 7 sites). Most pages use the
`AppPageScaffold`'s built-in container. This is consistent.

## 5. Data state coverage

### 5.1 State-handling primitive usage

| Primitive | Files | Notes |
|---|---:|---|
| `<DataState>` | 63 | the canonical "all-states" wrapper |
| `<EmptyState>` | 36 | empty list/data |
| `<ErrorState>` | 5 | error fallback |
| `<LoadingState>` | 13 | loading-only |
| `<Skeleton>` | 30 | shimmer loading |
| `<PatientListSkeleton>` | **0** | dead — defined but unused |
| `<AppointmentCalendarSkeleton>` | **0** | dead — defined but unused |
| `<DocitaLoadingIndicator>` | n/a | referenced in tests |
| `<ProgressGauge>` | n/a | per-feature |

### 5.2 Skeletons defined but never used

`@workspace/ui/components/feedback/patient-list-skeleton.tsx` and
`@workspace/ui/components/feedback/appointment-calendar-skeleton.tsx`
are **dead in production**. Their test files (`.test.tsx`) exist and
verify the components render, but no production page imports them.

**Either wire them up or delete them.** They contribute to bundle
size without value.

### 5.3 Feature pages missing state handling

Feature directories where many page/content files have no
DataState/EmptyState/ErrorState/LoadingState/Skeleton:

| Feature | Pages with state / Total | Missing |
|---|---:|---:|
| `settings/` | 1 / 19 | **18** |
| `patients/` | 12 / 28 | 16 |
| `subscription/` | 3 / 13 | 10 |
| `consultation/` | 1 / 8 | 7 |
| `invoices/` | 2 / 8 | 6 |
| `documents/` | 2 / 7 | 5 |
| `prescriptions/` | 3 / 7 | 4 |
| `legal/` | 0 / 4 | 4 |
| `verify-email/` | 0 / 4 | 4 |
| `ai-assistant/` | 2 / 6 | 4 |
| `appointments/` | 2 / 6 | 4 |

**The `settings/` directory is the worst offender** — 18 of 19
page/content files don't use the canonical state primitives. Most
of these are settings pages (form-heavy, no async data), so the
"missing" count is misleading — but the ones that DO load async
data (notifications, billing history, member list) should use
`<DataState>`.

### 5.4 React Query consumers missing `isLoading` check

`apps/app/src/features/settings/components/doctor-profile/DoctorProfileSettings.tsx:15`
calls `useAPIQuery<User>(...)` and uses `data?.doctorProfile` but
**never checks `isLoading` or renders a loading state**. When the
profile fetch is in flight, the form renders empty fields with no
indicator. **Real bug.**

## 6. Typography hierarchy

Heading element distribution in `apps/app/src`:

| Element | Count |
|---|---:|
| `<h1>` | 40 |
| `<h2>` | 33 |
| `<h3>` | 63 |
| `<h4>` | 9 |
| `<h5+>` | 0 |

**Healthy hierarchy.** h1 is rare (page title only), h2 is section
header, h3 is sub-section, h4 is rare (used for fine-grained
sectioning).

**The 40 `<h1>` is on the high side** — many pages use `<h1>` for
the page title in the content area, even when the `<PageHeader>` is
the canonical h1 source. The `<PageHeader>` component renders an
`<h1>` (per `packages/ui/src/components/layout/page-header.tsx:55`),
so pages that have both a PageHeader and a custom `<h1>` in the
content area have **two h1s**. AGENTS.md §8.1 ("Primary headings
must be clearly larger and visually prominent") implies one h1 per
page.

**Audit scope:** the 40 h1s — 1 is the PageHeader's h1 per page × 40
pages = ~40, but if the same pages also have inline h1s in content
sections, those are duplicates.

**Recommendation:** a future audit could compare PageHeader usage vs
inline `<h1>` per page. For now: review the 40 sites.

## 7. Sidebar information architecture

`docs/ui/UI_UX_STANDARD_2026.md` §1.1 requires the sidebar to have:
- **TRACK** section (clinical surface)
- **SERVICES** section (operational surface)
- **Footer** with Settings, Help, theme toggle, Plan (for billing admins)
- **Ask AI** pinned at the very bottom

Current `apps/app/src/components/navigation/sidebar.tsx:25` only
renders `<SidebarTrackSection sections={navSections} ... />`. The
footer is **missing** — no Settings link, no Help, no theme toggle,
no Plan, no Ask AI button.

### 7.1 Sidebar footer (missing)

The current sidebar has:
- Top: Docita logo (line 31-33)
- Middle: Nav sections (TRACK + SERVICES)
- Bottom: **nothing**

**Required by spec:**
- Settings link → `/settings`
- Help link → `/help`
- Theme toggle button (already exists at
  `packages/ui/src/components/theme-toggle.tsx`)
- Plan link (visible for billing-capable admins)
- Ask AI button (pinned, always visible) — **also missing entirely**

### 7.2 `AskAiButton` doesn't exist

`apps/app/src/components/ask-ai/` has 2 files:
- `ask-ai-context.tsx` — the provider
- `ask-ai-overlay.tsx` — the dialog

**No `ask-ai-button.tsx`.** The design system requires a "pinned at
the very bottom" button. The current implementation puts the AI
surface on page-level headers (PatientHeaderActions, ConsultationPageHeaderUI,
AppointmentsPageHeaderUI, settings-ai-chips, today-page-content)
but not in the sidebar footer.

**Action:** create `apps/app/src/components/ask-ai/ask-ai-button.tsx`
that opens the overlay with a "Sidebar" scope, and add it to the
sidebar footer in `sidebar.tsx:25`.

### 7.3 Settings / Help links

Settings is in `navSections[0].items` (TRACK_ITEMS) but should be
in the footer. Help is not in the sidebar at all — `/help` is a
top-level route but no nav entry.

**Action:** move Settings to the footer; add Help to the footer;
both as `<SidebarLink>` components with `MicroLabel` headers.

## 8. Density setting is wired but not applied

The `compactMode` setting in `useAppearanceStore` is wired:

```ts
// apps/app/src/lib/stores/appearance-store.ts:6
compactMode: boolean;
setCompactMode: (compact: boolean) => void;
// default: false
```

The `AppearanceSettings` UI saves it:

```ts
// apps/app/src/features/settings/components/ui/AppearanceSettings.tsx:136
onCheckedChange={(checked: boolean) => setCompactMode(checked)}
```

But **the `data-density="compact"` attribute is never set on
`<html>`**. The CSS in `globals.css:181-185` defines:

```css
[data-density="compact"] {
  --density-scale: 0.85;
}
[data-density="spacious"] {
  --density-scale: 1.1;
}
```

But no JS sets the attribute. The user's setting is saved but
invisible. **Real bug.**

**Same for `primaryColor` and `accent`.** The Appearance panel
offers 8 color choices (`blue`, `green`, `purple`, `orange`, `rose`,
`teal`, `slate`) but the `data-accent` attribute is never applied
to `<html>`. The CSS in `globals.css:184-279` defines the variants
but they're dead code.

**Action:** extend `theme-provider.tsx` to also set `data-density`
and `data-accent` from the zustand store. ~10 lines.

```ts
// in apps/app/src/components/layout/theme-provider.tsx
useEffect(() => {
  const root = document.documentElement;
  const accent = useAppearanceStore.getState().primaryColor || "blue";
  const compact = useAppearanceStore.getState().compactMode;
  if (accent !== "blue") root.setAttribute("data-accent", accent);
  else root.removeAttribute("data-accent");
  if (compact) root.setAttribute("data-density", "compact");
  else root.removeAttribute("data-density");
}, [primaryColor, compactMode]);
```

## 9. Responsive design

`md:`, `lg:`, `sm:`, `xl:` breakpoint usage: 676 sites in `apps/app`.

### 9.1 Sidebar (mobile vs desktop)

`sidebar.tsx:31, 40, 58` uses the standard pattern:
- `<aside className="hidden md:flex ...">` — desktop sidebar
- `<SheetContent className="md:hidden">` — mobile drawer
- `<Button className="md:hidden">` — mobile menu trigger

**Clean.** Mobile drawer is wired correctly with `Sheet` from
`@workspace/ui/components/overlay/sheet`.

### 9.2 Touch targets

`h-11 |h-12 |h-1[12]\b|min-h-1[12]\b` usage: 92 sites in `apps/app`.
The 44px (`h-11`) and 48px (`h-12`) sizes are the WCAG-recommended
touch target heights. **Good coverage.**

### 9.3 The `useMediaQuery` / `useBreakpoint` hooks

`@workspace/hooks/use-media-query` and `use-breakpoint` are
defined but **never used in app code** (0 imports found).
Responsive behavior is achieved with Tailwind breakpoint classes
(`md:`, `lg:`) directly, which is the modern React 19 idiom. The
hooks remain available for JS-driven responsive logic if needed.

## 10. Accessibility (deeper pass)

| Pattern | Count | Notes |
|---|---:|---|
| `aria-label` | 218 | covers icon-only buttons + sections |
| `aria-labelledby` | 7 | dialogs with descriptive labels |
| `role=` | 84 | navigation, main, banner, status, alert, tablist, tab |
| Heading elements | 95 files | semantic structure |
| `<img>` with `alt` | 13/13 | all images labeled |
| Skip links | 1 (public-booking) | needs to be added to other layouts |
| Focus ring CSS | 19 files | explicit `focus-visible:ring-*` |
| Keyboard shortcuts | 9 sites | 1 global `cmd+k` command palette |

### 10.1 Skip links

Only `public-booking-top-chrome.tsx:22` has a "Skip to content" link.
**The clinician app, internal app, and other landing pages don't
have skip links** at the top of their layouts. AGENTS.md §8.6
doesn't require them but WCAG 2.4.1 (Bypass Blocks) is a Level A
requirement.

**Action:** add a `<a href="#main-content">Skip to main content</a>`
as the first focusable element in `protected-layout.tsx`,
`portal-layout.tsx`, `setup-layout.tsx`, etc. Add `id="main-content"`
to the `<main>` element in each layout.

### 10.2 Tab order

8 sites use `tabIndex={-1}` for focus management (e.g., focusing
an element on a specific event without putting it in the tab
order). The rest rely on Radix focus handling. **No anti-patterns
found.**

### 10.3 Keyboard shortcuts

- Global `cmd+k` opens command palette (sidebar.tsx:30) — via
  `apps/app/src/components/navigation/command-palette.tsx`
- 9 sites with `onKeyDown` handlers
- Consultation workspace has dedicated keyboard shortcuts
  (`use-consultation-keyboard-shortcuts.ts:29`)

**Clean.**

## 11. i18n deep dive

### 11.1 Key parity: perfect ✅

51 message files in `apps/app/src/messages/en/`, 51 in
`apps/app/src/messages/hi/`. **0 key differences per file** (verified
by recursive flatten + set comparison).

### 11.2 Hardcoded JSX strings: 177 sites

Already documented in
[`FRONTEND_FINAL_PASS_CONT_2026-08-11.md`](./FRONTEND_FINAL_PASS_CONT_2026-08-11.md)
§3.2. Worst offenders: `subscription/`, `settings/`, `lab-tests/`,
`setup/`, `consultation/`.

### 11.3 i18n namespaces not registered

The `<MicroLabel>` component, the `<DataState>` component, and
some `<EmptyState>` uses hardcode English fallback text. These
are intentional (the empty state has no real translation context),
but they should be documented.

## 12. Page-level patterns

### 12.1 The `AppPageScaffold` + `PageHeader` + body pattern

`AppPageScaffold` is used 63 times. The pattern is:

```tsx
<AppPageScaffold header={<PageHeader title={t("title")} actions={...} />}>
  <DataState status={loading ? "loading" : ...}>
    {/* content */}
  </DataState>
</AppPageScaffold>
```

**Clean.** This is the canonical page shape.

### 12.2 The `*Sections.tsx` pattern

Long pages are split into:

- `XPageContent.tsx` — orchestrator + state
- `XPageContentSections.tsx` — visual section components
- `XPageContentSections.types.ts` — section prop types (some)

The `Sections` files average 200-300 lines and hold the body. This
is the project convention for long pages (per the AGENTS.md note
in §7.1 file-size). **15 large files** are in this pattern; none
exceed 400 lines.

### 12.3 Section registry for consultation

`apps/app/src/features/consultation/workspace/consultation-section-registry.ts`
defines the sections of the consultation workspace. This is the
canonical pattern for multi-tab/multi-section pages. Other
multi-section pages (settings tabs, patient detail tabs) use
local `<PageTabs>` instead. The two patterns could be unified
in a future refactor, but they serve different needs (one is
scroll-spy-driven, the other is route-driven).

## 13. Toaster / notifications

`apps/app/src/components/layout/providers.tsx:30-39` mounts
`<Toaster richColors position="top-right" duration={4000} />`
from `sonner`.

`apps/internal/src/main.tsx:34` mounts
`<Toaster richColors position="top-right" />` independently.

**Both use the same library (sonner) but inconsistent config** —
the app configures `duration={4000}` and `classNames: { toast:
"rounded-xl border shadow-lg" }`, the internal doesn't.

**Recommendation:** extract the toaster config to
`@workspace/ui/components/feedback/toaster.tsx` for consistency.

## 14. Dialog stack

`apps/app/src/components/layout/providers.tsx:7` mounts
`<DialogStackProvider>` from
`@workspace/ui/components/overlay/dialog-stack`. This is a
production-quality primitive that prevents stacked dialogs from
breaking the focus trap and z-index hierarchy.

`apps/internal` doesn't mount the `DialogStackProvider` — it
relies on Radix's default behavior. **Could be added for
consistency, but not a bug.**

## 15. Performance budget for the UI

`scripts/perf/route-budgets.config.mjs` defines per-route KB
budgets. The UI design system contributes to the shared
`vendor`/`ui`/`data` chunks via the `manualChunks` config in
`vite.config.ts`. The bundle sizes can't be measured without a
build (already noted in the prior audit).

**Bundle bloat from design system:**

- `packages/ui` is the largest non-app source (count not measured
  here, but it ships ~90 components)
- The `Recharts` library is split into the `ui` chunk (only loaded
  on analytics pages)
- `motion/react` (framer-motion) is used by landing only — it's
  in the `landing` chunks, not `apps/app`

**No UI-side bloat found.**

## 16. Concrete enhancement backlog

In priority order, with effort/impact:

### P0 — bugs (must fix)

1. **`primaryColor` / `compactMode` / `accent` not applied to DOM**
   (§8). Wire `theme-provider.tsx` to set `data-accent` and
   `data-density` from zustand. **30 min.**
2. **`<DoctorProfileSettings>` missing `isLoading` check** (§5.4).
   Add a `<Skeleton>` or `<DataState status="loading">` wrapper.
   **15 min.**
3. **Sidebar missing the spec-required footer** (§7) — Settings,
   Help, theme, Plan, Ask AI. Add the footer section. **1h.**

### P1 — UI/UX gaps

4. **Create `AskAiButton`** (§7.2) that opens the overlay with a
   sidebar scope. Pin it in the sidebar footer. **1h.**
5. **Add skip-to-content links** to each layout (§10.1). **30 min**
   per layout × 5 layouts = 2.5h.
6. **Delete dead skeletons** `PatientListSkeleton`,
   `AppointmentCalendarSkeleton` (§5.2) if they're not going to be
   wired up. **15 min** if delete, **2h** if wire up.
7. **Extract `<Toaster>` config to `@workspace/ui`** for app +
   internal consistency (§13). **30 min.**

### P2 — Polish

8. **Move `min-h-[50vh]` to a `--page-content-min-height` token**
   + add a `<PageContent>` wrapper (§3.3). Reduces 4-7 arbitrary
   values per file in the top offenders. **1h.**
9. **Add JSX-text-must-be-`t()`-wrapped lint rule** (§11.2 +
   [`FRONTEND_FINAL_PASS_CONT_2026-08-11.md`](./FRONTEND_FINAL_PASS_CONT_2026-08-11.md)
   §3.2). Prevents future hardcodes. **1h.**
10. **Migrate the 4 `transition-all` sites to `transition-[width]`
    or `transition-colors`** (§2.1). **30 min.**
11. **Migrate the 1 `animate-pulse` site to `<Skeleton>`** (§2.2).
    **15 min.**

### P3 — Long-arc

12. **Audit 40 `<h1>` sites** for duplicate h1s on pages with
    `<PageHeader>` (§6). **1h.**
13. **Unify section registry with `<PageTabs>`** for multi-section
    pages (§12.3). **4h.**
14. **Add `data-density` settings to the consultation workspace** —
    clinicians in tight spaces (hospitals) can compact the UI. **2h.**

## 17. Companion documents

- [`PERFECT_APP_AUDIT_2026-08-11.md`](./PERFECT_APP_AUDIT_2026-08-11.md) — master cross-app audit
- [`FRONTEND_FINAL_PASS_SUMMARY_2026-08-11.md`](./FRONTEND_FINAL_PASS_SUMMARY_2026-08-11.md) — final pass index
- [`FRONTEND_FINAL_PASS_CONT_2026-08-11.md`](./FRONTEND_FINAL_PASS_CONT_2026-08-11.md) — hooks/forms/i18n/API/Prisma/test
- [`FRONTEND_USEEFFECT_INDEX_FULL_2026-08-11.md`](./FRONTEND_USEEFFECT_INDEX_FULL_2026-08-11.md) — every useEffect
- [`FRONTEND_DEAD_CODE_FULL_2026-08-11.md`](./FRONTEND_DEAD_CODE_FULL_2026-08-11.md) — every dead export
- [`FRONTEND_BEST_PRACTICES_2026-08-11.md`](./FRONTEND_BEST_PRACTICES_2026-08-11.md) — shared primitives
- [`FRONTEND_FULL_AUDIT_2026-08-11.md`](./FRONTEND_FULL_AUDIT_2026-08-11.md) — earlier broad static review
- `docs/ui/UI_UX_STANDARD_2026.md` — the design system spec this audit checks against
- `packages/ui/src/styles/globals.css` — the design tokens

---

## Tracker

- **Previous:** [`PERFECT_APP_AUDIT_2026-08-11.md`](PERFECT_APP_AUDIT_2026-08-11.md)
- **Next:** [`FINAL_EXECUTION_PLAN_2026-08-11.md`](FINAL_EXECUTION_PLAN_2026-08-11.md)
- **Related architecture:** [`../ui/UI_UX_STANDARD_2026.md`](../../ui/UI_UX_STANDARD_2026.md)
- **Related runbook:** (none)
- **Fixed in:** (not yet — enhancement backlog)
- **Verified by:** (parent doc verification applies)
- **Open follow-ups:** UI/UX enhancement backlog for upcoming sprints.
