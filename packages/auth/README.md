# @workspace/auth

Shared auth and permission semantics for all web apps.

## Source-of-truth map

| Concern | Canonical file |
|---|---|
| Role → permission list (e.g. `DOCTOR` can `CREATE_PRESCRIPTIONS`) | `src/permissions-map.ts` (`PERMISSIONS_BY_ROLE`) |
| App permission strings (e.g. `"manageStaff"`, `"startConsultation"`) | `packages/types/src/access/access-matrix.ts` (`APP_PERMISSIONS`) |
| Tier / feature gate (`hasFeatureAccess`, `Feature` enum, tier ranking) | `packages/types/src/billing/tier.ts` |
| DB clinic tier string → `TierName` mapping | `packages/types/src/access/clinic-tier-map.ts` |
| React `AuthContext`, `useAuth`, `usePermission`, `useRole`, `useCanAccess` | `src/auth-context.tsx` |
| Token storage (access + refresh token helpers) | `src/token-storage.ts` |

## Exports

```ts
import { AuthProvider, useAuth, usePermission, useRole, useCanAccess, useUser } from "@workspace/auth";
import { tokenStorage } from "@workspace/auth";
import { PERMISSIONS_BY_ROLE } from "@workspace/auth";
```

## Boundaries

- Keep role and permission behavior aligned with `packages/types/src/access/access-matrix.ts`.
- Feature/tier checks must use `hasFeatureAccess` or `getMinimumTierForFeature` — never compare `Tier.INTELLIGENCE` or `Tier.FRONT_DESK` numerically.
- Do not import app UI, Next.js navigation, or API infrastructure from this package.

Use this package for cross-app permission semantics. Use app-local guards and middleware for framework-specific routing (e.g. `apps/internal/middleware.ts` redirects unauthenticated paths; `apps/internal/lib/auth.tsx` enforces `role === "INTERNAL"` at the context boundary).
