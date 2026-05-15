# 2026-05 Audit Coverage Ledger

Generated for `security-and-performance-audit-merry-lobster.md`.

| Area                  | Classification          | Owner workstream                        | Required checks                                                                             | Current enforcement                                                                         |
| --------------------- | ----------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `apps/**`             | runtime/test/config     | WS-1, WS-3, WS-4, WS-5, WS-11, WS-12    | auth posture, route guards, UI standard, data-access usage, upload/webhook validation, a11y | `verify:standard`, `check-controller-rbac`, `check-frontend-fetch`, structure audit reports |
| `packages/**`         | contract/runtime/config | WS-1, WS-4, WS-6, WS-7                  | Zod source of truth, package boundaries, tier semantics, framework boundaries, Knip         | `check-tier-comparisons`, `check-package-boundaries`, Knip                                  |
| `scripts/**`          | infra                   | WS-7, WS-10, WS-11, WS-12, WS-13, WS-18 | deterministic scripts, clear file:line output, no PHI/secrets, CI-safe exit codes           | `check:hygiene`, script lint/type coverage through repo gates, audit guardrail scripts      |
| `docs/**`             | docs                    | WS-8, WS-18                             | canonical-source links, current status, no conflicting standards                            | manual review plus audit evidence                                                           |
| `artifacts/**`        | asset/docs              | WS-12, WS-18                            | a11y and UX baselines, no PHI, intentional generated artifacts only                         | report-mode coverage                                                                        |
| `.github/**`          | infra                   | WS-7, WS-15                             | path-scoped CI/deploy, no secret echoing, staging mirror policy                             | deployment contract checks                                                                  |
| `.husky/**`           | infra                   | WS-15                                   | local hook commands stay lightweight and deterministic                                      | manual review                                                                               |
| `.vscode/**`          | config                  | WS-15                                   | developer convenience only, no required workflow state                                      | manual review                                                                               |
| `prisma/**`           | generated/runtime       | WS-7, WS-18                             | generated client artifacts only when intentionally tracked                                  | Prisma boundary and hygiene checks                                                          |
| `AGENTS.md`           | docs/contract           | WS-8                                    | canonical agent standards and pattern catalogue                                             | manual review                                                                               |
| `README.md`           | docs                    | WS-8                                    | concise repo orientation linking canonical docs                                             | manual review                                                                               |
| `package.json`        | infra                   | WS-7, WS-18                             | pnpm scripts, verify wiring, dependency hygiene                                             | `pnpm lint`, `pnpm knip`, `pnpm verify:standard`                                            |
| `pnpm-lock.yaml`      | infra                   | WS-7                                    | lockfile parity and dependency audit scope                                                  | package manager and CI checks                                                               |
| `pnpm-workspace.yaml` | infra                   | WS-18                                   | workspace membership only                                                                   | Turborepo structure verification                                                            |
| `turbo.json`          | infra                   | WS-18                                   | task graph correctness and cache boundaries                                                 | `verify:structure`                                                                          |
| `tsconfig*.json`      | config                  | WS-18                                   | compiler boundaries and path aliases                                                        | type checks                                                                                 |
| `eslint.config.*`     | config                  | WS-5                                    | repository rule enforcement                                                                 | lint                                                                                        |
| `knip.json`           | config                  | WS-7                                    | dead-code detector posture                                                                  | `pnpm knip`                                                                                 |
| `fly.toml`            | infra                   | WS-11                                   | API deployment contract and health checks                                                   | deployment contract checks                                                                  |
| `render.yaml`         | infra                   | WS-11                                   | staging deploy contract only                                                                | deployment contract checks                                                                  |
| `components.json`     | config                  | WS-3                                    | UI component registry config                                                                | manual review                                                                               |

## Guardrail Script Coverage

| Script                                    | Status       | Notes                                                                                               |
| ----------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------- |
| `scripts/check-type-duplicates.mjs`       | report-first | Promotable with `--enforce` after app-local duplicate type findings are resolved.                   |
| `scripts/check-webhook-signatures.mjs`    | strict       | Public webhook POST handlers must use raw body and signature verification.                          |
| `scripts/check-upload-validation.mjs`     | report-first | Promotable with `--enforce` after all upload endpoints declare mime, size, and filename validation. |
| `scripts/check-job-idempotency.mjs`       | report-first | Worker/API processors must declare retry, backoff, lock duration, idempotency, and failure policy.  |
| `scripts/check-sentry-scrubbing.mjs`      | report-first | Promotable after client and server Sentry configs share the same scrubber.                          |
| `scripts/check-audit-logging.mjs`         | report-first | Promotable after command services/use-cases have explicit audit markers.                            |
| `scripts/check-a11y-budget.mjs`           | report-first | Uses `artifacts/a11y-baseline.json` when present.                                                   |
| `scripts/check-contrast.mjs`              | strict       | Ensures core semantic foreground/background token pairs exist.                                      |
| `scripts/verify-app-security-headers.mjs` | strict       | Ensures app middleware applies CSP, HSTS, nosniff, Referrer-Policy, and Permissions-Policy.         |

## Current State

This ledger classifies coverage by top-level area first. File-by-file frontend and backend evidence is recorded in:

- `docs/audits/evidence/2026-05-frontend-file-audit.md`
- `docs/audits/evidence/2026-05-backend-file-audit.md`
- `docs/audits/evidence/2026-05-file-move-map.md`

The remaining non-runtime files are covered by area-level checks until the audit coverage script is promoted from report mode to strict mode.
