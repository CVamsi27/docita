# Security and validation stabilization implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use the installed executing-plans skill to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Correct the reproduced security and validation defects before extending clinical workflows or UI scope.

**Architecture:** Preserve canonical configuration and existing app/client contracts. Fix each failure at its boundary: runtime validation, landing response headers, browser readiness, audit authentication and assertions, dependency resolution, and isolated E2E processes.

**Tech Stack:** NestJS/Jest, Astro/Vitest, React/Playwright/axe, PostgreSQL 16, pnpm/Turbo.

**Status (8 October):** local corrections verified and committed; release remains blocked. Residual dependency and production evidence blockers are retained in the [validation record](releases/2026-10-08-stabilization-validation.md).

## Global constraints

- Node.js `>=22.22.0`, `pnpm@10.30.3`, pnpm only; final E2E comparison uses CI's pinned Node `22.22.0`.
- Preserve tenant/RBAC, fail-closed production auth, PHI protections and existing-user onboarding semantics.
- Use shared schemas and canonical getters; no replacement stores or unrequested libraries.
- Preserve production HTTPS/CSP; development allowances apply only to the existing development environment.
- Do not push, enable deployment workflows, or mutate production databases. Commit verified local changes using normal hooks.
- Execute inline on the existing clean feature checkout; the approved roadmap explicitly preserves it. No additional remote branch is created.
- Roadmap approved by the user on 8 October 2026; Phase 0 preserved as `c0efa95f9`. Later domain/product work has separate file-level plans and acceptance gates.

## Task 1 — Restore fail-closed startup and canonical worker JWT configuration

**Files:** `apps/api/src/shared/modules/config/{app-config-validation.ts,app-config-validation.spec.ts,env-schema.ts}`, `apps/api/src/domains/subscriptions/subscriptions.worker.module.ts`, `fly.toml`, `apps/worker/fly.toml`.

**Interfaces:** consumes `assertRuntimeSecretRequirements(config)` and `AppConfigService.getJwtSecret(): string`; produces the same interfaces with no optional production Turnstile bypass.

- [x] Change the existing bypass test to expect failure when the obsolete switch is supplied:

```ts
expect(() =>
  assertRuntimeSecretRequirements(buildConfig({ TURNSTILE_OPTIONAL: true })),
).toThrow("process.exit called");
```

- [x] Run `pnpm --filter @docita/api test -- --runInBand app-config-validation.spec.ts` and observe that this case fails because startup currently accepts the bypass.
- [x] Remove the bypass from validation/schema/Fly configuration. Preserve the existing non-HTTP worker exemption. Keep the regression by passing the extra obsolete property structurally rather than adding it back to the canonical schema.
- [x] Replace the worker module's redundant literal fallback with `secret: configService.getJwtSecret()`.
- [x] Run configuration/getter/worker tests, API and worker typechecks/lint, and `pnpm check:circular:enforce`; commit the security correction separately.

## Task 2 — Fix landing HTTP development CSP and interaction readiness

**Files:** `apps/landing/src/lib/security-headers.ts`, new adjacent `security-headers.test.ts`, `apps/landing/e2e/accessibility.spec.ts`.

**Interfaces:** `applyLandingSecurityHeaders(response: Response): Response` remains unchanged. Existing `import.meta.env.DEV` supplies the environment distinction.

- [x] Write a failing response-header regression:

```ts
vi.stubEnv("DEV", true);
vi.resetModules();
const { applyLandingSecurityHeaders } = await import("./security-headers");
const response = applyLandingSecurityHeaders(new Response("ok"));
expect(response.headers.get("Content-Security-Policy")).not.toContain(
  "upgrade-insecure-requests",
);
```

- [x] Add the complementary production case (`DEV=false`) requiring the directive and protective frame/object restrictions. Run the focused Vitest file and observe the development case fail.
- [x] Include `upgrade-insecure-requests` only outside development; remove the obsolete commented API-origin declaration because same-origin proxy access is already covered by `'self'`.
- [x] In browser tests, wait for the hero and pricing island hydration as the screenshot tests already do. Capture the initial selected tab and poll until ArrowRight changes it; do not turn timing into a fixed sleep.
- [x] Run landing unit tests, typecheck/lint, `build:cloudflare`, and all 18 landing accessibility cases. Production output must retain HTTPS upgrade. Commit the landing fix separately.

