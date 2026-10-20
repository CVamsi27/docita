# Zero hosting spend and maintenance state

**20 October hosted continuation:** the approved reviewed staging candidate is
Live on the existing Render Free service with Auto-Deploy Off and the
$0 build-pipeline spend limit. Seven HTTP checks pass; billing still shows $0.00
accrued/projected at the saved post-deployment readback. Later real sign-in
passes, but parallel-read contention and invalid capture pacing block runtime
acceptance; no upgrade is authorized to work around them.
The approved source repairs in PR #328 reuse the existing transaction and fix the
capture producer, preserving the Free plan and runtime limits. They remain
undeployed; no additional hosting cost or production restart is authorized by
their implementation.
Production API/worker recovery and backups remain
gated. Cloudflare Workers Builds independently updated the clinician/internal
production frontends; both identified build paths are now disabled and verified
after reload. See the [hosted continuation](../audits/2026-10-20-hosted-staging-continuation.md).
Earlier Render suspension and frontend-origin statements below are historical.
The synthetic Sentry monitor and its dedicated
email rule were activated on 19 October and disabled on 20 October after repeated
notifications. Earlier statements below that no monitor/check-in was submitted
describe the preceding billing audit; see the [incident](RUNBOOKS/backup-alert-test.md)
and [current release limits](../audits/2026-10-20-final-stability-pass.md).

On **19 October 2026**, the operator selected **zero total Docita hosting spend**,
including existing infrastructure, after being told that this can interrupt
production. This supersedes the earlier uncertainty about additional versus
total spending. The feature freeze still runs through 13 December; production
readiness is not certified.

The operator subsequently directed retaining the two Fly machines and keeping
Fly's gross monthly usage **strictly below $5**, relying on the personal-org
small-invoice waiver. This is a zero-collection goal, not authorization to pay
$5. Machine deletion is **not authorized**. CLI confirms organization type
`PERSONAL`. The signed-in billing console now verifies **$0.15 gross October
usage** and finalized **$0.00 invoices for May–September**. September's detailed
gross usage was $0.10, supporting the account's historical small-invoice waiver.
October's preview is not a finalized zero-dollar invoice. Both apps report
**RootFS Sizes: [Pending Sync]**, so remaining-month storage cost is still
unverified. On the same day, the operator confirmed the waived bill, zero
reserved instances and R2's $0 cost, and directed stabilization to continue.
Proceed with the existing feature PR's free validation under GitHub's verified
$0 hard budgets. A future month's finalized invoice is not a prerequisite for
source review. No reservation, paid plan or metered runtime activation is added;
runtime recovery retains its clinical, encryption, backup and usage gates.

## Applied controls

The following were verified through provider control planes on 19 October:

- `docita-api` machine `185de22c211008` is **stopped and cordoned**. Fly reports
  `cordoned=true`, so its proxy does not route requests to this machine. Its
  instance and image identities are unchanged; no config update, start or
  filesystem replacement occurred. The API has shared IPv4/IPv6 and no volume.
- `docita-worker` machine `6835051b497568` remains **stopped**, with its instance
  and image unchanged, no allocated IP and no volume.
- **Daily Worker Queue Drain**, **Synthetic uptime monitoring**, **Deploy
  Production** and the legacy **Deploy Staging API** workflow each read back
  `disabled_manually`. The existing migration, timed scaling and DB restart
  guard workflows were already disabled and were left that way. Source security
  checks and branch protections were not weakened.
- Machine metadata/configuration was encrypted locally to the existing approved
  age recipient before routing changed. This is **not a root-filesystem backup**.
  No private recovery identity was accessed or recreated.
- Backups remain unactivated: `DOCITA_BACKUPS_ENABLED=false`. No new workflow
  dispatch, clinical dump or host purchase was performed in the billing audit.
  The subsequent source validation and synthetic Sentry exercise are recorded
  separately above; neither activated production backups.

The unchanged `auto_start_machines=true` source configuration is not the active
maintenance control: the API's provider routing cordon is. A later deployment,
uncordon or manual start can invalidate this state. Do not do one while the
spending and restart gates below remain open.

