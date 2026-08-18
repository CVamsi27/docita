# Comprehensive UI/UX Audit — Enhancement Plan

**Date:** 2026-08-18
**Scope:** apps/app (44 features, 60 pages, 663 components), apps/internal (18 features, 18 pages, 35 components), apps/landing (14 pages, 65 components)

---

## Audit Summary

| Check | Result |
|-------|--------|
| `verify:standard` (80+ checks) | **All pass** |
| `check:button-primitive` | **Pass** |
| `check:native-button-types` | **Pass** |
| `check:native-ui-affordances` | **Pass** |
| `check:responsive-data-tables` | **Pass** |
| `check:a11y-budget:enforce` | **Pass** |
| `check:contrast` | **Pass** |
| `check:suspense-error-boundary-pair` | **Pass** |
| `check:error-boundary-coverage` | **Pass** |
| `check:i18n-coverage` | **Pass** |
| `check:require-feature-guard` | **Pass** |
| DataState coverage (pages with useQuery) | **All covered** |
| PageHeader on all pages | **All covered** |

**The codebase is remarkably clean.** Every automated gate passes. The gaps below are the honest remaining items — none are defects, but they represent real improvement opportunities.

---

## Findings

### Finding 1: Internal app uses `useState` + `apiGet` instead of React Query (Medium — Architecture)

**Evidence:**
- 35 files in `apps/internal/src/features` use `apiGet` directly
- 0 files use `useQuery` (React Query)
- Every internal page manually manages `loading`, `hasError`, `data` state with `useState` + `useEffect`
- Manual refetch on mutations (no automatic cache invalidation)

**Impact:**
- No stale-while-revalidate, no background refetch, no automatic cache invalidation
- Inconsistent error handling across pages
- More boilerplate per page (each page repeats the same `useState` + `useEffect` + `try/catch` + `finally` pattern)
- No offline support or retry logic

**Example (current pattern in every internal page):**
```tsx
const [loading, setLoading] = useState(true);
const [hasError, setHasError] = useState(false);
const [data, setData] = useState([]);

const fetchData = async () => {
  setLoading(true);
  setHasError(false);
  try {
    const result = await apiGet<T[]>("/api/internal/...");
    setData(result);
  } catch { setHasError(true); }
  finally { setLoading(false); }
};

useEffect(() => { fetchData(); }, []);
```

**Enhancement:** Migrate internal pages to `@workspace/data-access` hooks (React Query) or at minimum create a `useInternalQuery` hook that wraps `apiGet` with React Query for consistency. This is the single highest-impact improvement — it would reduce boilerplate by ~60% across 18 pages and add automatic cache management.

**Effort:** Medium (1-2 days). Each page is straightforward to migrate since the data-fetching pattern is uniform.

---

### Finding 2: Internal app oversized page file (Low — Code Quality)

**Evidence:**
- `apps/internal/src/features/leads/pages/leads-page.tsx` — **568 lines** (exceeds 400-line budget)
- `apps/internal/src/features/referrals/pages/referrals-page.tsx` — 326 lines
- `apps/internal/src/features/referrals/components/referrer-form-dialog.tsx` — 212 lines

**Impact:** The leads page mixes data fetching, state management, table rendering, dialog management, and form handling in one file. Hard to test, hard to navigate.

**Enhancement:** Split `leads-page.tsx` into `use-leads.ts` (data fetching + state), `LeadsTable.tsx` (table rendering), and `leads-page.tsx` (composition shell). Follow the `ConsultationDashboardUI` pattern from the app.

**Effort:** Low (half day).

---

### Finding 3: Internal app limited responsive behavior (Low — UX)

**Evidence:**
- Only 14 of 35 internal components use responsive breakpoints (`md:`, `sm:`, etc.)
- Internal app is primarily used on desktop (admin portal), so this is intentional
- But mobile/tablet access for urgent admin tasks (e.g., supporting a clinician on a tablet) is not supported

**Impact:** Internal portal is not usable on tablets or phones. If an admin needs to check something urgently on a mobile device, they can't.

**Enhancement:** Not a priority — the internal portal is a desktop-first admin tool. Document this as intentional in `docs/ui/UI_UX_STANDARD_2026.md` if not already noted.

**Effort:** None (documentation only).

---

### Finding 4: Landing site has limited motion documentation (Low — Polish)

**Evidence:**
- 54 motion-related patterns across landing components
- Hero section uses `motion/react` with `useReducedMotion` (good)
- Landing uses `landingFadeUpVariants` and `landingStaggerContainer` from a shared motion-prefs module

**Impact:** Motion is already well-implemented. The only gap is that not all animated sections may respect `prefers-reduced-motion` consistently.

**Enhancement:** Audit each animated landing section to confirm `useReducedMotion` is checked before triggering animations. Low priority since the hero (most prominent animation) already handles it.

**Effort:** Low (audit + minor fixes).

---

### Finding 5: Landing site raw `<img>` tags (Low — Performance)

**Evidence:**
- `apps/landing/src/components/sections/product-screenshots-section.tsx` uses `<img>` tags
- Alt text is provided (`shot.alt`)
- `loading="lazy"` and `decoding="async"` are set

**Impact:** Astro's `<Image>` component would automatically optimize images (WebP/AVIF, responsive srcset). Using raw `<img>` means no automatic optimization.

**Enhancement:** Migrate to Astro's `<Image>` component or `astro:assets` for automatic image optimization. This would improve Lighthouse scores and reduce bandwidth.

