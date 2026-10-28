# Operational metrics SQL fixtures

These tests execute the production repository's Prisma SQL against PostgreSQL. They verify aggregate definitions with synthetic rows; they do not benchmark the API, demonstrate tenant authorization or establish customer adoption.

Use Node 24 and the repository's pinned pnpm. First provision a disposable local database named `docita_capacity_*` whose test role may create schemas. Then run from the repository root:

```bash
export DOCITA_METRICS_TEST_DATABASE_URL=postgresql://docita@127.0.0.1:5434/docita_capacity_metrics
export DATABASE_URL="$DOCITA_METRICS_TEST_DATABASE_URL"
NODE_ENV=test pnpm --filter @docita/api exec jest \
  --config test/metrics/jest.config.mjs --runInBand
```

The dedicated configuration bypasses the normal E2E setup. It never loads a root environment file, pushes a schema, resets a database or starts an API/worker. The target guard requires a loopback host, a `docita_capacity_*` database and no URL options. Invalid targets fail before connecting, and errors do not echo supplied credentials.

Each run creates a randomly named `docita_metrics_*` schema with only the aggregate's projected columns, sets that schema as its search path, and drops that same schema in cleanup. It leaves other schemas and the database in place. Tests exercise actual window, scope, denominator and percentile behavior rather than matching query text. A failed local process can leave its owned schema behind; inspect only that run's `docita_metrics_*` schema before removing it.

The fixtures include delayed persistence, probe/internal traffic, invalid durations, the exclusive end boundary, repeat visits across clinic-patient pairs, cancelled appointments, prescriptions without PDFs, invoice statuses and an empty window. The production query uses PostgreSQL interpolated percentiles; the separate HTTP soak uses nearest-rank percentiles. Their algorithms and observation boundaries should remain explicit in evidence.

The volume fixture additionally inserts25 synthetic clinics via appointment keys, 26,000 completed appointments, 20,000 distinct clinic/patient pairs, 20,800 prescription records, 26,000 invoices and 520,000 customer observation rows. It checks exact aggregate counts, then rolls that fixture back. Tables contain only columns projected by this query, not the full application schema, indexes, RLS or foreign keys. Supplied latency values are inputs; none is a measured API duration. This is aggregate correctness at modeled row volume, not a full-stack capacity benchmark.
