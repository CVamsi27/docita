# Hosted staging continuation, 20 October 2026

**Production freeze readiness remains blocked.** This record supersedes the
Render-access and frontend-deployment-origin blockers in the
[earlier final pass](2026-10-20-final-stability-pass.md). Production API/worker
recovery, backups, offline key proof and elapsed observation are still gated.
The later real sign-in passes, but parallel authenticated reads fail and the
latency producer misreports its observation window. Those are active runtime
and measurement blockers in the deployed revision; the initial readiness smoke
is not release acceptance. The approved source repairs below remain undeployed.

## Reviewed source

Fresh Git reads confirm main `f3fddffc0963294a39ba73abc3ca688b236d6a9d`
and staging `5ac5de7bb67ab127fb5627a49c147e5d40357fb5` have the same tree,
`ff08bb763c60d367472f5d0be43d425e615b097c`. PR #326 and staging alignment
PR #327 are merged. Each exact head had seven successful checks, seven scope
skips and no failures. Those hosted results belong to the original candidate.
PR #328 now adds the approved source corrections described below; its local
checks are separate evidence. Skipped hosted checks are not executed evidence.

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

## Further hosted authentication preparation

The next pass confirms the isolated staging database was empty: zero clinics,
users, patients and documents. A guarded fixture transaction creates one
synthetic trial clinic, one verified clinician, its doctor/clinic link and one
trial subscription. The clinician is clinic-associated with completed onboarding;
this does not count as registration or onboarding-flow verification. No patient
or document is created, no provider message is requested, and no production
database is accessed. Random credentials and exact fixture IDs stay in protected
operator evidence outside Git. Disable the fixture account when testing ends.

The hosted email check recognizes this account and reaches the password step.
The user approved one staging CAPTCHA action. Keyboard activation reaches
verification; the widget then appears unchecked again. The approved token is
nevertheless accepted when Sign in is submitted. The synthetic clinician lands
in Consultation, and Today and Patients show their expected empty states without
an onboarding reset. The earlier manual-verification request is superseded;
no further CAPTCHA is needed for this session. The widget reset is consistent
with callback changes remounting the shared component; it is not evidence that
the backend rejected verification.

A normal refresh of that issued synthetic session returns 201. All six canonical
latency-route preflights return their expected statuses, including the unsigned
synthetic webhook's 401. An internal-only API route rejects this clinician with 403. No token is forged or published. These checks establish real sign-in and
basic authorized/denied reads; they do not complete the clinical write lifecycle.

Render supplies 20 one-minute memory samples from rollout through 09:05 UTC.
The first startup sample is 511.4 MiB; subsequent samples range from
385.9–420.3 MiB against the reported 512 MiB limit. The latest sample is 82.1%
of the limit. No failure or restart event is returned after rollout, and fresh
09:06 UTC readiness reads pass through the API and both frontend proxies.
These observations do not establish capacity under authenticated workload or
complete the soak.

## Newly reproduced runtime and measurement blockers

Appointments displays errors for its schedule and appointment-request reads.
The corresponding provider logs include connection-acquisition timeouts, failed
audit writes and readiness 503s. A separate bounded burst of eight authenticated
patient-list reads has **zero successes**: one 503, one 403 and six client
timeouts at 15 seconds. PostgreSQL snapshots show all five API connections
`idle in transaction` while requests wait. The source trace points to awaited
audit work leaving the active RLS transaction and borrowing from the same full
pool. A new local PostgreSQL regression reproduces acquisition timeouts with two
connections occupied by request transactions. The repaired awaited audit reuses
that transaction; both concurrent requests finish. RLS, audit failures and pool
limits remain enforced.

Readiness recovers to 200 at 09:41 UTC without a failure/restart event. The latest
provider memory sample is about 468.6 MiB of 512 MiB. Recovery does not make the
parallel-read test pass or establish capacity.

The real latency capture requests 300 probes over ten minutes at 30/minute and
concurrency one, using the normal refreshed synthetic session. It writes
`complete: true`, but the log-creation/artifact-write interval is only about
**185.72 seconds**. The producer calculates its reported 30.2 observations/minute
from the requested 600 seconds; the observed interval implies about 97.6/minute.
Its pure planner schedules the last request at 106 seconds and **264 requests
in one 60-second window**, despite the 30/minute setting. Two throttle responses
are observed. The artifact is quarantined as diagnostic evidence and is not
converted or committed as a valid ten-minute release baseline.

The shorter burst's diagnostic p95 values are auth 200 ms, CRUD 472 ms, search
302 ms, reports 472 ms and webhook rejection 91 ms; CRUD p99 is 3,053 ms. These
are actual samples from the faulty schedule, not accepted soak/SLO evidence.
The dataset is one synthetic clinic with zero patients, appointments or invoices;
even a corrected capture cannot establish production-volume capacity from it.

## Approved source repairs, not yet deployed

