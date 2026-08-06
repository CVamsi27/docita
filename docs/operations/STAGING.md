# Staging Setup

This repo keeps a `staging` branch that mirrors `main` for pre-production validation.

## Branch Contract

- `main` is the canonical production branch; all work lands here via PR.
- `staging` is an **automated mirror of `main`** — the same tree at the branch tip, fast-forwarded to each merged `main` commit. It is **not** an integration line: never commit, cherry-pick, or push directly to `staging` (see AGENTS.md §11.3).
- Staging should use staging hostnames and staging secrets, not production ones.

## Recommended Staging Topology

- API: Render web service deployed from the `staging` branch
- App: Cloudflare staging environment via [`apps/app/wrangler.toml`](../apps/app/wrangler.toml) using `--env staging`
- Internal: Cloudflare staging environment via [`apps/internal/wrangler.toml`](../apps/internal/wrangler.toml) using `--env staging`
- Database: Neon PostgreSQL

## API Environment

Use these values for the staging API service:

```env
NODE_ENV=staging
DATABASE_URL=<your Neon connection string>
APP_URL=https://staging-app.docita.work
FRONTEND_URL=https://staging-app.docita.work
API_PUBLIC_URL=https://staging-api.docita.work/api/v1
# Legacy aliases (deprecated): NEXT_PUBLIC_APP_URL / NEXT_PUBLIC_API_URL
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

Use these values for the staging Vite app (`wrangler.toml` `[env.staging.vars]`):

```env
VITE_API_URL=/api/v1
VITE_APP_URL=https://staging-app.docita.work
VITE_SOCKET_URL=https://staging-api.docita.work
API_PROXY_TARGET=https://staging-api.docita.work
VITE_RAZORPAY_KEY_ID=
VITE_AI_ENABLED=false
```

`VITE_*` vars are build-time inlined into the SPA and mirrored as runtime vars
for the proxy Worker in `wrangler.toml` (`[env.production.vars]` /
`[env.staging.vars]`); local dev uses the same names from
`apps/app/.env.example`. `VITE_RAZORPAY_KEY_ID` is intentionally empty —
the browser receives `razorpayKeyId` from the checkout API response, so no key
id is configured at build time.

## Deploy Flow

1. Merge work into `main` via PR; automation fast-forwards `staging` to the merged commit.
2. Render automatically redeploys the staging API from the connected `staging` branch.
3. Cloudflare staging deployments use `apps/app/wrangler.toml` / `apps/internal/wrangler.toml` with `--env staging` for the app(s).
4. Run the staging database migration workflow before validating data-dependent flows.
5. Feature/hotfix work never touches `staging` directly — open a PR into `main` (branch cap: at most two open feature PRs, see AGENTS.md §11.3).

If you need migrations to land before a staging API deploy becomes visible, configure the Render staging service to deploy after the relevant CI checks pass. GitHub Actions does not need a separate deploy hook for the staging API.

## Staging Smoke Commands

After a staging deploy, verify from the repo root:

```bash
# API boots and answers health checks
pnpm test:api-startup
curl -fsS https://staging-api.docita.work/api/health/live

# Scheduled synthetic probes (API health, DB, queue heartbeat, write/read tx)
pnpm monitor:synthetic
```

Then hit the staging app URL and check the browser console for chunk-load
errors (`Failed to fetch dynamically imported module` means a stale/partial
deploy).
