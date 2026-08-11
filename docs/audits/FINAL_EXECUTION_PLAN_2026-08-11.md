# Final Execution Plan & Tracker — 2026-08-11

This is the **final, actionable execution plan** consolidating every
P0/P1/P2/P3 task from the 9 prior audit docs. Each task includes:

- **Why it matters** (impact + risk)
- **Exact file:line to change**
- **Code to apply** (drop-in)
- **Verification steps** (lint / typecheck / test / visual)
- **Estimated time**

A **progress tracker** at the bottom uses markdown checkboxes that can
be updated as work is done.

## How to use this doc

1. Pick a phase (P0 → P3 in order)
2. Pick a task in the phase
3. Apply the diff under "Apply"
4. Run "Verify"
5. Tick the checkbox in the tracker
6. Commit with the suggested message

Phases are independent of each other within their priority — P0 items
can all ship in one PR; P1 items can ship together; P2/P3 by feature.

## Quick-start command reference

```bash
# Always before work
git status
git checkout -b feat/perfect-app-p0   # or your branch

# Lint / typecheck / test
pnpm --filter @docita/app run lint
pnpm --filter @docita/internal run lint
pnpm --filter @docita/app run check-types
pnpm --filter @docita/internal run check-types
pnpm knip
pnpm check:circular
pnpm check:prisma-boundary
pnpm check:duplication
pnpm check:hygiene
pnpm --filter @docita/app run test:run
pnpm --filter @docita/internal run test:run
pnpm --filter @workspace/hooks run test:run

# Build (when needed)
pnpm --filter @docita/app run build
pnpm --filter @docita/internal run build
```

The full pre-merge gate is `pnpm verify:standard` (≈80 individual
checks). For frontend-only PRs, the above subset is enough.

---

# Phase P0 — Bugs (≤2 hours)

## P0-1: Wire `data-accent` and `data-density` to the DOM

**Why it matters:** The user can pick 8 accent colors and a compact
mode in `AppearanceSettings` (saves to zustand). The CSS in
`globals.css:184-279` defines the variants, but **no JS sets the
attributes**. The user's choice is silently dropped. Real, observable
bug — users click a color, nothing changes.

**Risk:** Low — only affects the data attribute, no other code reads
them.

**Files to change:**

- `apps/app/src/components/layout/theme-provider.tsx` (currently 36 lines)

**Apply:**

Replace the entire file with:

```tsx
import { useEffect } from "react";
import { useAppearanceStore } from "@/lib/stores/appearance-store";

function getSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme: "light" | "dark" | "system"): void {
  const resolved = theme === "system" ? getSystemTheme() : theme;
  const root = document.documentElement;
  if (resolved === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  root.setAttribute("data-theme", resolved);
}

function applyAccent(accent: string): void {
  // "blue" is the default and is encoded in :root (globals.css:1-77);
  // omit the attribute to fall through to the default token values.
  const root = document.documentElement;
  if (!accent || accent === "blue") {
    root.removeAttribute("data-accent");
  } else {
    root.setAttribute("data-accent", accent);
  }
}

function applyDensity(compact: boolean): void {
  const root = document.documentElement;
  if (compact) {
    root.setAttribute("data-density", "compact");
  } else {
    root.removeAttribute("data-density");
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useAppearanceStore((s) => s.theme);
  const primaryColor = useAppearanceStore((s) => s.primaryColor);
  const compactMode = useAppearanceStore((s) => s.compactMode);

  useEffect(() => {
    applyTheme(theme);
    applyAccent(primaryColor);
    applyDensity(compactMode);

    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => applyTheme("system");
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
    return undefined;
  }, [theme, primaryColor, compactMode]);

  return <>{children}</>;
}
```

**Verify:**

```bash
pnpm --filter @docita/app run lint
pnpm --filter @docita/app run check-types
```

Manual: open `apps/app`, go to Settings → Appearance, pick "green"
accent. The whole app's primary color should switch to green within
~1 frame. Toggle "Compact mode" — UI density should drop 15%.
Reload — the setting should persist (zustand `persist` middleware).

**Commit message:** `fix(ui): wire data-accent and data-density from zustand to <html>`

---

## P0-2: Add `isLoading` check to `<DoctorProfileSettings>`

**Why it matters:** When the doctor profile fetch is in flight, the
form renders empty fields with no indicator — user sees blanks, may
type into a form that's about to be repopulated. Real, observable UX
bug.

**Risk:** Low — adds a loading state, doesn't change behavior on
success.

**File to change:**

- `apps/app/src/features/settings/components/doctor-profile/DoctorProfileSettings.tsx:15-19`

**Apply:**

Replace the `useAPIQuery` call and the early return with:

```tsx
  const {
    data: doctorProfile,
    isLoading: isProfileLoading,
  } = useAPIQuery<User>(
    appQueryKeys.doctorProfile.detail(user?.id ?? ""),
    `/doctors/${user?.id}`,
    { enabled: !!user?.id },
  );

  const profile = doctorProfile ?? user;
  const hasRegistration = !!profile?.registrationNumber;
```

And add an early return after the `resolvedHprIdDraft` line (line 43):

```tsx
  if (isProfileLoading && !profile) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }
```

Add to imports at the top:

```tsx
import { Skeleton } from "@workspace/ui/components/feedback/skeleton";
```

**Verify:**

```bash
pnpm --filter @docita/app run lint
pnpm --filter @docita/app run check-types
```

Manual: open `/settings/doctor-profile` (or equivalent). On first
load, you should see 3 skeleton placeholders for ~200ms before the
profile renders. Reload with the browser network throttled to
"Slow 3G" — the skeletons should be visible for a clear moment.

**Commit message:** `fix(settings): show skeleton while loading doctor profile`

---

## P0-3: Add per-layout `ErrorBoundaryWrapper` to `apps/internal`

**Why it matters:** `apps/app` has 5 layout-level `ErrorBoundaryWrapper`
plus 1 root. `apps/internal` has only 1 root. A crash in one
`/admin/*` page would tear down the whole admin app, while a crash
in `/today` would only tear down that page section.

