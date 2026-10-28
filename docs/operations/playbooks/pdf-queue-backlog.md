# Playbook: PDF queue backlog

Source-checked 28 October 2026 against Docita base `f3fddffc0`. This playbook
provides investigation and decision steps; no production query, restart, replay,
scale operation or alert delivery was performed by the documentation review.
The dated maintenance controls in [ZERO_HOSTING_SPEND.md](../ZERO_HOSTING_SPEND.md)
and [STABILITY_RUNBOOK.md](../STABILITY_RUNBOOK.md) take precedence over a generic
recovery action. A stopped worker is not a reason to start paid capacity during
an audit.

## Know which record represents the missing work

The PostgreSQL queue table is **`QueueJob`**, with `name` values
`generate-invoice-pdf` and `generate-prescription-pdf`. Its status enum is
`WAITING`, `ACTIVE`, `COMPLETED`, `FAILED`, `DELAYED` or `DEAD_LETTERED`.
There is no generic `Job.kind='pdf'` query in this schema.

`PdfJob` is a separate clinic/document status record: `PENDING`, `PROCESSING`,
`COMPLETED` or `FAILED`, with `pdfUrl`, `failedReason`, `createdAt`, `updatedAt`
and `completedAt`. A queue job is dispatch/execution state; a completed PDF
status is application metadata, and authorized artifact retrieval is a further
check. Do not assume the two records always transition atomically.

```text
PdfJob PENDING -> QueueJob for one of the two registered names
                         |
                    claim ACTIVE
                         |
               PdfJob PROCESSING -> render -> upload/persist object
                         |                         |
                         +------ failure           +-> PdfJob COMPLETED
                         |                              |
                  retry or DEAD_LETTERED             queue acknowledgment
                         |
             reconcile queue, document record and stored artifact
```

The PDF enqueue path requests three attempts; generic queue jobs default to
five. Inspect the selected job's actual attempt budget and current queue
implementation before assuming a retry schedule. The two PDF names are separate
lanes; capacity and errors can differ between them.

## Detect impact before choosing a threshold

Useful signals are unresolved user-visible document requests, oldest eligible
waiting/delayed work, active claims without progress, retries/dead letters,
worker heartbeat/process state and actual artifact completion. Track the two
PDF lanes separately. The historical thresholds of 200/500 queued jobs or five
minutes of lag are **proposed investigation thresholds**, not verified active
alerts or universally correct page criteria.

Queue depth alone omits processing duration and failures. A current-row wait
estimate is not the P95 of every document's enqueue-to-available delay: completed
or cleaned-up jobs leave that population. Define and retain complete pipeline
timestamps, terminal outcomes, sample counts and capture coverage before using
a percentile as an SLO result.

## First five minutes: collect protected, bounded evidence

1. Record the affected workflow, start time, environment, release revision,
   promised service hours and incident owner. Keep patient details out of the
   general incident channel.
2. Use an authorized operational database role and approved scope. The following
   example is read-only and returns aggregate counts, not payloads, document
   identifiers, object keys or error text. Its seven-day cohort is explicit; a
   zero count says nothing about older jobs. The second query checks oldest
   unresolved work across the retained queue. Statement timeouts can make a
   result unavailable; do not reinterpret that as zero backlog.

   ```sql
   BEGIN READ ONLY;
   SET LOCAL statement_timeout = '3s';
   SET LOCAL lock_timeout = '1s';

   SELECT name, status, COUNT(*) AS jobs_in_seven_day_cohort,
          MIN("createdAt") AS earliest_created_at
   FROM "QueueJob"
   WHERE name IN ('generate-invoice-pdf', 'generate-prescription-pdf')
     AND "createdAt" >= now() - interval '7 days'
   GROUP BY name, status
   ORDER BY name, status;

   SELECT name, status, MIN("createdAt") AS oldest_unresolved_created_at,
          MIN("processedAt") AS earliest_retained_claim_at
   FROM "QueueJob"
   WHERE name IN ('generate-invoice-pdf', 'generate-prescription-pdf')
     AND status IN ('WAITING', 'DELAYED', 'ACTIVE')
   GROUP BY name, status
   ORDER BY name, status;

   SELECT name, status, COUNT(*) AS recently_updated_rows,
          COUNT(*) FILTER (WHERE "failedReason" IS NOT NULL) AS rows_with_reason
   FROM "QueueJob"
   WHERE name IN ('generate-invoice-pdf', 'generate-prescription-pdf')
     AND status IN ('FAILED', 'DELAYED', 'DEAD_LETTERED')
     AND "updatedAt" >= now() - interval '15 minutes'
   GROUP BY name, status
   ORDER BY name, status;

   SELECT "documentType", status, COUNT(*) AS pdf_records_in_seven_day_cohort,
          COUNT(*) FILTER (
            WHERE status = 'COMPLETED' AND "pdfUrl" IS NULL
          ) AS completed_without_stored_reference
   FROM "PdfJob"
   WHERE "createdAt" >= now() - interval '7 days'
   GROUP BY "documentType", status
   ORDER BY "documentType", status;

   ROLLBACK;
   ```

