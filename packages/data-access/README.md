# @workspace/data-access

Single API client and React Query surface for web apps.

## Boundaries

- Owns API client functions, query keys, response parsing, and React Query hooks.
- Reuses request/response schemas from `@workspace/types`.
- Does not import UI components or app-local modules.
- App features should not call `fetch` directly; add or reuse a hook here when server state is shared.

## Cache Policy

| Data | staleTime | gcTime |
|---|---:|---:|
| today, queue, active consultation | 30 seconds | 5 minutes |
| patients list, prescriptions list | 60 seconds | 5 minutes |
| tier usage, subscription | 5 minutes | 30 minutes |
| clinic settings | 10 minutes | 30 minutes |

When adding a mutation, invalidate the matching query key in the same module.
