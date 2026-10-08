# Security and validation stabilization implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use the installed executing-plans skill to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct the reproduced security and validation defects before extending clinical workflows or UI scope.

**Architecture:** Preserve canonical configuration and existing app/client contracts. Fix each failure at its boundary: runtime validation, landing response headers, browser readiness, audit authentication and assertions, dependency resolution, and isolated E2E processes.

**Tech Stack:** NestJS/Jest, Astro/Vitest, React/Playwright/axe, PostgreSQL 16, pnpm/Turbo.

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

- [ ] Change the existing bypass test to expect failure when the obsolete switch is supplied:

```ts
expect(() => assertRuntimeSecretRequirements(buildConfig({ TURNSTILE_OPTIONAL: true }))).toThrow('process.exit called');
```

- [ ] Run `pnpm --filter @docita/api test -- --runInBand app-config-validation.spec.ts` and observe that this case fails because startup currently accepts the bypass.
- [ ] Remove the bypass from validation/schema/Fly configuration. Preserve the existing non-HTTP worker exemption. Keep the regression by passing the extra obsolete property structurally rather than adding it back to the canonical schema.
- [ ] Replace the worker module's redundant literal fallback with `secret: configService.getJwtSecret()`.
- [ ] Run configuration/getter/worker tests, API and worker typechecks/lint, and `pnpm check:circular:enforce`; commit the security correction separately.

## Task 2 — Fix landing HTTP development CSP and interaction readiness

**Files:** `apps/landing/src/lib/security-headers.ts`, new adjacent `security-headers.test.ts`, `apps/landing/e2e/accessibility.spec.ts`.

**Interfaces:** `applyLandingSecurityHeaders(response: Response): Response` remains unchanged. Existing `import.meta.env.DEV` supplies the environment distinction.

- [ ] Write a failing response-header regression:

```ts
vi.stubEnv('DEV', true);
vi.resetModules();
const { applyLandingSecurityHeaders } = await import('./security-headers');
const response = applyLandingSecurityHeaders(new Response('ok'));
expect(response.headers.get('Content-Security-Policy')).not.toContain('upgrade-insecure-requests');
```

- [ ] Add the complementary production case (`DEV=false`) requiring the directive and protective frame/object restrictions. Run the focused Vitest file and observe the development case fail.
- [ ] Include `upgrade-insecure-requests` only outside development; remove the obsolete commented API-origin declaration because same-origin proxy access is already covered by `'self'`.
- [ ] In browser tests, wait for the hero and pricing island hydration as the screenshot tests already do. Capture the initial selected tab and poll until ArrowRight changes it; do not turn timing into a fixed sleep.
- [ ] Run landing unit tests, typecheck/lint, `build:cloudflare`, and all 18 landing accessibility cases. Production output must retain HTTPS upgrade. Commit the landing fix separately.

## Task 3 — Make internal accessibility evidence enforceable

**Files:** `apps/internal/e2e/accessibility.spec.ts`, shared auth contracts/storage keys already used by internal clients, and an adjacent test-only audit helper only if needed for meaningful regressions.

**Interfaces:** consumes the canonical auth response schema and INTERNAL role; produces a report only from the intended rendered routes, with real violation/error failures.

- [ ] Preserve the existing negative baseline: missing INTERNAL fixture currently reports 20 passes with `seeded=false`. Change the suite so protected-page prerequisites fail explicitly instead of auditing a login redirect.
- [ ] Parse login JSON using the shared response schema, reject absent token/user or non-INTERNAL role, and reuse canonical browser session storage names.
- [ ] Keep login audited without an authenticated session; seed only protected pages. Assert the pathname and page content before scanning. Remove catch-and-ignore blocks and arbitrary 500ms sleeps.
- [ ] Assert zero serious/critical axe violations while recording all impacts. Distinguish skipped/failed/covered routes in report counts; isolate reports by Playwright project to prevent overwrites.
- [ ] Prove the missing-fixture run fails. Run a browser regression with a controlled fixture/API boundary that proves a critical violation or scanner failure is not swallowed, and a healthy route passes. Keep synthetic evidence separate from a real backend-authenticated audit.
- [ ] Run internal lint/typecheck/tests and the actual audit. If real INTERNAL credentials are unavailable, retain that real audit as blocked rather than manufacture success. Commit the gate correction separately.

