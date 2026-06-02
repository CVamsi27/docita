# @docita/landing

Astro-based landing app for Docita, running in the same monorepo and reusing `@workspace/ui`.

## Commands

```bash
pnpm --filter @docita/landing run dev
pnpm --filter @docita/landing run check-types
pnpm --filter @docita/landing run lint
pnpm --filter @docita/landing run build
pnpm --filter @docita/landing run test
pnpm --filter @docita/landing run test:critical-flows
pnpm --filter @docita/landing run audit:accessibility
```

## Runtime Environment

- `PUBLIC_APP_URL`: Main app URL for login/onboarding CTAs.
- `PUBLIC_API_URL`: Browser-facing API base (default: `/api/v1`).
- `API_PROXY_TARGET`: Upstream API host for `/api/*` proxy route.

Recommended production defaults:

- `PUBLIC_APP_URL=https://app.docita.work`
- `PUBLIC_API_URL=/api/v1`
- `API_PROXY_TARGET=https://api.docita.work`

## Incremental Cutover Strategy

1. Deploy this worker to staging route `astro-landing.docita.work`.
2. Validate:
   - route parity (`/`, `/contact`, `/privacy`, `/terms`, `/cookies`, `/refund-policy`)
   - API-backed blocks (pricing, stats, contact inquiry)
   - BFF helper contract tests (`pnpm --filter @docita/landing run test`)
   - Playwright critical flows and accessibility smoke checks
3. Keep existing Next landing on `docita.work`, `www.docita.work`, and `landing.docita.work` until sign-off.
4. During cutover, move production routes from old worker to this worker.

## Rollback

1. Re-point production routes back to previous landing worker.
2. Purge Cloudflare cache.
3. Re-run smoke checks on both root and legal pages.
4. Keep `astro-landing.docita.work` active for debugging.
