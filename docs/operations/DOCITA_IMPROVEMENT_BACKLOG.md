# Docita improvement backlog and release evidence

Updated: **2 October 2026**. Scope: the reviewed Docita source, existing feature plans and the operational-metrics release on `fix/actual-operational-metrics`. Keep this file as the entry point for remaining work; detailed implementation belongs in the linked domain plans and source.

The next useful improvements are reliable releases, demonstrated tenant isolation, recoverable financial/background operations and trustworthy product measurements. Adding more features before these boundaries are verified increases the amount of behavior that is difficult to operate.

## What is implemented, and what still needs proof

Docita already has typed React interfaces, NestJS APIs, PostgreSQL/Prisma persistence, authorization policies, encryption/audit infrastructure, background queues, outbox events, payment adapters, storage integrations and operational dashboards. Do not create replacements merely because release evidence is incomplete.

Use these statuses consistently:

| Status | Meaning |
| --- | --- |
| Confirmed behavior gap | Inspected code has a specific failure or semantic limitation; reproduce it before changing the mechanism. |
| Evidence gap | Implementation exists, but the required real-database, provider, browser or production evidence has not been established in this review. |
| Planned / partial | An existing product plan contains unfinished scope; do not advertise it as delivered. |
| Decision required | A business, clinical or operational definition must be settled before code can be correct. |

P0 protects patient data, financial correctness and safe releases. P1 protects recovery, reporting and everyday workflow correctness. P2 improves maintainability and validated product scope. Priority is independent of status: an evidence gap can be P0.

## Release first: the current dashboard branch

The user authorized a production release from this exact feature branch. This is a dated exception to the normal `main` release route. The branch scope selects **API and internal frontend**, retains detected database changes, and avoids releasing the worker, clinician app or landing site for this dashboard change.

The configured release sequence is below. Local tests verify its selection and contracts; successful production execution still requires a linked workflow run:

1. Detects the requested targets and validates the API/internal builds, repository standards and dashboard tests before production access.
2. Checks database connectivity, migration status and schema agreement. Applies migrations only when database inputs changed; removes automatic historical migration rollback/cleanup from the release path.
3. Deploys the API through the existing Fly blue-green helper and runs its configured probes.
4. Validates Cloudflare credentials and deploys the internal frontend after the required API release succeeds. Missing required credentials fail the release instead of producing a green skipped deployment.
5. Serializes production releases across branches with one concurrency group.

This authorized dashboard release uses the existing gate semantics: the absent API latency baseline is explicitly recorded as a skip, and R02 stays open. It does not grant an API latency/SLO claim. A future release that declares a performance budget must close R02 and require that evidence.

A trigger being enabled is not a successful release. Record the workflow URL, deployed revisions, API/frontend deployment IDs, post-release checks and rollback evidence in the [release checklist](RELEASE_EVIDENCE_CHECKLIST.md). Remove the feature-branch exception after the change is integrated and its release window is closed.

The operational dashboard requires no new table or metric seeds. It reads existing records and displays a rolling 30-day UTC window, request sample count and observation coverage. A read-only check on 2 October found retained request telemetry but no appointment, invoice or retained job activity in the selected window. Those records do not establish customer adoption or a before/after performance improvement. Keep aggregate evidence separate from patient information and credentials.

## P0: establish safe operating boundaries

### R01 — Complete release identity and rollback evidence

**Status:** Evidence gap. **Owner:** Release/platform.

Builds, local checks and deployment helpers exist. A complete release still needs a green workflow linked to the exact commit, the deployed Fly/Cloudflare revisions, protected-route smoke results and a usable rollback against the current schema.

**Next action:** Fill one [release evidence record](RELEASE_EVIDENCE_CHECKLIST.md), including the operator and post-release observation window. Exercise API rollback and frontend rollback in staging before relying on those commands during an incident.

**Done when:** The record identifies the exact artifact and schema compatibility; checks `/api/health/live`, authorized `/api/v1/internal/operational-metrics`, rejected clinician access, and an authenticated internal page load; and links staging rollback results for both API and frontend. A skipped job is recorded as skipped, never passed.

### R02 — Make missing performance evidence fail the intended release gate

**Status:** Confirmed behavior gap. **Owner:** Platform.

`check-api-latency-budget.mjs --enforce` currently reports a skip when `artifacts/api-latency-baseline.json` is absent. The repository command can therefore finish without a measured API budget. Existing accessibility/web-vitals baselines also need fresh release provenance.

**Next action:** Capture a representative staging soak, retain its route/workload/errors/concurrency/cache state, generate the baseline, and decide explicitly which releases require a fresh baseline. Add a regression for the required-baseline mode; preserve optional developer checks separately.

