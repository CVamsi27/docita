# Worker Scheduler Configuration Repair Plan

**Goal:** Allow the worker to initialize with scheduled jobs disabled while
preserving its required scheduler registry.

**Evidence:** The compiled worker, run with its Docker `NODE_PATH` layout and a
fresh synthetic database, fails dependency initialization with
`SchedulerOrchestrator -> SchedulerRegistry` when `ENABLE_SCHEDULERS=false`.
The worker conditionally removes `ScheduleModule.forRoot`, while imported modules
still depend on scheduler infrastructure. This is independent of provider delivery.

**Architecture:** Always register the schedule foundation and control job
activation through its documented `cronJobs`, `intervals` and `timeouts` options.
Read the flag through the existing canonical `isCronDisabledInThisProcess` helper.
No dependency, database or deployment changes.

## Tasks

- [x] Add `apps/worker/src/worker-scheduler.spec.ts`. Consume the actual worker's
  schedule-module metadata in a minimal Nest context with a named cron probe.
  Verify registry initialization and zero jobs when disabled / one when enabled.
- [x] Reuse API test crypto/UUID adapters in `apps/worker/jest.config.cjs` so the
  worker's module graph can be imported under Jest. These adapters affect tests
  only; no auth or crypto runtime behavior changes.
- [x] Observe the disabled case reject with missing `SchedulerRegistry`, while
  the enabled case succeeds.
- [x] Replace the conditional module removal in `apps/api/src/worker.module.ts`:

```ts
ScheduleModule.forRoot({
  cronJobs: ENABLE_SCHEDULERS,
  intervals: ENABLE_SCHEDULERS,
  timeouts: ENABLE_SCHEDULERS,
});
```

- [x] Run the complete worker suite and relevant API suites, both backend
  typechecks, full lint, standards, Knip and both backend builds.
- [x] Repeat compiled-worker startup and graceful shutdown against the owned
  synthetic worker database, with RLS enabled and schedulers/providers disabled.
- [x] Record results in the backend QA note and remove owned runtime artifacts.

Rollback is the focused code/config revert. Scheduled production jobs keep their
existing activation; disabling jobs retains only their supporting registry.
