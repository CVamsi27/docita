# 0002: Deploy apps/app and apps/internal on Cloudflare via OpenNext

- **Status**: superseded by [0012](./0012-replace-nextjs-with-vite-spa.md) (2026-07-31 — the Next.js apps are being replaced by `apps/app-vite` / `apps/internal-vite`, Vite SPAs with static assets + a tiny Hono proxy Worker. Cloudflare remains the host; see [`PORTING_PLAN_APP_VITE.md`](../../PORTING_PLAN_APP_VITE.md).)
- **Date**: 2025-10-12
- **Deciders**: platform
- **Tags**: frontend, infra

## Context

Next.js apps need a host. Candidates: Vercel (canonical), Cloudflare Workers
via OpenNext, self-host on Fly. Cost model and runtime characteristics
differ significantly. The internal admin app must enforce SSO + strict
geo-allowlist.

## Decision

Use Cloudflare Workers via OpenNext (`@opennextjs/cloudflare`) for both
`apps/app` and `apps/internal`. The API stays on Fly.io (different runtime
needs: long-lived sockets, Prisma binary, native deps).

## Alternatives considered

| Option | Pros | Cons | Why rejected |
| --- | --- | --- | --- |
| Vercel | Zero-config, best Next DX | Egress + function pricing at our scale, less geo control | Cost + India-locality preference |
| Self-host Next on Fly | Single stack | Reinventing OpenNext for cold starts, edge cache | More ops, less benefit |

## Consequences

- Positive: cheap edge + CDN, geo-locality controls, single Cloudflare
  account for DNS/WAF/Workers.
- Negative: Next features behind OpenNext compatibility (e.g., some streaming
  patterns, Node-only APIs need shims). Must keep `globalThis.__name`
  bootstrap in `apps/app/app/layout.tsx` (see `AGENTS.md` §4).
- Follow-up: any deploy-time Next upgrade requires verifying the OpenNext
  build before merging.

## References

- `apps/app/wrangler.toml`
- `apps/internal/wrangler.toml`
- `SYSTEM_DESIGN_AND_PATTERNS.md` §21
- ADR [0009](0009-vercel-retired.md) (Vercel as secondary target retired)
