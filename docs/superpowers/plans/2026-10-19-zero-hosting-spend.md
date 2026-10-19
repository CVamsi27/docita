# Zero Hosting Spend Implementation Plan

> Use executing-plans for the bounded operator work. The operator selected zero
> total Docita hosting spend on 19 October and acknowledged possible production
> interruption. Existing stability and recovery gates still apply to a restart.

**Goal:** Remove future Docita hosting charges without deleting clinical data or
claiming that an unverified free allowance is a spending cap.

**Fly decision:** The operator subsequently chose to preserve both machines and
keep gross monthly Fly usage strictly below $5 under the personal-organization
waiver. This does not authorize a paid $5 bill or machine deletion. Actual
invoice/waiver verification is required before restoring runtime. On 19 October
the operator confirmed the waived bill, zero reservations and R2's $0 cost, then
directed continuation. Free PR validation may proceed with GitHub's verified $0
hard budgets; no future finalized invoice is required for source review.

**Architecture:** Pause charge-producing execution first, preserve the current
Neon/R2 data and recovery material, then verify account plans and hard limits.
Use a reversible maintenance state while data-preserving removal of residual
metered resources and account access are unresolved. Do not migrate production
to an unverified free host.

**Tech Stack:** Existing Fly Machines, GitHub Actions, Render Free, Neon Free,
Cloudflare Workers/R2 and Sentry. Operator evidence stays protected outside Git.

## Global Constraints

- Zero total hosting spend is the target; charges already accrued cannot be
  erased by a new budget. No purchase, upgrade, billable verification run or
  clinical provider send is authorized.
- Preserve databases, documents, locked backups, secrets and offline recovery
  keys. Do not discard an uninspected machine filesystem without the operator's
  specific authorization after permanent loss is disclosed.
- Record actual provider readback. A stopped machine, suspended service, alert
  threshold or included allowance alone does not establish a zero-dollar bill.
- Keep source changes in the existing feature branch. GitHub's verified $0 hard
  budgets permit free PR validation; leave runtime/deployment workflows disabled.
  Source publication does not authorize a production release or paid execution.

## Tasks

### Task 1: Block automatic paid execution

**Files:** This plan; the protected operator evidence directory; no application
or clinical schema change.

- [x] Inventory both Fly apps without starting their machines. Each has one
      stopped machine; neither has a persistent volume. The API has shared IPv4 and
      IPv6, and traffic autostart is enabled. The worker has no allocated IP.
- [x] Inventory GitHub workflow activation states. Daily worker, synthetic
      recovery, production deployment and the legacy staging deploy are active.
- [x] Encrypt machine configuration/identity metadata to the existing approved
      age recipient before changing routing. This is not a filesystem backup.
- [x] Disable the four workflows above and read back `disabled_manually`.
      Record the uptime-monitoring pause as part of the maintenance state.
- [x] Cordon the API machine through Fly's routing operation, without a config
      update, start or filesystem replacement. Confirm provider acceptance, stopped
      state and unchanged instance/image identities. Keep the worker stopped.

### Task 2: Verify plans, limits and residual charges

**Files:** This plan; `docs/operations/ZERO_HOSTING_SPEND.md`; current stability
and backup documents link to that single operating record.

- [x] Verify personal GitHub billing access. Existing account-wide Actions and
      Packages budgets are $0 with Usage blocked; Actions' hard-stop checkbox is
      checked. Codespaces, Git LFS and AI credit SKUs also have unchanged $0 hard
      budgets. October metered usage reports $19.63 gross / $0 billed under Actions.
      No payment method, duplicate budget or unrelated subscription was changed.
- [x] Verify Render inventory: one suspended Free staging service, no Postgres
      instances and no Key Value instances. Hobby workspace, $0 October accrued and
      projected totals, and a $0 build spending limit are verified. Bandwidth is a
      separate allowance; keep the service suspended. Auto-Deploy was set to Off
      and independently read back through the service API.
- [x] Verify the current Neon organization is Free and contains only the
      production and isolated staging projects, without opening database compute.
      Usage fields do not establish stored bytes; the old alerted organization is
      outside current management access and remains unassessed.
- [x] Restore Cloudflare CLI control-plane access and inspect aggregate R2
      metadata: 704 objects / 37,067,230 payload bytes plus 8,696 metadata bytes;
      account analytics report 182 requests for 1–19 October. Preserve retained
      data; no clinical object content or patient row was read.
- [x] Verify Cloudflare console subscriptions: Workers Free, docita.work Free,
      and R2 Paid usage billing. The 2 October–1 November cycle shows $0 current
      and projected cost and 0.02 GB-month storage, all within included limits.
      Lower the existing account alert from $10 to $0.01 and read it back without
      changing its recipient. The alert is not a hard stop.
- [ ] Resolve R2's remaining zero-dollar overage exposure without deleting
      retained data. A free allowance and a one-cent alert do not enforce $0.
- [x] Verify Sentry Developer plan, 5,000 included errors and one included cron
      monitor. No billing details/payment method are on file; PAYG is unavailable
      on this free plan. Leave the upgrade flow without submitting changes.
- [ ] Verify the personal-org Fly waiver and current/forecast usage strictly
      below $5, including rootfs and any subscription/extension charge. Preserve both
      machines as directed; no removal is authorized. Do not call stopping a $0
      solution without the actual billing evidence. October currently shows
      $0.15 gross; May–September finalized invoices show Paid / $0.00, with
      September's detailed gross at $0.10. Both rootfs sizes show [Pending Sync],
      preventing a complete remaining-month forecast; October is not finalized.

### Task 3: Record and verify the maintenance state

- [x] Record completed changes, remaining charge sources, access blockers and
      the effect on clinician access, queues, webhooks and uptime monitoring.
- [x] Update the stability plan and backup activation instructions. Zero-dollar
      verification must precede any restart or hosted backup activation.
- [x] Run local documentation/script-reference/hygiene and secret checks,
      commit locally and leave the branch unpushed while the spending gate is open.
- [x] Report verified controls separately from unresolved charges. Do not claim
      that production is ready, a free migration is complete or the bill is $0.

### Task 4: Resume free source validation

- [x] Record the operator's waiver/R2 confirmation and distinguish zero reserved
      instances from the two retained stopped machines. Keep both preserved.
- [ ] Recheck the existing repair's local CI command and secret scan, then push
      only the existing feature branch. Preserve disabled deployment/recovery jobs.
- [ ] Inspect checks for the published revision through Code Review. Fix actual
      failures, retain the full API coverage thresholds and mobile auth coverage,
      and record scope skips separately from executed checks.
- [ ] Continue the staging/recovery gates that can run on free tooling. Leave
      source release, production credential/RLS rollout and backup activation
      gated on their own evidence.
