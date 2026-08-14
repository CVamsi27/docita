# Cloudflare Deployment Strategy — Vite SPA Apps

Covers `apps/app` (clinician app, `app.docita.work`) and `apps/internal`
(admin portal, `internal.docita.work`): the two Vite + React Router SPAs
deployed as Cloudflare Workers with Static Assets. The Astro landing site
has its own path (see [`DEPLOYMENT.md`](./DEPLOYMENT.md)) and is out of
scope here. Architecture decision: [ADR 0012](../architecture/decisions/0012-replace-nextjs-with-vite-spa.md).

## 1. Topology

```
Browser ── app.docita.work / internal.docita.work
            │
            ▼
   Cloudflare Worker (docita-app / docita-internal)
   ├── Static Assets (dist/)  → index.html + hashed /assets/*
   │                          → SPA fallback via not_found_handling = "single-page-application"
   ├── _redirects             → intentionally empty (see comment in public/_redirects)
   ├── _headers               → security headers for static responses
   └── Hono proxy (api/index.ts)
       ├── /api/v1/*          → upstream /api/v1/* (path-scoped proxy)
       ├── /api/*             → upstream passthrough
       └── /socket.io/*       → upstream WebSocket endpoint
            │
            ▼
   Fly.io API (api.docita.work)  [NestJS, ap-south-1 co-located DB]
```

Key properties:

- **Tiny Worker, fat edge**: only the ~50 KB gzip Hono proxy ships as the
  Worker; all app code is static assets served from Cloudflare's edge. No
  OpenNext runtime, no server-rendering process — no cold starts for the app.
- **Same-origin API calls**: the proxy Worker forwards `/api/*` and
  `/socket.io/*` to the backend, so the browser never needs CORS and cookies
  flow naturally.
- **Single deploy artifact**: one `wrangler deploy` ships assets + proxy
  Worker + `_headers` + `_redirects` together — there is no separate "upload
  assets then swap worker" step.

## 2. Environments and domains

Both apps define `production` and `staging` env blocks in `wrangler.toml`,
with `custom_domain = true` routes:

| App | Production | Staging |
|-----|-----------|---------|
| `apps/app` | `app.docita.work` (`docita-app`) | `staging-app.docita.work` (`docita-app-staging`) |
| `apps/internal` | `internal.docita.work` (`docita-internal`) | `staging-internal.docita.work` (`docita-internal-staging`) |

- Production routes are **custom domains** (DNS-managed, no `*.workers.dev`
  exposure for prod traffic).
- Every `vars` value in the `[env.production]` / `[env.staging]` blocks is
  **baked into the built assets at build time** by Vite's `define`, except
  `API_PROXY_TARGET` and `NODE_ENV`, which the Worker reads at runtime.
  Changing a `VITE_*` var therefore requires a **rebuild + redeploy**, not a
  dashboard edit.
- `VITE_RAZORPAY_KEY_ID` is intentionally empty: the publishable key arrives
  at runtime from the checkout API response. Do not re-add a literal.

## 3. Build pipeline

```
pnpm --filter @docita/app run build:cloudflare   # = NODE_ENV=production vite build
pnpm --filter @docita/internal run build:cloudflare
```

- Vite outputs `dist/` with content-hashed filenames under `dist/assets/`
  (e.g. `BillingTab-XY6z-COG.js`), plus `_headers` / `_redirects` copied
  from `public/`.
- Root `pnpm build` is a compile gate. Deploy with the `deploy:*:cloudflare`
  scripts, which run the Cloudflare build first:
  `deploy:cloudflare`, `deploy:cloudflare:staging` (adds `--env staging`),
  `deploy:cloudflare:production` (adds `--env production`).
- The Worker entry is `api/index.ts` (`main` in `wrangler.toml`); it is
  bundled by wrangler at deploy time (no separate build step).
- **Size gate**: CI runs `check:worker-size:app` / `check:worker-size:internal`
  (root package.json → `node scripts/checks/check-worker-size.mjs` on the
  built `dist/index.js`). Budget is 3.5 MiB gzip; the proxy Worker is ~50 KB,
  so the gate only trips if framework runtime accidentally creeps back into
  the Worker bundle.

## 4. Caching strategy

| Resource | Header | Rationale |
|----------|--------|-----------|
| `/assets/*` (hashed JS/CSS) | **`public, max-age=31536000, immutable`** | Content-hashed — a new filename means a new version. Safe to cache for a year. |
| `/index.html` + SPA routes | `no-cache` (revalidate) | Must revalidate so a deploy's new asset graph is picked up immediately. |
| `/api/*`, `/socket.io/*` | none (proxy) | Backend decides; never cached at the edge. |

> **Current gap**: `public/_headers` sets security headers for `/*` but does
> **not** yet add the immutable cache rule for `/assets/*`. Without it,
> hashed assets are served with default Cloudflare caching behavior, and a
> re-deploy can serve stale chunk names to clients that cached the old HTML
> — the classic "white screen after deploy" (see §8). Add a `/assets/*`
> block to `public/_headers` in both apps. The content-hash guarantees
> correctness: `index.html` changes on every build, so clients re-fetch it,
> and the new HTML references the new hashes.

## 5. The proxy Worker contract

`apps/app/api/index.ts` and `apps/internal/api/index.ts` are identical in
shape (shared helpers from `@workspace/utils/http/upstream-api-proxy`):

1. `/api/v1/*` — strips the leading `/api/v1` and re-prefixes onto
   `API_PROXY_TARGET` (path-scoped proxy; rejects traversal segments).
