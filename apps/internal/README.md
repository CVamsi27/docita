# apps/internal

Internal Next.js console for Docita operational staff. Not customer-facing.

## Access pattern

Role check happens in `apps/internal/lib/auth.tsx` (`AuthProvider`): on mount it reads the stored user, verifies `role === "INTERNAL"`, and redirects to the main-app login if the check fails. There is no separate middleware role gate — the `AuthProvider` at the root of `app/(protected)/layout.tsx` is the enforcement boundary.

Route protection is layered:

1. **`middleware.ts`** — redirects unknown paths to `/dashboard`; does not validate the JWT (stateless Next.js edge middleware).
2. **`AuthProvider` (client)** — validates the token via `GET /auth/validate`, enforces `role === "INTERNAL"`, refreshes the access token if needed, and clears storage + redirects on failure.

## Protected routes

`/dashboard`, `/users`, `/admins`, `/payment-processing`, `/billing`, `/pricing`, `/enterprise-contracts`, `/analytics`, `/system-monitoring`, `/feedback`, `/support`, `/broadcasts`, `/logs`, `/audits`, `/performance`, `/doctors`

## Boundaries

- Internal-only access checks belong at the `AuthProvider` boundary (see above) — not scattered in individual page components.
- Reuse `@workspace/ui`, `@workspace/types`, and `@workspace/data-access`.
- Do not duplicate app data clients or domain types here.
- Keep route files thin and move behavior into `features/<feature>`.

## Run

```bash
pnpm --filter @docita/internal run lint
pnpm --filter @docita/internal run test
pnpm audit:internal
```
