# 0009: Retire Vercel as a frontend deploy target

- **Status**: accepted
- **Date**: 2026-05-26
- **Deciders**: platform
- **Tags**: frontend, infra

## Context

`SYSTEM_DESIGN_AND_PATTERNS.md` §56 item 42 noted that both `vercel.json`
and `wrangler.toml` were wired for `apps/app`, leaving contributors unsure
which path is canonical. As of this branch consolidation, `apps/app/vercel.json`
no longer exists; only the Cloudflare/OpenNext path is wired.

## Decision

Cloudflare via OpenNext (ADR [0002](0002-opennext-on-cloudflare.md)) is the
single deploy target for `apps/app` and `apps/internal`. Vercel deployments
are not supported. If Vercel becomes necessary in the future, it requires a
new ADR that supersedes this one.

## Consequences

- Positive: one deploy path to reason about; no ambiguity in CI/CD.
- Negative: contributors who prefer Vercel preview deployments cannot use
  them without re-introducing the config.

## References

- `apps/app/wrangler.toml`
- `SYSTEM_DESIGN_AND_PATTERNS.md` §21, §56 item 42
- ADR [0002](0002-opennext-on-cloudflare.md)
