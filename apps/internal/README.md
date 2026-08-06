# @docita/internal

Internal admin portal — Vite + React Router v7 SPA (replaces the Next.js `apps/internal`; same shape as `apps/app`, see [`docs/PORTING_PLAN_APP_VITE.md`](../../docs/PORTING_PLAN_APP_VITE.md) for the migration plan and feature status).

## Stack

- Vite 6 + React 19 + React Router v7 (SPA, no SSR)
- React Query, Tailwind CSS with tokens from `@workspace/ui`
- TypeScript strict; shared types from `@workspace/types`

## Local development

```bash
pnpm --filter @docita/api run start:dev   # API on :3001 (see apps/api)
pnpm --filter @docita/internal run dev  # SPA on http://localhost:3002
```

`vite.config.ts` proxies `/api/*` to `VITE_API_TARGET` (default `http://localhost:3001`), mirroring the Hono proxy Worker used in production.

## Scripts

| Script | Purpose |
| --- | --- |
| `pnpm --filter @docita/internal run dev` | Dev server on :3002 |
| `pnpm --filter @docita/internal run test` | Vitest (unit) |
| `pnpm --filter @docita/internal run lint` / `check-types` | ESLint / `tsc --noEmit` |
| `pnpm --filter @docita/internal run build` | Production build |
| `pnpm --filter @docita/internal run preview:cloudflare` | Local `wrangler dev` (static assets + proxy Worker) |
| `pnpm --filter @docita/internal run deploy:cloudflare` | Deploy `docita-internal` (internal.docita.work) |

Wrangler config lives in `apps/internal/wrangler.toml` (`main = "api/index.ts"` Hono proxy Worker, `assets = "./dist"`, SPA not-found handling). Staging environment: `docita-internal-vite-staging` (staging-internal.docita.work).

## Project layout

Same conventions as `apps/app`: `src/App.tsx` route tree, `src/features/<feature>/`, `src/components/`, `src/lib/`, `src/providers/`. Import aliases: `@/*` → `./src/*`, `@workspace/*` → `packages/*/src`.

## Deployment

Cloudflare Workers + Static Assets (CI: `.github/workflows/deploy-cloudflare.yml`). The Hono proxy Worker (`api/index.ts`) forwards `/api/*` and `/socket.io/*` to the NestJS API on Fly.io; static assets are served from the edge with SPA fallback.

## PWA

Deliberately **not** a PWA: the internal admin portal gets no `manifest.webmanifest` / offline shell / install prompt (admin-only audience, always-online session flow). Only `apps/app` ships PWA assets (`manifest.webmanifest`, `offline.html` in its `public/`).
