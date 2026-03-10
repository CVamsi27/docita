# App Migration: Vercel to Cloudflare (App Only)

This runbook migrates only `apps/app` from Vercel to Cloudflare.

- `apps/app` -> Cloudflare Pages + Workers runtime (OpenNext)
- `apps/admin` -> stays on Vercel
- `apps/landing` -> stays on Vercel
- `apps/api` -> stays on Railway (or existing backend target)

## 1. What Changes

- Runtime adapter for Next.js app routes, SSR, middleware, and API route compatibility is handled by OpenNext Cloudflare tooling.
- DNS for `app.docita.work` moves from Vercel to Cloudflare Pages custom domain.
- Existing backend API endpoint remains unchanged.

## 2. Scripts Added

From repo root:

```bash
pnpm build:app:cloudflare
pnpm preview:app:cloudflare
pnpm deploy:app:cloudflare
```

Directly inside `apps/app`:

```bash
pnpm build:cloudflare
pnpm preview:cloudflare
pnpm deploy:cloudflare
```

## 3. Cloudflare Project Setup

1. Create a Cloudflare Pages project for `apps/app`.
2. Configure build command using your CI preference:
   - `pnpm --filter @docita/app run build:cloudflare`
3. Set all app runtime env vars in Cloudflare Pages/Workers settings.

Required app-side vars (example):

- `NEXT_PUBLIC_API_URL=https://api.docita.work/api/v1`
- `NEXT_PUBLIC_APP_URL=https://app.docita.work`
- `API_PROXY_TARGET=https://api.docita.work`

If using Sentry in app:

- `NEXT_PUBLIC_SENTRY_DSN=...`
- `SENTRY_ORG=...`
- `SENTRY_PROJECT=...`

## 4. DNS Cutover

- Add `app.docita.work` as a custom domain in Cloudflare Pages.
- Update DNS so `app.docita.work` resolves to Cloudflare Pages target.
- Keep `admin.docita.work` and `landing.docita.work` pointing to Vercel.

## 5. Validation Checklist

Before cutover:

- Login/logout flow works.
- Onboarding and clinic-selection redirects work.
- SSR pages render correctly.
- Cookies and CSRF flows work with `https` origin.
- API rewrites to backend are correct (`/api/*`).

After cutover:

- Health check and main user journeys pass.
- Error tracking and source maps work as expected.
- No mixed-content warnings.

## 6. Rollback Plan

- Re-point `app.docita.work` DNS back to Vercel deployment.
- Keep Cloudflare deployment artifacts for retry.

## 7. Notes

- This migration intentionally does not change `apps/admin` or `apps/landing` hosting.
- If any route relies on Node-only APIs, move that logic to backend API or make it edge-compatible.