## Task 4 — Resolve patched dependency advisories and triage residuals

**Files:** root/app manifests, `pnpm-lock.yaml`, and dated validation evidence.

**Interfaces:** existing package APIs remain unchanged; dependency installation must succeed with `--frozen-lockfile`.

- [ ] Refresh `pnpm audit --json` and record consumers, installed ranges and patched versions.
- [ ] Raise compatible direct/override floors to the advisory patches: `proxy-addr` 2.0.8, `compression` 1.8.2, `multer` 2.3.0, `axios` 1.20.0, `engine.io` 6.6.10, `undici` 7.29.1, `fast-uri` 3.1.7, `js-yaml` 4.3.2, `svgo` 4.1.0, `browserslist` 4.28.7, `mysql2` 3.22.0, `smol-toml` 1.7.1 and `source-map-js` 1.2.2. Use `brace-expansion` 1.1.20 for minimatch 3 and 5.0.11 for the newer existing overrides.
- [ ] Verify every version exists through the registry before installing. Generate the lockfile with `pnpm install`, then run frozen installation and audit again.
- [ ] For advisories reporting no patch (`braces`, `http-cache-semantics`), inspect upstream and actual runtime/CLI call sites. Record exposure and enforceable mitigation or an unresolved upstream blocker; do not add an audit ignore or remove a quality gate to hide a finding.
- [ ] Run applicable upload/provider tests, all-workspace types/lint/unit/build checks, Knip and standards checks after the dependency change. Commit validated dependency maintenance separately, with residual findings documented.

## Task 5 — Verify CI E2E topology at the pinned runtime

**Files:** `.github/workflows/api-e2e.yml` is the reference; only amend runner scripts/docs if the comparison proves a missing local entrypoint. No domain code change is assumed from a V8 heap abort.

- [ ] Use Node `22.22.0`, 4 GB heaps and four isolated PostgreSQL fixture databases. Run each shard in a fresh process:

```sh
NODE_OPTIONS=--max-old-space-size=4096 pnpm --filter @docita/api run test:e2e:shard -- 1/4
```

- [ ] Repeat for shards 2/4, 3/4 and 4/4, with each `DATABASE_URL` explicitly pointing to its own disposable local test database. Bound concurrent shards to host capacity.
- [ ] Record all suite/test totals and failures. If shards pass while the unsharded process exhausts memory, document the supported capacity-controlled runner rather than arbitrarily enlarging production memory or changing domain behavior.
- [ ] Run DB integrity/query-plan checks against the fixture and remove only the disposable databases/container created for this validation. Retain production-role/migration/volume limitations.

## Task 6 — Hygiene, reserved-event cleanup and evidence

**Files:** `apps/app/src/App.tsx`, `packages/data-access/src/types/app-types.ts`, `apps/api/src/domains/billing/billing.module.ts`, `apps/api/src/shared/common/events/application-events.ts`, relevant existing evidence/backlog docs.

- [ ] Fix whitespace/Prettier findings. Remove the unused reserved scheduler event only if no consumer exists; leave scheduler cadence/alert work explicitly tracked, without pretending an event is emitted.
- [ ] Run `git diff --check`, lint, types, relevant tests, `pnpm verify:standard`, hygiene and Knip. Do not broaden testing again without a new change or unresolved failure.
- [ ] Update roadmap status and companion backlog with actual completed tasks, reproduction/verification results, and outstanding provider/production/decision blockers. Keep the original preservation snapshot immutable as historical evidence.
- [ ] Commit all verified work; confirm a clean tree and report exact remaining work. Continue to the next approved phase only after its boundary is safe and its implementation plan is concrete.
