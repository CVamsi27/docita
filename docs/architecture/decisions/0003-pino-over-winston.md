# 0003: Use Pino for backend logging

- **Status**: accepted
- **Date**: 2025-08-04
- **Deciders**: platform
- **Tags**: backend, observability

## Context

NestJS ships with a basic logger. We need structured JSON output, request
context binding (`requestId`, `tenantId`, `userId`), per-module level
overrides, and Sentry integration.

## Decision

Use Pino + `nestjs-pino`. Wrap with a project logger in
`apps/api/src/shared/modules/error-handling/logger.service.ts` that
binds the AsyncLocalStorage request context (see §41).

## Alternatives considered

| Option | Pros | Cons | Why rejected |
| --- | --- | --- | --- |
| Winston | Familiar, plugin ecosystem | Slower, harder structured output | Performance + DX |
| Built-in Nest logger | Zero deps | No structured JSON, no context | Insufficient for production |

## Consequences

- Positive: fast, JSON-by-default, plays well with Render/Fly log shipping.
- Negative: less plugin ecosystem than Winston (acceptable).

## References

- `apps/api/src/shared/modules/error-handling/logger.service.ts`
- `SYSTEM_DESIGN_AND_PATTERNS.md` §38
