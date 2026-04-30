# UI redesign checklist (per page)

Use this for every route and its feature UI. Mark each item before merge.

## Shell and header

- [ ] Page uses `AppPageScaffold` with optional `density` / `contentClassName` only when needed.
- [ ] Primary context uses `PageHeader` (`title`, `description`, `actions`, `breadcrumbs`, `tabs`, `eyebrow`, `sticky`, `size`).
- [ ] No stray `container mx-auto` / one-off max-width unless product-specific (document why).

## Typography

- [ ] Headings use `ui-page-title` or `ui-section-title` (not raw `text-2xl` / `text-3xl` / `font-bold` / `tracking-normal`).
- [ ] Body and secondary copy use `ui-page-subtitle`, `ui-section-subtitle`, or `ui-helper-text` as appropriate.
- [ ] Numeric highlights use `StatTile`, `StatGrid`, or explicit `text-[var(--fs-*)]` with token line heights.

## Surfaces and elevation

- [ ] Cards use `Card` from `@workspace/ui` or `ui-card-surface` where a plain div is intentional.
- [ ] No `bg-white`; use `bg-background` / `bg-card` / semantic surfaces (`surface-*`, `badge-*`).
- [ ] Shadows limited to `shadow-sm` / `shadow-md` unless a documented exception.

## Data states

- [ ] Loading, empty, and error paths use `DataState` (or `LoadingState` / `EmptyState` / `ErrorState` where inline).
- [ ] Retry and navigation actions are wired; messages are user-safe (no PHI in client-only logs).

## Layout and responsiveness

- [ ] Vertical rhythm: `space-y-4 sm:space-y-6` or scaffold `density`.
- [ ] Grids stack on small viewports; header `actions` use `flex-wrap gap-2`.
- [ ] Sticky headers match sibling pages (`PageHeader` `sticky`).

## Accessibility

- [ ] Icon-only controls have `aria-label`.
- [ ] Focus order is logical; dialogs trap focus via shared primitives.

## Hygiene

- [ ] No `console.log` / `console.error`.
- [ ] No `{" "}` JSX spacing hacks; use spacing utilities or `<span className="ml-1">`.
- [ ] No stale `TODO` / `FIXME` in touched files.

## Verification

- [ ] `pnpm lint` and `pnpm --filter @docita/app run check-types` (or the app that changed).
- [ ] `pnpm audit:app` / `audit:internal` / `audit:landing` when that surface changed.
- [ ] Build the affected app when the change is broad.

## References

- Shared styles: `packages/ui/src/styles/globals.css`
- Layout primitives: `packages/ui/src/components/app-page-scaffold.tsx`, `page-header.tsx`
- Stats: `packages/ui/src/components/stat-tile.tsx`, `stat-grid.tsx`, `stats-card.tsx`
