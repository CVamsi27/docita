# apps/worker

Background worker app for queue and scheduled processing. Entry point: `apps/worker/src/main.ts`. It boots a NestJS `ApplicationContext` (no HTTP server) via `WorkerModule` defined in `apps/api/src/worker.module.ts`.

## BullMQ / queue layout

The queue backend is selected at runtime via `AppConfigService.getQueueBackend()`:

- `"postgres"` — `PostgresQueueService` (production default)
- `"in-memory"` — `InMemoryQueueService` (test/dev)

The `IQueueProvider` interface (`apps/api/src/shared/modules/queue/queue.interface.ts`) is the contract all backends implement.

## Domain-scoped worker modules

| Module                            | Domain                                     |
| --------------------------------- | ------------------------------------------ |
| `DocumentsWorkerModule`           | Document PDF generation and storage        |
| `BillingWorkerModule`             | Invoice PDF generation, payment-retry cron |
| `PrescriptionsWorkerModule`       | Prescription PDF generation                |
| `SubscriptionsWorkerModule`       | Subscription lifecycle events              |
| `EnterpriseContractsWorkerModule` | Enterprise contract processing             |
| `DoctorsVerificationWorkerModule` | Doctor verification workflow               |
| `WhatsAppWorkerModule`            | WhatsApp message delivery                  |

Scheduled modules (crons): `ClinicalSchedulerModule`, `RemindersSchedulerModule`, `ComplianceSchedulerModule`, `MonitoringSchedulerModule`, `AdminAlertsSchedulerModule`, `EphemeralStoreSchedulerModule`. Schedulers are conditionally loaded when `ENABLE_SCHEDULERS !== "false"`.

## Retry policy defaults

Job options are passed via `QueueJobOptions` (see `queue.interface.ts`):

```ts
interface QueueJobOptions {
  attempts?: number; // number of attempts before DLQ
  backoff?: { type: "fixed" | "exponential"; delay: number };
  delay?: number; // ms before first attempt
  priority?: number;
  timeout?: number;
  removeOnComplete?: boolean;
  idempotencyKey?: string; // same name+key within 24 h → no-op
}
```

Processors must check `job.attemptsMade + 1 >= job.maxAttempts` to detect the final attempt and trigger DLQ/alert behavior. Idempotency keys should be synthesised from domain ID + action (e.g. `"invoice-pdf:${invoiceId}"`).

Manual DLQ replay resets `attemptsMade` for the new execution window while
durably incrementing `QueueJob.replayCount` and recording `lastReplayedAt`.
Automatic replay stays disabled until each queue has an explicit bounded policy.

## Boundaries

- Worker code must not import API HTTP controllers.
- Processors must declare retry/backoff, lock duration, idempotency, and failure/DLQ behavior.
- Logs must be structured and PHI-safe.
- Shared helpers must be worker-safe and must not rely on Next.js or request-only API state.

`scripts/checks/check-job-idempotency.mjs` enforces idempotency key declarations on processors.

## Knip coverage

`apps/worker` is listed under `knip.json#ignoreWorkspaces` because the
worker shares its codebase with `apps/api` via the `@/*` path mapping
(`apps/worker/src/main.ts` imports `@/worker.module` which lives in
`apps/api/src/`). Knip cannot follow cross-workspace path aliases, so
enabling it on the worker reports every dependency as unused. Worker
dead-code is therefore captured indirectly by Knip running on
`apps/api`. See `SYSTEM_DESIGN_AND_PATTERNS.md` §56 item 49.
