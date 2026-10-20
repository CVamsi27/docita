# Staging Setup

This repo keeps a PR-protected `staging` branch for pre-production validation.
Its deployed revision must be verified before using staging results as release evidence.

## Current preparation, 17 October 2026

**20 October continuation:** PR #322 merged to main at
`a224633ab11d337dcb551e58ebb9840a07e0cbbf`; PR #325 aligned staging at
`becd8cde68d6c63f6a381ce4fd093025ee352acd`. Their trees match. Both exact PR heads
passed 14 hosted checks with three scope skips and zero failures.
Render remains suspended on Free, Auto-Deploy Off, with no candidate deployment.
Its Node version is now pinned to 22.22.0. A branch change from `main` to `staging`
was submitted but still needs provider readback; local browser use became disabled.
The protected configuration
handoff was saved on 17 October; targeted readback verified the isolated database
and restricted role. The prior production-owner URL statement is superseded.
Runtime verification, browser journeys, latency and
the full soak remain open. See the [final-pass checkpoint](../audits/2026-10-20-final-stability-pass.md).

A separate empty Neon Free project
is now prepared: `wispy-forest-27565397`, root `br-icy-violet-a13qncy8`, endpoint
`ep-bold-wave-a15dfyvk`, database `docita_staging`, runtime role `docita_app`.
All 175 migrations, zero schema drift, integrity and 19 strict isolation checks
pass; all 91 tenant tables have the required policies. Local candidate startup,
health and the real auth-session boundary also pass. See the
[current checkpoint](../audits/2026-10-17-staging-isolation-checkpoint.md).

Local operator configuration and GitHub's existing `STAGING_DATABASE_URL` secret
now use that restricted staging target. A protected Render environment file has
fresh staging JWT/field keys and explicit safety flags; its 26 prepared variables
were subsequently saved in Render, retaining existing Razorpay test settings.
The dedicated Turnstile pair is saved locally and incorporated in the
protected API/frontend handoff files. Full runtime validation and a repeat local
startup pass with the saved secret; a real widget challenge remains unverified. Preserve
existing test-only Razorpay settings and keep the old service suspended until
candidate review and staging alignment.

The independent project replaces the schema-only branch path for routine staging;
no production data was copied. A fixed 0.25 CU compute uses the Free plan's idle
suspension default. Production and recovery branches are not routine fixtures.

## Observed operator state, 16 October 2026

The authenticated Render console shows `docita-api-staging` in the Docita
project's Staging environment, **suspended by the operator**, on the Free Node
plan in Singapore. Its configured branch is **`main`**, which differs from the
staging branch contract below. The last successful deployed commit is
`cce2a2fb49121addeb5438773c567102b1317394`; the newer attempt at
`b94d6f93c254ae25e694d5b6f5daec8b249386e6` failed. Neither is the current
stability candidate. Login is verified; current staging validation is not.

The service was not resumed or reconfigured. Before resuming, verify its isolated
database identity and outbound-provider settings, align the reviewed staging tree
through its protected PR path, correct the connected branch and record the
deployed revision. The operator reports GitHub pricing/billing resolved on 16 October. Code Review
still requests its GitHub connection, so candidate hosted checks remain unverified. Resuming this stale
service alone cannot establish staging compatibility or begin the required soak.

Neon's schema-only branch request currently fails because of the legacy
`docita_app` web-access role. Do not remove that production role to make a fixture.
The October recovery probes used explicitly owned, quarantined child branches;
backup-role testing used a new empty database inside an owned child branch and
synthetic rows only. Those branches were removed. This fallback is controlled
recovery work, not permission to use production data as a routine staging fixture.

## Branch Contract

- `main` is the canonical production branch; all work lands here via PR.
- `staging` changes only through a PR into `staging`. There is no automatic
  `main` → `staging` synchronization. Never commit, cherry-pick, or push directly
  to either protected branch (see [AGENTS.md §11.3](../../AGENTS.md)).
- For a staging re-mirror, create the alignment branch from the current staging
  tip and replace its tree with the selected reviewed main tree in one commit.
  Record both SHAs and verify tree equality after the staging PR merges; a
  branch created from main can conflict with staging's divergent squash history.
- Staging should use staging hostnames and staging secrets, not production ones.

## Recommended Staging Topology

- API: Render web service deployed from the `staging` branch
- App: Cloudflare staging environment via [`apps/app/wrangler.toml`](../../apps/app/wrangler.toml) using `--env staging`
- Internal: Cloudflare staging environment via [`apps/internal/wrangler.toml`](../../apps/internal/wrangler.toml) using `--env staging`
- Database: independent Neon staging project/root with verified endpoint and credentials.
  Use the independently initialized schema plus synthetic fixtures for routine testing. A
  variable named `STAGING_DATABASE_URL` is not proof of isolation: the October
  audit found a local alias pointing at production. Verify its endpoint's branch
  identity against Neon before migration, seeding or write probes.

## API Environment

Use these values for the staging API service:

