# Onboarding Quick Start

Use the [local setup guide](product/ONBOARDING.md) for the complete procedure,
configuration tables and verification boundary. This page is a route map,
not a command that provisions or verifies a production service.

**28 October 2026 verification:** source inspection was followed by a bounded
local build, 175-migration apply, no-drift check, developer seed and guarded API
startup/authenticated-read smoke. See the canonical [executed local results](operations/CAPACITY_EVIDENCE.md#executed-local-results)
for receipts, test-profile deviations and shutdown. Existing dependencies were
reused; a fresh clone/install, browser and full clinic workflow remain unverified.

The later [clinical/document continuation](operations/CAPACITY_EVIDENCE.md#clinical-and-document-continuation) verifies linked synthetic creation and PDF download/retrieval after scoped corrections. The full seed rerun failed on existing lab-order references; use an owned fresh database for bootstrap practice. Seeded doctor verification is a fixture prerequisite, not a real verification result.

The [standalone worker continuation](operations/CAPACITY_EVIDENCE.md#standalone-postgresql-worker-continuation) records two durable PDF jobs, the missing-tenant-context failure and their successful rerun after repair. API and worker must share the intended PostgreSQL target, keys and local-storage working directory. Enabling consumers also enables the worker's scheduler graph; this owner/RLS-disabled local result does not establish production worker readiness or SQL RLS enforcement.

## Prerequisites and isolation

- Node.js `>=22.22.0`; use Node 24 for the capacity-learning workflow.
- Exactly `pnpm@10.30.3`, as pinned in `package.json`.
- A fresh, separately owned checkout of `CVamsi27/docita`, an owned disposable
  local PostgreSQL database and unused local ports. Docker is one optional way
  to run that database. Redis is not required by the memory or PostgreSQL queue
  profiles below.
- No inherited production connection/provider credentials or higher-priority
  production environment files. Never overwrite existing `.env` files to follow
  a tutorial; use a new checkout if their provenance is unclear.

## Follow the setup stages

1. Clone and install from the [verified repository and pinned tooling](product/ONBOARDING.md#1-create-an-isolated-checkout).
2. Create fresh environment files without overwriting existing files. Configure
   the root `.env` **and** API/frontend examples using the [loader and value table](product/ONBOARDING.md#2-configure-one-local-target-without-overwriting-files).
3. Start only the [owned disposable database](product/ONBOARDING.md#3-identify-and-initialize-the-disposable-database).
   Compose `db` and `db_test` both bind host port **5434**; do not start both.
4. Generate the client, inspect pending migrations, then deliberately apply and
   seed only that disposable target. `db:migrate:dry-run` inspects pending
   migrations; it does **not** initialize the schema.
5. Run the [basic UI/API profile](product/ONBOARDING.md#4-start-the-basic-uiapi-profile) with
   schedulers off, using filtered commands that do not kill unrelated listeners.
6. Use the [separate PostgreSQL-worker profile](product/ONBOARDING.md#5-practice-a-separate-postgresql-worker) only when explicitly practicing durable
   work; review shared local storage and enabled provider/scheduler effects.
7. Record [health, workflow and check results](product/ONBOARDING.md#6-verify-the-profile-and-record-its-limits).
   General API E2E setup can reset/truncate its database; it needs a separate
   positively identified test target.

## Local addresses

| Surface | Address |
| --- | --- |
| Clinic app | `http://localhost:3000` |
| API | `http://localhost:3001` |
| Internal app | `http://localhost:3002` |
| Landing | `http://127.0.0.1:3003` |
| Compose PostgreSQL | Host `127.0.0.1:5434`, container `db:5432` |

The Vite apps proxy `/api` to the API. Browser API base `VITE_API_URL=/api/v1`
and API-process `API_PUBLIC_URL=http://localhost:3001/api/v1` serve different
purposes. A reachable health route is not a verified clinical workflow.

See [AGENTS.md](../AGENTS.md) for repository rules and the
[testing guide](testing/TESTING.md) for test boundaries.