3. `processedAt` is the retained claim/start timestamp; `updatedAt` is the last
   row update, not a dedicated last-failure timestamp. There is no `lastErrorAt`
   field. Historical execution outcomes and current state answer different
   questions. Correlate the selected incident with authorized queue execution
   history and scrubbed logs rather than assigning failure time from a field
   that does not represent it.
4. Check process state through the approved inventory, for example
   `fly machines list --app <worker-app>` after selecting the correct app.
   This is an inspection command, not a start/restart instruction. Check
   scheduler/handler registration and actual heartbeat separately.
5. Investigate one representative protected record through an authorized
   operational interface. `data`, `failedReason`, document identifiers and logs
   may contain clinical or secret material; do not group/publish raw error
   strings or payloads in general reports. Record only a reviewed category and
   sanitized correlation alias outside protected custody.

## Choose a correction from the observed boundary

| Observation | Next investigation | Controlled correction and completion evidence |
| --- | --- | --- |
| Worker stopped or no heartbeat | Verify maintenance intent, approved service hours, process configuration and scheduler/handler registration | Obtain the operating decision before starting anything; verify heartbeat and a synthetic job under the approved cost boundary |
| Waiting work grows while process is healthy | Compare arrival and completion rates per job name, handler time, database pool/lock wait, CPU quota, RSS/heap and object-store latency | Fix the measured constraint; a scale proposal needs connection/memory/cost budgets, shared-state checks and rollback criteria |
| Rendering fails | Inspect the permitted document/template inputs, fonts/images, required source records and renderer failure with protected diagnostics | Reproduce on synthetic content, repair one cause, then verify a readable artifact and authorized retrieval |
| Upload/persistence fails | Check configured storage provider, credentials/access, object availability and metadata finalization independently | Reconcile missing/orphaned artifacts and metadata before replay; no source review establishes R2 as the most common failure |
| Active work appears stale after replacement | Inspect claim age/token ownership, stale-recovery policy and whether the external effect already occurred | Follow the canonical recovery mechanism; do not update status or replay blindly while another claim may own the work |
| PdfJob and QueueJob disagree | Inspect the enqueue/claim/render/upload/acknowledgment boundary for the same protected logical document | Reconcile the intended artifact and record state; a second HTTP request need not enqueue another job for an existing PdfJob |
| Retries exhausted | Inspect `DEAD_LETTERED`, recorded attempt/replay history, cause and any existing completed artifact | Use the authorized manual DLQ workflow only after cause repair and repeat-effect review; retain a bounded replay decision and outcome |

The source has manual DLQ replay and durable replay counters. The inspected
`DlqReplayScheduler.tick()` explicitly states that auto-replay wiring is pending;
its helper classifier is not an enabled automatic recovery loop. Do not promise
that dead letters will recover without an operator. Manual replay resets queue
attempt state; it does not prove that earlier external effects were absent.

A feature-disable action must reference a real enforced flag and its propagation
boundary. This playbook does not establish a universal Templates → Disable UI or
an immediate global stop. Escalate when the safe containment path is unknown.

## Validate recovery against the original incident

Record the before/after cohort, oldest unresolved work, actual document outcomes,
failed/dead-lettered work, measured completion delay, provider/storage condition
and remaining exceptions. Verify a readable synthetic document and authorized
retrieval through the application; a row labelled COMPLETED is insufficient.

Choose explicit acceptance thresholds from the clinic's promised hours and
workload before the intervention. Historical suggestions such as depth below 50
within ten minutes or generation within 60 seconds are not observed guarantees.
Report missing samples and unfinished work alongside successful timings. Keep
new arrivals separate when deciding whether the original backlog drained.

If a correction worsens database access, memory, delivery correctness or cost,
stop widening it and use the reviewed compatibility/rollback plan. A code or
process rollback does not remove uploaded objects or reverse completed effects.

## Retain a small incident record

Store timestamps, sanitized scope, source/deployment, queue/claim boundary,
observed cause, action/owner, result, remaining risk and one preventive follow-up.
Candidate alerts need a population/window, threshold, minimum usable data,
severity, delivered notification evidence and a named runbook owner before being
called active coverage. Keep the detailed implementation in the source rather
than adding an undocumented replay command here.

## Source references

- `packages/db/prisma/schema.prisma` — QueueJob/PdfJob fields and status enums.
- `apps/api/src/shared/modules/queue/queue.interface.ts` — registered PDF job names.
- `apps/api/src/shared/modules/queue/pdf-job.service.ts` and
  `base-pdf.processor.ts` — enqueue, attempt request, document status and artifact boundaries.
- `apps/api/src/shared/modules/queue/postgres-queue.service.ts` and
  `queue-job-lifecycle.ts` — claim acknowledgment, retries, dead letters and replay.
- `apps/api/src/shared/modules/queue/dlq-replay.scheduler.ts` — classifier versus pending auto-replay wiring.
- [Capacity evidence](../CAPACITY_EVIDENCE.md), [release evidence](../RELEASE_EVIDENCE_CHECKLIST.md)
  and [incident response](../RUNBOOKS.md) — operating scope and recovery ownership.
