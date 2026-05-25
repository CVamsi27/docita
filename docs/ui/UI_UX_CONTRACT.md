# UI/UX Contract (Doctor App + Portal)

This contract defines how UI should be built across `apps/app` and `apps/app/app/portal` to keep workflows fast, readable, and consistent for clinical usage.

> [`docs/ui/UI_UX_STANDARD_2026.md`](UI_UX_STANDARD_2026.md) is the authoritative UI/UX source going forward and **supersedes any conflicting guidance below**. This contract remains for the foundational page-structure, typography, motion, state, and component-ownership rules that the standard builds on. Where the two disagree, follow the standard. Engineering conventions (SOLID, KISS, DRY, comments, logging) live in [`AGENTS.md`](../AGENTS.md) §7 and §12.

## 1. Page Structure

- Use `@workspace/ui` page primitives:
  - `AppPageScaffold` for page layout and spacing.
  - `PageHeader` for title, description, and primary actions.
  - `DataState` for loading/error/empty/success rendering.
- Do not use raw `Loading...` text for data-fetching pages.

## 2. Typography Hierarchy

- Page titles: `text-3xl font-bold tracking-tight`.
- Section titles: `text-base` to `text-xl` depending on density.
- Body copy: `text-sm` or `text-base`.
- Helper text/sub-labels: `text-xs text-muted-foreground`.

## 3. Motion Policy

- Default surfaces are static.
- Use only minimal motion:
  - `animate-spin` for explicit loading feedback.
  - `transition-colors duration-150` for hover/focus states.
- Avoid broad/decorative motion in core workflows:
  - no default `transition-all`,
  - no lift/scale hover on non-primary interactions,
  - no persistent pulsing unless it communicates critical status.

## 4. State and Feedback Rules

- Every data page must support all states:
  - loading,
  - error (with retry when possible),
  - empty (with clear next action),
  - success.
- Use concise clinical language in state messages.

## 5. Component Ownership

- Prefer `@workspace/ui` primitives over app-local duplicates.
- If a new UI pattern is needed in multiple routes, add it to `packages/ui/src/components`.
- Keep feature components focused on workflow logic, not design-system reimplementation.
