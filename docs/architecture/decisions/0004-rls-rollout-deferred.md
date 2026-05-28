# 0004: Defer Postgres RLS to a phased rollout

- **Status**: accepted (in active rollout)
- **Date**: 2025-11-20
- **Deciders**: platform, security
- **Tags**: backend, data, security

## Context

Tenant isolation today is enforced at the application layer via the
`tenant.extension.ts` Prisma extension (§30.1) + AsyncLocalStorage context.
A missed `where: { clinicId }` is caught by the extension; but if the
extension itself is bypassed (`tenant.bypassed = true`), only code review
prevents cross-tenant leaks.

Postgres Row Level Security (RLS) would convert this into a database-level
invariant. Cost: every connection must `SET LOCAL app.current_clinic_id`;
every Prisma model needs a policy; migrations are non-trivial.

## Decision

Stage RLS in three phases:
1. Add `app.current_clinic_id` session setting + `SET LOCAL` in Prisma
   middleware. (Done; gated behind `RLS_ENABLED`.)
2. Enable RLS on low-risk read-mostly models first (`AuditEvent`,
   `Notification`). Observe error rates.
3. Roll out to write-heavy models last (`Patient`, `Appointment`,
   `Encounter`, `Prescription`).

The application-layer extension stays as belt-and-suspenders permanently.

## Alternatives considered

| Option | Pros | Cons | Why rejected |
| --- | --- | --- | --- |
| Big-bang RLS enable | Single change | High risk of breakage across 80+ models | Unsafe |
| Stay app-layer only | No DB complexity | Single point of failure if extension is bypassed | Compliance posture too thin |

## Consequences

- Positive: defense in depth; finishing the rollout closes §28.1 item 2.
- Negative: temporarily two enforcement layers complicates debugging.
- Follow-up: `scripts/checks/check-rls-rollout-readiness.mjs` tracks
  remaining models; promote to blocking once rollout completes.

## References

- `apps/api/src/shared/modules/rls/apply-rls-scope.ts`
- `SYSTEM_DESIGN_AND_PATTERNS.md` §4.7