**Done when:** A release requiring performance evidence fails on absent/stale evidence and passes on a reproducible compliant sample. A fast health-check response cannot satisfy a booking or invoice endpoint budget.

### S01 — Prove tenant isolation using the production database role

**Status:** Evidence gap. **Owner:** Security/backend.

Tenant context, ABAC and RLS policies exist. Their coverage depends on applied policies, database privileges, transaction routing and bypasses. Source presence is not a two-tenant execution result.

**Next action:** Run a real PostgreSQL matrix with two clinics and the actual application role. Cover reads, writes, raw SQL, relations, transactions, pooled-connection reuse, portal resources and INTERNAL/worker bypasses. Retain denied cases and audit attribution.

**Done when:** No unauthorized cross-tenant operation succeeds; transaction/session state does not leak between requests; privileged operations are intentional and attributable. See [RLS rollout decision](../architecture/decisions/0004-rls-rollout-deferred.md) and `apps/api/src/shared/common/interceptors/tenant-context.interceptor.ts`.

### S02 — Close OTP and upload capability consumption races

**Status:** Evidence gap. **Owner:** Auth/storage.

Attempt counting, token records and expiry checks are useful controls. A check followed by a separate consume/delete does not prove that parallel submissions have one winner.

**Next action:** Trace the current portal OTP and upload-token repositories. Where consumption is split, replace it with a conditional atomic claim, preserving expiry, attempts, scope and replay behavior. Test concurrent valid submissions against PostgreSQL.

**Done when:** At most one request consumes a single-use capability; the loser receives a controlled rejection, and no protected record/file is published twice. Sources: `apps/api/src/domains/patient-portal/infrastructure/repositories/prisma-portal-auth.repository.ts`, `apps/api/src/domains/documents/`.

### F01 — Prove payment replay, ownership and reconciliation

**Status:** Evidence gap. **Owner:** Payments/backend.

HMAC verification and transactional updates exist. Signature validation alone does not establish merchant/clinic ownership, replay-safe business effects or durable recovery after a handler failure.

**Next action:** Exercise duplicate, reordered, wrong-context and delayed callbacks. Trace acknowledgment versus handler completion and retain durable retry/reconciliation for failures. Reconcile provider settlements against local payment/subscription state.

**Done when:** Duplicate delivery cannot double-credit or activate a different clinic, and a crash after provider success has a documented recovery path. Source: `apps/api/src/domains/payments/infrastructure/adapters/razorpay/razorpay-webhook.adapter.ts`.

### F02 — Make invoice and subscription accounting definitions consistent

**Status:** Decision required. **Owner:** Billing/product.

Canonical minor-unit fields and invoice states exist. Finalization, recalculation, settlement dates, refunds and currencies still need consistent semantics across all paths; aggregate invoice creation is not collected revenue.

**Next action:** Trace finalization and settlement services, lock historical commercial context, define collection versus earned revenue, and group amounts by currency. Check rounding identities and late-payment periods using known transactions.

**Done when:** Finalized context cannot silently change; money identities hold; mixed currencies are never added as one amount; refunds/late captures land in defined periods. Sources: `apps/api/src/domains/billing/`, `packages/db/prisma/schema.prisma`.

### C01 — Establish patient-data lifecycle and recovery evidence

**Status:** Decision required. **Owner:** Security/operations.

Encryption, audit mechanisms and storage providers exist. This review does not establish complete read-audit coverage, key rotation/recovery, tenant-aware deletion, retention exceptions or a successful backup restore.

**Next action:** Test encrypted-data recovery and key rotation, inventory PHI in logs/storage/exports, and rehearse a database plus object-storage restore. Define retention, deletion/legal-hold behavior and provider boundaries in the existing compliance documents.

**Done when:** A timed restore of the database, referenced objects and required keys verifies integrity and tenant access against explicitly approved RTO/RPO targets; keys can be recovered/rotated; deletion/retention behavior has an owner and tested scope. See [DPDP readiness](../compliance/DPDP_READINESS.md), [PHI encryption decision](../architecture/decisions/0005-envelope-encryption-for-phi.md) and [runbooks](RUNBOOKS.md).

## P1: recover work and make workflow results correct