## Task 3 — Make internal accessibility evidence enforceable

**Files:** `apps/internal/e2e/accessibility.spec.ts`, `apps/internal/src/main.tsx`, adjacent entrypoint regression, `e2e/utils/accessibility-audit.ts`, and internal lint configuration.

**Interfaces:** consumes the canonical auth response schema and INTERNAL role; produces a report only from the intended rendered routes, with real violation/error failures.

- [x] Preserve the existing negative baseline: missing INTERNAL fixture currently reports 20 passes with `seeded=false`. Change the suite so protected-page prerequisites fail explicitly instead of auditing a login redirect.
- [x] Use the actual browser login flow, parse its response using the shared schema, and reject absent token/user or non-INTERNAL role. Let the application own session memory, cookies and user storage; do not seed obsolete token keys.
- [x] Reproduce the authenticated workspace tooltip crash at the entrypoint, add a regression using a real shared tooltip control, and restore the missing `TooltipProvider`.
- [x] Keep login audited without an authenticated session; seed only protected pages. Assert the pathname and page content before scanning. Remove catch-and-ignore blocks and arbitrary 500ms sleeps.
- [x] Assert zero serious/critical axe violations while recording all impacts. Distinguish skipped/failed/covered routes in report counts; isolate reports by Playwright project to prevent overwrites.
- [x] Prove the missing-fixture run fails. Run a browser regression with a controlled fixture/API boundary that proves a critical violation or scanner failure is not swallowed, and a healthy route passes. Keep synthetic evidence separate from a real backend-authenticated audit.
- [x] Run internal lint/typecheck/tests and the actual audit. If real INTERNAL credentials are unavailable, retain that real audit as blocked rather than manufacture success. Commit the gate correction separately.

### Task 3 follow-through — Dashboard wire contract and facility controls

Authenticated probing reproduced `clinics.map is not a function`: the API returns
`{ items, nextCursor, hasMore, count }`, the declared response instead expects
`{ data }`, and the page assumes an array. The selected clinic fields also do not
match the full clinic schema. Fix this before accepting the authenticated audit.

**Files:** `packages/types/src/admin/internal.ts` and adjacent tests;
`packages/data-access/src/internal/{dashboard.types.ts,lib/normalize-clinics-list.ts}`;
`apps/api/src/shared/modules/internal/{clinic-management.service.ts,internal-analytics.controller.ts,dto/internal.dto.ts}`;
`apps/internal/src/features/dashboard/{types.ts,hooks/use-dashboard-data.ts,pages/dashboard-page.tsx,components/clinic-list.tsx}` and page regression, plus `apps/api/src/shared/common/pagination.helper.ts` and `test/e2e/internal/clinic-cursor.e2e-spec.ts` for the database-proven ordering correction.

- [x] Add a failing wire-shape regression and a page regression using the actual cursor wrapper. Reject malformed payloads rather than rendering invented zero counts.
- [x] Compose a focused clinic row from `clinicSchema`, retaining consumed user/patient counts and clinic type. Match the existing `items` cursor envelope; add canonical dashboard stats/trends schemas for the actual stats payload and attach its DTO to the API route.
- [x] Parse both API responses at the feature data boundary; replace handwritten dashboard types with shared inferred types. Include clinic-query errors in DataState and retry/invalidate both queries after create/edit.
- [x] Wire the existing facility search input to the loaded rows, label its page scope, and expose cursor pagination with accessible Previous/Next buttons. Allow ordered `orderBy` arrays in the pagination helper; add an ID tie-breaker to clinic ordering so equal creation times do not duplicate or omit rows. Preserve a return path through cursor history and reset it after a mutation.
- [x] Verify wrapper/error/search/pagination behavior with focused unit/browser tests and the authenticated audit against the disposable fixture API. Build API/internal before claiming wire parity.