2. `/api/*` — passthrough proxy to `API_PROXY_TARGET`.
3. `/socket.io/*` — passthrough for the WebSocket endpoint.
4. Everything else falls through to Static Assets (SPA fallback via
   `_redirects`).

The Worker sets `X-Forwarded-Proto` / `X-Forwarded-Host` on proxied
requests so the backend sees the public scheme/host.

- `API_PROXY_TARGET` comes from `[env.*.vars]` at runtime: production
  `https://api.docita.work`, staging `https://staging-api.docita.work`.
- Keep `api/index.ts`, `wrangler.toml`, and `vite.config.ts`'s `server.proxy`
  in sync: local dev proxies `/api` + `/socket.io` to `localhost:3001`, the
  Worker proxies them upstream in production.

## 6. CI deploy flow (deploy.yml)

Production deploys run on push to `main`, path-scoped per app:

```
detect (scripts/workflow/detect-workflow-scope.mjs)
  └─ gate: verify Cloudflare credentials (token verify, account scope,
     Zone > Workers Routes read on docita.work)
        └─ deploy-app      (if apps/app/** changed)
        └─ deploy-internal (if apps/internal/** changed)
```

- Each job: checkout → pnpm 10.30.3 → `pnpm install --frozen-lockfile` →
  `rm -rf node_modules/.cache/wrangler apps/<app>/.wrangler` (wrangler cache
  can go stale across deploys) → `pnpm --filter @docita/<app> run
  deploy:cloudflare:production`.
- The **gate is the security boundary**: if `CLOUDFLARE_API_TOKEN` /
  `CLOUDFLARE_ACCOUNT_ID` are missing or fail
  `scripts/deploy/verify-cloudflare-deploy-credentials.mjs`, the deploy jobs
  skip with a warning instead of failing. Until credentials verify,
  Cloudflare Git integration / dashboard deploys are the fallback.
- Deploy order across the repo: migrations → API → worker → frontends
  (frontends are independent of each other and of backend deploy success).
- There is **no staging deploy in CI today** — staging is manual via
  `pnpm --filter @docita/<app> run deploy:cloudflare:staging`.

## 7. Rollback

Rollback is per-app, dashboard-driven (no CLI rollback step):

1. Cloudflare dashboard → Workers & Pages → `docita-app` (or
   `docita-internal`) → **Deployments**.
2. Pick the last known-good deployment → **Rollback to this deployment**.
3. Verify: hard-refresh the public URL, check the browser console for
   chunk-load errors, confirm `/api/v1/*` still proxies.

Notes:

- Rollback reverts the **Worker + assets together** — no partial state.
- A bad deploy is usually a *stale-html* problem (see §4): before rolling
  back, try a hard refresh; the fix may already be live.
- `_headers` / `_redirects` changes roll back with the deployment they
  shipped in.

## 8. Failure modes and decision guide

| Symptom | Likely cause | Action |
|---------|-------------|--------|
| White screen / chunk-load errors after deploy | Browser cached old HTML; new asset names not fetched | Hard refresh first. If persistent, dashboard rollback to last known-good. |
| Stale UI after deploy for some users | `/assets/*` not immutable-cached OR shared cache serving old HTML | Add `/assets/*` immutable rule (§4); redeploy; confirm index.html is `no-cache`. |
| `Authentication error [code: 10000]` on `/zones/.../workers/routes` | Token lacks Workers Routes permission | Rotate the Cloudflare API token with Workers Routes permission for `docita.work` zone. |
| Deploy jobs silently skipped | Credentials gate failed | Check gate job output (`missing-secrets` vs `invalid-credentials`); use dashboard fallback until fixed. |
| `/api/v1/*` returns 404 after deploy | Proxy path-scoping regression in `api/index.ts` | Verify `extractApiV1PathSegments` still strips exactly one `/api/v1`; check `API_PROXY_TARGET` var. |
| WebSocket broken in app | `/socket.io/*` proxy dropped | Confirm the `app.all("/socket.io/*")` route exists and targets the right upstream. |
| Worker bundle over size gate | Framework runtime leaked into `api/index.ts` | Check imports in the Worker entry; it must stay tiny (only Hono + utils). |

## 9. Local preview & verification

```bash
# Build and preview the exact Cloudflare artifact locally
pnpm --filter @docita/app run build:cloudflare
pnpm --filter @docita/app run preview:cloudflare      # wrangler dev

# Deploy a specific env
pnpm --filter @docita/app run deploy:cloudflare:production
pnpm --filter @docita/app run deploy:cloudflare:staging
```

Verification before/after deploy:

- `node scripts/checks/check-worker-size.mjs` (CI standard checks).
- `scripts/deploy/verify-app-security-headers.mjs` — asserts the Vite SPA
  `_headers` files carry CSP, HSTS, nosniff, Referrer-Policy,
  Permissions-Policy (landing additionally verified via middleware).
- The API e2e gate (`.github/workflows/api-e2e.yml`) exercises the real
  routes the app calls; the frontend-critical-e2e workflow boots the built
  app and runs the Playwright specs against it.

## 10. Operational rules (summary)

- Deploy the Vite apps only through `deploy:*:cloudflare` scripts — a
  plain `vite build` + manual upload misses the `_headers`/`_redirects`
  contract and the size gate.
- Keep `wrangler.toml` ↔ `vite.config.ts` in sync (static assets dir,
  `main`, dev proxy).
- Never embed secrets or live keys in `[env.*.vars]` — build-time vars are
  baked into public assets.
- Treat the dashboard **Deployments** list as the release history for
  rollback; keep deploy notifications attached to the workflow runs.
