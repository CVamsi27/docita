# Final stability pass, 20 October 2026

**Production freeze readiness remains blocked.** The feature freeze ends on
13 December. This pass does not merge main/staging, restart production, migrate
clinical data, activate backups, replay payments or create paid resources.

## Verification

Code Review reports **14 successful checks, three scope skips and zero failures**
for PR #322 at `a97882b0778f17d0684fcece2910b898a27a0870`.
Security Audit, Validate Migrations and App Bundle Analysis are skipped by scope;
they are not executed evidence. Passing checks include all four API E2E shards,
API/worker/frontend jobs, Repository Standards, OSV and critical frontend E2E.
The 19 October API run reports 526 suites / 4,386 tests with unchanged coverage
thresholds; frontend E2E reports 70 passed / two desktop hero skips.
The final-pass commit changes only test fixtures and operating records; its
hosted result must be read for that exact revision.

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

Provider readbacks confirm Fly API machine `185de22c211008` is stopped/cordoned
and worker `6835051b497568` is stopped. Both are preserved. Render's only service
is suspended on Free, Auto-Deploy Off, connected to `main`; no candidate was
deployed. The production/legacy staging deploy, synthetic recovery and daily
worker workflows remain `disabled_manually`. `DOCITA_BACKUPS_ENABLED=false`,
the Sentry slug is `new-monitor`, and the reviewed registry image variable is
absent. The Sentry test monitor and dedicated email rule remain disabled with
27 triggers after reload. See the [alert incident](../operations/RUNBOOKS/backup-alert-test.md).

## Open release gates

| Gate | Evidence still required |
| --- | --- |
| Reviewed release | Accept PR #322 into main, align staging through its protected PR path and verify deployed API/worker/frontend revisions. |
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