The operator approved the [scoped design](../superpowers/specs/2026-10-20-hosted-staging-repair-design.md)
with “Implement both scoped repairs.” The [implementation plan](../superpowers/plans/2026-10-20-hosted-staging-repairs.md)
tracks regressions, checks and publication in PR #328.

- Awaited `AuditService` validation/persistence retains the active request's RLS
  transaction. The sensitive-write interceptor explicitly detaches its background
  task; the event listener keeps its existing detached boundary. Real restricted-role
  PostgreSQL tests cover bounded-pool concurrency, joint rollback, audit-failure
  propagation, cross-tenant rejection and background persistence after commit.
- The capture schedules the default 300 probes through 598 seconds, with at most
  30 starts in any half-open 60-second window. Actual dispatch, retries and route
  intervals share admission pacing. It observes the requested window and records
  actual start/end/elapsed time. Incomplete work, shortened captures and throttles
  cannot become release evidence; conversion retains the original capture age.
- The reported Turnstile loop reproduces in a real React parent: token state
  changes replace callback identities and previously remounted the widget. The
  shared widget now delivers to current callbacks without restarting verification.
  Local tests cover token/expiry delivery, script load, key changes and cleanup.
  No additional hosted challenge has been activated, and hosted resolution is
  unverified until a reviewed frontend candidate is deployed.

No provider deployment, paid resource, live alert, payment replay or production
restart accompanies these source changes. The faulty hosted capture is retained
and no release baseline is created. Repeat hosted parallel reads and a corrected
capture only after source review and PR-only staging alignment.

## Cost and remaining gates

Before deployment, Render billing showed Hobby, $0.00 accrued/projected,
0/750 Free instance hours, 0/500 included pipeline minutes, 0/5 GB bandwidth and
a $0 build-pipeline spend limit. The post-deployment billing readback still shows $0.00
accrued and projected, with 0.25/750 Free instance hours, 13/500 pipeline minutes
and 0 MB/5 GB bandwidth. No paid service, plan, disk, cron job or datastore was
created. A payment method exists, and bandwidth overages are separate from the
build spend limit; this is not a universal $0 hard cap.

The full authenticated clinical lifecycle, parallel-read reliability, valid
representative latency and soak,
offline runtime-key proof, clinical restore and erasure reconciliation,
production migration/RLS rollout, backup activation/cadence and production
observation remain open. No live alert test or payment replay was issued.
The user's connection replies do not supply the runtime verifier's
`challengeSha256` or confirm offline custody; that gate remains open and the
private identity must stay offline.
Follow [zero-spend controls](../operations/ZERO_HOSTING_SPEND.md) and the
[earlier release-gate inventory](2026-10-20-final-stability-pass.md).

## Local source validation

- The audit regression fails on the old implementation (acquisition timeouts,
  orphan audit after rollback, tenant-scope escape and inherited background tx),
  then passes all five real PostgreSQL cases after repair. The pool has two
  connections and the effective test role is neither superuser nor `BYPASSRLS`.
- The related API unit suites pass 42 tests; all shared UI tests pass 156 cases,
  including four widget lifecycle cases. Capture/converter tests pass 47 cases,
  including a real loopback CLI run and deterministic dispatch/elapsed tests.
  They now run in `test:standards-checks`, which passes 254 cases with zero skips.
- Workspace typechecks pass all 29 tasks, lint all 11, and the full build all 35. Both frontend `build:cloudflare --mode staging` commands also pass without
  deploying. Standards and Knip pass; the default API-latency check explicitly
  skips because no release baseline exists. That skip does not close its gate.
- Public clinician accessibility checks execute 12 cases across four viewports;
  148 authenticated cases are explicitly skipped in public-only mode. The internal
  login-only accessibility audit passes four viewport cases. Protected internal
  pages are outside this check. The first attempts hit the outage gate without a
  local API; reruns use the owned synthetic local API with schedulers/external
  integrations disabled.
- The dependency audit exits successfully with one high advisory covered by the
  existing exception; no dependency or exception was changed. Formatting, diff
  and staged secret checks pass. No private runtime artifact enters Git.

The full API E2E command passes in all four CI-equivalent shards on distinct
owned loopback databases: **64 suites, 513 tests, zero failures and zero skips**
(shard case counts: 138, 122, 97 and 156). The new audit regression passes in that
full run. The initial serial run encountered one portal prescription 404; both
current and pre-repair implementations pass the isolated 24-case rerun, and the
final full shard also passes. One first sharded attempt rejected the chosen
disposable database name; its rerun uses an accepted test name without changing
the guard. Earlier failed/interrupted logs are retained separately. These local
results do not replace reviewed hosted deployment or soak evidence.

Hosted CI on the published source revision runs two successful scope detectors
and skips 12 downstream checks because PR #328 remains a draft. Repository
standards, application unit/E2E and security checks have not executed there;
those skips are not passing software evidence. The local results above remain
the executed source verification. Keep the draft and deployment holds until
review; changing readiness will trigger the deferred hosted checks.