## Task 4 — Resolve patched dependency advisories and triage residuals

**Files:** root/app manifests, `pnpm-lock.yaml`, and dated validation evidence.

**Interfaces:** existing package APIs remain unchanged; dependency installation must succeed with `--frozen-lockfile`.

- [x] Refresh `pnpm audit --json` and record consumers, installed ranges and patched versions.
- [x] Raise compatible direct/override floors to the advisory patches: `proxy-addr` 2.0.8, `compression` 1.8.2, `multer` 2.4.0, `axios` 1.20.0, `engine.io` 6.6.10, `undici` 7.29.1, `fast-uri` 3.1.8, `js-yaml` 4.3.2, `svgo` 4.1.0, `browserslist` 4.28.7, `mysql2` 3.23.1, `smol-toml` 1.9.0 and `source-map-js` 1.2.2. Use `brace-expansion` 1.1.21 for minimatch 3 and 5.0.12 for the newer existing overrides.
- [x] Also patch compatible moderate findings (`qs`, `hono`, Vitest and companions, `fflate`, browser mapping, filesystem tooling and copy helpers), preserving existing major versions. Verify every version exists through the registry before installing. Generate the lockfile with `pnpm install`, then run frozen installation and audit again.
- [x] For advisories reporting no patch (`braces`, `http-cache-semantics`), inspect upstream and actual runtime/CLI call sites. Record exposure and enforceable mitigation or an unresolved upstream blocker (including the selector-parser major compatibility constraint); do not add an audit ignore or remove a quality gate to hide a finding.
- [x] Run applicable upload/provider tests, all-workspace types/lint/unit/build checks, Knip and standards checks after the dependency change. Commit validated dependency maintenance separately, with residual findings documented.

## Task 5 — Verify CI E2E topology at the pinned runtime

**Files:** `.github/workflows/api-e2e.yml` is the reference; only amend runner scripts/docs if the comparison proves a missing local entrypoint. No domain code change is assumed from a V8 heap abort.

- [x] Use Node `22.22.0`, 4 GB heaps and four isolated PostgreSQL fixture databases. Run each shard in a fresh process:

```sh
NODE_OPTIONS=--max-old-space-size=4096 pnpm --filter @docita/api run test:e2e:shard 1/4
```

- [x] Repeat for shards 2/4, 3/4 and 4/4, with each `DATABASE_URL` explicitly pointing to its own disposable local test database. Bound concurrent shards to host capacity.
- [x] Record all suite/test totals and failures. If shards pass while the unsharded process exhausts memory, document the supported capacity-controlled runner rather than arbitrarily enlarging production memory or changing domain behavior.
- [x] Run DB integrity/query-plan checks against the fixture and remove only the disposable databases/container created for this validation. Retain production-role/migration/volume limitations.

## Task 6 — Hygiene, reserved-event cleanup and evidence

**Files:** `apps/app/src/App.tsx`, `packages/data-access/src/types/app-types.ts`, `apps/api/src/domains/billing/billing.module.ts`, `apps/api/src/shared/common/events/application-events.ts`, relevant existing evidence/backlog docs.

- [x] Add a regression for multi-line import/export renaming in `scripts/checks/check-batch-2.test.mjs`, then correct the assertion scanner to exclude those aliases while continuing to reject casts after them. The current scanner falsely treats dashboard re-exports as assertions.
- [x] Fix whitespace/Prettier findings. Remove the unused reserved scheduler event only if no consumer exists; leave scheduler cadence/alert work explicitly tracked, without pretending an event is emitted.
- [x] Run `git diff --check`, lint, types, relevant tests, `pnpm verify:standard`, hygiene and Knip. Do not broaden testing again without a new change or unresolved failure.
- [x] Update roadmap status and companion backlog with actual completed tasks, reproduction/verification results, and outstanding provider/production/decision blockers. Keep the original preservation snapshot immutable as historical evidence.
- [x] Commit all verified work; confirm a clean tree and report exact remaining work. The next approved phase remains pending until its boundary is safe and its implementation plan is concrete; residual audit and production evidence blockers are documented.