| ID / owner | Gap and status | Next action | Acceptance evidence |
| --- | --- | --- | --- |
| A01 — Async/backend | **Confirmed behavior gap:** queue claims, completion ownership and stale recovery need an effect-level protocol. | Fence acknowledgments by claim ownership; separate retryable work from irreversible external effects. | Two workers, lease expiry and crashes around effect/ack preserve required work without duplicate business effects. |
| A02 — Events/backend | **Confirmed behavior gap:** the outbox relay uses synchronous event emission; async listener completion is not its acknowledgment. | Move required effects into durably acknowledged consumers; if listener completion is awaited, persist retryable intent before acknowledgment so process crashes remain recoverable. | Listener rejection/crash leaves retryable intent; replay cannot silently lose required notifications. |
| W01 — Scheduling/backend | **Evidence gap:** preflight checks and token allocation can race outside protected booking paths. | Use database invariants and conditional ownership for booking, reschedule, queue tokens and terminal transitions. | Parallel booking has one winner; token identities remain unique; stale actions cannot reopen completed visits. |
| W02 — IPD/backend | **Evidence gap:** paired transactions alone do not prevent concurrent bed allocation. | Make occupancy claims conditional and transfers/discharges ownership-aware, with recoverable history. | Concurrent admissions do not allocate one bed twice; transfer/discharge retries preserve one valid transition. |
| W03 — Inventory/backend | **Confirmed behavior gap:** direct balance edits, mixed quantity units and non-unique references can bypass ledger/retry guarantees. | Make the movement ledger authoritative, define unit conversion and enforce operation identity. | Parallel decrements cannot oversell; repeated operations apply once; ledger reconstruction matches stock. |
| U01 — Subscriptions/backend | **Confirmed behavior gap:** daily increments, quota check/use and entitlement caches need rerun/concurrency guarantees. | Add stable accounting identity, atomic last-unit consumption and targeted entitlement invalidation. | Repeated accounting preserves totals, parallel last-unit consumption has one winner, and plan changes update access. |
| O01 — Analytics/backend | **Confirmed behavior gap:** financial weekly keys use day-of-month logic; calendar ranges, buckets and snapshots have uneven semantics. | Use explicit clinic calendar/ISO-week identities; define reporting windows and snapshot correction policy. | January/February weeks cannot collide; month/DST boundaries and late corrections match known fixtures. |
| O02 — Telemetry/platform | **Evidence gap:** retained requests can have persistence gaps and health-check skew; current job state is not an execution history. | Record capture health, route category, valid latency samples and immutable job outcomes with privacy-safe correlation. | The dashboard distinguishes customer operations, health checks, unavailable coverage, recovered retries and retained history. Observation coverage means first/last retained timestamps plus capture-health/gap evidence; it is not uptime. |
| D01 — Documents/storage | **Evidence gap:** upload and metadata failures can leave untracked objects; access semantics differ by provider. | Use quarantine/finalization and orphan reconciliation with scoped access tests. | Failed metadata persistence cannot publish an orphan; cross-tenant reads fail for every supported provider. |
| Q01 — Clinical/product | **Evidence gap:** string rules, generated documents and schema-valid AI output do not establish clinical correctness. | Version clinical rules/templates and rendering inputs; maintain reviewed cases, provider boundaries and human sign-off. | A clinical owner signs off critical rejection, acknowledgment and uncovered-case fixtures; outputs are traceable to versioned inputs/rules; AI cannot bypass clinical review. |
| Q02 — Lab/coding/backend | **Evidence gap:** release, notification completion and catalog provenance need distinct guarantees. | Atomically authorize result release; durably deliver notifications; retain catalog system/source/version and partial-sync state. | Unauthorized release fails, retries preserve one result effect, and a partial catalog sync cannot be labeled complete. |
| I01 — Insurance/backend | **Evidence gap:** local claim transitions are separate from insurer acceptance and settlement. | Test optimistic concurrency, transactional events, retryable submission and external reconciliation. | Concurrent/repeated transitions preserve history; external denial/settlement is linked to provider evidence. |
| I02 — ABDM/integrations | **Evidence gap:** a local exchange ledger is not complete interoperable consent-based exchange. | Verify authentication, correlation, consent, authorized preparation, encryption and receiver behavior in the applicable test environment. | End-to-end protocol evidence covers failure/replay/revocation; no unsupported certification or compatibility claim. |
| E01 — Enterprise/billing | **Decision required:** membership, entitlement exit, commercial versioning and true-up need explicit history. | Version membership/terms, separate issuance from retry identity, and distinguish estimates from forecasts. | Repeated issuance is stable; membership changes preserve historical billing; alerts have actual delivery evidence. |
| P01 — Portal/auth | **Evidence gap:** identity linking, resource scope and session revocation need an integrated matrix. | Test each resource through authenticated patient identity; define linking/revocation and request/channel abuse controls. | A patient cannot select another patient's resource; linking and logout/revocation behave as specified. |
| P02 — Booking/product | **Evidence gap:** practitioner verification and anonymous requests need dated identity/consent/abuse controls. | Keep verification evidence scoped and dated; test final booking conflicts, enumeration and recovery. | Public availability is only a candidate; final booking is authorized and conflicts are controlled. |
| X01 — Frontend/product | **Evidence gap:** reusable primitives do not prove each important flow works on mobile, keyboard or assistive technology. | Verify scheduling, clinical forms, payment and document flows with loading/error/stale-state and accessibility cases. | Browser evidence covers booking, clinical-form validation, invoice/payment and document flows at 360, 768 and 1440 CSS pixels, keyboard focus and announced errors. |

