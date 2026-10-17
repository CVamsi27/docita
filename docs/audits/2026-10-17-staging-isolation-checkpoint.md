# Staging isolation checkpoint — 17 October 2026

Render login is verified, but the service remains suspended. A separate empty
staging database is prepared and verified; no production source, schema, runtime
credential, idle setting or worker state changed in this pass. No production data
was copied and no staging soak has started.

## Verified environment identities

| Target                | Project / endpoint                                                                    | Database role                                | Status                                                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Production            | Neon `icy-river-59903017` / `ep-plain-rain-a1zogxgl`                                  | Existing owner connection                    | Current protected password matches Neon and authenticates through verified TLS/UTC. Production owner-role/RLS rollout remains open.          |
| Prepared staging      | Neon `wispy-forest-27565397` / `ep-bold-wave-a15dfyvk`, root `br-icy-violet-a13qncy8` | `docita_app` on `docita_staging`             | Independent empty project, Singapore, PostgreSQL 17, Free organization, fixed 0.25 CU; idle suspension inherits the Free default.            |
| Actual Render service | `srv-d7btp2juibrs739v1gsg`, Free Node, Singapore                                      | Still stores a production-endpoint owner URL | Suspended, connected to main, last successful commit `cce2a2fb49121addeb5438773c567102b1317394`. The new configuration has not been applied. |

The staging project was created independently, with no production parent or
restore/copy request. It had zero public tables before migration. Its fresh
migration run completed **175/175**, with zero failed ledger entries and **zero
schema drift** against the candidate. The organization is verified Free; its
new project uses a fixed 0.25 CU compute. API value `suspend_timeout_seconds=0`
means the plan default, not disabled idle shutdown. See [Neon plan allowances](https://neon.com/docs/introduction/plans).

## Role and candidate checks

The fresh runtime login has no superuser, create-database, create-role,
replication or BYPASSRLS attribute, no outgoing memberships and no owned
relations. Fresh certificate/hostname-verified TLS login and UTC pass.

- **19/19 strict isolation checks** pass with separate fixture administration;
  all **91 tenant tables** have RLS and the expected policy. The probe covers a
  scratch policy matrix plus real table coverage, not every clinical HTTP path.
- Database integrity and the final safe migration status check pass.
- Clinics, users, patients, invoices and documents were zero after migrations;
  no real account or medical record was seeded or copied. Probe fixtures were
  removed by their owned cleanup path.
- The local compiled candidate at `e95f3174e1725276cb79d02682723c34a4cff29d`
  starts against that non-owner Neon connection in **2.098 seconds**. Liveness
  and readiness return 200; unauthenticated `/api/v1/auth/validate` returns 401;
  SIGTERM exits zero. This is local candidate proof, not a Render deployment,
  load test, hosted CI result or staging soak.
- Local startup uses synthetic Razorpay credential syntax and the documented
  [Cloudflare Turnstile test key](https://developers.cloudflare.com/turnstile/troubleshooting/testing/).
  No provider-integration success or deployed bot defense is inferred.

The initial local Docker fixture could not start because Docker's daemon was
unavailable; a bounded Desktop start timed out. The new empty remote project
supplied the isolated migration target instead. Initial startup harness failures
from empty strict-optional values, missing staging-required provider fields and a
stale `/auth/me` smoke reference are retained as failed evidence. The corrected
harness preserves runtime validation, exercises the actual session route and
uses documented testing inputs. It does not disable application guards.

Provider role-password reset returned nonzero for the migration-created role.
The first TLS SQL attempt unnecessarily specified privileged role attributes and
was rejected with 42501. After verifying the existing restrictive attributes,
the successful path changes only LOGIN/password and grants. Before any password
statement, statement/duration/sample/error logging was verified disabled or at
panic severity, with audit statement logging absent. The password never entered
command arguments or printed output. See [PostgreSQL ALTER ROLE privileges](https://www.postgresql.org/docs/17/sql-alterrole.html).

## Configuration and remaining gates

The protected local operator `STAGING_DATABASE_URL` and GitHub's existing
repository secret of that name now contain the new restricted staging URL.
Production `DATABASE_URL` is unchanged. Fresh staging JWT and field-encryption
keys are in a mode-0600 local Render handoff file; no secret value is in this
record. The API retains the canonical JWT fallback for document signing.

Render's existing URLs reference staging, storage is local and its three
Razorpay settings are present with a test-mode key ID. It has no dedicated
Turnstile secret and no explicit scheduler-disable setting. The prepared file
sets `ENABLE_SCHEDULERS=false`, RLS on, PostgreSQL queues, external AI/cloud OCR
and database control off, and staging-only origins.

The operator must provide a dedicated staging Turnstile pair. After it is merged
into the protected configuration, the browser credential-entry handoff can save
settings using **Save only**; do not resume the old build. Render documents that
[Save only does not trigger a deploy](https://render.com/docs/configure-environment-variables).

Current candidate CI still cannot be inspected because Code Review requests its
GitHub connection. PR #322 is open for review; main/staging trees are unchanged.
Reviewed main acceptance, the protected staging alignment PR, actual Render and
Cloudflare revisions, matching Turnstile frontend configuration, authenticated
journeys, latency measurements and the full staging soak remain open. The backup
Sentry permissions, offline application-key packet proof, clinical recovery and
elapsed backup/production observation gates also remain open.

## Credential inspection incident

A Render database credential appeared in browser accessibility output during the
inspection. The stored Render password has a different length from the current
protected/provider password. The current value matches Neon and authenticates
freshly over verified TLS; it was not printed. The 14 October rotation record
already verified rejection of the prior credential. This pass did not retry the
exposed Render password or rotate production again. The secret view was reloaded;
no claim is made about erasing tool history. Keep staging suspended and replace
its production target before any use.