## Provider billing evidence

Billing observations are from 19 October except the Render readback and Sentry
containment update on 20 October.

| Provider   | Verified state                                                                                                                                                                                                                                                                                                                                                         | Remaining limit or charge                                                                                                                                                         |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fly        | **PERSONAL** organization; the console contains the same two Docita apps. October gross usage/preview is **$0.15**, with no nonzero subscription line. Finalized May–September invoices each show **Paid / $0.00**. Two stopped machines are preserved; API cordoned; no volumes or dedicated IPv4.                                                                    | Both rootfs sizes show **[Pending Sync]**. Remaining-month storage forecast and October's finalized waiver are unresolved; no provider hard $5 cap is established.                |
| Render     | On 20 October, Docita remains **Hobby**; its existing **Free** staging API is **Live**, branch `staging`, **Auto-Deploy Off**. No Postgres or Key Value instances were added. October accrued/projected totals remain **$0.00**, with 0.25/750 Free hours, 13/500 pipeline minutes and 0 MB/5 GB bandwidth. The build pipeline retains its **$0 monthly spend limit**. | Bandwidth overages are separate from the build cap; no universal $0 hard stop is verified. Preserve Free and suspend staging if runtime failures recur.                           |
| Neon       | Current `org-old-truth-42386674` is **Free**. Its two projects are production `icy-river-59903017` and isolated staging `wispy-forest-27565397`. Inspection opened no database connection.                                                                                                                                                                             | Null or zero API usage fields do not establish actual stored bytes. The older alerted organization/project remains outside current management access.                             |
| GitHub     | Signed-in personal console confirms existing account-wide **$0 budgets / Usage blocked** for Actions, Packages, Codespaces, Git LFS and AI credit SKUs. Actions' **Stop usage when budget limit is reached** is checked. October reports **$19.63 gross / $0 billed**, all reported under Actions. Existing limits were retained.                                      | No payment method was added. Included public-repository execution can still consume resources; preserve the existing hard stops and four disabled runtime/deployment workflows.   |
| Cloudflare | Console confirms **Workers Free**, **docita.work Free Plan**, and **R2 Paid** usage billing. For the **2 October–1 November** cycle, observed through 19 October, current and projected usage costs are **$0.00**; storage usage is **0.02 GB-month**. Aggregate R2 metadata below was also verified.                                                                  | R2 overages remain possible. The existing account alert was lowered from $10 to the supported minimum **$0.01**, with its recipient unchanged. This is an alert, not a hard stop. |
| Sentry     | Signed-in console confirms the free **Developer** plan, **5,000 included errors** and **one included cron monitor**. No billing details or payment method are on file; PAYG is unavailable. The later test monitor and dedicated email rule are disabled after the 20 October containment readback.                                                                    | Included quotas can stop ingestion; retain the free plan. Fresh authorization and an automatic cutoff are required before any more live alert tests.                              |

