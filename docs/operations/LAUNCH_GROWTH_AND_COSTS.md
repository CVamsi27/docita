# Launch, growth and operating costs

Updated 28 October 2026. This is the repository operating companion to the public
[launch-to-growth roadmap](https://github.com/CVamsi27/software-developer-bible/blob/main/projects/docita/25-launch-to-growth.md)
[monthly cost model](https://github.com/CVamsi27/software-developer-bible/blob/main/projects/docita/26-monthly-operating-costs.md)
and [operating-evidence workbook](https://github.com/CVamsi27/software-developer-bible/blob/main/projects/docita/27-operating-evidence-workbook.md).
Those chapters own the detailed lifecycle, provider quotes and reproducible cost
arithmetic. This companion connects their proposed stages to Docita's operating
records; it does not establish customer adoption, measured capacity or a live bill.

## Preserve the approved low-cost boundary

The 28 October read-only inventory in [capacity evidence](CAPACITY_EVIDENCE.md)
found a stopped Singapore API machine with one shared vCPU / 512 MiB RAM and a
stopped worker with one shared vCPU / 256 MiB RAM. The owner confirmed temporary
Neon use to reduce cost. The actual current Neon plan, compute usage, storage and
bill were not reverified in that inventory. The earlier Free-plan observation in
[recovery verification](DR_RUNBOOK.md#current-provider-verification-15-october-2026)
is dated evidence, not a replacement for a current invoice or account check.

Keep these smaller guests and the temporary Neon setup until a measured constraint
and reviewed cost decision justify a change. Preserve the recorded
[maintenance and spending controls](ZERO_HOSTING_SPEND.md), paused deployment
triggers and disabled schedules. The 28 October observation does not establish
that earlier cordons, billing waivers or access controls have changed. This document
does not authorize restarting machines, enabling schedules, buying a plan or
releasing production code.

An API request may wake the API under its configured suspend policy. The worker
has no HTTP wake path: promised PDFs, reminders, outbox effects and cleanup need an
explicit worker lifecycle and an operator who checks completion. A stopped worker
is a service limitation even when the API responds.

The future balanced experiment remains two API guests of one shared vCPU / 1 GiB
each, a worker of one shared vCPU / 512 MiB and AWS RDS PostgreSQL
`db.t4g.medium` (2 vCPU / 4 GiB), with storage and recovery configured deliberately.
It is not a deployed profile or an automatic upgrade at 25 clinics. The capacity
reference can keep one API warm; the comparison cost below intentionally prices
**both APIs running for the whole month**. Single-AZ RDS does not provide Multi-AZ
availability. [Deployment](DEPLOYMENT.md) owns configuration and release/rollback
procedures; historical AWS instructions there do not identify today's database.

```text
Current preserved profile                 Future experiment, after review
Cloudflare -> Fly API 512 MiB -> Neon      Cloudflare -> two Fly APIs 1 GiB
                 |                                         |
        Fly worker 256 MiB                         Fly worker 512 MiB
        explicit lifecycle                         measured coordination
                 |                                         |
                 +-> R2 / external providers       +-> AWS RDS / R2 / providers

Current stopped state is not active service. Neither drawing proves capacity.
```

## Promote the service through evidence

Clinic bands are proposed operating stages, not actual customer counts or hardware
thresholds. The owner can initially fill several roles, but each action still needs
an owner, review date and stop condition. Do not widen the promise while a required
tenant-safety, recovery or clinical-workflow gate remains open.

| Stage | Work and operating owner | Evidence before moving to the next stage |
| --- | --- | --- |
| 0: local development | Engineering defines one outpatient workflow and supported roles; use [developer onboarding](../ONBOARDING.md) and [product developer setup](../product/ONBOARDING.md), synthetic data and isolated providers | A fresh setup completes booking, visit, prescription/document retrieval and invoice work; relevant rejection/failure paths, checks and compatible rollback are recorded |
| 1: supervised pilot | Before activation, release/operations owner verifies the minimum readiness gates below; clinic administrator approves bounded scope, hours, training and fallback; onboarding owner reconciles any supervised import | Readiness remains valid and the pilot completes its first reconciled clinic day before expanding to more clinics |
| 2–5: repeatable onboarding | Onboarding and support owners reuse a versioned setup, import/reconciliation and training checklist; billing owner reconciles trial, paid, renewal and cancellation state | Another operator can follow the checklist; clinic outcomes, exceptions, support hours and commercial access agree; support coverage can absorb the next cohort |
| 6–10: predictable operation | Operations checks readiness, worker age, pending work and backup freshness before opening; release owner supervises each compatible rollout; finance reviews monthly variance | Current operating measurements, incident handling, recovery drills, retained use/renewals and forecast costs support the promised hours and response |
| 11–25: controlled expansion | Engineering tests the intended workload and failure boundaries; growth owner sizes cohorts to onboarding/support capacity | Representative full-application reads **and writes**, tenant denials, contention, PDFs, provider replay/recovery, resource observations and sustained-load evidence pass with a funded recovery/support plan |
| 25+: revise the constraint | Product/operations review busiest tenants, retention, data growth, support and unit economics; engineering tests one proposed change | A documented constraint and measured experiment justify the next change; shared-state, pool, regional failure and migration consequences are checked before horizontal growth or a provider move |

Define an activated clinic by its agreed useful workflow and observation window.
Registration, a free pilot, an import job or a message attempt is not a paying,
retained clinic. Track permitted discovery, qualified pilots, activation, paid
conversion, renewal and consented referrals separately. Keep prospect/customer
identities and clinical records outside public artifacts; this plan sends no
outreach.

## Reproduce only the available, isolated boundary

The capacity runner and dedicated metrics suite are included with this guide; historical base `f3fddffc0` lacks those additions. Run the public deployment chapter's read-only script/file availability check and retain source provenance before offering those commands as a fresh-clone path. The ordinary local seed is not a 25-clinic full-application fixture or a 25-identity credential generator; those remain preparation work. A passing SQL aggregate is not a completed clinic day.

Use the corrected [developer setup](../product/ONBOARDING.md) for actual root/API/worker environment loaders, local ports, no-overwrite files and filtered startup. The root umbrella startup kills listeners; it is not an innocuous inventory command. Separate processes need the same PostgreSQL queue and reviewed key/storage decisions, API schedulers off and worker schedulers on. Local storage defaults to each process's own working directory; verify artifact retrieval before claiming a complete split-worker PDF setup.

The later [executed local results](CAPACITY_EVIDENCE.md#executed-local-results) now record a reused-dependency build, all 175 migrations/no schema drift, synthetic developer seed, guarded unseeded API health and one seeded authentication/list-read smoke. They also record the dedicated tenant fixture, verbatim diagnostic-query results, controlled network/listener deviation and stopped experiment processes. These are bounded local results, not a fresh-clone/Compose walkthrough, browser/full clinic day, worker/PDF/provider/recovery or performance proof. The development API ran with owner access and RLS disabled; the separate passing tenant fixture does not change that runtime boundary.

A subsequent [clinical/document continuation](CAPACITY_EVIDENCE.md#clinical-and-document-continuation) repaired dropped prescription clinic scope and seed key/doctor snapshots, then verified a fresh linked-create sequence, database invariants and synchronous/stored PDF paths. Its declared fixture/profile controls, initial failures and seed-rerun foreign-key limitation remain visible.

The later [standalone worker continuation](CAPACITY_EVIDENCE.md#standalone-postgresql-worker-continuation) retains a real tenant-context failure and a corrected two-job asynchronous PDF/retrieval result. Common local storage and the scheduler coupling remain explicit. Owner/RLS-disabled access, two jobs and nonexpiring local URLs do not establish production worker readiness, least-privilege SQL RLS, load or recovery. Full clinic-day, non-owner cross-clinic HTTP, provider/recovery, production memory and 25-tenant capacity gates remain open; this result changes no hosting allocation or monthly cost assumption.

The earlier database/API phase's focused reruns total **34 passing tests**: metrics 15 (6 real-PostgreSQL
aggregate cases and 9 target guards), service 4 and dedicated tenant fixture 15.
Keep that population separate from the later clinical/worker checks and historical 74-test record. The macOS readiness sample's RSS
was **696,352,768 bytes (approximately 664.09 MiB)**, with approximately
**254.35 MiB heap used**. That development sample does not validate the 512 MiB
API / 256 MiB worker active-service cost envelopes, steady-state memory or an
appropriate production allocation. Keep those envelopes conditional on
production-like memory/soak measurements; no production RAM change was made.

General API E2E can force-reset and truncate a database. Its target must be separately owned and positively identified; the tenant-isolation integration suite also creates cluster-wide roles and can skip without its specific fixture URL. A missing prerequisite remains blocked. The [PDF backlog playbook](playbooks/pdf-queue-backlog.md) now uses actual `QueueJob`/`PdfJob` names and aggregate-only diagnostics; its proposed actions/queries were not executed against production. The [stability runbook](STABILITY_RUNBOOK.md) distinguishes percentile targets from good/bad event budgets, corrects the 30-day 99.9% time example to 43 minutes 12 seconds, and keeps alert delivery separate from source configuration.

## Collect the resource and invoice register first

The actual monthly bill is **unknown**. Record each environment and payer in a
protected inventory, then reconcile the following meters with provider invoices.
Public documentation should contain only sanitized totals and assumptions.

| Meter | Inventory and reconciliation inputs |
| --- | --- |
| Fly API and worker | App/region, guest CPU/RAM, machine count, running seconds, stopped-rootfs sizes/time, swap limits, paid volumes, allocated inbound/outbound IPs and their lifecycles, internet/private transfer and invoice plan minimums |
| Neon now / RDS later | Verified provider/region/plan, compute size over time, active branches/replicas, CU-hours or instance-hours, used/provisioned storage as billed, restore history, transfer, connection headroom and enabled extras; RDS burst credits, IOPS, backups, public IPs and overlap costs if selected |
| Cloudflare and objects | Workers plan and account-wide requests/CPU allowances; R2 retained GB-month and operation classes; versions, images, backups, retention locks, cleanup and proxy-path egress; allocate shared allowances once |
| External providers | Billable delivered messages by country/category/phone/allowance, BSP minimum/markup, recipient email credits purchased/used/expired, successful eligible payment amounts/rates/refunds/disputes and the actual merchant/payer |
| Recovery and release | Independent encrypted backup bytes/operations/transfer, restore compute and drill effort, staging/previews, CI minutes/artifacts/images, paid monitoring retention/ingestion/alerts, secret/key custody and migration overlap |
| Business operation | Domain renewal/12, business mailboxes, taxes, settled currency conversion/bank fees, onboarding/support/on-call/maintenance hours, actual acquisition spend and explicitly chosen reserve |

For every line retain owner, purpose, invoice currency, unit rate/date, included
allowance, consumption, calculated charge, actual invoice, variance, renewal or
removal date and next action. Track prepaid balances separately from consumption.
A spending alert is not necessarily a hard cap; verify enforcement and delivery.

## Use conditional infrastructure comparisons

These are the exact rounded examples in the public cost chapter, using Singapore
Fly rates checked on **28 October 2026**, **720 hours/month**, public on-demand
pricing and no promotional credits. They are planning inputs, not quotes for an
uninspected account. Recompute from that chapter when any input changes.

| Example | Explicit comparison inputs | Infrastructure subtotal/month |
| --- | --- | --- |
| Parked development | Zero runtime; two assumed 1 GB rootfs stopped all month; Neon/edge/R2 within Free limits; no paid IP/volume | **$0.30** |
| Supervised pilot on Neon Free | 512 MiB API + 256 MiB worker, each 260h; 0.25 CU × 260h within all Free limits; 1 GB data; 1 GB Fly egress; assumed rootfs stopped for 460h | **$2.93** |
| Same pilot on Neon Launch | Same Fly schedule/network/rootfs; 0.25 CU × 260h and 1 GB paid storage; no restore-history charge assumed | **$10.17** |
| 2–5 comparison | 512 MiB API + 256 MiB worker, each 720h; Launch 0.25 CU × 720h + 5 GB data; Workers Paid; R2 within allowance; 5 GB Fly egress | **$33.50** |
| 6–10 comparison | 1 GiB API + 512 MiB worker, each 720h; Launch 0.5 CU × 720h + 10 GB data + 5 GB-month history; Workers Paid; R2 within allowance; 10 GB Fly egress | **$61.25** |
| 11–25 Neon comparison | Two 1 GiB APIs + 512 MiB worker, all 720h; Launch 0.5 CU × 720h + 20 GB data + 5 GB-month history; Workers Paid; steady R2 inventory as modeled; 25 GB Fly egress | **$75.00** |
| 11–25 future AWS comparison | Same Fly/Workers/R2/egress; Singapore Single-AZ `db.t4g.medium` × 720h + 50 GiB provisioned gp3, priced as 50 provider storage units; two app-scoped Fly static egress allocations; one billable RDS public IPv4 | **$119.98** |

The public calculator also verifies a 744-hour sensitivity, holding monthly storage/rootfs charge assumptions, traffic and plan minimums fixed. The active comparison rows become **$34.39**, **$62.96**, **$77.00** and **$123.51**; the fixed 260-hour pilot rows round unchanged. This is not a verified 31-day provider invoice: actual metering/normalization and additional usage follow account statements. All 720-hour totals above remain unchanged.

Fund backup frequency/retention explicitly. In a hypothetical full-archive policy, 1 GB per hourly copy retained 31 days holds 744 GB in steady inventory. With free storage already consumed, the incremental R2 Standard storage rate in the canonical cost model gives **$11.16/month**, or **$223.20** for 20 GB archives, before operations, transfer, restore compute and labor. Archive size is not inferred from database-used bytes, and the illustrative $20 tooling allocation is not a backup quote. Measure compression, retained copies and independent recovery custody.

The pilot's 260h is total runtime, not proof that background work may stop at
closing. Existing account minimums still apply. The R2 growth comparison holds
86.26176 decimal GB constant for a month, rounds to 87 GB-month and prices 77
after its 10 GB allowance: $1.155 before rounding. This is not every earlier
month's accumulating inventory or a database-size measurement. Free allowances
cannot also be subtracted from Neon Launch charges.

The AWS example assumes a strictly source-allowlisted public endpoint with TLS
verification and limited runtime roles; API and worker are separate Fly apps and
need their own selected static egress allocations. It excludes AWS outbound
transfer, Multi-AZ, replicas, surplus burst credits and additional storage/backup
charges. Private networking is a separately reviewed design and quote. Verify
storage units and all allocations against the chosen provider configuration.

All rows exclude independent backups, extra monitoring, email, WhatsApp, payment
fees, AI, domain, staging, taxes and labor. A $0 backup line is an unfunded
readiness gap, not a production policy. Cheap infrastructure does not establish
profitability, uptime or capacity.

## Fund the complete service and assign the correct payer

```text
Monthly funding need =
  infrastructure invoices (runtime + database + edge + storage + network)
  + independent recovery, restore drills, staging, release/build and monitoring
  + Docita-paid messaging, recipient email, gateway and optional AI usage
  + domain/business mail + onboarding/support/on-call/maintenance + acquisition
  + applicable taxes and settled currency/bank fees
  + an explicitly chosen reserve
```

Assign each expense once. If a planning tooling allocation already contains
backups or staging, do not add them again. Keep USD and INR lines separate until a
dated conversion rate is chosen. Annual payments divided by twelve describe
monthly economics; cash due and expiring prepaid credits remain separate.

The public model's illustrative $75.00 infrastructure + $20 unverified allocation
for small operational additions + $29 Sentry Team + $15 email-credit purchase is
**$139.00 USD/month** before tax, extras, labor and reserve. Replacing only the
infrastructure line with the AWS example yields **$183.98**. The $20 is a budget
to validate with quotes, not evidence all recovery/staging needs fit inside it.

The hypothetical two-message-per-visit workload is 52,000 **intents**. If all become
billable India utility deliveries at the dated ₹0.115 rate and Docita pays, add
**₹5,980** before tax/BSP. Verify current rate cards, message category, consent,
delivery, allowances and the documented service-pricing source conflict. A clinic
that owns and pays the messaging account bears that expense under its agreement.
Six $2.50 email credits buy 60,000 recipient emails: 52,000 consume $13 equivalent
but require $15 cash from a zero balance, with 8,000 remaining and paid credits
expiring after six months. These examples do not establish real deliveries.

Gateway cost uses successful eligible **value**, not attempts: at an assumed
contracted 2% fee with 18% GST on the fee, ₹100,000 yields ₹2,360. Reconcile Docita
subscription collections separately from clinic patient collections and their
merchant accounts. Patient collections are not Docita SaaS revenue. Refunds,
disputes and optional provider services require their own reconciliation; no
blanket refund of gateway fees is assumed.

## Close the minimum readiness gaps before live promotion

- Reverify the current maintenance state, spend controls and release approvals.
  Do not infer activation from these planning documents or a successful local test.
- Establish API and worker coverage for the promised hours, queue/heartbeat
  observation, bounded retries, stale-effect recovery and a reachable operator.
- Complete the staged least-privilege runtime rollout and tenant denial evidence in
  [RLS rollout](../compliance/RLS_ROLLOUT.md). Earlier records retain owner-role
  bypass, policy gaps and pending migrations; reread the checkpoint before release.
- Fund and verify independent backups, offline key/object custody, clinical restore
  scope and retention/erasure reconciliation through the
  [encrypted backup gates](ENCRYPTED_DATABASE_BACKUPS.md#live-activation-requirements)
  and [disaster recovery runbook](DR_RUNBOOK.md). Prepared scripts and the bounded
  synthetic Neon drill do not prove complete recovery.
- Preserve alert-test containment: the dated 20 October record has production
  backups disabled and the synthetic Sentry monitor/email rule disabled after an
  unbounded test. Follow the [bounded alert-test runbook](RUNBOOKS/backup-alert-test.md)
  before a new authorized test; verify missed-run delivery before claiming coverage.
- Collect a real staging-soak latency baseline and full-application correctness,
  load/resource and provider-recovery evidence described in
  [capacity evidence](CAPACITY_EVIDENCE.md). P95/P99 budgets remain targets; SQL
  fixtures and synthetic duration inputs are not achieved production latency.
- Rehearse a compatible deployment/rollback and clinical smoke with current checks,
  [synthetic monitoring](SYNTHETIC_MONITORING.md), clinic training, fallback and
  [incident ownership](RUNBOOKS.md). Retain actual skipped/blocked/failing gates.

Review the resource/invoice register monthly and the service state before each
live promotion. A Neon-to-AWS move must include dual-running costs, migration
transfer, isolated verification, recovery evidence and a compatible rollback.
Measured constraints and the service promise decide that move; clinic count alone
does not require it.
