# @docita/app

Main clinician application — Vite + React Router v7 SPA (replaces the Next.js `apps/app`).

## Stack

- Vite 6 + React 19 + React Router v7 (SPA, no SSR)
- React Query (via `@workspace/data-access`), React Hook Form + Zod, i18next (en/hi), zustand
- Tailwind CSS with tokens from `@workspace/ui` (global styles from `packages/ui/src/styles/globals.css`)
- TypeScript strict; shared types from `@workspace/types`

## Local development

```bash
pnpm --filter @docita/api run start:dev   # API on :3001 (see apps/api)
pnpm --filter @docita/app run dev    # SPA on http://localhost:3000
```

`vite.config.ts` proxies `/api/*` and `/socket.io/*` to `VITE_API_TARGET` (default `http://localhost:3001`), mirroring the Hono proxy Worker used in production.

### Environment variables

Copy `apps/app/.env.example` to `.env.local` in this directory. Variables use the `VITE_` prefix; legacy `NEXT_PUBLIC_*` names are still accepted as aliases.

## Scripts

| Script | Purpose |
| --- | --- |
| `pnpm --filter @docita/app run dev` | Dev server on :3000 |
| `pnpm --filter @docita/app run test` | Vitest (unit) |
| `pnpm --filter @docita/app run lint` / `check-types` | ESLint / `tsc --noEmit` |
| `pnpm --filter @docita/app run build` | Production build |
| `pnpm --filter @docita/app run preview:cloudflare` | Local `wrangler dev` (static assets + proxy Worker) |
| `pnpm --filter @docita/app run deploy:cloudflare:staging` | Deploy `docita-app-vite-staging` (staging-app.docita.work) |
| `pnpm --filter @docita/app run deploy:cloudflare:production` | Deploy `docita-app` (app.docita.work) |

Wrangler config lives in `apps/app/wrangler.toml` (`main = "api/index.ts"` Hono proxy Worker, `assets = "./dist"`, SPA not-found handling).

## Project layout

```
src/
├── App.tsx             React Router route tree (layouts + guards)
├── main.tsx            browser entry (providers + router)
├── features/<feature>/{components,hooks,lib,types.ts,index.ts}
├── components/         shared app-only presentational components
├── hooks/              cross-feature app hooks
├── lib/                app runtime setup (api, auth, config, logger, ...)
├── providers/          app-level React providers (query, navigation)
├── i18n/ + messages/   i18next init + en/hi message JSON
└── test-utils/         test-helper render() wrapper
```

Import aliases: `@/*` → `./src/*`, `@workspace/*` → `packages/*/src`. Cross-feature imports must go through `@/features` — never deep relative imports. Follow `AGENTS.md` §4 (UI primitives from `@workspace/ui`, `DataState` for page states, no decorative motion).

## Testing

Vitest + Testing Library (jsdom).

## Deployment

Cloudflare Workers + Static Assets (CI: `.github/workflows/deploy-cloudflare.yml`). The Hono proxy Worker (`api/index.ts`) forwards `/api/*` and `/socket.io/*` to the NestJS API on Fly.io; static assets are served from the edge with SPA fallback. Production/staging names and domains are defined in `wrangler.toml`.