Fly [charges for stopped root filesystems](https://fly.io/docs/about/pricing/)
as well as running compute. No new account budget can erase usage already
accrued. Removing only a machine leaves its Fly app, app secret store and
separate Neon/R2 data intact, but **permanently discards that machine's temporary
filesystem**. Both filesystems are uninspected and are being retained under the
operator's latest direction. Configuration custody does not prove filesystem
recovery. A [May 2026 Fly support forum clarification](https://community.fly.io/t/convert-new-organization-to-personal-organization/27828)
describes the below-$5 waiver for personal organizations; the current billing
documentation does not promise a universal $5 hard spending cap. Verify actual
account eligibility and the invoice rather than treating a forum statement as a
budget enforcement mechanism. The signed-in console now demonstrates historical
zero-collection treatment, but does not supply a remaining-month rootfs forecast:
both app overview pages display **[Pending Sync]** for their one machine. Do not
start a machine to obtain that missing cost metadata.

R2 metadata reports `docita-cache` at 697 objects / 32.1 MB,
`docita-storage` at 6 objects / 4.98 MB, and `docita-db-backups` at one object /
230 B. The exact account aggregate above avoids adding rounded bucket sizes.
Current storage and reported operation counts are well below R2's
[included allowances](https://developers.cloudflare.com/r2/pricing/), but do not
establish all subscriptions or guarantee future usage. Only aggregate
[analytics](https://developers.cloudflare.com/r2/platform/metrics-analytics/)
were queried; no object name, document content or patient row was selected.
The billing console subsequently confirms current-cycle costs are within included
tiers. Its cycle is labelled **Nov 2026** because it ends on 1 November; this does
not mean November activity has occurred. Cloudflare's [budget alerts](https://developers.cloudflare.com/billing/manage/budget-alerts/)
notify about spend and do not block usage; the saved one-cent threshold cannot
guarantee a zero-dollar invoice.

Sentry's [Developer-plan policy](https://www.sentry.help/en/articles/13965037-can-i-set-up-an-on-demand-pay-as-you-go-budget-for-my-free-developer-plan)
does not permit PAYG. The paid-plan defaults shown when opening Manage plan are
an upgrade proposal, not the account's current settings; that flow was left
without submitting any change.

Neon's [Free limits](https://neon.com/docs/introduction/plans) stop compute or
reject growth when exhausted instead of silently upgrading the plan. Keep the
current organization on Free; no snapshot, extra service or paid plan was added.
Render's [Free documentation](https://render.com/docs/free) distinguishes its
build spend limit from bandwidth overage billing. An included allowance or an
email alert is not a universal hard spending cap.

## Effect on production

The production API is intentionally unavailable through Fly routing. Static
frontend assets may still load, but login and clinician operations need the API.
Worker queues are not drained, payment webhook processing cannot complete while
the API is unavailable, and uptime monitoring/recovery is paused. This is a
cost-driven maintenance state, not successful uptime or freeze-readiness proof.

Neon databases, R2 documents/locked backups, app secret stores and offline keys
have not been deleted. Do not replay historical queues or financial webhooks as
part of a restart. Reconcile provider delivery state and review normal queue
processing first; never infer that an unavailable API safely accepted an event.

## Remaining work and restart boundary

1. Retain the verified [GitHub $0 hard budgets](https://docs.github.com/en/billing/how-tos/set-up-budgets).
   Existing account-wide Actions and Packages limits already block paid usage;
   no duplicate repository budget or change to unrelated account services was
   needed. A source push is not a production restart or authorization to activate
   a runtime/deployment workflow.
2. Read Fly's current-month usage and forecast all remaining rootfs, runtime,
   network and subscription costs before permitting any start. Keep the sum
   strictly below $5 and verify that the account's waiver produces $0 collected.
   Current gross usage is below $5; stop/cordon controls remain in place while
   rootfs size/forecast and the final October collection are unavailable. Do not
   delete the machines or start one merely to inspect its filesystem.
3. Verify R2's actual stored bytes and operation exposure, and preserve the
   approved lock/retention policy. Do not purge clinical objects or locked
   backups to meet a storage target. Worker/zone Free plans and Sentry's free
   plan are verified. R2's usage billing has no verified zero-dollar hard stop;
   its alert must not be described as one.
4. Continue source review and free validation with the verified GitHub $0 hard
   budgets. Keep the API cordon and stopped worker during this phase. Before
   activating execution, assess its expected use of the approved free allowances
   and personal-org waiver against the existing clinical, encryption,
   RLS, recovery, authenticated journey and staging-soak gates. Do not repurpose
   the isolated staging database as production or weaken a release check to fit
   the budget.
5. Restoring routing or runtime/deployment workflows requires a reviewed
   release/recovery decision and a cost profile within the operator's $0 target.
   PR checks do not restore runtime or activate backups. Keep the [stability plan](../superpowers/plans/2026-10-13-two-month-stability.md)
   and [backup activation gates](ENCRYPTED_DATABASE_BACKUPS.md) in force.

Protected evidence is outside Git in the 19 October operator evidence directory.
No secret, raw billing profile, patient data or recovery private key belongs in
this record. **A $0 total bill is not yet verified.**