Async sources: `apps/api/src/shared/modules/queue/postgres-queue.service.ts`, `apps/api/src/shared/modules/outbox/outbox-relay.scheduler.ts`. Domain sources: `apps/api/src/domains/appointments/`, `ipd/`, `inventory/`, `subscriptions/`, `analytics/`, `documents/`, `clinical/`, `insurance-claims/`, `abdm/`, `enterprise-contracts/`, `patient-portal/`. Confirm the current path and behavior before implementation; do not assume every row is already a reproduced failing test.

## P2: discovery areas to turn into scoped work items

The areas below have existing plans or require a reproducible gap inventory. They are not closed by completing this document: assign an owner and item-specific acceptance evidence before scheduling each change.

- **Architecture and contracts:** reconcile the [SSOT remaining checklist](../architecture/SSOT_REMAINING.md), [data-access migration plan](../architecture/DATA_ACCESS_MIGRATION_PLAN.md) and [ABAC migration plan](../analysis/ABAC_MIGRATION_PLAN.md). Inventory any currently open duplicated derivations, legacy adapters and thin-route violations through the existing ratchets, preserving compatibility. Do not reopen completed checklist phases solely because an older plan exists.
- **Operational capacity:** measure pool acquisition wait, database saturation, queue age, outbox retry age and scheduler heartbeats across replicas and deployment overlap. Set capacity limits from those observations; a larger pool is not automatically faster.
- **Product adoption measurement:** define provisioned, test/demo, active and paying clinics; assign explicit event timestamps and deduplication identity. Build period cohorts from real records, with an owner for their definition. Do not substitute row counts or benchmark fixtures for customers.
- **Referral/partner program:** complete the existing [partner plan](../REFERRAL_PARTNER_PROGRAM_PLAN.md), including unfinished partner UX/handoff and the policy/verification/payout gates. Treat sponsor bonuses as an explicitly approved extension. Do not relabel partial backend work as a complete partner product.
- **Messaging/provider operations:** prove provider compatibility, recipient consent, rate limits, deduplication and reconciliation. Provider acceptance and actual delivery are different outcomes; operational messages must not silently become marketing.
- **Small-domain audit:** trace immunization, consent, specialty, feedback, support, imports and exports through tenant-qualified identity, conditional transitions and durable recovery. Use existing modules rather than a parallel generic workflow engine.
- **Dependency and supply-chain maintenance:** retain current audit/container-scan evidence, verify supported runtime/package versions and pin deployment actions appropriately. Track any exception with an owner, expiry and affected release.
- **Documentation drift:** reconcile stale runtime/hosting statements with package manifests and Fly/Cloudflare configuration. Keep implementation status, verification evidence and proposals separate in all feature plans.

## How to close an item

Use one small change per failure boundary. Record: backlog ID, failing reproduction, exact source commit, implementation, tests with real/mocked dependencies identified, rollout/rollback, and resulting artifact or report. Mark an item closed only when its acceptance evidence exists; a unit-test count or successful build alone does not close a production-data or recovery gap.

Initial queue: R01 release evidence → S01 tenant matrix → C01 recovery/PHI lifecycle → S02 single-use capability races → F01 payment recovery → F02 accounting definitions → A01/A02 durable work. R02 proceeds alongside the release work and blocks future declared performance-budget claims until closed. A reproduced data leak, lost financial effect or clinical correctness failure takes precedence over this sequence. Prioritize concrete failures uncovered by real customer workflows over adding another dashboard card or adopting infrastructure without a measured need.

## Evidence index

- [Deployment workflow](../../.github/workflows/deploy.yml), branch scope helper in `scripts/workflow/production-branch-scope.mjs` and its regression tests.
- [Release evidence checklist](RELEASE_EVIDENCE_CHECKLIST.md), [deployment guide](DEPLOYMENT.md) and [runbooks](RUNBOOKS.md).
- [Single source of truth](../architecture/SINGLE_SOURCE_OF_TRUTH.md) for canonical operational metric inputs.
- `apps/api/src/shared/modules/internal/internal-operational-metrics.service.ts` and `infrastructure/prisma-internal-operational-metrics.repository.ts` for metric bounds and source selection.
- `apps/api/src/domains/analytics/core/factories/period-bucket.util.ts` for the weekly-key behavior; `snapshot-analytics.factory.ts` for snapshot input scope.
- GitHub's [workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax) and [enable/disable workflow controls](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/disable-and-enable-workflows) explain the two separate activation requirements.
