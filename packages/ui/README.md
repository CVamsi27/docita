# @workspace/ui

Shared presentational primitives and global styles.

## Boundaries

- No data fetching, API clients, tenant logic, or business rules.
- Use tokens from `src/styles/globals.css`; do not hardcode product colors in components.
- Motion follows `docs/UI_UX_STANDARD_2026.md`: no decorative pulse/slide motion and no `transition-all`.
- Export reusable primitives from `src/components` rather than duplicating them in apps.

Use app-specific composition in `apps/*/features`; promote only stable primitives with multiple current consumers.
