# Release Evidence — 2026-10-03 release gate blocked

Filled entry for [`../RELEASE_EVIDENCE_CHECKLIST.md`](../RELEASE_EVIDENCE_CHECKLIST.md),
continuing [`2026-08-06-p5-closure.md`](2026-08-06-p5-closure.md).

Draft status: everything locally verifiable is real and measured. Everything
that requires a merge, a deploy, or external credentials is marked **pending**
or **blocked** below. No item in this record was inferred from source presence:
a skipped job is recorded as skipped, never as passed.

Scope: the operational-metrics dashboard release authorized from
`fix/actual-operational-metrics`, plus the P0 backlog closure work landed on
`feat/ui-ux-sweep-and-outage-gate` (R02, S01, S02, F01).

## 1. Commit and checks

- Commit/PR: **pending** — work is staged and uncommitted on
  `feat/ui-ux-sweep-and-outage-gate`; no push and no PR has been opened
- CI run: **pending** (no push yet)
- `pnpm verify:standard` (local): **PASS** — exit 0, including
  `check:api-latency-budget:enforce`. The latency gate now reports an explicit
  skip while `artifacts/api-latency-baseline.json` is absent; the release path
  is expected to use `check:api-latency-budget:required` (R02) when a release
  declares a performance budget
- `pnpm audit --audit-level=high`: not re-run this batch (no dependency
  manifest changes). `pnpm-lock.yaml` is modified in the working tree by a
  separate workstream, so a dependency audit belongs to that change, not this one

## 2. Tests and audits

- API unit tests: **22/22** for the F01 webhook/reconciliation suites;
  **17/17** for the S02 portal-OTP and uploads suites
- API E2E: **6/6** `razorpay-payment-webhook.e2e-spec.ts` (capture-once,
  ingress replay rejection, delayed duplicate no-op, amount mismatch, parallel
  claim election, concurrent-delivery race) against docker Postgres
  (`docita_test`); **10/10** `uploads.e2e-spec.ts`; patient-portal OTP race
  suite passing
- Standards checks: `pnpm test:standards-checks` **217/217** (210 before this
  batch; the new RLS coverage suite adds 7)
- Tenant isolation: `db:check-tenant-isolation` **16/18 cases**, with the two
  precondition cases unmet locally and one coverage failure fixed during this
  batch (see section 3)
- Accessibility: **not run this batch** (no UI change). Playwright Chromium is
  installed locally (`chromium-1223` plus `chromium_headless_shell-1243`) so the
  X01 browser/a11y work is unblocked
- Performance: **pending** — no staging soak has been captured, so
  `artifacts/api-latency-baseline.json` still does not exist

## 3. Deployment

- Schema migration: **one new migration, not yet applied to any deployed
  environment** — `20261003000000_complete_rls_policy_coverage`. Applied and
  verified against the local migrated database (`docita` on port 5434);
  `prisma migrate status` reports it as the only unapplied migration before the
  run and "All migrations have been successfully applied" after it
- Coverage finding: the policy loop in `20260502143500_add_rls_policies` ran
  exactly once, so **16 clinicId-bearing tables added afterwards had RLS
  disabled and no `tenant_isolation` policy**, i.e. no database-level tenant
  backstop. Coverage is now **91/91** clinicId-bearing public tables. A static
  guard (`pnpm check:rls-table-coverage`, in `verify:standard`) now fails when a
  migration newer than the last sweep creates a tenant table without enabling
  RLS
- Deploy IDs: **pending** (no deploy)
- Env/secrets changed: **none this batch**
- **Release trigger state changed**: `.github/workflows/deploy.yml` has its
  entire `on:` block commented out, with the header stating deployments are
  paused and triggers are also disabled at the GitHub level. The workflow
  therefore cannot run from a push, and every "release attempt" claim must be
  read as historical. This supersedes the backlog's earlier statement that the
  production workflow is active. Re-enabling requires uncommenting the `on:`
  block **and** clearing the GitHub-level disable — two separate controls
- Cloudflare deploys remain gated on credentials: the `gate` job skips
  `deploy-app` / `deploy-internal` / `deploy-landing` with
  `reason=missing-secrets` or `reason=invalid-credentials`, and the previously
  recorded HTTP 401 / code 1000 rejection is unresolved
- `TURNSTILE_SECRET_KEY` is a boot requirement in staging and production; a
  production API startup smoke previously exited because it was absent

## 4. Post-release health (within 1 hour)

**Not started — blocked.** No release has been executed from this batch, so
there is no deployed revision to observe. Required once unblocked:
`curl -fsS <api>/api/health/live` and `/api/health/ready`; `fly releases` for
api and worker; `wrangler deployments list` for app / internal / landing;
Sentry release check; one representative audit write/read; rollback rehearsal.

## 5. Owner and rollback window

- Release owner: **pending** — must be named before the release window opens
- Alert destination: per the `SLOS.md` ownership table (API latency alerts → API
  owner; web-vitals drift → frontend owner)
- Rollback window closed deliberately: **pending**

---

## Blocked items — handoff requirements

| Blocker | Unblock requirement | Exact command once unblocked |
| --- | --- | --- |
| Workflow cannot run at all | Uncomment the `on:` block in `.github/workflows/deploy.yml` and clear the GitHub-level disable | `gh workflow enable deploy.yml` after the edit merges |
| Cloudflare deploys skipped | Valid `CLOUDFLARE_API_TOKEN` (Edit Cloudflare Workers template) + `CLOUDFLARE_ACCOUNT_ID` | `node scripts/deploy/verify-cloudflare-deploy-credentials.mjs`, then update the repository secret per RB-13 |
| API will not boot in prod/staging | `TURNSTILE_SECRET_KEY` set for the real production widget, on Fly and in Render staging | Set the secret, then re-run the release |
| API latency budget claim | A representative staging soak | `pnpm perf:api-latency:baseline -- <soak-metrics.json>` → commit `artifacts/api-latency-baseline.json`; `pnpm check:api-latency-budget --require-baseline` then actively gates |
| RLS enforcement in production | Operators point `DATABASE_URL` at a login-enabled `docita_app` (currently `rolcanlogin=false`) | `packages/db/scripts/provision-docita-app-role.sql`, then `RLS_ENABLED=true` per `docs/compliance/RLS_ROLLOUT.md` |
| Staging rollback evidence | A staging deploy to roll back from | API/worker: `fly releases rollback <VERSION>`; frontend: Cloudflare dashboard → Deployments → "Rollback to this deployment" |
| Authenticated a11y baseline | Seeded clinician accounts + staging API/Redis | `pnpm audit:app` with fixtures; review serious/critical findings; update `artifacts/a11y-baseline.json` |

## Evidence index

- P02 public-booking evidence (dated 2026-10-04):
  [`2026-10-04-p02-public-booking-evidence.md`](2026-10-04-p02-public-booking-evidence.md)
- Tenant matrix: `packages/db/scripts/check-tenant-isolation.mjs`
  (`pnpm --filter @workspace/db run db:check-tenant-isolation`)
- Coverage guard: `scripts/checks/check-rls-table-coverage.mjs` +
  `scripts/checks/check-rls-table-coverage.test.mjs`
- Coverage migration:
  `packages/db/prisma/migrations/20261003000000_complete_rls_policy_coverage/migration.sql`
- Rollout procedure and known limitations: [`../../compliance/RLS_ROLLOUT.md`](../../compliance/RLS_ROLLOUT.md)
- Latency gate semantics: [`../SLOS.md`](../SLOS.md)
