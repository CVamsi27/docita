# Backend reliability repair QA — 2026-10-12

Status: implementation and consolidated verification complete.

## Scope

The user approved the backend repair design and ordering: transaction isolation,
notification lookups/dates, diagnostic privacy, durable delivery and demonstrated
worker problems. Changes apply to the existing API/worker implementation on the
current feature branch; existing UI work remains preserved. No schema migration,
historical account reset, production data write or deployment is included.

## Repairs and reproduction evidence

| Concern | Before | After / regression evidence |
| --- | --- | --- |
| Concurrent RLS routing | An overlapping query returned the outer-client result while its sibling awaited a transaction delegate. | Child ALS scopes preserve the transaction for siblings and nested calls. Three new tests failed before the repair; focused transaction/interceptor/audit coverage passed. |
| Detached audit work | Detaching a pending side effect set the parent request's transaction to null. | Child scope detaches only that branch, including nested/rejected side effects. |
| Invoice/staff/patient notification lookups | Real synthetic invoice logs showed the tenant policy rejecting `findUnique` without `clinicId`; permissive persistence mocks concealed it. | Invoice, prescription and appointment reads include their supplied clinic ID. Test doubles apply the real tenant policy; absent and wrong-clinic records do not reach staff/payment boundaries. |
| Payment staff notification | An absent invoice produced a generic payment notification. | Missing invoices stop staff notification creation. Existing successful notifications and feature checks remain. |
| Clinic-local message dates | Six new date/DST cases used the default timezone instead of the clinic's date/time. | Shared formatters receive the selected clinic timezone; canonical fallback remains for older fixtures. |
| Diagnostic privacy | Patient event names/contact markers appeared in `emit`, `emitAsync` and development audit logs. | Payload logging is removed; event type/correlation context and persisted audit/event payloads remain. Three new privacy assertions passed after failing beforehand. |
| Outbox duplicate insertion | The second keyed append caught P2002, but subsequent SQL failed with Postgres `25P02` because the transaction was aborted. | Conflict-safe insertion keeps one event and allows subsequent transaction work. Unkeyed events remain distinct. |
| Missing subscribers | A real emitter with no subscribers acknowledged delivery. | The event remains unprocessed with bounded retry/DLQ evidence. |
| Relay tenant context | Concurrent rows inherited the caller tenant, and a conflicting payload clinic reached a subscriber. | Each row uses its persisted clinic scope; mismatches fail before dispatch. |
| Relay RLS connection | Restoring ALS alone left subscribers without a scoped database transaction. Production configuration enables RLS for API and worker. | Each clinic delivery opens a fresh transaction, applies parameterized GUCs and publishes it through the existing routing storage. Real Postgres tests inspect both clinic and RLS GUCs. |
| Relay pool capacity | A 20-row RLS batch claimed every row despite the development pool's five-connection limit. | Claims derive from canonical pool capacity minus two reserved connections; three deliver and 17 retain zero attempts in the regression. |
| Lead delivery acknowledgment | Actual Nest decorators with `async: true` acknowledged before the pending persistence write; failures resolved instead of rejecting. | Promisified subscribers propagate errors after retaining FAILED evidence. Existing unique `(leadId, kind)` upserts support retry and redelivery. |
| Advisory-lock lifetime | The helper ignored its requested timeout; real bounded work could commit after the transaction expired. | Explicit options preserve shared defaults and honor longer requests. The relay's lock lifetime exceeds its bounded dispatch window. |
| Disabled worker schedulers | Compiled worker startup failed to resolve `SchedulerRegistry` when job activation was disabled. | The scheduler module stays registered and job activation is controlled separately; enabled/disabled registry tests cover the module configuration. |
| Appointment query duplication | Timezone repair aligned two existing lookup shapes and triggered one clone group. | Both consumers use the existing notification-query helper module. |
| Docker package exports | Both real runtime packaging recipes copied `dist` contents into package roots but retained manifests pointing into a missing `dist` directory. Node export resolution failed for the fixture layout. | Root workspace entries link to canonical package directories, preserving manifests and their compiled paths. Two artifact-execution regressions are included in the standards suite. |

