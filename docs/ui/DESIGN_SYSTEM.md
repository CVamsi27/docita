# Docita Design System

`@deprecated` Use `docs/ui/UI_UX_STANDARD_2026.md` as the authoritative UI/UX standard. This file remains only as a historical token and primitive reference.

Source of truth for tokens, typography, primitives, and keyboard/interaction patterns across every app.

> [`docs/ui/UI_UX_STANDARD_2026.md`](UI_UX_STANDARD_2026.md) is the authoritative UI/UX source going forward and **supersedes any conflicting guidance below**. This document remains as the detailed token, primitive, and accessibility reference. When a rule here disagrees with the Origin-inspired standard (information architecture, AI surface contract, motion policy, modal/wizard patterns, per-page test contract, per-feature compliance checklist), follow the standard.

## Tokens

All tokens live in [packages/ui/src/styles/globals.css](../packages/ui/src/styles/globals.css). They are exposed as CSS custom properties on `:root` and re-mapped under `@theme inline` so Tailwind v4 can resolve them in arbitrary-value classes without hardcoding.

### Color

- Core semantic roles: `--background`, `--foreground`, `--card`, `--popover`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`.
- Intent roles: `--info`, `--success`, `--warning`, `--destructive` (+ `-foreground` pairs).
- Workflow roles: `--pending`, `--processing`, `--completed`, `--cancelled`.
- Sidebar roles: `--sidebar`, `--sidebar-foreground`, `--sidebar-primary`, `--sidebar-accent`, `--sidebar-border`, `--sidebar-ring`.
- Elevation ramp: `--surface-1`, `--surface-2`, `--surface-3` (use instead of compositing `bg-card` with alpha overlays).
- Chart palette: `--chart-1` … `--chart-5` (analytics must bind to these, never raw hex).

All colors are authored in `oklch` so light and dark ramps stay perceptually aligned.

### Typography

- Families: `--font-sans` (Inter + system fallback), `--font-mono` (JetBrains Mono + system fallback). Wired via `@font-face` in `packages/ui/src/styles/globals.css`.
- Sizes: `--fs-2xs` (0.6875rem) through `--fs-4xl` (1.875rem). Use these via `text-[var(--fs-xs)]` in arbitrary values, or the Tailwind `text-xs/text-sm/text-base/...` scale mapped under `@theme inline`.
- Line-heights: `--lh-tight`, `--lh-snug`, `--lh-normal`, `--lh-relaxed`.
- Tracking: `--tracking-tight`, `--tracking-normal`, `--tracking-wide`.
- Weights: `--fw-regular`, `--fw-medium`, `--fw-semibold`, `--fw-bold`.

Do not reach for `text-[10px]`, `text-[11px]`, `text-[13px]`, `text-[15px]`: use `--fs-2xs`, `--fs-xs`, `--fs-sm`, `--fs-md`.

### Density + spacing

- `--density-scale` on `<html>` via `data-density="compact|comfortable|spacious"` (default `comfortable`, scale = 1).
- Derived spacing: `--space-1` (0.25rem) through `--space-8` (2rem), all multiplied by `--density-scale`.
- Control heights: `--control-h-sm`, `--control-h-md`, `--control-h-lg`.
- Radii: `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl` (derived from `--radius` 0.625rem base).

### Focus + motion

- `--ring-width` 2px, `--ring-offset-width` 2px, `--ring-offset-color` bound to `--background`. `:focus-visible` in base layer wires these globally.
- Motion: `--motion-fast` 120ms, `--motion-base` 200ms, `--motion-slow` 320ms. Easings: `--motion-ease`, `--motion-ease-in`, `--motion-ease-out`.
- `prefers-reduced-motion: reduce` globally neutralizes animations and transitions.

## Primitives

Exports from `@workspace/ui/components`:

- Layout/chrome: `AppShell`, `TopBar`, `Breadcrumbs`, `PageLayout`, `PageHeader`, `PageContainer`, `AppPageScaffold`, `Section`.
- Data/list: `DataTable`, `FilterBar`, `Toolbar`, `DescriptionList`, `Timeline`, `StatGrid`, `GradientStatCard`.
- Feedback/state: `EmptyState`, `ErrorState`, `LoadingState`, `DataState`, `Skeleton`, `Alert`.
- Forms: `Form`, `FormField`, `FieldRow`, `FormPage`, `FormGrid`, `FormSection`.
- Overlays: `Dialog`, `Sheet`, `Popover`, `DropdownMenu`, `Tooltip`, `Command`, `CommandDialog`, `CommandPaletteShell`, `DialogStackProvider`, `useDialogStack`.
- Print: `PrintSheet`.

## Keyboard map

Scoped to authenticated `apps/app` shell.

| Shortcut     | Action               |
| ------------ | -------------------- |
| `Cmd/Ctrl+K` | Open command palette |
| `/`          | Focus global search  |
| `?`          | Open keyboard help   |
| `Esc`        | Close top overlay    |
| `g d`        | Go to dashboard      |
| `g p`        | Go to patients       |
| `g a`        | Go to appointments   |
| `g i`        | Go to invoices       |
| `g r`        | Go to prescriptions  |
| `g x`        | Go to inventory      |
| `n p`        | New patient          |
| `n a`        | New appointment      |
| `n i`        | New invoice          |

Consultation route adds its own scoped shortcuts (documented in [apps/app/src/features/consultation/workspace/ConsultationShell.tsx](../apps/app/src/features/consultation/workspace/ConsultationShell.tsx)).

## Accessibility baseline

- Every icon-only control ships with `aria-label`.
- Forms use `<Form>` + `FormField` + `FieldRow`, never bare inputs without `<Label htmlFor>`.
- Loading/empty/error states use the shared primitives so screen readers see consistent text.
- Color contrast is verified by `apps/app/e2e/accessibility.spec.ts` (axe).

## Responsiveness

- Shell collapses sidebar to a `Sheet` below `md`.
- `DataTable` exposes a `stackOnMobile` variant that flips to a card list under `md`.
- Right rails become bottom sheets on mobile.
