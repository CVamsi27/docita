#!/usr/bin/env node
/**
 * Two-clinic PostgreSQL matrix for the migration's tenant policy contract.
 *
 * Background
 * ----------
 * Tenant context, ABAC and RLS policies exist in source. Source presence is not
 * an execution result: enforcement depends on applied policies, the connection
 * role's privileges (a superuser or table owner bypasses RLS entirely), and
 * whether the tenant GUCs reach the connection that runs the query.
 *
 * The matrix executes on disposable fixture tables, not production tenant rows.
 * Catalog checks verify public tenant-table RLS coverage and configured-role
 * privileges. These checks do not certify every production policy expression.
 * Fixture writes in matrix cases are rolled back; fixture setup is dropped.
 *
 * Usage
 * -----
 *   pnpm --filter @workspace/db run db:check-tenant-isolation
 *   pnpm --filter @workspace/db run db:check-tenant-isolation -- --json
 *   pnpm --filter @workspace/db run db:check-tenant-isolation -- --strict-preconditions
 *
 * Reads `DATABASE_URL` from the environment, then `.env`, then `apps/api/.env`.
 * Set `TENANT_ISOLATION_ADMIN_DATABASE_URL` to a fixture administrator on the
 * same host, port and database to run the matrix as the DATABASE_URL app role.
 * Without it, developer mode creates a temporary non-owner login role.
 *
 * Severities
 * ----------
 * - `isolation`    — a tenant-isolation guarantee. Any failure fails the run.
 * - `coverage`     — policy coverage on the real schema. Fails the run when a
 *                    clinicId-bearing table has no policy, because that table
 *                    has no database-level tenant backstop at all.
 * - `precondition` — production readiness facts about the configured role and
 *                    the application role. Reported always; fails the run only
 *                    with `--strict-preconditions`, so a local run against the
 *                    owner role can still produce policy evidence.
 *
 * See docs/compliance/RLS_ROLLOUT.md and
 * packages/db/prisma/migrations/20260502143500_add_rls_policies.
 */

import { readFileSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..", "..");

const AS_JSON = process.argv.includes("--json");
const STRICT_PRECONDITIONS = process.argv.includes("--strict-preconditions");

const PROBE_ID = randomBytes(12).toString("hex");
const SCRATCH_SCHEMA = `rls_isolation_probe_${PROBE_ID}`;
const SCRATCH_ROLE = `rls_isolation_probe_role_${PROBE_ID}`;
const SCRATCH_PASSWORD = randomBytes(32).toString("hex");
const CLINIC_A = "clinic-isolation-a";
const CLINIC_B = "clinic-isolation-b";

const results = [];

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  for (const candidate of [".env", "apps/api/.env"]) {
    const envPath = resolve(ROOT, candidate);
    if (!existsSync(envPath)) continue;
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const match = line.match(/^DATABASE_URL\s*=\s*["']?([^"'\n]+)["']?/);
      if (match) return match[1].trim();
    }
  }
  throw new Error(
    "DATABASE_URL is not set and no .env with DATABASE_URL was found",
  );
}

function record(id, kind, description, passed, detail) {
  results.push({ id, kind, description, passed, detail });
  if (AS_JSON) return;
  const mark = passed ? "PASS" : "FAIL";
  process.stdout.write(`${mark}  ${id}  ${description}\n`);
  if (detail) process.stdout.write(`      ${detail}\n`);
}

/**
 * Runs `fn` inside a transaction whose role and GUCs are pinned, then rolls
 * back so no probe row survives. GUCs use `set_config(..., true)` — the
 * function form of SET LOCAL — matching `applyRlsScope` in the API.
 */
async function scoped(client, { role, rlsEnabled, clinicId }, fn) {
  await client.query("BEGIN");
  try {
    if (role) await client.query(`SET LOCAL ROLE ${role}`);
    if (rlsEnabled !== undefined) {
      await client.query(`SELECT set_config('app.rls_enabled', $1, true)`, [
        rlsEnabled ? "on" : "off",
      ]);
    }
    if (clinicId !== undefined) {
      await client.query(
        `SELECT set_config('app.current_clinic_id', $1, true)`,
        [clinicId],
      );
    }
    return await fn();
  } finally {
    await client.query("ROLLBACK");
  }
}

/** Captures either the error SQLSTATE or the literal 'accepted'. */
async function attempt(fn) {
  try {
    await fn();
    return "accepted";
  } catch (error) {
    return error.code ?? String(error);
  }
}

