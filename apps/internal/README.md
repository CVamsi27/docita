# apps/internal

Internal Next.js console for Docita operational staff. Not customer-facing.

## Access pattern

Role check happens in [`shared/lib/auth/auth.tsx`](shared/lib/auth/auth.tsx) (`AuthProvider`): on mount it reads the stored user, verifies `role === "INTERNAL"`, and redirects to the main-app login if the check fails.

Route protection is layered:

1. **`middleware.ts`** — redirects unknown paths to `/dashboard`; does not validate the JWT (stateless Next.js edge middleware).
2. **`AuthProvider` (client)** — in [`app/providers.tsx`](app/providers.tsx); validates the token via `GET /auth/validate`, enforces `role === "INTERNAL"`, refreshes the access token if needed, and clears storage on failure.
3. **`InternalProtectedGate`** — in [`app/(protected)/layout.tsx`](app/(protected)/layout.tsx); redirects unauthenticated or non-internal sessions to `/` before rendering the app shell.

## Protected routes

`/dashboard`, `/users`, `/admins`, `/payment-processing`, `/billing`, `/pricing`, `/enterprise-contracts`, `/analytics`, `/system-monitoring`, `/feedback`, `/support`, `/broadcasts`, `/logs`, `/audits`, `/performance`, `/doctors`

## Boundaries

- Internal-only access checks belong at the `AuthProvider` boundary (see above) — not scattered in individual page components.
- Reuse `@workspace/ui`, `@workspace/types`, and `@workspace/data-access`.
- Do not duplicate app data clients or domain types here.
- Keep route files thin (`app/(protected)/*/page.tsx` re-exports only) and move behavior into `features/<feature>/`.
- Examples: `features/billing`, `features/doctors`, `features/pricing`, `features/feedback`, `features/admins`, `features/analytics`, `features/payment-processing`.

## Run

```bash
pnpm --filter @docita/internal run lint
pnpm --filter @docita/internal run test
pnpm audit:internal
```
