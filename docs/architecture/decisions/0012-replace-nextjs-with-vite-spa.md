# 0012: Replace Next.js apps with Vite SPAs on Cloudflare Static Assets

- **Status**: accepted
- **Date**: 2026-07-31
- **Deciders**: platform
- **Tags**: frontend, infra

## Context

The Next.js 16 + OpenNext Cloudflare Worker bundle for `apps/app` was ~3.5 MB gzip, over the 3 MB Workers Free plan limit and growing. Every feature port increased bundle size with framework overhead (Next.js runtime, RSC, OpenNext adapter, `@sentry/nextjs`) rather than app code. Both frontend apps are login-gated (clinician app, internal admin portal) with no public SEO surface, so SSR/SSG provides no product value.

Work started as `apps/app-vite` / `apps/internal-vite` (Vite 6 + React Router v7 SPA) alongside the Next.js apps; infra (turbo tasks, CI, deploy workflows, ~30 repo checks) was already repointed at the Vite apps. This ADR records the decision and the cutover contract. (The working phase plan `PORTING_PLAN_APP_VITE.md` lived on the port branch and was not carried into the tree; the cutover completed 2026-08-10 — the Vite apps now own `apps/app` / `apps/internal`.) Supersedes [0002](./0002-opennext-on-cloudflare.md).

## Decision

Replace `apps/app` and `apps/internal` (Next.js 16 App Router, OpenNext on Cloudflare Workers) with `apps/app-vite` and `apps/internal-vite`: Vite + React Router v7 SPAs deployed on Cloudflare Workers with Static Assets, with a tiny Hono proxy Worker (`api/index.ts`) forwarding `/api/*` and `/socket.io/*` to the NestJS API on Fly.io.

## Alternatives considered

| Option | Pros | Cons | Why rejected |
| --- | --- | --- | --- |
| Keep OpenNext + Next.js | Zero porting work | ~3.5 MB gzip bundle over free limit; overhead grows with every feature; Sentry/next-intl adapters | Bundle ceiling is a hard constraint for a growing app |
| Vite SPA + Static Assets (chosen) | ~50 KB gzip Worker, static assets at edge, no cold starts, full control of dependency tree, faster builds | Loses SSR (irrelevant — login-gated apps); feature port required | Best cost/effort for a non-SEO product |
| Self-host Next.js on Fly | Keeps Next.js | New backend runtime (Node server for frontend), more infra to operate | Adds infra, keeps the size problem irrelevant but cost high |
| SPA without proxy Worker (direct API calls) | Simplest | CORS + cookie/auth complexity, WebSocket proxying broken | Proxy Worker is trivial (~50 KB) and preserves same-origin auth |

## Consequences

- Positive: bundle well under 1 MB gzip; static assets served from edge with immutable caching; no OpenNext/Sentry-server/next-intl baggage; `check-worker-size.mjs` stays meaningful for the tiny proxy Worker.
- Negative: full feature port (368 of ~1,967 app files as of 2026-07-31); Playwright E2E suite (50 + 2 specs) not yet ported; some Next-specific affordances (middleware route guards, CSP nonce) must be reimplemented as React Router guards + static `_headers`.
- Follow-up work (completed 2026-08-10): the working plan `PORTING_PLAN_APP_VITE.md` phases 1-9 were finished on the port branch and the plan was not carried into the tree; the Next.js predecessors were deleted at cutover.

## References

- Files: `apps/app/wrangler.toml`, `apps/app/api/index.ts`, `apps/app/vite.config.ts`, `apps/internal/wrangler.toml`
- Related ADRs: [0002](./0002-opennext-on-cloudflare.md) (superseded), [0009](./0009-vercel-retired.md)
