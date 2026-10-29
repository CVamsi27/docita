# Onboarding — Isolated Local Setup and Verification

Use this procedure to prepare a local developer environment before practicing a
clinic workflow. It does not deploy, restart or reconfigure any hosted service.

**Verification boundary, 28 October 2026:** source review was followed by a
bounded local build, 175-migration apply, no-drift check, compiled developer seed
and guarded API startup/authenticated-read smoke. The canonical [executed local results](../operations/CAPACITY_EVIDENCE.md#executed-local-results)
own the counts, receipts, owner-role/RLS boundary, private network/listener
deviation and shutdown. Existing dependencies were reused, so this does not
verify a fresh clone/install, this exact Compose/filtered-startup recipe, browser
workflow, standalone workers, provider effects or production performance. The later
[clinical/document continuation](../operations/CAPACITY_EVIDENCE.md#clinical-and-document-continuation) verifies bounded linked creation and controlled PDF retrieval; it does not close those broader gates.

## 1. Create an isolated checkout

Required tools are Node.js `>=22.22.0`, exactly `pnpm@10.30.3`, PostgreSQL 15+
and, for the Compose option, Docker Compose. Use Node 24 when following the
capacity-learning workflow. Redis is not required: local queues can use memory,
and the durable cross-process queue uses PostgreSQL.

The verified repository origin is `CVamsi27/docita`. Choose a new directory that
you own; do not reuse a checkout containing production environment files or data.
The following commands create a checkout, install dependencies and run the
repository's postinstall/client-generation and prepare hooks:

```bash
git clone https://github.com/CVamsi27/docita.git docita-local
cd docita-local
corepack enable
corepack prepare pnpm@10.30.3 --activate
pnpm install --frozen-lockfile
```

Use an isolated terminal without inherited database/provider credentials.
Before following the next sections, inspect environment-variable **names** and
file names privately; do not print or paste their secret values. If an existing
file or inherited value is unexplained, stop and use a clean environment rather
than overwriting it or assuming `NODE_ENV=development` makes a remote target safe.

## 2. Configure one local target without overwriting files

Different commands load different files. An API-local `.env` alone does not
configure Prisma, the seed command or the database preflight.

| Consumer | Environment lookup in the inspected source |
| --- | --- |
| Prisma CLI | `packages/db/prisma.config.ts` loads repository-root `.env`; explicit process variables can already supply values |
| Local seed | `apps/api/package.json` sets `DOTENV_CONFIG_PATH=../../.env` for the seed script |
| Root database preflight | `scripts/db/db-check.mjs` uses an existing process `DATABASE_URL`, otherwise root `.env` |
| API and standalone worker | Their Nest modules list `.env.production`, `.env.development`, `.env.test`, `../../.env`, `.env` in that order, relative to the process working directory; earlier-file values and existing process values can take precedence |
| Vite apps | App-local `.env.local` plus process/build configuration; the commands below explicitly pin the proxy/base URL for the local profile |

The worker shares source with the API, but it is a separate process launched
from `apps/worker`; that does not make `apps/api/.env` its environment file.
Do not leave higher-priority production/mode files beside either process.

In a **fresh checkout only**, this copy block refuses existing destination files
or symlinks. It also refuses existing higher-priority API/worker mode files. It
creates protected local files; it never edits a deployed configuration:

```bash
(
  set -eu
  umask 077
  for directory in apps/api apps/worker; do
    for name in .env.production .env.development .env.test; do
      candidate="$directory/$name"
      if [ -e "$candidate" ] || [ -L "$candidate" ]; then
        printf 'Stop: existing mode file %s\n' "$candidate" >&2
        exit 1
      fi
    done
  done
  for target in .env apps/api/.env apps/worker/.env \
    apps/app/.env.local apps/internal/.env.local apps/landing/.env; do
    if [ -e "$target" ] || [ -L "$target" ]; then
      printf 'Stop: existing local file %s\n' "$target" >&2
      exit 1
    fi
  done
  cp .env.example .env
  cp apps/api/.env.example apps/api/.env
  cp apps/worker/.env.example apps/worker/.env
  cp apps/app/.env.example apps/app/.env.local
  cp apps/internal/.env.example apps/internal/.env.local
  cp apps/landing/.env.example apps/landing/.env
)
```

Edit only these newly created files with a local editor. Examples are starting
points, not a ready-to-run safe profile: the API/worker examples contain
`NODE_ENV=production`, secret fields need real local values, and some frontend
example URLs differ from the development proxy path.

| Setting | Required local decision |
| --- | --- |
| `DATABASE_URL` | Set the same owned disposable loopback database in root, API and worker files. For the owned Compose `db` option: `postgresql://docita:docita@127.0.0.1:5434/docita?options=-c%20TimeZone%3DUTC`. These are local fixture credentials, not production credentials. |
| `NODE_ENV` | Set `development` in root/API/worker and the new landing file. The profile commands also make this explicit. |
| `JWT_SECRET` | Generate a local random value of at least 32 characters; configure root and API consistently. Do not retain example placeholder strings. |
| `ENCRYPTION_KEY` | Generate a separate 64-hex-character local key; use the same key for root, API and worker so they can read the same encrypted fixtures. |
| `APP_URL`, `FRONTEND_URL` | Root/API/worker: `http://localhost:3000`; root needs the canonical names because seed validation does not load the API's Nest module. |
| `API_PUBLIC_URL` | Root/API/worker: `http://localhost:3001/api/v1`; this is API-process configuration, not the browser API base. |
| `CORS_ORIGINS` | Root/API/worker: include only intended local origins, such as `http://localhost:3000,http://localhost:3002,http://127.0.0.1:3003`. |
| `STORAGE_PROVIDER` | Use `local` for this isolated exercise; keep R2 keys empty. Separate-process local storage has the additional boundary described in section 5. |
| `QUEUE_BACKEND`, `WORKER_ENTRYPOINT`, `ENABLE_SCHEDULERS` | Basic root/API profile: `memory`, `main`, `false`. The separate-worker profile uses PostgreSQL and explicit process-specific overrides. |
| `RLS_ENABLED` | Basic fixtures use the example's `false`; this is not a tenant-isolation proof. Real app-role/RLS practice requires the separate [RLS rollout procedure](../compliance/RLS_ROLLOUT.md). |
| Browser variables | App/internal: `VITE_API_URL=/api/v1`, API target `http://localhost:3001`; app origin `http://localhost:3000`, internal origin `http://localhost:3002`, internal `VITE_MAIN_APP_URL=http://localhost:3000`. |
| Optional providers | Leave real payment, Meta/WhatsApp, mail, Sentry, AI/SMS and other external-provider credentials absent. Inspect enabled features and schedules; blank keys do not guarantee every feature degrades gracefully or that every outbound integration is disabled. |

`openssl rand -hex 32` can generate each of the two distinct local secrets.
Put the results only in the protected local files; do not commit them or include
them in screenshots, command transcripts or public fixtures. Do not copy a
production key merely to make local decryption succeed.

## 3. Identify and initialize the disposable database

Before any command below, confirm that the database belongs only to this
exercise. Inspect port ownership without killing listeners:

```bash
lsof -nP -iTCP:5434 -sTCP:LISTEN
lsof -nP -iTCP:3000 -iTCP:3001 -iTCP:3002 -iTCP:3003 -sTCP:LISTEN
```

No output means no matching listener was found, not that a future container or
database has been verified. Stop if a listener belongs to another project.
For a fresh owned Compose project, the following creates/starts only the local
database service and its persistent volume:

```bash
docker compose --project-name docita-local up -d db
docker compose --project-name docita-local ps db
```

Review the project/container identity before reusing that project name. Both
`db` and the optional `db_test` service in `docker-compose.yml` bind host
**5434**, so they cannot be started together on that port. The Compose database
inside the network listens on 5432; host-side scripts use 5434. Its `docita`
role owns the local database and is not an appropriate production RLS role.

In the isolated terminal, pin the already-approved local target explicitly so
different loaders do not select a stale URL. This value is valid only for the
owned Compose option just described:

```bash
export DATABASE_URL='postgresql://docita:docita@127.0.0.1:5434/docita?options=-c%20TimeZone%3DUTC'
export NODE_ENV=development
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 \
  -c 'SELECT current_database(), current_user, inet_server_addr(), inet_server_port();'
```

Require database `docita`, the expected local role and the independently owned
container/port mapping. `inet_server_port()` reports the server's container port
5432, not host port 5434. Merely accepting a loopback URL does not prove the
service is the disposable one. If ownership or contents are uncertain, stop.

The next commands generate local files, inspect migration state, apply schema
changes and insert/update synthetic fixtures. Run them **only after** that
identity check; do not point them at a shared, staging or hosted database:

```bash
pnpm --filter @workspace/db run db:generate
pnpm --filter @workspace/db run db:migrate:dry-run
pnpm --filter @workspace/db run db:migrate:deploy
pnpm db:seed:local
```

Dry-run reports pending migration state; it does not apply the schema and the
wrapper may create local log directories/files. `db:migrate:deploy` applies
existing migrations. `db:migrate` is a different script (`prisma migrate dev`)
used when developing migrations; do not confuse it with a read-only inspection.
The seed expects the matching migrated schema and required local environment;
record failures rather than using schema resets as an unexplained repair. A later full-seed rerun on an already seeded database failed because lab orders referenced lab tests selected for deletion. Treat this as a fresh-database bootstrap, not a proven idempotent refresh. Preserve the failed state before choosing another owned target.

Seeded doctors default to UNVERIFIED; ordinary prescription creation still requires the real verification/signature conditions. The bounded local acceptance run used an explicitly synthetic temporary VERIFIED fixture and disabled clinic WhatsApp automation, restoring both settings afterward. Schedulers-off alone does not disable immediate event listeners. Do not treat that fixture preparation as real clinician verification.

## 4. Start the basic UI/API profile

This profile supports local UI/API work with an in-process memory queue and
schedulers disabled. It does not prove durable jobs, scheduled reminders,
provider delivery or production tenant enforcement. PDF consumers also consult
`ENABLE_SCHEDULERS`; a pending PDF is expected if no consumer is enabled.

After reviewing the local environment, build shared browser dependencies once:

```bash
pnpm run build:web-workspace-deps
```

Run these in separate terminals from the same checkout. Each terminal must use
the same approved local environment; API predev builds its shared dependencies.
These filtered commands do not invoke the root port-killing helper:

```bash
# Terminal 1: API; no scheduled background work in this basic profile.
NODE_ENV=development WORKER_ENTRYPOINT=main QUEUE_BACKEND=memory \
  ENABLE_SCHEDULERS=false STORAGE_PROVIDER=local pnpm --filter @docita/api run dev

# Terminal 2: main clinic app, through its local /api proxy.
NODE_ENV=development VITE_API_URL=/api/v1 VITE_API_TARGET=http://localhost:3001 \
  pnpm --filter @docita/app run dev

# Terminal 3: internal app.
NODE_ENV=development VITE_API_URL=/api/v1 VITE_API_TARGET=http://localhost:3001 \
  VITE_MAIN_APP_URL=http://localhost:3000 pnpm --filter @docita/internal run dev

# Optional terminal 4: landing page.
NODE_ENV=development pnpm --filter @docita/landing run dev
```

Do not substitute `pnpm dev` without reviewing its side effects. Its current
`dev:full` chain invokes `scripts/kill-ports.js`, which sends `kill -9` to
listeners on ports 3000–3003 regardless of project ownership, and it does not
include the standalone worker. If a filtered Vite command selects a fallback
port, stop and resolve the conflict deliberately rather than silently accepting
a different origin.

| Surface | Source-configured URL |
| --- | --- |
| Clinic app | `http://localhost:3000` |
| API | `http://localhost:3001` |
| Internal app | `http://localhost:3002` |
| Landing | `http://127.0.0.1:3003` |

Use only the synthetic users created by `apps/api/src/seed/seed-clinic-users.ts`.
The inspected seed hashes fixture password `password123`; it is for this
disposable environment only. The default clinic, roles and account state must
be checked against the successful seed output/source before assuming a login
failure is a frontend bug. Never reuse fixture credentials for a hosted clinic.

## 5. Practice a separate PostgreSQL worker

Stop the basic API process first. Verify all root/API/worker files still refer
to the same local database and encryption key, and the worker's new `.env` has
the canonical URL settings. Use **PostgreSQL in both processes**: an API memory
queue cannot hand its in-memory jobs to a different worker process.

Review the schedulers and provider paths before enabling them. Use synthetic
records plus reviewed mocks/sandboxes; this section does not authorize real
messages, charges or background processing against hosted data.

```bash
# API terminal: produces durable work; does not own schedulers/PDF consumers.
NODE_ENV=development WORKER_ENTRYPOINT=main QUEUE_BACKEND=postgres \
  ENABLE_SCHEDULERS=false STORAGE_PROVIDER=local pnpm --filter @docita/api run dev

# Separate worker terminal: explicit identity overrides root's default "main".
NODE_ENV=development WORKER_ENTRYPOINT=worker QUEUE_BACKEND=postgres \
  ENABLE_SCHEDULERS=true STORAGE_PROVIDER=local pnpm --filter @docita/worker run dev
```

**Local file boundary:** `LocalStorageProvider` and API static serving use
`process.cwd()/uploads`. The filtered development commands above run from
different package directories, so they do not share files merely by selecting
`STORAGE_PROVIDER=local`.

A later controlled local run used both compiled processes from the **same owned
working directory on one filesystem**, with all configuration supplied explicitly.
It verified API enqueue, separate-worker completion and byte-equal stored PDF
retrieval after the reviewed tenant-context correction. See the
[standalone-worker evidence](../operations/CAPACITY_EVIDENCE.md#standalone-postgresql-worker-continuation)
for the initial failures, exact scope and cleanup. This is not evidence that two
Fly machines share a local disk; production worker storage requires the configured
R2 boundary.

For that layout, first build from the reviewed checkout and prepare one shared
working directory. The root `.env` must already be the isolated local profile
reviewed in section 2, with all required URLs/keys and provider destinations checked.
These commands require the worker tenant-context correction included with this
guide. Historical base `f3fddffc0` lacks that correction; verify the selected
checkout before using it as a reproducible recipe.

```bash
# In the reviewed repository root; retain these absolute values for both terminals.
task_repo_root="$PWD"
task_env_file="$task_repo_root/.env"
task_shared_dir="$(mktemp -d "${TMPDIR:-/tmp}/docita-worker-shared.XXXXXX")"
pnpm --filter @docita/api run build
pnpm --filter @docita/worker run build

# API terminal: cd to the shared directory, not apps/api.
cd "$task_shared_dir"
NODE_ENV=development WORKER_ENTRYPOINT=main QUEUE_BACKEND=postgres \
  ENABLE_SCHEDULERS=false STORAGE_PROVIDER=local \
  node --env-file="$task_env_file" "$task_repo_root/apps/api/dist/main.js"

# Worker terminal: set the same three absolute values, then use the same CWD.
cd "$task_shared_dir"
NODE_ENV=development WORKER_ENTRYPOINT=worker QUEUE_BACKEND=postgres \
  ENABLE_SCHEDULERS=true STORAGE_PROVIDER=local \
  node --env-file="$task_env_file" "$task_repo_root/apps/worker/dist/worker/src/main.js"
```

The API retains its existing wildcard listen behavior. The controlled experiment
also applied an OS network policy, an experiment-only loopback preload and actual
listener readback; the commands above do not themselves supply that isolation.
Worker scheduler enablement includes the wider cron graph. Use only owned synthetic
fixtures, explicitly disable fixture messaging, and account for broader scheduler
effects. The receipt's owner/RLS-disabled profile does not establish SQL RLS or
non-owner production authorization.

A completed local status URL is a development static URL, not an expiring signed
URL. Verify the selected access path and bytes; production R2 and application
HMAC capabilities have separate authority/lifetime contracts.

Verify worker startup, a synthetic job's `QueueJob` transition, its associated
`PdfJob` state where applicable, the stored artifact and authorized retrieval as
separate results. The schema uses `QueueJob` with names
`generate-invoice-pdf`/`generate-prescription-pdf` and uppercase statuses; a
query against a generic `Job(kind='pdf')` table does not describe this queue.
See [worker event ownership](../operations/WORKER_EVENT_OWNERSHIP.md) and the
[testing guide](../testing/TESTING.md) for the remaining boundaries.

## 6. Verify the profile and record its limits

Start with read-only bounded local probes after confirming the processes use
the disposable target:

```bash
curl --fail --max-time 10 http://localhost:3001/api/health/live
curl --fail --max-time 10 http://localhost:3001/api/health/ready
curl --fail --max-time 10 http://localhost:3000/api/health/live
curl --fail --max-time 10 http://localhost:3002/api/health/live
```

Direct API liveness, dependency readiness and frontend-proxy reachability prove
different things. Then use a synthetic role to log in and verify an authorized
workflow, a meaningful denied action, expected persisted records and unfinished
work. A passing health probe or seeded record count is not a complete clinical
day, worker/provider result or tenant-isolation verdict.

Relevant existing checks, with results recorded separately:

```bash
pnpm lint
pnpm verify:standard
pnpm --filter @docita/api run check-types
pnpm --filter @docita/app run check-types
pnpm --filter @docita/internal run check-types
```

**General API E2E is destructive.** `apps/api/test/setup.ts` can run
`prisma db push --accept-data-loss --force-reset` and `TRUNCATE ... CASCADE`.
Do not add `test:e2e` to the commands above while the development database URL
is active. Provision a separate owned disposable test database, positively
verify every test loader/URL, and resolve the Compose host-port conflict before
running the test guide's E2E commands. Never run reset-based tests against an
arbitrary environment URL. The isolated metrics suite has a different scope;
it does not certify the general E2E setup or full application schema/RLS.

For each attempt retain revision, profile, target identity without credentials,
commands, expected versus observed result and unresolved limitation. Do not
turn an unexecuted command list or partial successful check into a completed
fresh-start or production-readiness claim.

## Source references and next steps

- [Root quick start](../ONBOARDING.md) — stage map and local addresses.
- [AGENTS.md](../../AGENTS.md) — repository workflow and runtime requirements.
- [Testing](../testing/TESTING.md) — tests and their prerequisites.
- [Architecture](../architecture/ARCHITECTURE.md) — component responsibilities.
- [RLS rollout](../compliance/RLS_ROLLOUT.md) — real runtime roles/policies.
- [Deployment](../operations/DEPLOYMENT.md) and [release evidence](../operations/RELEASE_EVIDENCE_CHECKLIST.md) — hosted operating decisions, outside this local setup.
- Inspected source: `package.json`, `packages/db/package.json`,
  `packages/db/prisma.config.ts`, `docker-compose.yml`, `apps/api/src/app.module.ts`,
  `apps/api/src/worker.module.ts`, `apps/worker/src/main.ts`,
  `apps/api/src/shared/modules/config/env-schema.ts`,
  `apps/api/src/shared/modules/queue/pdf-processor-registration.ts`,
  `apps/api/src/domains/documents/infrastructure/local-storage.provider.ts`
  and the app `.env.example`/Vite/package files.