## Validation record

- Baseline: 515 API unit suites / 4,052 tests, two worker tests, both backend
  typechecks, lint and Prisma boundary passed.
- Repaired API unit suite: 521 suites / 4,078 tests passed. Later query-helper and
  pool-budget refinements receive focused reruns.
- Real Postgres outbox suite: eight tests passed, covering conflict-safe append,
  unkeyed events, orphan delivery, per-row scope, clinic mismatch, RLS GUCs,
  pool-budget claims and lock lifetime.
- The original unsharded API E2E run exhausted Node's heap after passing 37 suites.
  It is not counted as complete validation. The complete suite was rerun
  in three sequential isolated shards using the repository's existing command.
- Source analysis initially misclassified the excluded API test-helper directory.
  `.fallowrc.json` now excludes that test-only directory alongside its existing
  test/spec exclusions, matching the API production tsconfig. Alias imports remain
  canonical; helper correctness remains covered by tests and typechecks. No
  unresolved-import suppression or production-source exclusion was added.

Final results:

- All **60 API E2E suites** passed: 20 / 166 tests, 20 / 140 tests and 20 / 172
  tests in sequential shards. The final outbox pool-budget regression was added
  after its shard ran; its complete eight-test suite passed separately, giving
  **479 distinct E2E cases** across the final runs.
- **4,078 API unit tests** in 521 suites passed, plus final focused reruns after
  query consolidation and the pool-budget refinement (57 and 31 cases).
- **Four worker tests** passed, including enabled/disabled scheduler registration.
- **70 standards-check tests** passed, including both Docker package layouts.
- API and worker typechecks and builds, full lint, repository standards, Prisma
  boundary, UTC-storage checks, hygiene, Fallow and duplication passed. Knip's
  now-obsolete worker scheduler ignore was removed because the new worker test
  is a real consumer.
- The compiled worker reached its ready state with RLS enabled and scheduled
  jobs disabled, accepted SIGTERM, closed its database clients and exited zero.
- The full standards gate retains its existing informational skip for the
  missing staging API-latency artifact. The E2E reset-budget reported one timing
  warning during shared local CPU load; no test failed on it.
- The prior redirect-only upgrade i18n exception had not been recounted in
  `docs/analysis/SUPPRESSION_LEDGER.md`. Counts now match disk (24 entries), and
  the suppression-ledger gate passes. No new i18n exception was introduced here.

Final review before commit and push repeated the complete standards gate with
every new file staged, both backend typechecks, all 76 tests across the 12 touched
API regression suites and all four worker tests. All passed. The review required
no further implementation changes; the full unit, E2E and build evidence above
continues to apply.

## Compatibility, rollback and remaining boundary

No API wire contract, clinical write, billing total, tenant/auth policy or account
onboarding rule changes. The notification queries now satisfy existing guards;
they do not add access. Changes can be reverted by concern without a data rollback.

The worker still lacks the API's payment messaging subscriber. This pass preserves
such events as retry/DLQ intent rather than enabling external sends with unproven
duplicate handling. It does not replay historical events or assert complete
provider delivery. Lead delivery is the idempotent existing subscriber repaired
and exercised here.

Tests use owned disposable synthetic databases and provider mocks/disabled
destinations. The RLS regression proves actual connection scope; it is not a new
repository-wide certification of every database policy or tenant/role combination.
Worker startup smoke uses the Docker module-resolution layout with test settings,
RLS enabled and scheduled jobs disabled; production provider integration remains
outside this verification.

The Docker regression executes the actual non-destructive runtime packaging
commands on temporary fixtures and checks Node's export resolution. It does not
claim a complete Linux image build, native-library verification or deployment.
Disposable database and private runtime artifacts are removed after testing.
