# Playbook: Cloudflare API reachability (TLS failures or upstream timeouts)

## Detection signals

- App/internal `/api/*` requests fail with 502, 504 or 525. Record HTTP status,
  timestamp and Cloudflare request ID before choosing a recovery action.
- **525** identifies a Cloudflare-to-origin TLS handshake failure; investigate
  the custom-domain certificate and DNS validation. It is not evidence that a
  Worker request timeout needs increasing. [Cloudflare 525 reference](https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-5xx-errors/error-525/).
- **504** requires comparing direct origin, public API and Worker proxy results
  to locate the timeout. Use request/DB/queue evidence when the API is slow.

The clinician and internal SPAs use the Hono Workers in
[`apps/app/api/index.ts`](../../../apps/app/api/index.ts) and
[`apps/internal/api/index.ts`](../../../apps/internal/api/index.ts). The shared
[proxy factory](../../../packages/utils/src/http/cloudflare-api-proxy.ts) serves
`/api/v1/*`, `/api/*` and `/socket.io/*` using `API_PROXY_TARGET` from the
affected app's Wrangler config.

## First 5 minutes

1. Compare the same version-neutral health route at each boundary:
   ```bash
   curl -i --max-time 15 https://docita-api.fly.dev/api/health/live
   curl -i --max-time 15 https://api.docita.work/api/health/live
   curl -i --max-time 15 https://app.docita.work/api/health/live
   curl -i --max-time 15 https://internal.docita.work/api/health/live
   ```
   Repeat with `/api/health/ready` to check dependency readiness. A successful
   `.fly.dev` probe does not validate TLS for `api.docita.work`.
2. For 525 or certificate validation errors, inspect the hostname's certificate
   and challenge records:
   ```bash
   flyctl certs show api.docita.work --app docita-api
   flyctl certs check api.docita.work --app docita-api
   dig +short CNAME _acme-challenge.api.docita.work
   dig +short TXT _fly-ownership.api.docita.work
   ```
   Compare with the current `flyctl certs setup api.docita.work --app docita-api`
   instructions. Retain the configured TLS validation requirements; do not
   bypass certificate validation to declare recovery.
3. Check the affected Worker's analytics and configured upstream hostname.
   If direct/public API probes succeed while the Worker fails, investigate
   proxy routing, bindings and the failing Worker version. If the origin fails,
   use [API recovery](../RUNBOOKS.md#rb-01-api-rollback) or
   [DB connection exhaustion](db-connection-exhaustion.md).

## Certificate recovery record, 13 October 2026

The Fly certificate for `api.docita.work` was created after the earlier DNS
challenge was found to use the previous `pqn612k` app target. The DNS operator
updated the following records; authoritative DNS and 1.1.1.1 resolve both to
the current app's required values:

| DNS record                                         | Required value recorded for the current Fly app |
| -------------------------------------------------- | ----------------------------------------------- |
| CNAME `_acme-challenge.api.docita.work` (DNS-only) | `api.docita.work.o9d0jnj.flydns.net`            |
| TXT `_fly-ownership.api.docita.work`               | `app-o9d0jnj`                                   |

Fly subsequently issued active RSA/ECDSA certificates, expiring 11 January 2027.
Repeated direct/public/proxied liveness and readiness checks returned 200 at
19:06–19:10 IST. Record further journey/alert and observation evidence before
closing the broader stability work. These public DNS values must be rechecked against the live
certificate setup for future incidents; certificate creation or corrected DNS
alone does not establish recovery. [Fly custom-domain validation](https://docs.fly.io/networking/custom-domain).

## Mitigation

- **Certificate or DNS failure:** complete the hostname validation above.
  Redeploying the Worker cannot repair a stale Fly DNS challenge.
- **Confirmed Worker regression:** select the known-good Worker version from
  deployment evidence and run only the affected workspace command:
  ```bash
  pnpm --filter @docita/app exec wrangler rollback "$KNOWN_GOOD_APP_VERSION_ID" --config wrangler.toml --env production
  pnpm --filter @docita/internal exec wrangler rollback "$KNOWN_GOOD_INTERNAL_VERSION_ID" --config wrangler.toml --env production
  ```
  Or use the dashboard's known-good deployment recovery. Validate assets,
  bindings, routes and secret compatibility; see
  [frontend recovery](../DEPLOYMENT.md#frontend-cloudflare-workers).
  [Wrangler rollback reference](https://developers.cloudflare.com/workers/wrangler/commands/workers/#rollback).
- **API regression:** select a compatible recorded API image and follow
  [RB-01](../RUNBOOKS.md#rb-01-api-rollback). Current config/secrets and schema
  remain in effect; the helper skips release commands.
- **Slow API or background work:** use the DB playbook or
  [PDF queue backlog](pdf-queue-backlog.md). Change timeout behavior only after
  identifying the failing request boundary and verifying a bounded code fix.

## Validation and closure

- Direct Fly, public API and app/internal proxy liveness/readiness return 200.
  Record observed timings and compare to [canonical SLOs](../SLOS.md).
- Clinician `/login`, `/today` and `/patients` work; verify an appropriate
  protected internal route and `/socket.io/*` connectivity where used.
- Synthetic monitoring is enabled and alert delivery is verified. Record the
  healthy observation window; a successful deploy or certificate request is
  insufficient to close the incident.
- Keep the selected known-good version as the recovery baseline until the
  failing change is corrected and verified. Record the incident cause,
  certificate/Worker/image evidence and customer impact without PHI or secrets.
