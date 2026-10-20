# Hosted staging continuation, 20 October 2026

**Production freeze readiness remains blocked.** This record supersedes the
Render-access and frontend-deployment-origin blockers in the
[earlier final pass](2026-10-20-final-stability-pass.md). Production API/worker
recovery, backups, offline key proof and elapsed observation are still gated.

## Reviewed source

Fresh Git reads confirm main `f3fddffc0963294a39ba73abc3ca688b236d6a9d`
and staging `5ac5de7bb67ab127fb5627a49c147e5d40357fb5` have the same tree,
`ff08bb763c60d367472f5d0be43d425e615b097c`. PR #326 and staging alignment
PR #327 are merged. Each exact head had seven successful checks, seven scope
skips and no failures. Local frontend build evidence belongs to that source
acceptance and was not rerun for this operating-record update. The mandatory
push hook separately passes all 207 standards regression cases for this docs
branch. Skipped hosted checks are not executed evidence.

## Render staging

The installed Render plugin now authenticates. The Docita workspace's existing
`docita-api-staging` service is on Free in Singapore, linked to `staging`, with
Auto-Deploy Off. Readback verifies Node 22.22.0, the independent staging
database and restricted `docita_app` role with TLS, RLS enabled, test-only
Razorpay, and disabled schedulers, external AI and database control. No outbound
mail, Sentry or live messaging credential keys were present; no environment
groups were linked. Secret values were checked in memory and hidden again.

The HTTP health path is now `/api/health/ready`. The build command is:

```sh
pnpm install --frozen-lockfile && NODE_OPTIONS=--max-old-space-size=4096 pnpm run build:api
```

The heap setting applies only to the build subprocess. It does not increase
the runtime plan or configure a 4 GB runtime heap. The first candidate deploy,
`dep-dbbi7r0n74is73cpsro0`, failed during API typechecking with exit 134 and
JavaScript heap exhaustion near 2 GB. The Starter build pipeline has 8 GB RAM;
the retry retains its checks with a 4 GB build heap. All 19 build tasks pass,
including API typechecks and lint.

Render rejected deployment while suspended. Its Resume control acted
immediately; the reviewed candidate was then triggered explicitly. The retry
`dep-dbbia47avr4c73dvlrqg` targets the same reviewed staging commit. It built
successfully, then failed during rollout: Render's terminal event reports an
out-of-memory kill against the **512 MiB runtime limit**. The service was
suspended again to stop its crash loop.

An authentication error in the shared log stream belongs to a different
instance from the recorded memory failure. The saved Render database URL
matches the protected staging handoff exactly. Fresh direct PostgreSQL and
Prisma queries accept it, confirm the isolated database/restricted role, and
the application configuration parser preserves it. No database credential
was changed to address the memory failure.

The local candidate starts with a 256 MiB heap, answers readiness and rejects
an unauthenticated session. With a 4 MiB semi-space, three local measurements
show 486–498 MiB RSS and 229–230 MiB heap use; a 192 MiB heap cannot start it.
These Mac measurements show little headroom and do not establish Linux
capacity. The successful hosted attempt removes the resident pnpm launcher and uses:

```sh
cd apps/api && exec node --max-old-space-size=256 --max-semi-space-size=4 dist/main.js
```

Deploy `dep-dbbih30n74is73cqpahg` targets the same reviewed commit with that
bounded runtime command. It reached terminal **Live at 08:46:41 UTC**. The Free
compute plan is unchanged. Seven fresh HTTP checks at 08:47:32 UTC all pass:

- API liveness returns 200 with the expected service identity.
- Custom-domain and Render-subdomain readiness each return 200 with `ready=true`.
- Both staging frontend readiness proxies return 200 with `ready=true`.
- An unauthenticated session-validation request returns 401.
- The system-health response reports **398.1 MiB RSS and 217.9 MiB heap used**.

