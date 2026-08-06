# Playbook: Cloudflare upstream timeout (app/internal cannot reach API)

## Detection signals

- `apps/app` and `apps/internal` show 502/504 in response to
  `/api/v1/*` calls.
- Cloudflare dashboard shows worker errors of type `upstream timeout`.
- API itself is healthy on direct Fly.io hostname; only the proxy path
  fails.

## First 5 minutes

1. Confirm the API hostname is reachable directly:
   ```
   curl -fsSL https://api.docita.work/api/v1/health
   ```
2. Compare to the proxied path from the user side:
   ```
   curl -fsSL https://app.docita.work/api/v1/health
   ```
3. Check Cloudflare worker analytics for the affected route.

## Mitigation

- **If Cloudflare worker is misconfigured**: roll back the most recent
  worker deploy:
  ```
  pnpm --filter @docita/app run deploy:cloudflare:production --previous
  ```
- **If the bridge `/api/v1/[...path]/route.ts` is the bottleneck**:
  bump request timeout via env (
  `wrangler secret put CLOUDFLARE_PROXY_TIMEOUT_MS` if exposed) and
  redeploy.
- **If the API itself is slow** (proxy is fine): switch to the API
  playbook in [`db-connection-exhaustion.md`](db-connection-exhaustion.md)
  or [`pdf-queue-backlog.md`](pdf-queue-backlog.md) depending on
  symptoms.

## Validation

- Both direct and proxied health endpoints return 200 < 500 ms.
- Critical pages (`/dashboard`, `/patients`) load in apps/app without
  client-side fallback toasts.

## Rollback criteria

- If a worker rollback was needed, treat it as the canonical state
  until the offending deploy is fixed forward.

## Post-incident

- File a follow-up to add a Cloudflare-side healthcheck pinger
  (Stream L item 38).
- Verify the proxy stress test scenario
  (Stream R item 46, `loadtest/k6/scenarios/proxy-route.js`) catches the
  failure mode that triggered this incident.
