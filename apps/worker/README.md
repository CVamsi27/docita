# apps/worker

The worker consumes durable jobs and runs scheduled background work without
opening an HTTP server. [Its entrypoint](src/main.ts) creates a NestJS
`ApplicationContext` from the API's [WorkerModule](../api/src/worker.module.ts).
The `@/*` alias resolves to `apps/api/src/*`, so the worker build includes the
API modules it imports.

## Choose a queue shared by both processes

`QUEUE_BACKEND` accepts `memory` or `postgres`; the configuration schema defaults
to `memory`. [QueueWorkerModule](../api/src/shared/modules/queue/queue.worker.module.ts)
selects `PostgresQueueService` when the environment value is `postgres`, otherwise
`InMemoryQueueService`. The API's queue module reads the same setting through
`AppConfigService`. The contract is
[IQueueProvider](../api/src/shared/modules/queue/queue.interface.ts); this worker
does not use BullMQ.

Memory queues belong to one process. A separate API and worker must both select
`postgres` and use the same database. Staging/production worker validation
requires PostgreSQL; the [Fly configuration](fly.toml) explicitly selects it.

## Give each process explicit ownership

Set these values before starting either process, rather than relying on defaults:

| Process | `WORKER_ENTRYPOINT` | `QUEUE_BACKEND` | `ENABLE_SCHEDULERS` |
| --- | --- | --- | --- |
| API producing durable jobs | `main` | `postgres` | `false` |
| Worker consuming PDF jobs and running schedules | `worker` | `postgres` | `true` |

[PDF handler registration](../api/src/shared/modules/queue/pdf-processor-registration.ts)
requires schedulers to be enabled and, with PostgreSQL, the worker identity.
`WorkerModule` imports its modules regardless of this flag; the flag controls
Nest's cron/interval/timeout registration and PDF consumer registration.
Disabling schedules does not remove every provider or event handler.

| Worker module | Responsibility |
| --- | --- |
| `DocumentsWorkerModule` | Shared document providers and storage |
| `BillingWorkerModule` | Invoice PDF processor and billing background work |
| `PrescriptionsWorkerModule` | Prescription PDF processor |
| `SubscriptionsWorkerModule` | Subscription lifecycle events |
| `EnterpriseContractsWorkerModule` | Enterprise contract processing |
| `DoctorsVerificationWorkerModule` | Doctor verification workflow |
| `WhatsappReconciliationWorkerModule` | WhatsApp reconciliation |
| `WhatsappCampaignWorkerModule` | WhatsApp campaign work |

The graph also includes clinical, insurance-claims, reminders, compliance,
monitoring, admin-alert and ephemeral-store scheduler modules, plus the outbox
and cron heartbeat modules. Enabling schedulers is therefore broader than
enabling PDF processing. Review
[worker event ownership](../../docs/operations/WORKER_EVENT_OWNERSHIP.md) and
use synthetic records with reviewed mocks/sandboxes for local exercises.

## PostgreSQL retries and duplicate effects

[PostgresQueueService](../api/src/shared/modules/queue/postgres-queue.service.ts)
polls every two seconds, with no overlapping polls for a job name in that service
instance. The repository atomically claims a due `WAITING`/`DELAYED` row using
`FOR UPDATE SKIP LOCKED`, ordered by descending priority then creation time.
The row lock protects the claim transaction; it is not held throughout the handler.

- `attempts` defaults to five total handler attempts; PDF jobs request three.
  Ordinary handler failures become `DELAYED` while attempts remain, then
  `DEAD_LETTERED` when exhausted.
- The PostgreSQL implementation computes its own exponential retry delay:
  1, 2, 4, … seconds, capped at 60 seconds, plus polling delay. It does not apply
  the caller's `backoff` option, including the PDF enqueue request's 2-second
  base. The shared interface's `timeout` and `removeOnComplete` options also
  have no enforcement in this implementation.
- A matching job name and idempotency key skips work only when a matching
  **completed** job exists from the preceding 24 hours. This check runs at enqueue
  and again after claim. It is not a unique constraint: concurrent first jobs,
  an unfinished job or a crash before completion can repeat the business effect.
  Design the effect itself to tolerate repetition.