```env
NODE_ENV=staging
SECRETS_PROVIDER=env
DATABASE_URL=<verified isolated staging branch connection string>
APP_URL=https://staging-app.docita.work
FRONTEND_URL=https://staging-app.docita.work
API_PUBLIC_URL=https://staging-api.docita.work/api/v1
# Legacy aliases (deprecated): NEXT_PUBLIC_APP_URL / NEXT_PUBLIC_API_URL
CORS_ORIGINS=https://staging-app.docita.work,https://staging-internal.docita.work
STORAGE_PROVIDER=local
ENABLE_SCHEDULERS=false
WORKER_ENTRYPOINT=main
QUEUE_BACKEND=postgres
RLS_ENABLED=true
AI_EXTERNAL_ENABLED=false
AI_CLOUD_OCR_ENABLED=false
DATABASE_CONTROL_ENABLED=false
DATABASE_CONTROL_DEPLOY_GUARD=false
```

Also supply fresh staging-only `JWT_SECRET` and `ENCRYPTION_KEY`, a dedicated
`TURNSTILE_SECRET_KEY`, and the three required Razorpay **test** settings. Staging
frontend builds must receive the matching `VITE_TURNSTILE_SITE_KEY`. Public test
keys used by local harnesses are not the deployed staging widget configuration.
Both clinician and internal login send the proof when this public key is set.
Verify the widget permits both corresponding hostnames. Production deployment
steps use the existing public repository variable for both builds; staging builds
must explicitly use the separate staging value rather than overwrite production.

The Render staging service must set `DATABASE_URL` directly to that branch's
connection string. Keep payment, messaging, storage and alert credentials isolated
from production. A recovery branch containing production data is a controlled DR
target, not a routine staging fixture; see [DR_RUNBOOK.md](DR_RUNBOOK.md).

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

The shared Cloudflare build helper reads the selected `wrangler.toml` environment
and supplies its variables to Vite, overriding inherited production URL values.
Use `pnpm --filter @docita/app run build:cloudflare --mode staging` and the
equivalent `@docita/internal` command. Default mode remains production.
Staging deploy scripts explicitly select staging mode. The helper also derives
the output CSP's API and WebSocket origins from the selected proxy target;
production static-header sources remain unchanged. The clinician HTML has no
production API preconnect. Internal staging links back to the staging clinician
app. Staging Sentry DSNs are empty to keep synthetic traffic out of production
email alerts; an isolated telemetry destination needs its own reviewed setup.
Supply the dedicated public staging Turnstile site key explicitly to the build.

`VITE_*` vars are build-time inlined into the SPA and mirrored as runtime vars
for the proxy Worker in `wrangler.toml` (`[env.production.vars]` /
`[env.staging.vars]`); local dev uses the same names from
`apps/app/.env.example`. `VITE_RAZORPAY_KEY_ID` is intentionally empty —
the browser receives `razorpayKeyId` from the checkout API response, so no key
id is configured at build time.

## Deploy Flow

1. Select the reviewed main revision and align staging through its PR-only path.
   Normal feature/hotfix work still targets main; respect the two-feature-branch cap.
2. Verify the staging database identity and recovery evidence. Run
   `pnpm --filter @workspace/db run db:migrate:dry-run`, review pending migrations,
   then use `db:migrate:safe` against that isolated branch. The current manual
   database workflow is paused and targets production; it is not a staging runner.
3. Render redeploys the staging API from the connected staging branch. Coordinate
   schema compatibility with auto-deploy; use expand/backfill/enforce sequencing
   where a migration and old runtime must coexist.
4. Cloudflare staging deployments use each affected app's canonical configuration
   with `--env staging`. Record Render's actual commit and each Cloudflare deployed
   version, plus the matching build-time API/proxy targets.
5. Validate the deployed staging routes and data-dependent flows. Branch alignment
   alone does not prove that Render or Cloudflare released the selected revision.

If you need migrations to land before a staging API deploy becomes visible, configure the Render staging service to deploy after the relevant CI checks pass. GitHub Actions does not need a separate deploy hook for the staging API.

## Staging Smoke Commands

After a staging deploy, verify from the repo root:

```bash
# Local startup fixture; this does not verify a deployed staging revision.
pnpm test:api-startup
curl -fsS https://staging-api.docita.work/api/health/live
curl -fsS https://staging-api.docita.work/api/health/ready

# Supply dedicated staging monitor credentials securely in the environment.
# Clear inherited production recovery and alert targets for this invocation.
env -u FLY_API_TOKEN -u SYNTHETIC_FLY_API_ORIGIN -u SENTRY_DSN \
  -u OPS_ALERT_WEBHOOK_URL \
  SYNTHETIC_API_ORIGIN=https://staging-api.docita.work/api \
  SYNTHETIC_API_BASE_URL=https://staging-api.docita.work/api/v1 \
  SYNTHETIC_APP_BASE_URL=https://staging-app.docita.work \
  pnpm monitor:synthetic
```

The runner defaults to production unless all staging targets above are supplied.
It checks API liveness, the app's proxied daily thought, and optional staff login.
Login is skipped without both monitor credentials. It does not test database
transactions, patient lists, queue cadence or notification delivery; retain
separate authenticated journey and worker evidence for those release gates.

Then hit the staging app URL and check the browser console for chunk-load
errors (`Failed to fetch dynamically imported module` means a stale/partial
deploy).
