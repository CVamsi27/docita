# 0008: AsyncLocalStorage for request-scoped tenant context

- **Status**: accepted
- **Date**: 2025-08-30
- **Deciders**: platform
- **Tags**: backend, architecture

## Context

Multi-tenant scoping must hold for every database call — including
schedulers and queue workers, not just HTTP requests. Threading
`tenantId` explicitly through every function signature is verbose and
error-prone (a missed parameter is a leak).

## Decision

Use Node's AsyncLocalStorage to carry a per-request context object
(`requestId`, `tenant: { clinicId, userId, role, bypassed }`, logger).
Set by `TenantContextInterceptor` on HTTP boundary and by
`with-tenant.ts` helper for non-HTTP entrypoints (queue, cron).
Consumed by `tenant.extension.ts` and the audit interceptor.

## Alternatives considered

| Option | Pros | Cons | Why rejected |
| --- | --- | --- | --- |
| Explicit param threading | Visible, type-safe | Verbose, missable, requires changing every signature | Friction too high |
| Class-level Nest scope | Built-in DI | Doesn't cover queue workers or schedulers | Insufficient coverage |

## Consequences

- Positive: every Prisma call is automatically tenant-safe; queue workers
  inherit context via explicit `runWithTenant(...)` wrappers.
- Negative: detaching work with `setTimeout` loses context;
  `check-detached-promises.mjs` flags these patterns.
- Follow-up: when moving to multi-region, ALS context must survive
  outbox replay — encode tenant in the outbox payload (ADR 0010).

## References

- `apps/api/src/shared/modules/auth/middleware/tenant.middleware.ts`
- `SYSTEM_DESIGN_AND_PATTERNS.md` §41
