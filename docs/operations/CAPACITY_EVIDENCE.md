# Capacity evidence and deployment profiles

Updated 28 October 2026. Source base: canonical main f3fddffc0. This change repairs operational measurements, prescription clinic persistence, developer seed inputs and standalone PDF job tenant context, and adds bounded local experiments; it does not establish measured 25-clinic capacity or upgrade production resources.

See [launch, growth and operating costs](LAUNCH_GROWTH_AND_COSTS.md) for the proposed 0-to-25+ promotion gates, current-versus-future resource boundary, invoice inventory and conditional monthly funding model.

## Current low-cost operation

A read-only Fly inventory found one API machine (1 shared vCPU, 512 MiB RAM) and one worker machine (1 shared vCPU, 256 MiB RAM), both in Singapore and stopped. Checked-in API uses 384 MiB old space, 512 MiB swap, autostart/suspend with minimum zero and soft 60 / hard 100 request concurrency. Worker uses 192 MiB old space and 512 MiB swap, with no HTTP service to wake it from incoming requests. No machine was started or resized by this work.

The owner confirmed a temporary move from AWS to Neon to reduce cost. Actual Neon tier, compute, used storage and allocated allowance were not verified. Do not infer DB hardware from local configuration, `shared_buffers`, or a connection hostname. AWS remains a future production reference, not the observed current provider. No paid database settings or credentials were changed.

Before active adoption, decide when background work is promised and how the worker is started. A stopped worker cannot finish PDFs, reminders or the outbox. Keeping it stopped saves runtime cost but creates a product limitation; API autostart does not solve that limitation.

## Future balanced reference

Benchmark before purchasing: two API guests of 1 shared vCPU / 1 GiB each with one warm, one worker of 1 shared vCPU / 512 MiB, and AWS RDS PostgreSQL db.t4g.medium (2 vCPU / 4 GiB) with an illustrative 50 GiB gp3 allocation. This is a proposed starting experiment, not a sizing theorem from 25 clinics. Review burst credits, regional networking, IOPS, storage growth, backups, failover and cost. Multi-AZ is a separate availability/cost choice. The actual implementation retains the smaller guests and temporary Neon setup.

There are 15 production Prisma connections per process. Two API processes plus one worker budget 45 connections before deployment overlap, migrations and reserve. RLS limits outbox batches to pool minus two, normally 13; the nominal 200 is not always used. Generic queue jobs default to five attempts, PDF jobs request three, and outbox events use eight. Request soft/hard limits are not database pool limits.

API rate counters, cache and socket rooms remain process-local. Horizontal growth requires an explicit shared-state/recovery design and tests across replicas. The main branch already contains active queue-poll shutdown draining; retain bounded forced exit and stale-effect recovery checks.

## What changed in measurement

The version 2 operational response retains existing rolling 30-day [start,end) activity definitions and adds prescriptions created, distinct clinic-patients seen, P99 and valid/invalid sample counts. Customer requests are now windowed by `observedAt`, excluding health/internal routes; invalid durations are excluded from percentiles but remain in request/error counts. New fields are optional for older-server compatibility; the UI marks legacy scope and unavailable additions.

Completed appointments are selected by scheduled start and current COMPLETED status, not completion time. Patients seen means distinct (clinicId,patientId), not new registrations or global people. Invoices created is not paid cash. Prescriptions are not PDF artifacts. Clinic counts include any demo/test records; no exclusion can be inferred from clinic names.

`apps/api/test/metrics/README.md` describes the isolated real-PostgreSQL aggregate suite. It uses an owned schema and never resets the whole database. The modeled-volume fixture checks 25 clinic keys, 26,000 appointments, 20,800 prescriptions, 26,000 invoices, 20,000 clinic-patients and 520,000 customer observation rows. These projected tables do not prove the full schema, indexes, RLS or API capacity. Synthetic durations in that test are arithmetic inputs, not achieved performance.

## Executed local results

A later 28 October run moved beyond source inspection to a bounded local build,
migration, seed and API smoke. It reused the existing installed dependencies in
the working tree based on `f3fddffc0`; it was **not a fresh clone/install** or a
production deployment. The observations below have separate targets and must not
be combined into a full clinic-day, capacity or production-tenancy verdict.

