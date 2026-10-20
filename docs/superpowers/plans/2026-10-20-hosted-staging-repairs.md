# Hosted staging repairs implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Execute inline in the existing isolated checkout; current instructions prohibit unsolicited delegation.

**Goal:** Remove the reproduced audit pool deadlock and make latency captures honor their declared pacing and observation window.

**Architecture:** Awaited audit work uses the active tenant transaction; genuine background boundaries detach explicitly. The existing capture producer owns both deterministic planning and serialized dispatch admission, and records actual elapsed time for completeness checks and conversion.

**Tech Stack:** NestJS, Prisma/pg, AsyncLocalStorage, Jest with local PostgreSQL; Node test runner and controlled clocks for the capture tool; React/Vitest for the reported widget lifecycle issue.

## Global constraints

- Implement the [approved design](../specs/2026-10-20-hosted-staging-repair-design.md) on `fix/staging-runtime-hold-evidence`, in PR #328. No new branch or deployment.
- Keep Free staging, production stop, disabled backups and alert holds. Do not read offline private identity, send live messages, replay financial events, change pool size, weaken RLS/audits or relax SLO budgets.
- Use Node 22.22.0 and pnpm 10.30.3. Test against a new owned loopback-only PostgreSQL database; never use staging/prod for destructive test setup.
- Preserve old failed captures; create no release baseline from local fixtures or incomplete evidence.

## Task 1: Audit transaction lifetime

Files: `apps/api/src/shared/modules/audit/audit/audit.service.ts`, `apps/api/src/shared/common/interceptors/patient-audit.interceptor.ts`, `apps/api/src/shared/modules/rls/active-tx.storage.ts`; tests in `apps/api/test/e2e/audit/audit-transaction.e2e-spec.ts` and the existing interceptor spec.

- [x] Audit all `AuditService` call sites, identifying genuine work that outlives the handler.
- [x] Add a real PostgreSQL regression using `rlsRoutingExtension`, a bounded pg pool and request ALS. Start two transactions behind a barrier that fills the pool; both call `await audit.logAction(data)`. Assert both complete and persist two audit rows. Run and observe acquisition failure before editing source.
- [x] Add rollback coverage: `await audit.logAction(data); throw new Error('rollback')` leaves neither the transaction's clinical write nor its audit row. Add restricted-role RLS rejection and detached post-request persistence coverage.
- [x] Remove unconditional `runOutsideActiveTx` from `AuditService.createAuditLog`, preserving `runUnrestricted`, validation, persistence and failure propagation. Explicitly wrap the sensitive-write interceptor's background task in `runOutsideActiveTx(async () => { ... })`; leave the already detached event listener intact.
- [x] Verify real regressions and existing audit/ALS/routing/tenant tests. Run API E2E, typecheck and lint before publication.

## Task 2: Capture scheduling and evidence

Files: `scripts/perf/capture-api-latency-soak.mjs`, its `.test.mjs`, `scripts/checks/check-api-latency-budget.mjs` and its tests; `docs/operations/SLOS.md`.

- [x] Add failing tests for the default plan: 300 requests over 600 seconds, at least 2,000 ms between global starts, each route's minimum interval and balanced counts. Include a slow route and a short window that cannot fit all routes without violating the cap.
- [x] Replace budget clipping with globally spaced fair scheduling: each candidate dispatch is `max(globalNextAt, routeNextAt)`; select the earliest eligible route with stable round-robin tie breaking. Stop before `durationMs`.
- [x] Add controlled-clock runner tests for concurrent workers, a delayed wakeup, 429 retry admission, request timeout, exhausted window and actual elapsed reporting. Use the real runner with injected clock/sleep/request seams; no network credentials.
- [x] Serialize dispatch admission, recheck the clock after every sleep, pace retries and route starts, and stop dispatch at the requested window. Wait through the full observation window, then record monotonic elapsed time plus UTC start/end. Never dispatch catch-up bursts.
- [x] Build artifacts from runner timing and completed/planned counts. Reject missing/shortened timing, skipped plan steps, errors, unexpected statuses and throttles. Compute achieved rate with actual elapsed time. Preserve sample minimums and no-body/header privacy.
- [x] Add converter rejection tests for old or shortened capture evidence; validate timing before conversion. Preserve budget/minimum thresholds. Run producer/converter suites and real loopback CLI smoke. Wire these regressions into the standard gate and pre-push suite; document the roughly 10-second window cost.

## Task 3: Reported Turnstile loop

Files if reproduced: `packages/ui/src/components/form/turnstile-widget.tsx` and a colocated `.test.tsx`.

- [x] Reproduce a real React parent rerender after the provider token callback and verify that changing callback identity currently removes/re-renders the widget.
- [x] If reproduced, keep callback delivery current without remounting the provider widget on parent rerenders; recreate only for site-key/lifecycle changes. Verify token, expiry, load and cleanup behavior. Do not solve another hosted challenge or weaken Turnstile.
- [x] Run UI tests/typecheck/lint and affected frontend builds. Record that local lifecycle proof does not establish provider-side hosted resolution.

## Task 4: Publication and retained gates

- [x] Run repository lint, standard verification, hygiene, Knip, relevant types/tests/builds and Prisma boundaries. Fix regressions before push; record exact blocked gates separately.
- [x] Update companion staging/stability/audit docs with implementation and validation, leaving hosted capacity, offline recovery and production release gates open.
- [x] Self-review the diff, commit focused changes with normal hooks, push the existing branch, rewrite PR #328 around final behavior and verify scoped CI results. Keep it draft and undeployed pending review and staging alignment.

## Completion evidence

The [continuation audit](../../audits/2026-10-20-hosted-staging-continuation.md#local-source-validation) records the reproducing failures and final local checks. Publication readback and the exact hosted CI state are retained with the operator evidence. Source review, PR-only staging alignment and a new hosted capture remain release gates; this plan does not authorize production recovery.
