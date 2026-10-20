# Final stability pass, 20 October 2026

**Production freeze readiness remains blocked.** The feature freeze ends on
13 December. This pass does not restart production, migrate
clinical data, activate backups, replay payments or create paid resources.

The reviewed source has now merged through PR #322 to main
`a224633ab11d337dcb551e58ebb9840a07e0cbbf`. PR #325 aligned staging at
`becd8cde68d6c63f6a381ce4fd093025ee352acd`; their trees match. Both final PR heads
passed 14 hosted checks with three scope skips and zero failures. Neither merge
deployed production. The encrypted runtime-key packet was copied to a new folder
on Messenger, all five file digests were verified, and the drive was safely
ejected without reading the private identity. Offline challenge proof remains open.

## Verification

Code Review reports **14 successful checks, three scope skips and zero failures**
for PR #322 at final head `d785597f5b9950cd6191d56ca36bf1d95d8beba3`.
Security Audit, Validate Migrations and App Bundle Analysis are skipped by scope;
they are not executed evidence. Passing checks include all four API E2E shards,
API/worker/frontend jobs, Repository Standards, OSV and critical frontend E2E.
The 19 October API run reports 526 suites / 4,386 tests with unchanged coverage
thresholds; frontend E2E reports 70 passed / two desktop hero skips.
That PR's final pass changed test fixtures and operating records; the later
local frontend correction below has no hosted result yet.

Fresh local results:

- Lint: 11/11 tasks, cached. Workspace types: 29/29 tasks, 27 cached. Knip passes.
- `verify:standard` exits zero, including 198/198 standards regression cases.
  It still skips the absent API latency baseline and the unregistered backup
  workflow's staleness read. These operating gates remain open.
- The required release latency command with `--require-baseline --max-age-days 7`
  fails with exit 1 because `artifacts/api-latency-baseline.json` is absent.
  No baseline was invented or replaced with a static budget file.
- The first concurrent backup process run passed 115/117 cases. Both cleanup
  fixtures published their event file before installing SIGTERM handlers. A
  deliberate 50 ms startup window reproduces the two failures; waiting for a
  separate marker after handler installation makes both pass. Production
  shutdown code and cleanup assertions are unchanged. The full serial CI command
  then passes **117/117**, zero skips.

## Subsequent staging build correction

The existing staging deploy command built in Vite's default production mode,
inherited production URL values, retained a production API preconnect and copied
the production-only WebSocket CSP into staging. A shared build helper now reads
the selected Wrangler environment, sets its build variables, and derives the
output HTTP/WebSocket CSP origins from its proxy target. The staging deploy
commands explicitly select staging mode. Internal staging's clinician link now
uses its configured staging app origin. Staging telemetry stays disabled so
synthetic traffic cannot notify the production inbox. Production remains the
default build mode and its static-header bytes are preserved.

Nine regressions fail before the correction and pass after it. The complete
standards suite passes **207/207** with zero skipped cases; the surrounding
standard command still skips the missing latency baseline. Lint passes 11 tasks,
frontend types pass 21 tasks, Knip passes, and both production and staging builds
pass for both SPAs. Both Worker dry-runs pass. Artifact checks find zero
production API origins in staging static assets and zero matches against the
configured private credentials. These checks do not expose credential values.

Six compiled Worker routing probes select the staging upstream with all outbound
requests intercepted. The bundled local emulator only supports compatibility
dates through 2 June, so those probes use that local date; the release remains
configured for 29 July. Exact hosted-runtime verification remains open. No Worker
was deployed and no request was sent to a production API. The new correction is
local and unreviewed. Publication initially paused because three existing PRs
(#321, #323, #324) exceeded the repository's two-PR cap.

The operator subsequently authorized the scanner updates as a CI-maintenance
exception to the freeze. PR #323 merged at
`d667837d6a28b7340b933173f9f01b18452ff2c4`; PR #324 merged at
`1a9964fd00b5d12604105c56879a183b26d28b83`. Each exact PR head had two successful
hosted checks and ten scope skips, including the scan itself. Static review of
the upstream v2.7.0 reusable workflows verifies compatible inputs and permissions,
unchanged failure on vulnerabilities and no inherited secrets. Both remote
branches were deleted. The landing PR remains separate. The cap now permits
publishing the staging correction; its hosted checks still need verification.

Render's Node version was saved and read back as 22.22.0. Its branch change to
`staging` was submitted but could not be read back after local browser access was
disabled. Database identity, restricted runtime role, disabled schedulers and
Razorpay test mode were read back safely before the browser block. No new Render
deploy or resume was triggered.

Earlier provider readbacks confirm Fly API machine `185de22c211008` is stopped/cordoned
and worker `6835051b497568` is stopped. Both are preserved. Render's only service
is suspended on Free, Auto-Deploy Off, connected to `main` before the unverified
branch edit above; no candidate was
deployed. The production/legacy staging deploy, synthetic recovery and daily
worker workflows remain `disabled_manually`. `DOCITA_BACKUPS_ENABLED=false`,
the Sentry slug is `new-monitor`, and the reviewed registry image variable is
absent. The Sentry test monitor and dedicated email rule remain disabled with
27 triggers after reload. See the [alert incident](../operations/RUNBOOKS/backup-alert-test.md).

## Open release gates

| Gate | Evidence still required |
| --- | --- |
| Reviewed release | Source acceptance and staging tree alignment pass; verify deployed API/worker/frontend revisions. A subsequent local frontend isolation correction still needs review. |
| Staging | Deploy the reviewed candidate against the isolated restricted database, verify configuration/Turnstile/browser journeys, collect fresh latency evidence and complete the soak. |
| Encryption and RLS | Verify offline application-key packet recovery, release the compatible decoder, reconcile retained keys, then complete the reviewed migration/restricted-role rollout. Production has ten pending migrations and owner-role RLS bypass. |
| Backup recovery | Prove quarantined clinical restore and erasure/legal-hold reconciliation, measure resource limits, publish a scanned immutable image and verify actual schedule cadence and missed-run delivery. No clinical dump/restore has passed. |
| Alert tests | Keep test resources disabled. Prove an automatic cutoff and obtain fresh authorization before additional live test messages. |
| Credential incident | Complete historical triage, old-organization access assessment, retained-key recovery and provider-origin payment webhook delivery proof. Do not replay financial events to manufacture evidence. |
| Spending | Preserve free plans and GitHub $0 hard budgets. Fly's remaining-month rootfs forecast/final waiver and R2's uncapped overage exposure remain unresolved. No universal $0 hard cap is verified. |
| Observation | Complete 24 hours of actual backup cadence and required staging/production observation after reviewed recovery. A stopped system supplies no uptime evidence. |

Production remains deliberately unavailable in the
[maintenance state](../operations/ZERO_HOSTING_SPEND.md). Static frontend loading
does not prove usable clinician journeys. Keep each gate open until its own
evidence exists; local or PR success does not replace deployment and recovery.
