# @workspace/data-access

Single API client and React Query surface for web apps.

**Rule:** no UI imports, no business logic — only API clients, query keys, response parsing, and React Query hooks.

## Boundaries

- Owns API client functions, query keys, response parsing, and React Query hooks.
- Reuses request/response schemas from `@workspace/types`.
- Does not import UI components or app-local modules.
- App features must not call `fetch` directly; add or reuse a hook here when server state is shared across features.

## staleTime / gcTime policy

Global defaults live in `apps/app-vite/src/providers/react-query-provider.tsx` (`staleTime: 30 s`, `gcTime: 5 min`). Per-query stale times are inferred from the shared key-prefix registry in `src/core/stale-time.ts`.

| Data category | staleTime | gcTime |
|---|---:|---:|
| Queue, IPD census, payment status | 10–15 s | SHORT (2 min) |
| Dashboard, today's appointments, analytics | 30 s | DEFAULT (5 min) |
| Patient list, appointments, invoices, prescriptions | 60 s | DEFAULT (5 min) |
| Clinic settings, doctors list, reference data | 5 min | LONG (30 min) |
| Tier / subscription | 5 min | LONG (30 min) |
| Referrals (read-only reference) | 60 min | VERY_LONG (2 hr) |

Use the shared `queryKeys` factory so `inferStaleTime()` can apply the right tier. When adding a mutation, invalidate the matching query key in the same hook file.

## Query-key conventions

All keys are defined in `src/lib/query-keys.ts`. Format: array, domain-first, specificity increases left to right.

```ts
queryKeys.patients.all()           // ["patients"]
queryKeys.patients.list(params)    // ["patients", "list", {...params}]
queryKeys.patients.detail(id)      // ["patients", "detail", id]
```

Never inline string arrays for query keys — always use `queryKeys.*` so invalidations stay predictable.

## Files

| File | Purpose |
|---|---|
| `src/lib/query-keys.ts` | All React Query key factories |
| `src/lib/client-factory.ts` | Axios/fetch client factory |
| `src/lib/crud-resource.ts` | Generic CRUD resource builder |
| `src/lib/errors.ts` | `APIRequestError` and error parsing |
| `src/lib/retry.ts` | Retry helpers |
| `src/lib/idempotency.ts` | Idempotency key helpers |
| `src/lib/browser-session.ts` | Browser session token helpers |
| `src/lib/singleton.ts` | Client singleton pattern |
| `src/lib/request-helpers.ts` | Request utility functions |
