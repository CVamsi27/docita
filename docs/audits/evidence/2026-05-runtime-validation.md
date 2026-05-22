# 2026-05 Runtime Validation Evidence

Scope: final hygiene pass on `fix/audit-overhaul-quality-gates`.

## Local Runtime And Security Evidence

| Surface                           | Evidence                                                                                                                                                          | Result                           |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| API bootstrap and critical routes | `pnpm --filter @docita/api run test:e2e` with local Postgres `postgresql://docita:docita@localhost:5434/docita_test`                                              | 18 suites, 100 tests passed      |
| Auth and tenant-sensitive E2E     | `test/auth.e2e-spec.ts`, `test/rbac-high-risk-matrix.e2e-spec.ts`, `test/rbac-403-verification.e2e-spec.ts`, `test/critical-user-flow.e2e-spec.ts` inside API E2E | passed                           |
| Webhook rejection posture         | `pnpm check:webhook-signatures`                                                                                                                                   | passed                           |
| Upload rejection posture          | `pnpm check:upload-validation`                                                                                                                                    | passed                           |
| PHI encryption coverage           | `pnpm check:phi-encryption-coverage`                                                                                                                              | passed, 7 patient fields covered |
| Sentry/browser error scrubbing    | `pnpm check:sentry-scrubbing`                                                                                                                                     | passed                           |
| App security headers              | `pnpm verify:app-security-headers`                                                                                                                                | passed                           |
| Secret scan                       | `gitleaks git --config .gitleaks.toml --log-opts "origin/main..HEAD" --no-banner`                                                                                 | no leaks found                   |
| Strict repo contract              | `pnpm verify:standard`                                                                                                                                            | passed                           |
| Unit/product tests                | `pnpm test`                                                                                                                                                       | passed                           |

## Runtime Endpoint Smoke

External endpoint checks were attempted from the local agent environment on 2026-05-21:

| Endpoint                                        | Command                                                                                   | Observed result                   | Status                         |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------- | ------------------------------ |
| `https://staging-app.docita.work`               | `curl -fsS -D - -o /dev/null --max-time 20 https://staging-app.docita.work`               | HTTP 500 from Cloudflare/OpenNext | environment follow-up required |
| `https://staging-api.docita.work/api/v1/health` | `curl -fsS -D - -o /dev/null --max-time 20 https://staging-api.docita.work/api/v1/health` | timed out after 20 seconds        | environment follow-up required |
| `https://api.docita.work/api/v1/health`         | `curl -fsS -D - -o /dev/null --max-time 20 https://api.docita.work/api/v1/health`         | timed out after 20 seconds        | environment follow-up required |

These external endpoint results are not treated as repository regressions in this pass because the local branch is not deployed to those environments. The repo-side runtime contract is covered by the local API E2E suite, strict guardrails, and build/test gates above.
