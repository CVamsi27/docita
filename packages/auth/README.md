# @workspace/auth

Shared auth and permission semantics.

## Boundaries

- Keep role and permission behavior aligned with `packages/types/src/access/access-matrix.ts`.
- Feature/tier checks must use the shared access helpers, not numeric comparisons against add-on tiers.
- Do not import app UI or API infrastructure from this package.

Use this package for cross-app permission semantics; use app-local guards for framework-specific routing.
