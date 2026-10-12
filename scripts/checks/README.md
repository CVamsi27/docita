# Repository invariant checks

This directory holds repo-wide guardrail scripts. Each script enforces a
single boundary or invariant: a layering rule, a security posture, a
performance budget, a hygiene constraint. They are wired into
`pnpm verify:standard` and CI via [`scripts/workflow/detect-workflow-scope.mjs`](../workflow/detect-workflow-scope.mjs).

## How to find the right check to extend

Map your concern to a script, then `Read` it to see the pattern:

| Concern                                                             | Script                                                                                           |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **Layering / DDD**                                                  |                                                                                                  |
| Prisma client leaks outside `packages/db`/api repos                 | [`check-prisma-boundary.js`](check-prisma-boundary.js)                                           |
| API folder layout (`core/application/infrastructure/presentation`)  | [`check-api-domain-layout.mjs`](check-api-domain-layout.mjs)                                     |
| Cross-domain application imports                                    | [`check-cross-domain-application-imports.mjs`](check-cross-domain-application-imports.mjs)       |
| Cross-domain infrastructure imports                                 | [`check-cross-domain-infrastructure-imports.mjs`](check-cross-domain-infrastructure-imports.mjs) |
| API folder structure                                                | [`check-backend-structure.mjs`](check-backend-structure.mjs)                                     |
| Frontend feature/shared structure                                   | [`check-frontend-structure.mjs`](check-frontend-structure.mjs)                                   |
| Feature boundary imports                                            | [`check-feature-boundaries.mjs`](check-feature-boundaries.mjs)                                   |
| Workspace package boundary imports                                  | [`check-package-boundaries.mjs`](check-package-boundaries.mjs)                                   |
| `@workspace/*` imports resolve to src or a CI-built dist             | [`check-workspace-resolution.mjs`](check-workspace-resolution.mjs)                               |
| Module-level config initialization                                  | [`check-module-scope-config.mjs`](check-module-scope-config.mjs)                                 |
| External SDK use in application layer                               | [`check-external-sdk-in-application.mjs`](check-external-sdk-in-application.mjs)                 |
| **Repository / CQS / facade**                                       |                                                                                                  |
| Controllers respect CQS                                             | [`check-controller-cqs.mjs`](check-controller-cqs.mjs)                                           |
| Routes stay thin                                                    | [`check-route-thinness.mjs`](check-route-thinness.mjs)                                           |
| Application services delegate (no thick facades)                    | [`check-facade-delegation.mjs`](check-facade-delegation.mjs)                                     |
| Module init does not cache forever                                  | [`check-repo-on-module-init-cache.mjs`](check-repo-on-module-init-cache.mjs)                     |
| **Auth / tenant / RBAC / RLS**                                      |                                                                                                  |
| Controllers declare auth posture                                    | [`check-controller-rbac.mjs`](check-controller-rbac.mjs)                                         |
| Tenant-safe auth wiring                                             | [`check-auth-tenant-safety.mjs`](check-auth-tenant-safety.mjs)                                   |
| RLS rollout completeness                                            | [`check-rls-rollout-readiness.mjs`](check-rls-rollout-readiness.mjs)                             |
| `@RlsBypass` annotation present where extension is bypassed         | [`check-rls-bypass-annotation.mjs`](check-rls-bypass-annotation.mjs)                             |
| Workspace-profile gating banned                                     | [`check-workspace-profile-gating.mjs`](check-workspace-profile-gating.mjs)                       |
| Tier comparisons banned                                             | [`check-tier-comparisons.mjs`](check-tier-comparisons.mjs)                                       |
| Tier ladder drift                                                   | [`check-tier-ladder-drift.mjs`](check-tier-ladder-drift.mjs)                                     |
| **Contracts / Zod-first / types**                                   |                                                                                                  |
| Contract strictness                                                 | [`check-contract-strictness.mjs`](check-contract-strictness.mjs)                                 |
| No duplicate type definitions                                       | [`check-type-duplicates.mjs`](check-type-duplicates.mjs)                                         |
| JSON columns validated by Zod                                       | [`check-json-column-zod.mjs`](check-json-column-zod.mjs)                                         |
| `JSON.parse` is guarded with Zod                                    | [`check-json-parse-guarded.mjs`](check-json-parse-guarded.mjs)                                   |
| **PHI / audit / compliance**                                        |                                                                                                  |
| PHI encryption coverage on patient fields                           | [`check-phi-encryption-coverage.mjs`](check-phi-encryption-coverage.mjs)                         |
| Encrypted patient fields stay in observability scrubbers            | [`check-phi-boundary-parity.mjs`](check-phi-boundary-parity.mjs)                                 |
| PHI reads are audited                                               | [`check-phi-read-audit.mjs`](check-phi-read-audit.mjs)                                           |
| Audit logging coverage                                              | [`check-audit-logging.mjs`](check-audit-logging.mjs)                                             |
| Audit coverage on sensitive ops                                     | [`check-audit-coverage.mjs`](check-audit-coverage.mjs)                                           |
| User-facing error envelope contract                                 | [`check-user-facing-errors.mjs`](check-user-facing-errors.mjs)                                   |
| Sensitive data is not logged                                        | [`check-sensitive-logging.mjs`](check-sensitive-logging.mjs)                                     |
| Sentry scrubbing rules                                              | [`check-sentry-scrubbing.mjs`](check-sentry-scrubbing.mjs)                                       |
| **Frontend / UI / data-access**                                     |                                                                                                  |
| No inline `fetch` in client features                                | [`check-frontend-fetch.mjs`](check-frontend-fetch.mjs)                                           |
| Legacy app API hook directory stays gone                            | [`check-legacy-app-api-hooks.mjs`](check-legacy-app-api-hooks.mjs)                               |
| Patient display names route through canonical helper                | [`check-patient-name-ssot.mjs`](check-patient-name-ssot.mjs)                                     |
| Suspense + error boundary paired                                    | [`check-suspense-error-boundary-pair.mjs`](check-suspense-error-boundary-pair.mjs)               |
| No duplicate shared paths                                           | [`check-no-duplicate-shared-paths.mjs`](check-no-duplicate-shared-paths.mjs)                     |
| Native button types                                                 | [`check-native-button-types.mjs`](check-native-button-types.mjs)                                 |
| Naming ARIA lands on a role, not a bare container                  | [`check-aria-naming-target.mjs`](check-aria-naming-target.mjs)                                   |
| Untranslated JSX copy does not grow (ratchet)                      | [`check-jsx-literal-density.mjs`](check-jsx-literal-density.mjs)                                 |
| Untranslated copy in pure helpers does not grow (ratchet)          | [`check-user-facing-copy.mjs`](check-user-facing-copy.mjs)                                     |
| UPPER_SNAKE display map keys match a Prisma enum member    | [`check-enum-map-drift.mjs`](check-enum-map-drift.mjs)                                             |
| Client API paths are served by some controller            | [`check-unserved-endpoint.mjs`](check-unserved-endpoint.mjs)                                       |
| Response DTO schemas come from a shared contract       | [`check-inline-response-dto.mjs`](check-inline-response-dto.mjs)                                 |
| Clinician app never calls an INTERNAL-only endpoint    | [`check-internal-only-client-call.mjs`](check-internal-only-client-call.mjs)                     |
| Test helpers do not redeclare a shared wire contract | [`check-test-schema-duplication.mjs`](check-test-schema-duplication.mjs)                         |
| `<label>` does not override its own text with `aria-label` (2.5.3)  | [`check-aria-naming-target.mjs`](check-aria-naming-target.mjs)                                   |
| Accessible name contains the words shown on screen (2.5.3)         | [`check-aria-naming-target.mjs`](check-aria-naming-target.mjs)                                   |
| Native UI affordances use shared primitives                         | [`check-native-ui-affordances.mjs`](check-native-ui-affordances.mjs)                             |
| Responsive `DataTable` mobile renderers                             | [`check-responsive-data-tables.mjs`](check-responsive-data-tables.mjs)                           |
| Filename casing                                                     | [`check-filename-case.mjs`](check-filename-case.mjs)                                             |
| **Web / external IO**                                               |                                                                                                  |
| External HTTP requests have timeouts                                | [`check-external-http-timeouts.mjs`](check-external-http-timeouts.mjs)                           |
| Webhook signature verification                                      | [`check-webhook-signatures.mjs`](check-webhook-signatures.mjs)                                   |
| Webhook replay protection                                           | [`check-webhook-replay-protection.mjs`](check-webhook-replay-protection.mjs)                     |
| Upload size/MIME validation                                         | [`check-upload-validation.mjs`](check-upload-validation.mjs)                                     |
| Razorpay adapter discipline                                         | [`check-razorpay-adapters.mjs`](check-razorpay-adapters.mjs)                                     |
| **Cache / queue / jobs**                                            |                                                                                                  |
| No ad-hoc service caches                                            | [`check-ad-hoc-service-cache.mjs`](check-ad-hoc-service-cache.mjs)                               |
| Redis not required in dev                                           | [`check-cache-redis-required.mjs`](check-cache-redis-required.mjs)                               |
| Job idempotency                                                     | [`check-job-idempotency.mjs`](check-job-idempotency.mjs)                                         |
| Cron schedules sanity                                               | [`check-cron-schedules.mjs`](check-cron-schedules.mjs)                                           |
| `Promise.all` inside schedulers (fan-out hazard)                    | [`check-promise-all-in-schedulers.mjs`](check-promise-all-in-schedulers.mjs)                     |
| Detached promises (`setTimeout`, `.then(...)` fire-and-forget)      | [`check-detached-promises.mjs`](check-detached-promises.mjs)                                     |
| Multi-write transactions                                            | [`check-multi-write-transaction.mjs`](check-multi-write-transaction.mjs)                         |
| **Hygiene / typing / dead code**                                    |                                                                                                  |
| Empty `catch` blocks                                                | [`check-empty-catches.mjs`](check-empty-catches.mjs)                                             |
| `as` cast density                                                   | [`check-as-cast-density.mjs`](check-as-cast-density.mjs)                                         |
| Non-null assertion density                                          | [`check-non-null-assertion.mjs`](check-non-null-assertion.mjs)                                   |
| Deep optional chain density                                         | [`check-deep-optional-chain.mjs`](check-deep-optional-chain.mjs)                                 |
| `new Date()` in domain/infrastructure                               | [`check-new-date-in-domain-infrastructure.mjs`](check-new-date-in-domain-infrastructure.mjs)     |
| `console.*` at runtime                                              | [`check-no-console-runtime.mjs`](check-no-console-runtime.mjs)                                   |
| `process.env` direct reads                                          | [`check-process-env.mjs`](check-process-env.mjs)                                                 |
| Application event constants present                                 | [`check-application-event-constants.mjs`](check-application-event-constants.mjs)                 |
| Worker bundle size                                                  | [`check-worker-size.mjs`](check-worker-size.mjs)                                                 |
| File size budget (advisory)                                         | [`check-file-size-budget.mjs`](check-file-size-budget.mjs)                                       |
| Domain rules unit-tested                                            | [`check-domain-rules-tests.mjs`](check-domain-rules-tests.mjs)                                   |
| Feature test density                                                | [`check-feature-test-density.mjs`](check-feature-test-density.mjs)                               |
| **PDF / data pipeline**                                             |                                                                                                  |
| PDF pipeline shape                                                  | [`check-pdf-pipeline.mjs`](check-pdf-pipeline.mjs)                                               |
| **Datetime / storage correctness**                                  |                                                                                                  |
| `DateTime` columns are `timestamptz`, pools read in UTC            | [`check-utc-instant-storage.mjs`](check-utc-instant-storage.mjs)                                 |
| **Migrations**                                                      |                                                                                                  |
| Migration prefix collisions                                         | [`check-migration-prefix-collision.mjs`](check-migration-prefix-collision.mjs)                   |
| Migration reversibility                                             | [`check-migration-reversibility.mjs`](check-migration-reversibility.mjs)                         |
| **N+1 / query performance**                                         |                                                                                                  |
| N+1 query patterns                                                  | [`check-n-plus-1.mjs`](check-n-plus-1.mjs)                                                       |
| **Routing / nav / E2E**                                             |                                                                                                  |
| **Deploy contracts**                                                |                                                                                                  |
| Deployment contracts                                                | [`check-deployment-contracts.mjs`](check-deployment-contracts.mjs)                               |
| `turbo.json#globalEnv` vs `.env.example` drift                      | [`check-env-vs-globalenv.mjs`](check-env-vs-globalenv.mjs)                                       |
| Knip `globals.css @import` surrogate                                | [`check-globals-css-imports.mjs`](check-globals-css-imports.mjs)                                 |
| **Auth / crypto posture (2026-05 sweep)**                           |                                                                                                  |
| PDF signed URLs bound to requester                                  | [`check-pdf-bearer-cap.mjs`](check-pdf-bearer-cap.mjs)                                           |
| Client storage (`localStorage`/`sessionStorage`) allowlist          | [`check-client-storage-usage.mjs`](check-client-storage-usage.mjs)                               |
| Sentry PHI scrubber parity (`@workspace/utils` ↔ per-app)           | [`check-sentry-scrubber-parity.mjs`](check-sentry-scrubber-parity.mjs)                           |
| Browser telemetry stays same-origin                                 | [`check-browser-telemetry-same-origin.mjs`](check-browser-telemetry-same-origin.mjs)             |
| **Frontend data-access (2026-05 sweep)**                            |                                                                                                  |
| React Query keys go through `queryKeys` factory                     | [`check-query-key-factory.mjs`](check-query-key-factory.mjs)                                     |
| `*FormSchema` extends a base `*Schema`                              | [`check-form-schema-extends.mjs`](check-form-schema-extends.mjs)                                 |
| **Backend / events / queue (2026-05 sweep)**                        |                                                                                                  |
| Command paths emit via Outbox, not `EventEmitter`                   | [`check-event-emit-via-outbox.mjs`](check-event-emit-via-outbox.mjs)                             |
| Repositories bound to DI tokens                                     | [`check-repository-di-tokens.mjs`](check-repository-di-tokens.mjs)                               |
| `@Cron` jobs carry `@TrackHeartbeat` with a unique name (enforcing) | [`check-cron-heartbeat-coverage.mjs`](check-cron-heartbeat-coverage.mjs)                         |
| Use cases stay under LoC soft cap                                   | [`check-use-case-loc.mjs`](check-use-case-loc.mjs)                                               |

## Authoring a new check

1. Pick the closest existing script as a template. They share a small
   pattern: walk the file tree, parse with regex or `@typescript-eslint/parser`,
   emit `console.error` per violation, `process.exit(1)` if any.
2. Add the script to this README under the appropriate group.
3. Wire it into [`scripts/workflow/detect-workflow-scope.mjs`](../workflow/detect-workflow-scope.mjs)
   so CI runs it only when relevant paths change.
4. Register it in the corresponding `pnpm` script in the root
   `package.json` and (if part of the standard guardrail set) in
   `verify:standard`.
5. Add allowlist entries under [`allowlists/`](allowlists/) for justified
   exceptions, with a one-line comment per entry.

## Notes

- Scripts are intentionally simple and dependency-light. They run in
  Node without a TS build step; use `.mjs` for new ones unless you have
  a specific reason for `.js`.
- Tests for these scripts (where they exist) live alongside them with
  the `.spec.mjs` suffix.
- The full automation map (which principle each check enforces) lives
  in `AGENTS.md` §15.11.
