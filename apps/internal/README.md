# apps/internal

Internal Next.js app for operational staff.

## Boundaries

- Internal-only access checks belong at the route/shell boundary.
- Reuse `@workspace/ui`, `@workspace/types`, and `@workspace/data-access`.
- Do not duplicate app data clients or domain types here.
- Keep route files thin and move behavior into `features/<feature>`.

Run:

```bash
pnpm --filter @docita/internal run lint
pnpm --filter @docita/internal run test
pnpm audit:internal
```