| Executed boundary | Observed result | Evidence identity and limit |
| --- | --- | --- |
| API build | Exit 0 with Node 24.22.1 and pinned pnpm 10.30.3; emitted `apps/api/dist/main.js` and compiled seed; workspace imports resolve without booting the app | `api-build.log`; scrubbed build environment and offline Corepack cache, existing dependencies reused |
| New full-schema database | All 175 existing migrations applied, exit 0; subsequent schema diff exited 0 with no difference | `migrate-deploy.log`, `schema-diff.log`; owned temporary local PostgreSQL target, not hosted data or the projected metrics fixture |
| Operational-metrics suite | 15 tests passed: 6 real-PostgreSQL aggregate cases and 9 target-guard cases | Current focused suite; aggregate cases validate the projected fixture/window definitions, while guards validate test-target protection; neither establishes API workload or production latency |
| Operational-metrics service | 4 focused service tests passed | Current focused service suite; separate from the real-PostgreSQL SQL fixture and API smoke |
| Tenant-role fixture | 15 tests passed with no skip on a dedicated temporary PostgreSQL cluster | `tenant-isolation-rerun.log`; exercises the dedicated role/policy fixture, not the development API's runtime role |
| PDF diagnostic SQL | Four SELECTs extracted verbatim from the current backlog playbook ran in a read-only transaction with timeouts; result-group counts were 5, 3, 3, 5 | `queue-diagnostic-receipt.json`; synthetic queue/PDF states only, no rendering, uploading, worker or provider execution |
| Unseeded API startup | Direct liveness 200 and readiness 200; listener evidence records `127.0.0.1:35501`; SIGTERM shutdown exited 0 | `api-startup-receipt.json`; full migrated schema, no seeded staff/patient workflow |
| Developer seed | Existing compiled developer seed exited 0; inspected fixture counts were 1 clinic, 25 patients, 90 appointments, 10 prescriptions and 15 invoices | `seed-local-receipt.json`, `seed-local.log`; synthetic developer records, no dependency downloads, not adoption or a 25-tenant application fixture |
| Seeded API smoke | Anonymous patient-list request 401; one synthetic staff login 201; session validation 200; authorized bounded patient-list read 200 with 5 rows; SIGTERM shutdown exited 0 | `api-seeded-smoke-receipt.json`; token issued but not retained, response bodies not retained, no full clinical workflow |

Artifact basenames identify protected operator evidence; their raw contents and
private locations do not belong in tracked/public documentation. Passing counts
refer to these specific runs, not a claim that every repository test was rerun.
If reporting one combined focused rerun count, use **34 passing tests**: metrics
15 (6 PostgreSQL aggregate + 9 target guards), service 4 and tenant fixture 15.
Keep the historical 74-test implementation record below separate.

### Keep the experiment deviations and cleanup visible

The API used allowlisted generated local environment values, no hosted/provider
credentials, schedulers disabled and an owned local database. An OS loopback
network policy and a private listener preload constrained the experiment. The
preload forced the listener to loopback because the application entrypoint still
requests `0.0.0.0`. This was an **experiment-only controlled deviation**, not a
production source change or proof that an ordinary launch binds loopback.

The macOS development readiness sample reported **696,352,768 bytes RSS
(approximately 664.09 MiB)** and approximately **254.35 MiB heap used**. This is
one development-process observation, not a steady-state or peak-memory profile.
It does **not** validate running the API in a 512 MiB guest or the worker in a
256 MiB guest; the worker was not exercised in that phase. Those active-service envelopes
remain cost assumptions pending production-like memory and soak measurements.
No production RAM setting was changed, and this sample alone does not determine
the appropriate production allocation.

The API profile used a development owner role with **RLS disabled**. Its 401 and
authorized-list results establish those authentication paths; they do not prove
database tenant enforcement. The 15 passing tenant tests used a different
dedicated cluster/role fixture. An earlier attempt in a shared local cluster
cancelled all 15 tests because cluster-wide fixture roles collided. That attempt
is preserved in `tenant-isolation.log`; moving the fixture to the dedicated
cluster resolved the prerequisite collision. Do not describe the cancellation
as a discovered application isolation defect or silently count it as a pass.

The diagnostic fixture checked 2 recent failed rows, 1 recent failure with a
recorded reason and 1 completed invoice PDF without a stored reference. Its
cleanup left 0 fixture clinics, 0 PDF jobs and 0 queue jobs, as recorded in
`queue-diagnostic-receipt.json`. Those deliberately inconsistent synthetic states
test diagnosis; they are not production incidents.

The developer seed writes its sample PDF files beneath `apps/api/uploads`,
whereas the experiment API's local storage/static serving uses its fresh custom
working directory. No artifact retrieval was verified across that difference.
A seeded PDF record or sample file is not evidence of worker generation,
authorized retrieval or shared local storage.