**Risk:** Low — adds isolation, doesn't change behavior on no-error.

**File to change:**

- `apps/internal/src/components/layout/protected-layout.tsx`

**Apply:**

Read the file first to find the right insertion point. Wrap the
`<Outlet />` like `apps/app/src/components/layout/protected-layout.tsx:43-45`
does:

```tsx
<ErrorBoundaryWrapper>
  <Outlet />
</ErrorBoundaryWrapper>
```

Add to imports:

```tsx
import { ErrorBoundaryWrapper } from "@workspace/ui/components/feedback/error-boundary";
```

**Verify:**

```bash
pnpm --filter @docita/internal run lint
pnpm --filter @docita/internal run check-types
```

Manual: throw a temporary error from one of the page components
(e.g., add `throw new Error("test")` at the top of
`apps/internal/src/features/dashboard/pages/dashboard-page.tsx:10`),
load the dashboard, confirm the error UI shows in the layout
boundary (not the whole app). Revert the throw after testing.

**Commit message:** `fix(internal): add per-layout error boundary`

---

## P0-4: Add `VITE_SENTRY_DSN` to `apps/internal/src/vite-env.d.ts`

**Why it matters:** The DSN is used in
`apps/internal/src/lib/monitoring/sentry.client.config.ts:14` but
not declared in the type. TypeScript won't autocomplete it, won't
catch typos, and a future refactor that drops the env var won't be
flagged at build time.

**Risk:** None — purely a type addition.

**File to change:**

- `apps/internal/src/vite-env.d.ts`

**Apply:**

Add the missing type after `VITE_API_TARGET`:

```ts
  readonly VITE_API_URL?: string;
  readonly VITE_APP_URL?: string;
  readonly VITE_MAIN_APP_URL?: string;
  readonly VITE_API_TARGET?: string;
  readonly VITE_SENTRY_DSN?: string;
```

**Verify:**

```bash
pnpm --filter @docita/internal run check-types
```

**Commit message:** `chore(internal): type VITE_SENTRY_DSN in vite-env`

---

## P0-5: Replace hand-rolled `SubscriptionResponseDto` interface with Zod