- [Stale-claim recovery](../api/src/shared/modules/queue/queue-job-lifecycle.ts)
  treats `ACTIVE` work older than ten minutes as stale. Below the attempt limit
  it increments the attempt count and delays the job for 30 seconds; an already
  exhausted stale job becomes `FAILED`. There is no renewable execution lease.
  Claim tokens fence later acknowledgments, but cannot cancel a slow handler's
  external action when another worker takes over.
- Manual dead-letter replay resets `attemptsMade`, increments `replayCount` and
  records `lastReplayedAt`. Automatic dead-letter replay is not wired into this
  worker; replay policy and the safety of repeated effects need separate review.

`PdfJob` is a separate domain record from `QueueJob`. Its unique
`(clinicId, documentId, documentType)` tuple returns an existing PDF job on a
duplicate request, even if that job failed; it does not automatically enqueue
another execution. Inspect both records when diagnosing a stuck PDF.

On shutdown the queue stops polling and awaits active polls. The entrypoint's
15-second shutdown timeout bounds the entire close sequence, including telemetry
flush; it can force exit before a long-running handler finishes. Recovery and
effect-level idempotency remain necessary.

## Share local files deliberately

Follow the canonical
[separate PostgreSQL worker setup](../../docs/product/ONBOARDING.md#5-practice-a-separate-postgresql-worker)
for environment, database and safety prerequisites. Filtered `dev` commands run
from different workspace directories. Both local providers default to
`process.cwd()/uploads`, and the development API serves its own directory;
selecting `STORAGE_PROVIDER=local` twice does not share files.

For a bounded same-machine exercise, build both apps first, then launch their
compiled entrypoints by absolute path from the **same owned, fresh working
directory**, with explicitly supplied development settings. Use the same
disposable database, encryption key and canonical API URL, set the ownership
flags above, select local storage and exclude hosted R2 credentials. Both
processes then resolve the same `uploads` root without a new configuration
setting. Review CWD-relative environment-file loading before launch, including
the `../../.env` fallback. Do not inherit unrelated credentials or target data.

Declare any synthetic input-file placement separately: the seed's output
directory does not automatically follow this working directory. Verify a newly
worker-written bare object key, its bytes and authorized API retrieval without
manually copying that output. A synchronous staff PDF download can regenerate
bytes and does not prove stored-artifact retrieval or worker completion.

Separate Fly machines do not share local disk. Production requires
`STORAGE_PROVIDER=r2` and complete R2 credentials; the worker fails startup
without them. Keep the local shared-directory exercise separate from that
production storage profile.

## Build, resolution and deployment

From the repository root:

```bash
pnpm --filter @docita/worker run build
pnpm --filter @docita/worker run check:runtime
```

The build runs the shared-package prerequisites. From the worker workspace,
`start:prod` runs `node dist/worker/src/main.js`. The
[container](Dockerfile) uses `/app` and maps `dist` to the compiled worker
output so the same relative entrypoint resolves there; runtime dependencies
must be present independently of TypeScript alias resolution.

[The runtime check](test/runtime-module-resolution.test.mjs) imports the compiled
`dist/api/src/worker.module.js` in a child Node process from a temporary directory,
without inherited secrets or `NODE_PATH`, and walks module metadata. It checks
ordinary Node dependency resolution. It does not create a Nest application
context, instantiate providers, query the database, consume a job or produce a
PDF. Record those integration results separately, including both job states,
stored bytes, authorized retrieval and shutdown.

[Knip](../../knip.json) explicitly configures the worker workspace and its API
path alias, with dependency exceptions for imported API modules. Static analysis
and the compiled graph check cover different boundaries; neither proves a
running worker's behavior.

Deploy through [Fly](fly.toml), following the
[deployment guide](../../docs/operations/DEPLOYMENT.md) and
[CI workflow](../../.github/workflows/deploy.yml). This app has no HTTP service
or Cloudflare/wrangler deployment path.

## Keep worker code independent of requests

- Do not import HTTP controllers or rely on Next.js/request-only state.
- Specify retry, duplicate-effect, stale-claim and failure behavior for each
  processor, then verify the selected backend actually enforces those choices.
- Keep logs structured and free of protected health information.
- The [idempotency check](../../scripts/checks/check-job-idempotency.mjs) checks
  declarations; it does not prove effect-level idempotency.