At the end of the recorded experiment, the API and both owned temporary
PostgreSQL clusters were stopped. This closure refers to the experiment
processes, not an assertion about every local PostgreSQL installation or any
hosted service. Production infrastructure, schedules and provider settings were
not activated by these results.

At that earlier stage, clinical writes, PDF retrieval and standalone worker
execution were still unverified. The later continuations below advance those
specific local boundaries. Fresh clone/install, UI/browser interaction, a complete
clinic day, 25-identity workload, provider outcomes, recovery and performance/SLO
evidence remain open.

## Clinical and document continuation

A later owned experiment retained actual failure results before corrections:

- Four linked clinical POSTs and their reads returned 201/200, but SQL found the new Prescription.clinicId null. The service had dropped clinicId and the repository omitted the clinic relation. Four focused assertions failed before the repair; all nine tests across two suites passed afterward. The repository now also rejects missing scope. Existing nullable rows were not backfilled.
- The seeded invoice generated a valid PDF, while seeded prescription download returned 400 because doctorName was missing. Direct LocalStorageProvider readback found the sample file and read its canonical key, but the persisted browser URL produced ENOENT under the same root. Seed upserts now snapshot the actual fixture doctor name on create/update, and seed PDFs persist bare seed object keys. Missing fixture doctors/names fail explicitly.
- A private harness initially parsed the wrong login-token field after a successful login. It stopped before PDF assertions; the source contract uses access_token. Its failure remains retained separately from application failures.

The corrected API built successfully. Eight existing seed suites passed 44 tests; combined API typecheck, focused lint, Prisma boundary and whitespace checks passed. These current focused checks are separate from earlier 34/74-test records.

A full seed rerun on the used database failed at lab-test deletion because LabTestOrder rows referenced those tests. A database dump and failure log were retained. This does not establish an idempotent refresh. A fresh owned database accepted all 175 migrations and the corrected seed, still using installed dependencies.

On that fresh fixture, another patient/appointment/prescription/pending-invoice sequence returned four 201s, four GETs returned 200, and SQL confirmed every direct clinic and patient/appointment/doctor association. One medication, one active notice consent and its successful audit, and one invoice line reconciled. Invoice and line totals were 50,000 paise in INR, with zero tax, discount and paid amounts. Related PaymentSession, WhatsappLog/Message, PdfJob and OutboxEvent counts were zero. A failed direct payment-link setup was observed; invoice creation is not settlement or durable retry evidence.

Both new documents and both corrected seeded documents returned valid one-page PDFs through protected staff routes. Anonymous seeded access returned 401 and missing records returned 404, with private, no-store headers on successful downloads. Local getPdf regenerates bytes; that alone does not read the stored sample.

For a separate stored-object check, only the two synthetic files were copied into the fresh API CWD/uploads tree. Valid local document capabilities returned 200 with bytes exactly equal to the copied objects. Malformed/tampered capabilities returned 400; wrong-type and signed missing-document requests returned 404. PublicDocumentTokenService uses HMAC and has no expiry field/check; these capabilities are distinct from expiring R2 presigned URLs. Capability values were kept in memory and redacted from URL logs.

The API still used owner/RLS-disabled development access, memory queues, schedulers off and the prior network/listener deviation. The owned synthetic doctor was temporarily marked VERIFIED and clinic WhatsApp automation explicitly disabled for the write exercise; this is not real clinician verification. Both databases' original fixture settings were restored. All five API runs exited zero after SIGTERM, the restarted owned PostgreSQL cluster stopped and experiment ports closed. Database snapshots were retained but not restored.

These results cover bounded local creation, synchronous rendering and controlled stored retrieval. Standalone queue processing is recorded in the separate continuation below. Two-clinic HTTP enforcement under the deployed non-owner role, a complete clinic day, 25-tenant load, provider delivery, production sizing/SLOs and recovery remain separate gates.

## Standalone PostgreSQL worker continuation

Another controlled 28 October run separated durable enqueue from processing for
one synthetic invoice and one prescription. With the worker stopped, both async
staff requests returned **202**, leaving their `QueueJob` rows `WAITING` and
`PdfJob` rows `PENDING`. This established enqueue only.

The first real worker run failed both jobs after three attempts each: tenant
guards rejected domain reads without a clinic context. Both queue rows became
`DEAD_LETTERED`, both PDF records became `FAILED`, six execution records were
retained and neither file existed. The failure was application behavior, not a
missing test prerequisite. `BasePdfProcessor` now runs read/render/upload inside
a fresh `runWithTenant({ clinicId }, ...)` scope. It does not inherit a caller's
bypass; existing narrow PDF-status bypasses and retry behavior remain. Three
new focused cases failed before this repair; all **19 processor tests** passed
afterward, along with relevant lint, API/worker typechecks and the Prisma boundary
check.

