# Auth status documentation implementation plan

> Execute inline with the installed executing-plans workflow. The approved roadmap's Phase 2 selects compatibility-preserving auth documentation as the default; the user's continuation authorizes this slice.

**Goal:** Close T-F1-F5 by documenting the actual HTTP 201 success status on twelve existing auth POST handlers and removing all conformance allowances.

**Architecture:** Update Swagger metadata only. Nest's existing POST status, response bodies, session cookies, guards and errors remain intact. Record a narrow compatibility exception to the new-action HTTP 200 policy, with an exact route list in the API reference. New action POSTs still require explicit HTTP 200; changing existing auth wire statuses requires separate contract review.

**Tech stack:** NestJS Swagger, pnpm 10.30.3, Node 22.22.0, Jest and PostgreSQL 16 E2E fixtures; no dependencies or migrations.

## Task 1 — Confirm and correct metadata

- [x] Inspect the twelve existing allowance keys in `scripts/checks/check-api-conformance.mjs`, Nest's installed `RouterResponseController#getStatusByMethod`, and the six controller files below. Confirm POST defaults to 201, no explicit `@HttpCode` or manual response status overrides apply, and the existing login/check-email HTTP tests assert 201.
- [x] Change only the twelve success `@ApiResponse({ status: 200 })` values to `201` in `patient-portal-auth.controller.ts`, `auth-login.controller.ts`, `auth-password.controller.ts`, `auth-registration.controller.ts`, `auth-session.controller.ts`, and `auth-verification.controller.ts`. Preserve the session GET's 200 and every error status. No new implementation-mirroring test is needed for these metadata edits.
- [x] Empty `ACTION_POST_ALLOWLIST`, lower its ceiling from 12 to 0, and update explanatory comments to distinguish accurate legacy 201 metadata from new action HTTP 200 rules. Preserve rejection of any documented 200 POST without explicit HTTP 200.

## Task 2 — Verify compatibility and gate enforcement

- [x] Run `pnpm check:api-conformance` and `pnpm test:standards-checks`: expect zero conformance allowances and all 68 regressions passing, including rejection of mismatched action metadata. Update the existing `scripts/checks/standard-checks.test.mjs` fixture that expected a legacy auth allowance: the old mismatch must now fail, while accurate 201 metadata passes.
- [x] Against the existing owned disposable container on localhost 5547, run `auth/auth.e2e-spec.ts`, `auth/csrf.e2e-spec.ts` and `patient-portal/patient-portal-otp.e2e-spec.ts` with Node 22.22.0, a 4 GB heap and one worker. Existing success-status assertions, negative auth/CSRF assertions and OTP single-use behavior must remain green. The OTP suite exercises the service/repository, not all portal HTTP statuses; report that limit.
- [x] Run API typecheck/build, repository lint, standards, Knip and hygiene. Keep output builds sequential. No dependency audit or UI accessibility refresh is required because this slice changes neither dependencies nor UI markup.

## Task 3 — Document and commit

- [x] Update `docs/architecture/API_DESIGN_STANDARD.md` §5 and client status guidance with the narrow existing-auth compatibility exception. Add an exact twelve-route success-status table to `API_DOCUMENTATION.md` Authentication, including the global `/api/v1` prefix.
- [x] Mark T-F1-F5 closed locally in the backlog, update the approved roadmap and write a dated validation record with exact commands/counts and remaining release blockers. Preserve historical acceptance records.
- [x] Stop only `docita-codex-overlap-20261008`, then commit with normal hooks and verify a clean tree. No push, merge, deployment or production database changes.

## Acceptance

All tasks are complete. The [dated validation record](releases/2026-10-08-auth-status-validation.md) records exact checks, the compatibility boundary and fixture cleanup.