**Effort:** Low (a few hours).

---

### Finding 6: No outstanding a11y gaps (Informational)

All automated checks pass:
- `check:a11y-budget:enforce` — baseline met
- `check:contrast` — all tokens meet WCAG AA
- `check:native-button-types` — no missing `type` attributes
- `check:native-ui-affordances` — no click handlers on non-interactive elements
- `check:responsive-data-tables` — all tables scroll or reflow on mobile
- `check:suspense-error-boundary-pair` — all Suspense wrappers have ErrorBoundary siblings
- `check:error-boundary-coverage` — all functional layouts wrap content in ErrorBoundary

---

### Finding 7: No outstanding loading/error/empty state gaps (Informational)

All pages with data fetching use `DataState` or equivalent:
- App: 60 pages, all with proper loading/error/empty states
- Internal: 18 pages, all with `DataState` wrappers
- Landing: Static content, no data fetching (Astro SSR)

---

## Prioritized Enhancement Plan

### Phase 1: Internal App React Query Migration (Highest Impact)

**Goal:** Replace `useState` + `apiGet` + `useEffect` with React Query across all 18 internal pages.

**Approach:**
1. Create a `useInternalQuery` hook in `apps/internal/src/lib/` that wraps `apiGet` with React Query
2. Migrate pages in order of complexity (simplest first):
   - `logs-page.tsx` (144 lines, simple list)
   - `system-monitoring-page.tsx` (190 lines, simple list)
   - `analytics-page.tsx` (159 lines, simple list)
   - `support-page.tsx` (146 lines, simple list)
   - `admins-page.tsx` (medium, CRUD)
   - `users-page.tsx` (medium, CRUD with filters)
   - `doctors-page.tsx` (medium, CRUD)
   - `billing-page.tsx` (medium, CRUD)
   - `pricing-page.tsx` (medium, CRUD)
   - `referrals-page.tsx` (326 lines, complex)
   - `leads-page.tsx` (568 lines, complex — also split into smaller files)
   - Remaining pages
3. Add `DataAccessProvider` to the internal app's root (if not already present)
4. Verify: `pnpm --filter @docita/internal run check-types` and `pnpm --filter @docita/internal run lint`

**Expected outcome:** ~60% less boilerplate per page, automatic cache management, consistent error handling, background refetch on window focus.

---

### Phase 2: Internal App Leads Page Split (Low — Code Quality)

**Goal:** Split the 568-line `leads-page.tsx` into smaller, testable files.

**Approach:**
1. Extract `use-leads.ts` (data fetching + state)
2. Extract `LeadsTable.tsx` (table rendering)
3. Extract `LeadsFilters.tsx` (search + filters)
4. Keep `leads-page.tsx` as composition shell

**Expected outcome:** Each file under 200 lines, easier to test and maintain.

---

### Phase 3: Landing Image Optimization (Low — Performance)

**Goal:** Migrate raw `<img>` tags to Astro's `<Image>` component for automatic optimization.

**Approach:**
1. Import `Image` from `astro:assets`
2. Replace `<img>` with `<Image>` in `product-screenshots-section.tsx`
3. Verify: `pnpm --filter @docita/landing run build`

**Expected outcome:** Smaller image payloads, automatic WebP/AVIF conversion, responsive srcset.

---

### Phase 4: Landing Reduced-Motion Audit (Low — Accessibility)

**Goal:** Ensure all animated landing sections respect `prefers-reduced-motion`.

**Approach:**
1. Check each animated section for `useReducedMotion` usage
2. Add the check where missing
3. Verify: `pnpm audit:landing`

**Expected outcome:** Full WCAG 2.1 motion compliance.

---

## What's Already Excellent

| Area | Status |
|------|--------|
| DataState coverage | All pages with data fetching have loading/error/empty states |
| PageHeader | All pages use `AppPageScaffold` + `PageHeader` |
| Button primitive | No raw `<button>` elements in features/components |
| Responsive tables | All data tables scroll or reflow on mobile |
| Error boundaries | All functional layouts wrap content in ErrorBoundary |
| i18n | All Vite features use `useTranslation` |
| Suspense+ErrorBoundary | All Suspense wrappers have ErrorBoundary siblings |
| Contrast | All tokens meet WCAG AA |
| Feature gates | All tier-gated surfaces have `<FeatureGate>` or `@RequireFeature` |
| Design tokens | No raw hex outside `globals.css`, typography hierarchy preserved |
| Motion policy | No `animate-pulse` on chrome, no skeleton `animation="wave"`, no decorative `animate-in` |
| Sidebar IA | Sectioned (TRACK / SERVICES / Settings / Help / Theme / Plan / Ask AI) |
| AI surface | `AskAiButton` pinned, `AskAiOverlay` shell, contextual scope chip |

---

## Effort Estimate

| Phase | Effort | Impact | Priority |
|-------|--------|--------|----------|
| 1. Internal React Query migration | 1-2 days | High | **P1** |
| 2. Leads page split | 0.5 days | Low | P2 |
| 3. Landing image optimization | 0.5 days | Low | P3 |
| 4. Landing motion audit | 0.5 days | Low | P4 |
| **Total** | **3-4 days** | | |

---

## Recommendation

Phase 1 (Internal React Query migration) is the only item with meaningful impact. The other three are polish improvements that can be done opportunistically. The app and landing sites are already in excellent shape — no gaps in loading/error/empty states, responsive behavior, accessibility, or design consistency.