In the rebuilt green run, both jobs completed on their first attempt. Queue and
PDF records reached `COMPLETED`, execution records identified attempt one, and
canonical stored keys and generated files agreed. Status polling returned **200**;
the local-storage URLs returned bytes equal to those files. Separate document
capability requests returned **200** with private, no-store headers and equal
bytes; PDF parsing passed. The local URL is not an expiring signed URL, and the
HMAC document capability has no expiry. This does not verify R2 signing or hosted
object access. Use the [split-worker setup](../product/ONBOARDING.md#5-practice-a-separate-postgresql-worker)
for the common working-directory/storage requirement.

The API and worker used owner/RLS-disabled development access. The fix restores
application tenant context; it does not add SQL `SET LOCAL`, a database RLS
transaction or a least-privilege enforcement result. PDF consumer registration
still requires worker schedulers enabled, coupling it to the full worker graph
of cron modules and startup hooks. One cron heartbeat was observed in the red
run; this was not a PDF-only process. Scoped outbound-record counts did not
increase during green, which is not provider-delivery evidence.

Both phases' API and worker processes exited zero after SIGTERM; the worker had
no HTTP listener. Fixture controls in both owned clones were restored, PostgreSQL
was stopped and experiment ports were closed. Failed and passing evidence remains
retained. These two jobs establish bounded local asynchronous generation and
retrieval, not load, crash/replay recovery, production worker readiness, resource
sizing or a change to stopped production machines and offline schedules.

## Collect the missing full application evidence

1. Use [the local runner](../../loadtest/README.md) and its dry-run to review the plan. Prepare 25 real local staff credentials and representative synthetic history, then verify authorized reads and cross-tenant denials.
2. Run ordinary, busy and artificial headroom phases separately, with explicit warm/cold state. Capture offered/started/completed rates, route/tenant coverage, errors, throttles, timeouts, client lag and unfinished work. Keep per-route percentile methods and sample counts.
3. Observe actual CPU quota/throttling, RSS/heap, event-loop delay, DB pool waits, locks/I/O, query plans, used relation bytes and job completion/backlog. Declared VM values in the artifact are not observations.
4. Exercise write contention, duplicate payment outcomes, PDFs and provider-effects recovery separately. The four GET read paths do not exercise those operations.
5. Repeat compatible runs and reconcile correctness before accepting a capacity statement. Native developer-machine or stub results are not a 512 MiB Fly shared-CPU result.

The published CRUD budgets remain P95 <= 200 ms / P99 <= 500 ms targets. `check:api-latency-budget --require-baseline` still fails when the real staging-soak baseline is absent. Neither the SQL fixture nor the local runner's stub tests replace that artifact. The existing bounded-rate soak and this open-arrival local experiment measure different boundaries.

## Review and publish

No production deployment is part of this change. Keep secrets and raw private data outside tracked artifacts. Preserve the repository's maximum two open feature PRs; do not merge or close unrelated work merely to publish this change. Before committing, run relevant lint/typechecks/tests, standards and contract gates and retain actual failures. Cloudflare build verification applies to the changed internal frontend before a production release.

Earlier 28 October implementation record: relevant lint, API/internal typechecks, 74 focused SQL/schema/service/UI/runner tests and the internal Cloudflare build passed locally. Those 74 are a retained prior record, not the current focused rerun count. The full standards chain then stopped at the existing workflow-staleness check: Daily Worker Queue Drain was disabled and its last run was nine days old at inspection. All 69 later standards commands were also run separately and returned zero; the optional API latency gate explicitly skipped its absent baseline. Required-baseline mode remained blocked. No disabled hosted schedule was re-enabled or hosted machine started. The later bounded local results above do not replace that full release gate or establish production capacity.

The final source pass reconciles that deliberately stopped worker with the existing guard contract: [RB-16](RUNBOOKS.md#rb-16-daily-worker-intentionally-held-during-maintenance) records the operator's maintenance intent, and the named exemption applies only while GitHub reports `disabled_manually`. Six offline guard tests cover the hold, re-enabled stale/recent states, inactivity disable, unrelated stale schedules and a removed documented file. This source correction does not enable a workflow, dispatch a drain or certify runtime readiness. Retain the final standard-chain result separately from the earlier failed attempt.