**Why it matters:** The only `interface <X>Dto` in the entire API
DTO layer. AGENTS.md §3.1 ("Zod-first type system") and §3.2 ("HTTP
contract parity") both require Zod-typed responses. Drift risk is
real — Prisma can return fields this interface never declared.

**Risk:** Low — Zod will validate, will fail at boot if existing
data doesn't match.

**Files to change:**

- `apps/api/src/domains/subscriptions/application/dto/subscription.dto.ts`

**Apply:**

Open the file. Replace the hand-rolled `interface
SubscriptionResponseDto` (around line 24) with a Zod schema:

```ts
export const subscriptionResponseSchema = z.object({
  id: z.string(),
  clinicId: z.string(),
  plan: z.string(),
  billingCycle: z.string(),
  status: z.string(),
  basePriceCents: z.number(),
  totalDiscountPercent: z.number(),
  creditsCents: z.number(),
  currentPeriodStart: z.string(),
  currentPeriodEnd: z.string(),
  trialEnd: z.string().nullable().optional(),
  autoPayEnabled: z.boolean(),
  cancelledAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type SubscriptionResponseDto = z.infer<typeof subscriptionResponseSchema>;

export class SubscriptionResponseDtoClass extends createZodDto(subscriptionResponseSchema) {}
```

Replace every `SubscriptionResponseDto` reference (in controllers,
services) with `SubscriptionResponseDtoClass` if they need the DTO
class, or keep the `SubscriptionResponseDto` type alias (both are
now derived from Zod).

**Verify:**

```bash
pnpm --filter @docita/api run lint
pnpm --filter @docita/api run check-types
pnpm --filter @docita/api run test
```

**Commit message:** `refactor(api): convert SubscriptionResponseDto interface to Zod schema`

---

## P0-6: Delete dead business rules (Group A)

**Why it matters:** 33 functions across 8 files in
`features/*/rules/*.ts` are tested but never imported by production
code. They add bundle size, maintenance burden, and confusion.

**Risk:** Low — each file is independently testable. If a rule is
actually used, the test would still pass but the production code
would not import it. Spot-check the 8 files before deleting.

**Files to change (delete only the unused exports; keep file if it
has used exports too):**

| File | Unused exports |
|---|---|
| `apps/app/src/features/appointments/rules/appointment-rules.ts` | `isAppointmentPast`, `isAppointmentToday`, `canCheckIn`, `canCancel` |
| `apps/app/src/features/consultation/rules/consultation-rules.ts` | `getVitalRanges`, `isVitalNormal`, `requiresUrgentAttention` |
| `apps/app/src/features/consultation/rules/consultationTabRouting.ts` | `legacyTabToSectionId`, `getConsultationTabIds`, `normalizeConsultationTab` |
| `apps/app/src/features/documents/rules/document-rules.ts` | `isValidFileExtension`, `isValidFileSize`, `detectDocumentType`, `formatFileSize`, `getFileIcon` |
| `apps/app/src/features/invoices/rules/invoice-rules.ts` | `isInvoiceOverdue`, `canEditInvoice`, `validateInvoiceItems` |
| `apps/app/src/features/ipd/rules/ipd-rules.ts` | `canAdmitPatient`, `canDischargePatient`, `calculateLengthOfStay`, `getBedOccupancyRate`, `getAvailableBeds` |
| `apps/app/src/features/ipd/lib/ipd-stats-helpers.ts` | `countBedsByStatus`, `countTotalBeds` |
| `apps/app/src/features/lab-tests/rules/lab-test-rules.ts` | `getTestResultStatus`, `formatLabValue`, `hasAbnormalResults`, `hasCriticalResults`, `LabTestResult` |
| `apps/app/src/features/medical-coding/rules/coding-rules.ts` | `isValidICD10Code`, `isValidCPTCode`, `getICD10Category`, `formatDiagnosisCode`, `requiresMoreSpecificity` |
| `apps/app/src/features/patients/rules/patient-rules.ts` | `isPatientMinor`, `validatePatientData` |
| `apps/app/src/features/patients/rules/vitals-rules.ts` | `isBloodPressureNormal`, `isPulseNormal`, `isTemperatureNormal` |

**Apply (per file):**

1. Read the file to confirm the export is unused (the doc has the
   full file:line and surrounding context).
2. Delete the unused export and any related test cases.
3. If the file becomes empty, delete the file too.

Example for `appointment-rules.ts`:

```diff
-export const isAppointmentPast = (appointment: Appointment): boolean => {
-  return isPast(appointment.startTime);
-};
-export const isAppointmentToday = (appointment: Appointment): boolean => {
-  return isToday(appointment.startTime);
-};
 export { getAppointmentStatusDisplay } from "./appointment-status-display";
 export { validateAppointmentData } from "./appointment-validation";
-export const canCheckIn = (appointment: Appointment): boolean => { ... };
-export const canCancel = (appointment: Appointment): boolean => { ... };
```

And in `apps/app/src/features/appointments/rules/appointment-rules.test.ts:4-9`,
remove the matching imports + test cases.

**Verify:**

```bash
pnpm --filter @docita/app run test:run
pnpm --filter @docita/app run lint
pnpm --filter @docita/app run check-types
pnpm knip
```

**Commit message:** `refactor(frontend): delete dead business rules (group A)`

---

## P0-7: Delete entire feature sub-folders (Group B/C/D/E)

**Why it matters:** IPD, patient-portal, lab-tests settings, and
ConsentNoticeModal are entirely orphaned. No imports from production.

**Risk:** Low — confirm no imports from any test/e2e file first.

**Folders to delete:**

- `apps/app/src/features/ipd/` (entire directory)
- `apps/app/src/features/patient-portal/` (entire directory — but
  check if a separate entry point exists)
- `apps/app/src/features/lab-tests/components/settings/`
- `apps/app/src/features/legal/`

**Apply:**

```bash
# First, confirm no external imports
pnpm knip
rg "features/ipd" apps packages --type ts --type tsx 2>/dev/null | grep -v "apps/app/src/features/ipd/" || echo "no external imports"
rg "features/patient-portal" apps packages --type ts --type tsx 2>/dev/null | grep -v "apps/app/src/features/patient-portal/" | head -5

# Then delete
git rm -r apps/app/src/features/ipd/
git rm -r apps/app/src/features/lab-tests/components/settings/
git rm -r apps/app/src/features/legal/
```

For `patient-portal/`, check first — it may have a separate entry
point in `App.tsx` that imports from a different file. The Portal
layout is in `apps/app/src/components/layout/portal-layout.tsx:1`
which imports from
`apps/app/src/features/patient-portal/components/layout/portal-layout-shell.tsx`.
So the **shell** must stay, but the components, hooks, and pages
inside `patient-portal/` (other than the shell) can likely be
deleted.

**Verify:**

```bash
pnpm --filter @docita/app run lint
pnpm --filter @docita/app run check-types
pnpm --filter @docita/app run test:run
pnpm knip
```

**Commit message:** `refactor(frontend): delete orphaned feature sub-folders`

---

## P0-8: Fix the 4 `transition-all` violations

**Why it matters:** The motion policy (`UI_UX_STANDARD_2026.md` §4)
forbids `transition-all` because it animates every CSS property
including properties that don't change, causing visible jank on
Safari iOS and Linux Firefox.

**Risk:** None — explicit property names are more performant.

**Files to change:**

| File:line | Replace with |
|---|---|
| `apps/internal/src/features/analytics/pages/analytics-page.tsx:192` | `transition-[width] duration-300` |
| `apps/internal/src/components/layout/protected-layout.tsx:67` | `transition-[width] duration-200` |
| `apps/landing/src/components/pricing-mode-toggle.tsx:28` | `transition-colors duration-150` |
| `apps/landing/src/components/pricing-mode-toggle.tsx:57` | `transition-colors duration-150` |

**Apply:**

For each line, edit the className string. Use the file's existing
pattern (the landing ones already have `focus-visible:ring-*`
classes, so just swap `transition-all` for the property name).

**Verify:**

```bash
pnpm --filter @docita/internal run lint
pnpm --filter @docita/landing run lint
```

Manual: navigate to the analytics page, hover the progress bar.
The width should animate smoothly. On the landing pricing toggle,
the active tab should transition background/color only.

**Commit message:** `fix(ui): replace transition-all with explicit property names`

---

## P0-9: Replace `animate-pulse` with `<Skeleton>`

**Why it matters:** Same motion policy. The consultation dashboard
skeleton uses a raw `animate-pulse` div instead of the shared
`<Skeleton>` primitive. Visual jank and policy violation.

**Risk:** None — `<Skeleton>` has the same look with `animation="shimmer"`.

**File to change:**

- `apps/app/src/features/consultation/components/consultation-dashboard-sections.tsx:83-95`

**Apply:**

Replace `ConsultationDashboardSkeleton`:

```diff
-export function ConsultationDashboardSkeleton() {
-  return (
-    <div className="space-y-4 p-4">
-      <div className="animate-pulse space-y-3">
-        <div className="h-8 w-48 rounded bg-muted-foreground/10" />
-        <div className="grid grid-cols-4 gap-4">
-          {[1, 2, 3, 4].map((i) => (
-            <div key={i} className="h-20 rounded-lg bg-muted-foreground/10" />
-          ))}
-        </div>
+import { Skeleton } from "@workspace/ui/components/feedback/skeleton";
+
+export function ConsultationDashboardSkeleton() {
+  return (
+    <div className="space-y-4 p-4">
+      <div className="space-y-3">
+        <Skeleton className="h-8 w-48" />
+        <div className="grid grid-cols-4 gap-4">
+          {[1, 2, 3, 4].map((i) => (
+            <Skeleton key={i} className="h-20 rounded-lg" />
+          ))}
+        </div>
         {/* ...rest of skeleton... */}
```

**Verify:**

```bash
pnpm --filter @docita/app run lint
```

Manual: trigger the dashboard loading state (throttle network in
devtools). The skeleton should render with the shimmer animation,
not the pulse animation.

**Commit message:** `fix(ui): use shared Skeleton primitive in consultation dashboard`

---

# Phase P1 — UI/UX gaps (≤1 day)

## P1-1: Add the spec-required sidebar footer

**Why it matters:** `docs/ui/UI_UX_STANDARD_2026.md` §1.1 requires
the sidebar to have Settings / Help / theme toggle / Plan / Ask AI
in the footer. Current sidebar has none of these.

**Risk:** Low — additive change.

**Files to change:**

- `apps/app/src/components/navigation/sidebar.tsx` (add a footer)
- `packages/ui/src/components/navigation/sidebar-rail-action.tsx`
  (may need new variants)

**Apply:**

In `sidebar.tsx`, add a footer section inside the `<aside>` (after
the `{nav}` line):

```tsx
{/* Footer: Settings, Help, Theme, Plan, Ask AI (per UI_UX_STANDARD_2026 §1.1) */}
<div className="border-t border-border/60 px-2 py-3 space-y-0.5">
  <SidebarLink
    item={{
      href: "/settings",
      icon: Settings,
      label: "Settings",
      labelKey: "settings",
    }}
    collapsedRail={isCollapsed}
    showLabels
  />
  <SidebarLink
    item={{
      href: "/help",
      icon: HelpCircle,
      label: "Help",
      labelKey: "help",
    }}
    collapsedRail={isCollapsed}
    showLabels
  />
  <ThemeToggleButton collapsedRail={isCollapsed} />
  <SidebarLink
    item={{
      href: SUBSCRIPTION_SETTINGS_PATH,
      icon: CreditCard,
      label: "Plan & billing",
      labelKey: "planBilling",
    }}
    collapsedRail={isCollapsed}
    showLabels
  />
  <AskAiButton collapsedRail={isCollapsed} />
</div>
```

Create `apps/app/src/components/ask-ai/ask-ai-button.tsx`:

```tsx
import { Sparkles } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import { SidebarLink } from "@/components/navigation/sidebar-nav-link";
import { useAskAi } from "./ask-ai-context";

export function AskAiButton({ collapsedRail = false }: { collapsedRail?: boolean }) {
  const { openOverlay } = useAskAi();
  return (
    <Button
      type="button"
      variant="default"
      onClick={() => openOverlay({ id: "sidebar", label: "Sidebar" })}
      className="h-9 w-full justify-start gap-2 px-2.5"
      aria-label="Open Ask AI"
    >
      <Sparkles className="size-4" />
      {!collapsedRail && <span className="text-sm font-medium">Ask AI</span>}
    </Button>
  );
}
```

The `Settings` and `HelpCircle` and `CreditCard` icons are
already in `lucide-react`. `ThemeToggleButton` is a new
extraction — the existing `theme-toggle.tsx` is a full component;
extract a `ThemeToggleButton` that uses the existing
`useAppearanceStore` for the toggle, with optional label.

Add `apps/app/src/messages/en/Common.json`:
```json
{
  "sidebar": {
    "settings": "Settings",
    "help": "Help",
    "askAi": "Ask AI"
  }
}
```

And the same to `apps/app/src/messages/hi/Common.json`:
```json
{
  "sidebar": {
    "settings": "सेटिंग्स",
    "help": "सहायता",
    "askAi": "AI से पूछें"
  }
}
```

**Verify:**

```bash
pnpm --filter @docita/app run lint
pnpm --filter @docita/app run check-types
pnpm --filter @docita/app run test:run
```

Manual: open the app. Scroll to the bottom of the sidebar. You
should see 5 items: Settings, Help, theme toggle, Plan & billing,
Ask AI (the Ask AI button styled as primary). All clickable.

**Commit message:** `feat(ui): add spec-required sidebar footer (Settings, Help, Theme, Plan, Ask AI)`

---

## P1-2: Add skip-to-content links to all 5 clinician layouts

**Why it matters:** WCAG 2.4.1 (Bypass Blocks, Level A) requires a
mechanism to skip repetitive navigation. Only `public-booking` has
one.

**Risk:** None.

**Files to change:**

- `apps/app/src/components/layout/protected-layout.tsx`
- `apps/app/src/components/layout/setup-layout.tsx`
- `apps/app/src/components/layout/portal-layout.tsx`
- `apps/app/src/components/layout/public-layout.tsx`
- `apps/app/src/components/layout/lab-portal-layout.tsx`
- `apps/app/src/components/layout/tools-layout.tsx` (6 total)

**Apply (per file):**

Add an `id="main-content"` to the `<main>` element and an `<a
href="#main-content">Skip to main content</a>` as the first
focusable element.

The reference pattern is
`apps/landing/src/components/public-booking/atoms/public-booking-top-chrome.tsx:22`:

```tsx
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:shadow-md focus:ring-2 focus:ring-ring"
>
  Skip to main content
</a>
```

**Verify:**

```bash
pnpm --filter @docita/app run lint
```

Manual: load the app, press Tab from the address bar. The "Skip to
main content" link should appear, pressing Enter should move focus
to the `<main>` element.

**Commit message:** `feat(a11y): add skip-to-content links to all layouts`

---

## P1-3: Convert 14 `apps/internal` pages to React Query

**Why it matters:** Eliminates 20 `useState` + 20 `useEffect` mount-fetch
pairs, standardizes mutation invalidation, gives consistent loading
states via `isFetching`/`isRefetching`. Largest single perf +
maintainability win in the audit.

**Risk:** Medium — loading state semantics change, mutation patterns
need refactoring. Per-page review needed.

**Files to change (14 page files):**

See [`FRONTEND_USEEFFECT_INDEX_FULL_2026-08-11.md`](./FRONTEND_USEEFFECT_INDEX_FULL_2026-08-11.md)
"14 mount-fetch appendix" for the exact list with bodies.

**Template (per file):**

Read the file, identify the `useState`/`useEffect` mount-fetch pair
and the `apiGet`/`apiPost` calls. Replace with `useAPIQuery` and
`useAPIMutation`:

```diff
-const [loading, setLoading] = useState(true);
-const [items, setItems] = useState<Item[]>([]);
-
-const fetchData = async () => {
-  setLoading(true);
-  try {
-    const data = await apiGet<Item[]>("/api/internal/...");
-    setItems(data);
-  } catch { /* ignore */ }
-  finally { setLoading(false); }
-};
-
-useEffect(() => { void fetchData(); }, []);
+const { data: items = [], isLoading: loading, refetch } = useAPIQuery<Item[]>(
+  internalQueryKeys.x,
+  "/api/internal/...",
+);
```

For mutations (after a POST/PUT/DELETE), invalidate the query:

```diff
-await apiPost("/api/internal/...", payload);
-await fetchData();
+const createMutation = useAPIMutation({ ... });
+await createMutation.mutateAsync(payload);
+queryClient.invalidateQueries({ queryKey: internalQueryKeys.x });
```

Add to imports:
```ts
import { useAPIQuery, useAPIMutation } from "@workspace/data-access";
import { useQueryClient } from "@tanstack/react-query";
import { internalQueryKeys } from "@workspace/data-access";
```

**Verify per file:**

```bash
pnpm --filter @docita/internal run lint
pnpm --filter @docita/internal run check-types
```

Manual: load each refactored page, perform a mutation, confirm
the data refreshes. The refresh button should still work via
`refetch()`.

**Commit message:** `refactor(internal): convert 14 admin pages to React Query`

This is a 4-hour refactor — recommend splitting into 2-3 PRs by
domain (billing+broadcasts, dashboards+users, support+admins).

---

## P1-4: Convert 8 settings forms to RHF `values` prop

**Why it matters:** Eliminates 8 `useEffect(() => form.reset(...), [prop, form])`
patterns. The current pattern fires the effect after every render
where the dep changes, which can cause flicker on tab switches.

**Risk:** Low — RHF v7.43+ has the `values` prop officially. The
form is then declaratively bound to the source prop.

**Files to change:**

- `apps/app/src/features/settings/components/security/SecuritySettings.tsx:34`
- `apps/app/src/features/settings/components/clinical/OpdSlipSettings.tsx:31`
- `apps/app/src/features/settings/components/clinical/PrescriptionDefaultsSettings.tsx:30`
- `apps/app/src/features/settings/components/clinic/use-clinic-general-settings.ts:56`
- `apps/app/src/features/settings/components/clinic/queue/queue-configuration-form.tsx:30`
- `apps/app/src/features/settings/components/notifications/NotificationSettings.tsx:34`
- `apps/app/src/features/settings/components/notifications/ReminderSettingsUI.tsx:38`
- `apps/app/src/features/invoices/hooks/use-invoice-edit-logic.ts:50`
- `apps/app/src/features/insurance-claims/hooks/use-insurance-claim-edit-logic.ts:40`
- `apps/app/src/features/patients/components/forms/dialogs/EditPatientDialog.tsx:88`
- `apps/app/src/features/auth/pages/forgot-password.tsx:43`
- `apps/app/src/features/dialogs/components/InventoryAddItemDialogUI.tsx:45`
- `apps/app/src/features/dialogs/components/ContactSalesModalUI.tsx:43`

**Apply (per file):**

Replace:
```diff
-  const form = useForm<FormValues>({ defaultValues: initialDefaults });
-  useEffect(() => {
-    if (source) form.reset(buildValuesFromSource(source));
-  }, [source, form]);
+  const form = useForm<FormValues>({ defaultValues: initialDefaults, values: source ? buildValuesFromSource(source) : undefined });
```

The `values` prop (vs `defaultValues`) makes the form reactive to
changes in `source` — RHF re-renders the fields when the values
change.

**Verify:**

```bash
pnpm --filter @docita/app run lint
pnpm --filter @docita/app run test:run
```

Manual: open a settings form, switch between clinics in the clinic
switcher. The form should update to the new clinic's settings
without flicker. Edit a value, switch clinics, switch back — the
edit should be replaced by the source value.

**Commit message:** `refactor(forms): use RHF values prop instead of useEffect form.reset`

---

## P1-5: Wire `@ZodSerializerDto` on the 51 missing controllers

**Why it matters:** The "0 waste API" rule. Without `@ZodSerializerDto`,
the controller passes the raw response through, which may include
Prisma-model fields the contract never declared. The
`SafeZodSerializerInterceptor` strips these on `@ZodSerializerDto`
controllers but is a no-op otherwise.

**Risk:** Low — the interceptor is non-throwing (logs warning on
schema mismatch, passes original through). Worst case is a
controller starts logging warnings that point to schema/response
drift.

**Files to change (51 controllers, top 10 by domain):**

See
[`FRONTEND_BEST_PRACTICES_2026-08-11.md`](./FRONTEND_BEST_PRACTICES_2026-08-11.md)
§4.4 for the full list.

**Apply (per controller):**

```diff
-  @Get(':id')
-  async findOne(@Param('id') id: string): Promise<X> {
+  @Get(':id')
+  @ZodSerializerDto(XResponseDto)
+  async findOne(@Param('id') id: string): Promise<X> {
```

The DTO is the Zod-derived response schema in
`packages/types/src/contracts/<domain>.ts`.

**Verify:**

```bash
pnpm --filter @docita/api run lint
pnpm --filter @docita/api run check-types
```

Check the response payload with a curl after the change:

```bash
curl -s -H "Cookie: $SESSION" https://staging-api.docita.work/patients/123 | jq 'keys'
```

Compare with the contract schema; only the declared fields should
be in the response.

**Commit message:** `refactor(api): wire @ZodSerializerDto on remaining controllers (0-waste API)`

Recommend splitting into 2-3 PRs by domain.

---

## P1-6: Migrate 177 hardcoded JSX strings to i18n

**Why it matters:** Indian (Hindi) users see English text for these
177 strings despite the i18n layer being otherwise complete. Clinical
copy in English is a real product issue.

**Risk:** Low — adding i18n keys + replacements is mechanical.

**Files to change:** 121 files, top 10 domains by count:
- `features/subscription/` (11 strings)
- `features/settings/` (10)
- `features/lab-tests/` (10)
- `features/setup/` (9)
- `features/consultation/` (9)
- `features/invoices/` (6)
- `features/ipd/` (4) — but IPD is being deleted in P0-7
- `features/medical-coding/` (1)

**Apply (per file):**

1. Find the hardcoded string from the
   [`FRONTEND_FINAL_PASS_CONT_2026-08-11.md`](./FRONTEND_FINAL_PASS_CONT_2026-08-11.md)
   §3.2 list.
2. Add a key to `apps/app/src/messages/en/<Domain>.json` and
   `apps/app/src/messages/hi/<Domain>.json`.
3. Replace the JSX text with `{t("keyName")}`.

Example for `features/consultation/components/ConsultationLeaveDialog.tsx:37`:

```diff
+ // apps/app/src/messages/en/Consultation.json
+ { "leaveDialog": { "title": "Leave consultation?" } }

+ // apps/app/src/messages/hi/Consultation.json
+ { "leaveDialog": { "title": "परामर्श छोड़ें?" } }

- <DialogTitle>Leave consultation?</DialogTitle>
+ <DialogTitle>{t("leaveDialog.title")}</DialogTitle>
```

**Verify:**

```bash
pnpm --filter @docita/app run lint
pnpm --filter @docita/app run test:run
# Specifically test the namespace-registration test
pnpm --filter @docita/app run test:run -- --testPathPattern="namespace-registration"
```

Manual: switch to Hindi in settings, navigate to all changed
pages, confirm the strings appear in Devanagari.

**Commit message:** `feat(i18n): migrate 177 hardcoded strings to t() (subscription first)`

---

## P1-7: Add `useTimeout` / `useInterval` to `packages/hooks/src`

**Why it matters:** 16 sites manually track `setTimeout` /
`setInterval` with ref-based cleanup. The pattern is consistent
enough to extract. Promotes to the canonical 27 shared hooks.

**Risk:** Low — purely additive.

**Files to add:**

- `packages/hooks/src/use-timeout.ts`
- `packages/hooks/src/use-interval.ts`
- `packages/hooks/src/use-debounced-callback.ts` (alternative to
  `useDebounce` for the callback variant)

**Apply (create):**

`packages/hooks/src/use-timeout.ts`:

```ts
import { useEffect, useRef } from "react";

/**
 * Run `callback` after `delay` ms. Pass `delay: null` to skip.
 * The latest callback is used (no stale closure).
 */
export function useTimeout(callback: () => void, delay: number | null): void {
  const callbackRef = useRef(callback);
  useEffect(() => { callbackRef.current = callback; }, [callback]);
  useEffect(() => {
    if (delay === null) return;
    const id = setTimeout(() => callbackRef.current(), delay);
    return () => clearTimeout(id);
  }, [delay]);
}
```

`packages/hooks/src/use-interval.ts`:

```ts
import { useEffect, useRef } from "react";

/**
 * Run `callback` every `delay` ms. Pass `delay: null` to stop.
 * The latest callback is used (no stale closure).
 */
export function useInterval(callback: () => void, delay: number | null): void {
  const callbackRef = useRef(callback);
  useEffect(() => { callbackRef.current = callback; }, [callback]);
  useEffect(() => {
    if (delay === null) return;
    const id = setInterval(() => callbackRef.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}
```

Add to `packages/hooks/src/index.ts`:

```ts
export * from "./use-timeout.js";
export * from "./use-interval.js";
```

**Then migrate the 16 sites** to use the new hooks. The list is in
[`FRONTEND_BEST_PRACTICES_2026-08-11.md`](./FRONTEND_BEST_PRACTICES_2026-08-11.md)
§2.1.

**Verify:**

```bash
pnpm --filter @workspace/hooks run test:run
pnpm --filter @docita/app run test:run
```

**Commit message:** `feat(hooks): add useTimeout and useInterval to @workspace/hooks`

---

# Phase P2 — Polish (≤2 days)

## P2-1: Promote list-item/detail convention to 27 contract files

**Why it matters:** Smaller list payloads (typically 50%+ reduction).
The single `appointments.ts` contract uses the canonical 4-schema
pattern; the other 27 don't. List endpoints currently return
detail-sized payloads.

**Risk:** Low — back-end types stay the same, only the contract
shapes change.

**Files to change (27 contract files):**

For each contract file, add a `<Entity>ListItemSchema` with the
list-page fields, then a `<Entity>ResponseSchema` extending it
with the detail-page fields. See the
[`FRONTEND_BEST_PRACTICES_2026-08-11.md`](./FRONTEND_BEST_PRACTICES_2026-08-11.md)
§4.6 for the template.

**Verify:**

```bash
pnpm --filter @workspace/types run test:run
pnpm --filter @docita/api run check-types
pnpm --filter @docita/app run check-types
```

**Commit message:** `refactor(contracts): add list-item schemas for all 28 domains`

---

## P2-2: Add JSX-text-must-be-`t()`-wrapped lint rule

**Why it matters:** Prevents the 177 hardcoded strings from coming
back after migration.

**Risk:** None.

**Files to change:**

- `packages/eslint-config/` (add the rule)
- `apps/app/eslint.config.*` (enable)

**Apply:**

Add a custom ESLint rule in
`packages/eslint-config/src/rules/no-hardcoded-jsx-text.ts`:

```ts
import { ESLintUtils, AST_NODE_TYPES } from "@typescript-eslint/utils";

export default ESLintUtils.RuleCreator.withoutDocs({
  meta: {
    type: "problem",
    messages: {
      hardcoded:
        "Hardcoded user-facing string in JSX. Wrap with t() from useTranslation.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      JSXText(node) {
        if (node.parent?.type === AST_NODE_TYPES.JSXElement &&
            /^[A-Z]/.test(node.value.trim())) {
          context.report({ node, messageId: "hardcoded" });
        }
      },
    };
  },
});
```

The rule fires when a JSX text node starts with a capital letter
(high-signal indicator of user-facing copy). Whitespace and
punctuation-only nodes are exempt.

Wire it in via the shared config. Initially `warn`, not `error`.

**Verify:**

```bash
pnpm --filter @docita/app run lint 2>&1 | head -100
```

The 177 sites should now produce warnings.

**Commit message:** `feat(lint): add no-hardcoded-jsx-text rule (warn initially)`

---

## P2-3: Add en/hi key-parity CI check

**Why it matters:** Prevents future drift between the two locales.

**Risk:** None.

**File to add:**

- `scripts/checks/check-i18n-parity.mjs`

**Apply:**

```js
#!/usr/bin/env node
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const MSG = "apps/app/src/messages";
const en = readdirSync(join(MSG, "en")).filter(f => f.endsWith(".json"));
const hi = readdirSync(join(MSG, "hi")).filter(f => f.endsWith(".json"));

function flatten(o, p = "") {
  return Object.entries(o).flatMap(([k, v]) =>
    typeof v === "object" ? flatten(v, `${p}${k}.`) : [`${p}${k}`]
  );
}

const errors = [];
for (const f of en) {
  if (!hi.includes(f)) { errors.push(`hi/ missing ${f}`); continue; }
  const a = new Set(flatten(JSON.parse(readFileSync(join(MSG, "en", f), "utf8"))));
  const b = new Set(flatten(JSON.parse(readFileSync(join(MSG, "hi", f), "utf8"))));
  for (const k of a) if (!b.has(k)) errors.push(`${f}: hi missing ${k}`);
  for (const k of b) if (!a.has(k)) errors.push(`${f}: en missing ${k}`);
}

if (errors.length) {
  console.error("i18n parity FAILED:\n" + errors.join("\n"));
  process.exit(1);
}
console.log("i18n parity OK");
```

Add to `package.json`:
```json
{ "scripts": { "check:i18n": "node scripts/checks/check-i18n-parity.mjs" } }
```

Add to `verify:standard` if not already.

**Verify:**

```bash
pnpm check:i18n
```

**Commit message:** `ci(i18n): add en/hi key-parity check`

---

## P2-4: Add per-layout skip-to-content links (already in P1-2)

If P1-2 wasn't done, do it here. Otherwise skip.

---

## P2-5: Extract `<Toaster>` config to `@workspace/ui`

**Why it matters:** App and internal both use `sonner`'s Toaster but
with different configurations. Single source of truth prevents drift.

**Risk:** Low.

**File to add:**

- `packages/ui/src/components/feedback/toaster.tsx`

**Apply:**

```tsx
import { Toaster as SonnerToaster } from "sonner";

export function Toaster({ position = "top-right" }: { position?: "top-right" | "top-center" | "top-left" | "bottom-right" | "bottom-center" | "bottom-left" } = {}) {
  return (
    <SonnerToaster
      richColors
      position={position}
      duration={4000}
      toastOptions={{
        classNames: {
          toast: "rounded-xl border shadow-lg",
          description: "text-sm",
        },
      }}
    />
  );
}
```

Re-export from `packages/ui/src/components/feedback/index.ts`.

In `apps/app/src/components/layout/providers.tsx:30-39`, replace:

```diff
-<Toaster richColors position="top-right" duration={4000} ... />
+<Toaster />
```

Same in `apps/internal/src/main.tsx:34`.

**Verify:**

```bash
pnpm --filter @docita/app run lint
pnpm --filter @docita/internal run lint
```

**Commit message:** `refactor(ui): extract shared Toaster to @workspace/ui`

---

# Phase P3 — Long-arc (≤1 week)

## P3-1: Wire 2 dead skeletons OR delete them

`@workspace/ui/components/feedback/patient-list-skeleton.tsx` and
`appointment-calendar-skeleton.tsx` are defined but never imported
in production.

**Decision:**
- **Wire up** if the corresponding pages
  (`features/patients/components/list/PatientsPageUI.tsx` and
  `features/appointments/components/CalendarViewSection.tsx`) need
  them.
- **Delete** if not.

**Apply (delete branch):**

```bash
git rm packages/ui/src/components/feedback/patient-list-skeleton.tsx
git rm packages/ui/src/components/feedback/patient-list-skeleton.test.tsx
git rm packages/ui/src/components/feedback/appointment-calendar-skeleton.tsx
git rm packages/ui/src/components/feedback/appointment-calendar-skeleton.test.tsx
```

Update `packages/ui/src/components/feedback/index.ts` to remove
their exports.

**Verify:**

```bash
pnpm --filter @workspace/ui run test:run
pnpm --filter @docita/app run build
```

**Commit message:** `refactor(ui): delete unused PatientListSkeleton and AppointmentCalendarSkeleton`

---

## P3-2: Promote `useEffectivePermissions` cache to `@workspace/data-access`

**Why it matters:** The module-level cache in
`apps/app/src/lib/access-control/use-effective-permissions.ts:12`
is currently a frontend-only pattern. The API could also use the
snapshot for fast role checks.

**Risk:** Medium — requires API changes.

**Files to change:**

- Move the snapshot logic to `packages/data-access/src/snapshots/permissions.ts`
- Add a server-side equivalent in `apps/api/src/shared/modules/permissions/`
- Wire both to a shared Zod schema

**Verify:**

```bash
pnpm --filter @workspace/data-access run test:run
pnpm --filter @docita/api run test:run
```

**Commit message:** `refactor(permissions): share effective-permissions snapshot between API and UI`

---

## P3-3: Audit 40 `<h1>` sites for duplicates

**Why it matters:** AGENTS.md §8.1 says primary headings should be
clearly larger. Having two `<h1>` per page (PageHeader + inline)
dilutes the hierarchy.

**Risk:** None.

**Apply:**

```bash
# Find pages with both a PageHeader and an inline <h1>
python3 <<'PY'
import os, re
for dp, _, fns in os.walk('apps/app/src/features'):
    for fn in fns:
        if not fn.endswith('.tsx') or '.test.' in fn or '.spec.' in fn:
            continue
        if 'page' not in fn.lower():
            continue
        f = os.path.join(dp, fn)
        src = open(f).read()
        if 'PageHeader' not in src:
            continue
        if re.search(r'<h1\b', src):
            print(f"{f}: has PageHeader + <h1>")
PY
```

For each file, decide:
- If the inline `<h1>` is the main content title (and PageHeader is just metadata), demote the inline to `<h2>`.
- If PageHeader is the only h1 needed, delete the inline.

**Verify:**

```bash
pnpm --filter @docita/app run lint
```

**Commit message:** `refactor(ui): ensure single h1 per page (resolve PageHeader duplicates)`

---

# Tracker

Update as work completes. Format: `- [ ]` for pending, `- [x]` for
done, with PR/branch reference.

## P0 — Bugs

- [ ] P0-1: Wire `data-accent` and `data-density` in `theme-provider.tsx`
- [ ] P0-2: Add `isLoading` check to `DoctorProfileSettings`
- [ ] P0-3: Per-layout `ErrorBoundaryWrapper` in `apps/internal`
- [ ] P0-4: Add `VITE_SENTRY_DSN` to `apps/internal/src/vite-env.d.ts`
- [ ] P0-5: Replace `SubscriptionResponseDto` interface with Zod
- [ ] P0-6: Delete dead business rules (Group A) — 11 files
- [ ] P0-7: Delete orphaned feature sub-folders (IPD, patient-portal, lab-tests settings, legal) — 4 directories
- [ ] P0-8: Fix 4 `transition-all` sites
- [ ] P0-9: Replace `animate-pulse` with `<Skeleton>` in consultation dashboard

## P1 — UI/UX gaps

- [ ] P1-1: Sidebar footer (Settings, Help, Theme, Plan, Ask AI)
- [ ] P1-2: Skip-to-content links in 6 layouts
- [ ] P1-3: 14 `apps/internal` pages to React Query (split into 2-3 PRs)
  - [ ] P1-3a: billing + broadcasts + pricing
  - [ ] P1-3b: dashboards + users + doctors
  - [ ] P1-3c: support + admins + others
- [ ] P1-4: 13 settings forms to RHF `values` prop
- [ ] P1-5: 51 controllers' `@ZodSerializerDto` (split into 2-3 PRs)
  - [ ] P1-5a: patients + clinical
  - [ ] P1-5b: subscriptions + enterprise-contracts
  - [ ] P1-5c: doctors + remaining
- [ ] P1-6: Migrate 177 hardcoded strings to i18n (subscription first)
- [ ] P1-7: Add `useTimeout` / `useInterval` to `packages/hooks/src`

## P2 — Polish

- [ ] P2-1: List-item/detail convention in 27 contract files
- [ ] P2-2: `no-hardcoded-jsx-text` lint rule
- [ ] P2-3: en/hi key-parity CI check
- [ ] P2-5: Extract `<Toaster>` to `@workspace/ui`

## P3 — Long-arc

- [ ] P3-1: Wire or delete 2 dead skeletons
- [ ] P3-2: Promote `useEffectivePermissions` to `@workspace/data-access`
- [ ] P3-3: Audit 40 `<h1>` sites for duplicates

## Cross-cutting

- [ ] Run full `pnpm verify:standard` after each phase
- [ ] Update
  [`FRONTEND_FINAL_PASS_SUMMARY_2026-08-11.md`](./FRONTEND_FINAL_PASS_SUMMARY_2026-08-11.md)
  with the final completion status
- [ ] Communicate the plan to the team via PR description

---

# Companion documents

This plan is the actionable layer on top of the 9 audit docs:

- [`PERFECT_APP_AUDIT_2026-08-11.md`](./PERFECT_APP_AUDIT_2026-08-11.md) — 10-standard scorecard across all 3 apps
- [`UI_UX_ENHANCEMENTS_2026-08-11.md`](./UI_UX_ENHANCEMENTS_2026-08-11.md) — design tokens, motion, sidebar IA, a11y
- [`FRONTEND_FINAL_PASS_CONT_2026-08-11.md`](./FRONTEND_FINAL_PASS_CONT_2026-08-11.md) — hooks, forms, i18n, API, Prisma, tests
- [`FRONTEND_USEEFFECT_INDEX_FULL_2026-08-11.md`](./FRONTEND_USEEFFECT_INDEX_FULL_2026-08-11.md) — every useEffect with body + line + classification
- [`FRONTEND_DEAD_CODE_FULL_2026-08-11.md`](./FRONTEND_DEAD_CODE_FULL_2026-08-11.md) — every dead export with file:line + context
- [`FRONTEND_BEST_PRACTICES_2026-08-11.md`](./FRONTEND_BEST_PRACTICES_2026-08-11.md) — shared primitives + React Query + Zod + 0-waste API
- [`FRONTEND_FULL_AUDIT_2026-08-11.md`](./FRONTEND_FULL_AUDIT_2026-08-11.md) — original static review
- [`FRONTEND_FINAL_PASS_SUMMARY_2026-08-11.md`](./FRONTEND_FINAL_PASS_SUMMARY_2026-08-11.md) — master index

When starting a task, **always re-read the relevant section** of the
doc it's drawn from to confirm the line numbers and surrounding code
haven't changed since the audit was generated.