The 08:50 UTC provider readback still shows Live, Free, branch `staging`, one
instance and Auto-Deploy Off. No failure or restart event is returned for the
short interval after rollout. This proves startup and basic readiness, not
representative-load capacity or a completed soak. Suspend this staging service
if runtime memory failures recur; do not upgrade its plan under the $0 constraint.

## Frontend deployment hold

The dashboard now establishes the earlier production frontend deployment
origin: Cloudflare Workers Builds watched `main` independently of the disabled
GitHub deployment workflow. The clinician app's production version
`123e8484-2d68-4193-bf46-1e83a39fed38` came from build
`575b3ce9-37dd-480d-8a2e-697d34f246c6`, for the reviewed main commit above.
The internal app shows the same source commit through build
`f79d3cbf-4234-41c0-ab27-094c34d5be7b`, version prefix `5a4789bd`.
Earlier statements that the merges deployed no production frontend are
superseded by this provider evidence.

**Disable builds is saved and verified after reload for both production
Workers.** Their Git connections and deployed versions are preserved. No Worker
was deployed or rolled back during this continuation, and landing infrastructure
was left alone. This controls the identified Git build paths; it does not revoke
manual deployment credentials or prove the absence of every external trigger.

The original stabilization chat subsequently released both sealed staging
artifacts: clinician version `6f43b283-38b7-4e95-b109-1e0947945335` and internal
version `09eb13b2-f94a-40cc-b4ba-ce2cada2817e`. The internal staging Worker now
exists. Its recorded hosted readback verifies compatibility date 2026-07-29,
`nodejs_compat`, the staging API upstream and disabled staging Sentry.

Fresh HTTP reads at 08:42 UTC verify both login documents and entry JavaScript
return 200, script hashes match the reviewed seal, CSP contains the staging
HTTPS/WSS origins, and production API origins are absent from HTML/CSP. HTML
matches its reviewed checksum after removing exactly one Cloudflare Analytics
beacon and its inserted newline; no other normalization is applied. The default
Python client received 403, while the descriptive `Docita-Stability-Probe/1.0`
client succeeds without changing security settings. After the API became Live,
the hosted clinician login rendered its email field and Continue control without
browser warning/error logs. No form was submitted. These checks do not establish
Turnstile or authenticated clinician journeys.

The existing staging clinician Worker's saved build command now explicitly uses
`pnpm run build:cloudflare --mode staging`; its deploy command already selected
`--env staging`. The configuration is verified after reload. This continuation
did not issue another frontend deployment.

## Cost and remaining gates

Before deployment, Render billing showed Hobby, $0.00 accrued/projected,
0/750 Free instance hours, 0/500 included pipeline minutes, 0/5 GB bandwidth and
a $0 build-pipeline spend limit. The post-deployment billing readback still shows $0.00
accrued and projected, with 0.25/750 Free instance hours, 13/500 pipeline minutes
and 0 MB/5 GB bandwidth. No paid service, plan, disk, cron job or datastore was
created. A payment method exists, and bandwidth overages are separate from the
build spend limit; this is not a universal $0 hard cap.

Hosted authentication/Turnstile journeys, representative latency and soak,
offline runtime-key proof, clinical restore and erasure reconciliation,
production migration/RLS rollout, backup activation/cadence and production
observation remain open. No live alert test or payment replay was issued.
The user's connection replies do not supply the runtime verifier's
`challengeSha256` or confirm offline custody; that gate remains open and the
private identity must stay offline.
Follow [zero-spend controls](../operations/ZERO_HOSTING_SPEND.md) and the
[earlier release-gate inventory](2026-10-20-final-stability-pass.md).

## Operating-record validation

This change updates documentation only. Local lint passes all 11 tasks from
cache; hygiene and documented script-name checks pass. All 78 local Markdown
targets resolve, formatting and diff checks pass, and the staged secret scan
finds no leaks. The required push hook also passes duplication and the configured
standards checks, including 207/207 regression cases with zero skips. No new
application typecheck or application unit-test run is claimed for this
documentation change; the hosted build and runtime checks above are separate
deployment evidence.
