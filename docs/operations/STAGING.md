# Staging Setup

This repo supports a separate `staging` branch for pre-production validation.

## Branch Contract

- `main` remains the production branch.
- `staging` is the integration branch for pre-production deploys.
- Staging should use staging hostnames and staging secrets, not production ones.

## Recommended Staging Topology

- API: Render web service deployed from the `staging` branch
- App: Cloudflare staging environment via [`apps/app-vite/wrangler.toml`](/Users/vamsikrishnachandaluri/repos/docita/apps/app-vite/wrangler.toml) using `--env staging`
- Internal: Cloudflare staging environment via [`apps/internal-vite/wrangler.toml`](/Users/vamsikrishnachandaluri/repos/docita/apps/internal-vite/wrangler.toml) using `--env staging`
- Database: Neon PostgreSQL

## API Environment

Use these values for the staging API service:

```env
NODE_ENV=staging
DATABASE_URL=<your Neon connection string>
APP_URL=https://staging-app.docita.work
NEXT_PUBLIC_APP_URL=https://staging-app.docita.work
NEXT_PUBLIC_API_URL=https://staging-api.docita.work/api/v1
CORS_ORIGINS=https://staging-app.docita.work
STORAGE_PROVIDER=local
```

The Render staging service must set `DATABASE_URL` directly to the Neon connection string.

If you want staging to match production document storage, switch to:

```env
STORAGE_PROVIDER=r2
```

and provide:

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`

## Cloudflare App Environment

Use these values for the staging Vite app (`wrangler.toml` `[env.staging]` — values mirror the legacy `NEXT_PUBLIC_*` names):

```env
NEXT_PUBLIC_APP_URL=https://staging-app.docita.work
NEXT_PUBLIC_API_URL=/api/v1
NEXT_PUBLIC_SOCKET_URL=https://staging-api.docita.work
API_PROXY_TARGET=https://staging-api.docita.work
NEXT_PUBLIC_RAZORPAY_KEY_ID=
NEXT_PUBLIC_AI_ENABLED=false
```

Local dev uses the `VITE_*` variants from `apps/app-vite/.env.example` (build-time inlined); the `NEXT_PUBLIC_*` names remain in `wrangler.toml` for the proxy Worker and legacy compatibility.

## Deploy Flow

1. Push changes to `staging`.
2. Render automatically redeploys the staging API from the connected `staging` branch.
3. Cloudflare staging deployments use `apps/app-vite/wrangler.toml` / `apps/internal-vite/wrangler.toml` with `--env staging` for the app(s).
4. Run the staging database migration workflow before validating data-dependent flows.

If you need migrations to land before a staging API deploy becomes visible, configure the Render staging service to deploy after the relevant CI checks pass. GitHub Actions does not need a separate deploy hook for the staging API.