async function main() {
  const url = loadDatabaseUrl();
  const { default: pg } = await import("pg").catch(() => ({ default: null }));
  if (!pg) {
    throw new Error("pg client not available — install with `pnpm add -D pg`");
  }

  const configured = new pg.Client({ connectionString: url });
  const adminUrl = process.env.TENANT_ISOLATION_ADMIN_DATABASE_URL?.trim();
  const owner = adminUrl
    ? new pg.Client({ connectionString: adminUrl })
    : configured;
  // Compare the driver's effective target, including query-string overrides.
  const target = configured.connectionParameters;
  const adminTarget = owner.connectionParameters;
  if (
    target.host !== adminTarget.host ||
    target.port !== adminTarget.port ||
    target.database !== adminTarget.database
  ) {
    throw new Error(
      "Fixture administrator must target the same database host, port and name as DATABASE_URL",
    );
  }
  let ownerRole = target.user;
  let loginRole = target.user;
  let appClient;
  let schemaCreated = false;
  let roleCreated = false;

  try {
    await configured.connect();
    await configured.query("SET TIME ZONE 'UTC'");
    if (owner !== configured) {
      await owner.connect();
      await owner.query("SET TIME ZONE 'UTC'");
    }
    const version = await configured.query(
      "SELECT current_setting('server_version_num')::int AS version",
    );
    // PG16 distinguishes SET permission from membership; older versions let
    // every direct or indirect member assume a granted role.
    const assumePrivilege =
      version.rows[0].version >= 160000 ? "SET" : "MEMBER";
    const roleRow = await configured.query(
      `SELECT current_user AS role, session_user AS login_role, rolcreaterole,
        has_database_privilege(current_user, current_database(), 'CREATE') AS can_create_schema,
        EXISTS (
          SELECT 1 FROM pg_roles reachable
          WHERE (reachable.rolname IN (current_user, session_user)
            OR pg_has_role(session_user, reachable.oid, $1))
            AND (reachable.rolsuper OR reachable.rolbypassrls OR EXISTS (
              SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
              WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
                AND pg_has_role(reachable.oid, c.relowner, 'USAGE')
                AND EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid = c.oid
                  AND a.attname = 'clinicId' AND a.attnum > 0 AND NOT a.attisdropped)
            ))
        ) AS can_assume_bypass_role
       FROM pg_roles WHERE rolname = current_user`,
      [assumePrivilege],
    );
    ownerRole = roleRow.rows[0]?.role ?? ownerRole;
    loginRole = roleRow.rows[0]?.login_role ?? loginRole;
    const ownerBypasses =
      roleRow.rows.length === 0 ||
      roleRow.rows[0].can_assume_bypass_role === true;
    if (
      !adminUrl &&
      (!roleRow.rows[0]?.can_create_schema || !roleRow.rows[0]?.rolcreaterole)
    ) {
      throw new Error(
        "Fixture precondition requires TENANT_ISOLATION_ADMIN_DATABASE_URL for this application role",
      );
    }
    const policyText = `AS PERMISSIVE FOR ALL TO PUBLIC
      USING (
        current_setting('app.rls_enabled', true) IS DISTINCT FROM 'on'
        OR "clinicId" = current_setting('app.current_clinic_id', true)
      )
      WITH CHECK (
        current_setting('app.rls_enabled', true) IS DISTINCT FROM 'on'
        OR "clinicId" = current_setting('app.current_clinic_id', true)
      )`;

    // ------------------------------------------------------------------
    // Fixture. `record` mirrors a tenant table (clinicId + the migration's
    // exact policy). `child` mirrors a tenant relation, so the matrix can
    // prove a JOIN does not widen scope. `unscoped` has no clinicId, which
    // puts it outside the policy matrix by construction.
    // ------------------------------------------------------------------
    await owner.query(`CREATE SCHEMA ${SCRATCH_SCHEMA}`);
    schemaCreated = true;
    await owner.query(`
      CREATE TABLE ${SCRATCH_SCHEMA}.record (
        id text PRIMARY KEY,
        "clinicId" text NOT NULL,
        value text
      )
    `);
    await owner.query(`
      INSERT INTO ${SCRATCH_SCHEMA}.record (id, "clinicId", value) VALUES
        ('a-1', '${CLINIC_A}', 'a1'),
        ('a-2', '${CLINIC_A}', 'a2'),
        ('b-1', '${CLINIC_B}', 'b1')
    `);
    await owner.query(`
      CREATE TABLE ${SCRATCH_SCHEMA}.child (
        id text PRIMARY KEY,
        "recordId" text NOT NULL,
        "clinicId" text NOT NULL,
        note text
      )
    `);
    await owner.query(`
      INSERT INTO ${SCRATCH_SCHEMA}.child (id, "recordId", "clinicId", note) VALUES
        ('ca-1', 'a-1', '${CLINIC_A}', 'child of a-1'),
        ('cb-1', 'b-1', '${CLINIC_B}', 'child of b-1')
    `);
    await owner.query(`
      CREATE TABLE ${SCRATCH_SCHEMA}.unscoped (
        id text PRIMARY KEY
      )
    `);
    await owner.query(
      `INSERT INTO ${SCRATCH_SCHEMA}.unscoped (id) VALUES ('global-1')`,
    );

    // Non-owner login role with the same attributes as the migration's
    // docita_app role.
    const matrixRole = adminUrl ? ownerRole : SCRATCH_ROLE;
    if (!adminUrl) {
      await owner.query(
        `CREATE ROLE ${SCRATCH_ROLE} LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE PASSWORD '${SCRATCH_PASSWORD}'`,
      );
      roleCreated = true;
    }
    const quotedMatrixRole = `"${matrixRole.replaceAll('"', '""')}"`;
    await owner.query(
      `GRANT USAGE ON SCHEMA ${SCRATCH_SCHEMA} TO ${quotedMatrixRole}`,
    );
    await owner.query(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA ${SCRATCH_SCHEMA} TO ${quotedMatrixRole}`,
    );
    for (const table of ["record", "child"]) {
      await owner.query(
        `ALTER TABLE ${SCRATCH_SCHEMA}.${table} ENABLE ROW LEVEL SECURITY`,
      );
      await owner.query(
        `CREATE POLICY tenant_isolation ON ${SCRATCH_SCHEMA}.${table} ${policyText}`,
      );
    }

    // ------------------------------------------------------------------
    // Preconditions: role privileges and operator provisioning.
    // ------------------------------------------------------------------
    const ownerScopedRead = await scoped(
      configured,
      { rlsEnabled: true, clinicId: CLINIC_A },
      () =>
        configured
          .query(`SELECT count(*)::int AS n FROM ${SCRATCH_SCHEMA}.record`)
          .then((r) => r.rows[0].n),
    );
    record(
      "S01-00",
      "precondition",
      "configured DATABASE_URL login and reachable roles cannot bypass RLS",
      !ownerBypasses && ownerScopedRead === 2,
      `role=${ownerRole} login_role=${loginRole} reachable_rls_bypass=${ownerBypasses}; ` +
        `scoped read with rls on returned ${ownerScopedRead} row(s) ` +
        `(3 = the role bypasses RLS, 2 = it does not)`,
    );

    const appRole = await owner.query(
      `SELECT rolcanlogin FROM pg_roles WHERE rolname = 'docita_app'`,
    );
    record(
      "S01-15",
      "precondition",
      "docita_app exists and can log in",
      appRole.rows.length === 1 && appRole.rows[0].rolcanlogin === true,
      appRole.rows.length === 0
        ? "docita_app is missing; run packages/db/scripts/provision-docita-app-role.sql"
        : `rolcanlogin=${appRole.rows[0].rolcanlogin}; the API/worker DATABASE_URL must ` +
            `point at this role or policies never bind`,
    );

    // Non-owner client for the isolation matrix.
    if (adminUrl) {
      appClient = configured;
    } else {
      const appUrl = new URL(url);
      appUrl.username = SCRATCH_ROLE;
      appUrl.password = SCRATCH_PASSWORD;
      appUrl.searchParams.delete("user");
      appUrl.searchParams.delete("password");
      appClient = new pg.Client({ connectionString: appUrl.toString() });
      await appClient.connect();
      await appClient.query("SET TIME ZONE 'UTC'");
    }

    const countByClinic = () =>
      appClient
        .query(
          `SELECT "clinicId", count(*)::int AS n FROM ${SCRATCH_SCHEMA}.record GROUP BY 1 ORDER BY 1`,
        )
        .then((r) => r.rows);

    // ------------------------------------------------------------------
    // Reads.
    // ------------------------------------------------------------------
    const offRows = await scoped(
      appClient,
      { rlsEnabled: false, clinicId: CLINIC_A },
      countByClinic,
    );
    record(
      "S01-01",
      "isolation",
      "rls_enabled=off leaves behavior unchanged (staged rollout contract)",
      offRows.length === 2,
      `rows=${JSON.stringify(offRows)}`,
    );

    const aRows = await scoped(
      appClient,
      { rlsEnabled: true, clinicId: CLINIC_A },
      countByClinic,
    );
    record(
      "S01-02",
      "isolation",
      "scoped read sees only its own tenant",
      aRows.length === 1 && aRows[0].clinicId === CLINIC_A && aRows[0].n === 2,
      `scope=${CLINIC_A} rows=${JSON.stringify(aRows)}`,
    );

    const bRows = await scoped(
      appClient,
      { rlsEnabled: true, clinicId: CLINIC_B },
      countByClinic,
    );
    record(
      "S01-03",
      "isolation",
      "the other tenant scope sees only the other tenant",
      bRows.length === 1 && bRows[0].clinicId === CLINIC_B && bRows[0].n === 1,
      `scope=${CLINIC_B} rows=${JSON.stringify(bRows)}`,
    );

    // Raw SQL / primary-key probe: no existence disclosure.
    const crossRead = await scoped(
      appClient,
      { rlsEnabled: true, clinicId: CLINIC_A },
      () =>
        appClient
          .query(`SELECT id FROM ${SCRATCH_SCHEMA}.record WHERE id = 'b-1'`)
          .then((r) => r.rows),
    );
    record(
      "S01-04",
      "isolation",
      "cross-tenant read by primary key returns no row",
      crossRead.length === 0,
      `rows=${JSON.stringify(crossRead)}`,
    );

    // Relation probe: a JOIN across two tenant tables must not widen scope.
    const joinRows = await scoped(
      appClient,
      { rlsEnabled: true, clinicId: CLINIC_A },
      () =>
        appClient
          .query(
            `SELECT r.id, c.id AS child_id
               FROM ${SCRATCH_SCHEMA}.record r
               JOIN ${SCRATCH_SCHEMA}.child c ON c."recordId" = r.id
              ORDER BY r.id`,
          )
          .then((r) => r.rows),
    );
    record(
      "S01-05",
      "isolation",
      "a JOIN across tenant relations stays inside the scope",
      joinRows.length === 1 && joinRows[0].id === "a-1",
      `rows=${JSON.stringify(joinRows)}; the clinic-B join row must not appear`,
    );

    // ------------------------------------------------------------------
    // Writes.
    // ------------------------------------------------------------------
    const crossInsert = await scoped(
      appClient,
      { rlsEnabled: true, clinicId: CLINIC_A },
      () =>
        attempt(() =>
          appClient.query(
            `INSERT INTO ${SCRATCH_SCHEMA}.record (id, "clinicId", value) VALUES ('sneak', $1, 'sneak')`,
            [CLINIC_B],
          ),
        ),
    );
    record(
      "S01-06",
      "isolation",
      "cross-tenant insert is rejected by WITH CHECK",
      crossInsert === "42501",
      `outcome=${crossInsert} (42501 = row-level security violation)`,
    );

    const crossUpdate = await scoped(
      appClient,
      { rlsEnabled: true, clinicId: CLINIC_A },
      () =>
        appClient
          .query(
            `UPDATE ${SCRATCH_SCHEMA}.record SET value = 'hijack' WHERE "clinicId" = $1`,
            [CLINIC_B],
          )
          .then((r) => r.rowCount),
    );
    record(
      "S01-07",
      "isolation",
      "cross-tenant update affects zero rows",
      crossUpdate === 0,
      `rowCount=${crossUpdate}`,
    );

    const crossDelete = await scoped(
      appClient,
      { rlsEnabled: true, clinicId: CLINIC_A },
      () =>
        appClient
          .query(`DELETE FROM ${SCRATCH_SCHEMA}.record WHERE "clinicId" = $1`, [
            CLINIC_B,
          ])
          .then((r) => r.rowCount),
    );
    record(
      "S01-08",
      "isolation",
      "cross-tenant delete affects zero rows",
      crossDelete === 0,
      `rowCount=${crossDelete}`,
    );

    // ------------------------------------------------------------------
    // Missing tenant scope must fail closed in both USING and WITH CHECK.
    // ------------------------------------------------------------------
    const noScopeRead = await scoped(appClient, { rlsEnabled: true }, () =>
      appClient
        .query(`SELECT count(*)::int AS n FROM ${SCRATCH_SCHEMA}.record`)
        .then((r) => r.rows[0].n),
    );
    record(
      "S01-09",
      "isolation",
      "rls_enabled=on with no clinic scope fails closed for reads",
      noScopeRead === 0,
      `visible_rows=${noScopeRead}`,
    );

    const noScopeWrite = await scoped(appClient, { rlsEnabled: true }, () =>
      attempt(() =>
        appClient.query(
          `INSERT INTO ${SCRATCH_SCHEMA}.record (id, "clinicId", value) VALUES ('no-scope', $1, 'no-scope')`,
          [CLINIC_B],
        ),
      ),
    );
    record(
      "S01-10",
      "isolation",
      "rls_enabled=on with no clinic scope fails closed for writes",
      noScopeWrite === "42501",
      `outcome=${noScopeWrite}; 'accepted' would mean the policy fails open`,
    );

    // ------------------------------------------------------------------
    // Connection-state hygiene.
    // ------------------------------------------------------------------
    const afterRollback = await appClient
      .query(`SELECT current_setting('app.current_clinic_id', true) AS scope`)
      .then((r) => r.rows[0].scope);
    record(
      "S01-11",
      "isolation",
      "SET LOCAL scope does not survive the transaction",
      afterRollback === "" || afterRollback === null,
      `scope_after_rollback=${JSON.stringify(afterRollback)}`,
    );

    // A session-level SET (is_local=false) is deliberately committed to prove
    // the pooled-connection hazard: the value is still visible to the next
    // statement, so any scope write that forgets `true` leaks into unrelated
    // requests on the same pooled connection.
    await appClient.query("BEGIN");
    await appClient.query(
      `SELECT set_config('app.rls_enabled', 'on', false), set_config('app.current_clinic_id', $1, false)`,
      [CLINIC_A],
    );
    await appClient.query("COMMIT");
    const leakedScope = await appClient
      .query(`SELECT current_setting('app.current_clinic_id', true) AS scope`)
      .then((r) => r.rows[0].scope);
    record(
      "S01-12",
      "isolation",
      "session-level SET leaks past COMMIT (pooled-connection hazard)",
      leakedScope === CLINIC_A,
      `scope_after_session_set=${JSON.stringify(leakedScope)}; this is why every scope ` +
        `write must use set_config(..., true) or SET LOCAL`,
    );
    await appClient.query("DISCARD ALL");

    const afterDiscard = await appClient
      .query(`SELECT current_setting('app.current_clinic_id', true) AS scope`)
      .then((r) => r.rows[0].scope);
    record(
      "S01-13",
      "isolation",
      "DISCARD ALL clears a leaked scope before connection reuse",
      afterDiscard === "" || afterDiscard === null,
      `scope_after_discard=${JSON.stringify(afterDiscard)}`,
    );

    // ------------------------------------------------------------------
    // Privileged access is a policy decision, not a database one.
    // ------------------------------------------------------------------
    const bypassRead = await scoped(
      appClient,
      { rlsEnabled: false, clinicId: CLINIC_A },
      countByClinic,
    );
    record(
      "S01-14",
      "isolation",
      "rls off spans tenants by design (INTERNAL/worker bypass surface)",
      bypassRead.length === 2,
      `rows=${JSON.stringify(bypassRead)}; privileged paths rely on application ` +
        `scoping, and the annotation guard in check-rls-bypass-annotation.mjs ` +
        `keeps each bypass justified`,
    );

    // ------------------------------------------------------------------
    // Coverage: the real schema. A clinicId table without a policy has no
    // database-level tenant backstop at all.
    // ------------------------------------------------------------------
    const coverage = await configured.query(`
      SELECT c.relname, c.relrowsecurity,
        EXISTS (SELECT 1 FROM pg_policy p
          WHERE p.polrelid = c.oid AND p.polname = 'tenant_isolation') AS has_policy
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
        AND EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid = c.oid
          AND a.attname = 'clinicId' AND a.attnum > 0 AND NOT a.attisdropped)
      ORDER BY c.relname
    `);
    const clinic_tables = coverage.rows.length;
    const covered = coverage.rows.filter((row) => row.relrowsecurity).length;
    const policies = coverage.rows.filter((row) => row.has_policy).length;
    const uncovered = coverage.rows
      .filter((row) => !row.relrowsecurity || !row.has_policy)
      .map(
        (row) =>
          `${row.relname} (rls=${row.relrowsecurity}, policy=${row.has_policy})`,
      );

    record(
      "S01-16",
      "coverage",
      "every clinicId-bearing public table has RLS and a tenant_isolation policy",
      clinic_tables > 0 && uncovered.length === 0,
      `clinic_tables=${clinic_tables} rls_enabled=${covered} policies=${policies}` +
        (uncovered.length > 0
          ? `\n      uncovered (${uncovered.length}): ${uncovered.join(", ")}\n` +
            `      the policy loop in 20260502143500_add_rls_policies only ran once; ` +
            `tables added afterwards need the loop re-applied`
          : ""),
    );

    const unscopedRead = await scoped(
      appClient,
      { rlsEnabled: true, clinicId: CLINIC_A },
      () =>
        appClient
          .query(`SELECT count(*)::int AS n FROM ${SCRATCH_SCHEMA}.unscoped`)
          .then((r) => r.rows[0].n),
    );
    record(
      "S01-17",
      "isolation",
      "a relation without a clinicId column is outside the policy matrix",
      unscopedRead === 1,
      `visible_rows=${unscopedRead}; the global fixture row remains visible because ` +
        "relations without clinicId require application scoping",
    );
  } finally {
    const cleanupFailures = [];
    const cleanup = async (label, operation) => {
      try {
        await operation();
      } catch (error) {
        cleanupFailures.push(
          `${label}: ${error instanceof Error ? error.message : "cleanup failed"}`,
        );
      }
    };
    if (appClient && appClient !== owner)
      await cleanup("matrix connection", () => appClient.end());
    if (schemaCreated)
      await cleanup("fixture schema", () =>
        owner.query(`DROP SCHEMA ${SCRATCH_SCHEMA} CASCADE`),
      );
    if (roleCreated)
      await cleanup("fixture role", () =>
        owner.query(`DROP ROLE ${SCRATCH_ROLE}`),
      );
    if (configured !== owner && configured !== appClient)
      await cleanup("configured connection", () => configured.end());
    await cleanup("administrator connection", () => owner.end());
    record(
      "S01-18",
      "isolation",
      "owned fixture resources and connections are cleaned up",
      cleanupFailures.length === 0,
      cleanupFailures.length
        ? cleanupFailures.join("; ")
        : "only this invocation's schema and temporary role were removed",
    );
  }

  const isolationFailures = results.filter(
    (r) => !r.passed && r.kind !== "precondition",
  );
  const preconditionFailures = results.filter(
    (r) => !r.passed && r.kind === "precondition",
  );
  const gatingFailures = STRICT_PRECONDITIONS
    ? [...isolationFailures, ...preconditionFailures]
    : isolationFailures;

  if (AS_JSON) {
    process.stdout.write(
      JSON.stringify(
        {
          databaseRole: ownerRole,
          databaseLoginRole: loginRole,
          matrixRole: adminUrl ? ownerRole : SCRATCH_ROLE,
          fixtureAdministrationSeparate: Boolean(adminUrl),
          validationScope:
            "scratch policy matrix and public tenant-table RLS coverage",
          strictPreconditions: STRICT_PRECONDITIONS,
          generatedAt: new Date().toISOString(),
          results,
          passed:
            results.length -
            isolationFailures.length -
            preconditionFailures.length,
          isolationFailures: isolationFailures.map((r) => r.id),
          preconditionFailures: preconditionFailures.map((r) => r.id),
        },
        null,
        2,
      ) + "\n",
    );
  } else {
    const passed = results.filter((r) => r.passed).length;
    process.stdout.write(`\n${passed}/${results.length} cases passed.\n`);
    if (preconditionFailures.length > 0) {
      process.stdout.write(
        `\nPreconditions not met (${preconditionFailures.length}): ${preconditionFailures
          .map((r) => r.id)
          .join(", ")}` +
          (STRICT_PRECONDITIONS
            ? ""
            : " — rerun with --strict-preconditions to gate on these") +
          "\n",
      );
    }
    if (isolationFailures.length > 0) {
      process.stderr.write(
        `\nFAIL — ${isolationFailures.length} isolation/coverage case(s) did not hold: ${isolationFailures
          .map((r) => r.id)
          .join(", ")}\n`,
      );
    }
  }

  process.exit(gatingFailures.length > 0 ? 1 : 0);
}

main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.stack : String(error)}\n`,
  );
  process.exit(1);
});
