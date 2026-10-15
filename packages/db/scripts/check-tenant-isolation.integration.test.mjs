import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { after, before, describe, test } from "node:test";
import pg from "pg";

const adminUrl = process.env.TENANT_ISOLATION_TEST_ADMIN_URL;
const script = new URL("./check-tenant-isolation.mjs", import.meta.url);

describe("tenant isolation release probe", { skip: !adminUrl }, () => {
  let admin;
  let applicationUrl;

  before(async () => {
    const url = new URL(adminUrl);
    assert.ok(
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname),
      "Integration fixtures must use an owned local database",
    );
    assert.match(url.pathname, /\/docita_isolation_fixture_test$/);
    admin = new pg.Client({ connectionString: adminUrl });
    await admin.connect();
    const password = randomBytes(24).toString("hex");
    await admin.query(
      `CREATE ROLE docita_app LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE PASSWORD '${password}'`,
    );
    url.username = "docita_app";
    url.password = password;
    applicationUrl = url.toString();
    await admin.query(`
      CREATE TABLE public."ProbeCovered" (id text PRIMARY KEY, "clinicId" text NOT NULL);
      ALTER TABLE public."ProbeCovered" ENABLE ROW LEVEL SECURITY;
      CREATE POLICY tenant_isolation ON public."ProbeCovered"
        USING ("clinicId" = current_setting('app.current_clinic_id', true))
        WITH CHECK ("clinicId" = current_setting('app.current_clinic_id', true));
    `);
  });

  after(async () => {
    if (!admin) return;
    await admin.query('DROP TABLE IF EXISTS public."ProbeCovered" CASCADE');
    await admin.query(
      'DROP TABLE IF EXISTS public."ProbeMissingPolicy" CASCADE',
    );
    await admin.query(
      'DROP TABLE IF EXISTS public."ProbeUnrelatedPolicy" CASCADE',
    );
    await admin.query("DROP ROLE IF EXISTS docita_app");
    await admin.end();
  });

  function probe(overrides = {}, flags = ["--strict-preconditions", "--json"]) {
    const result = spawnSync(process.execPath, [script.pathname, ...flags], {
      encoding: "utf8",
      timeout: 30000,
      env: {
        ...process.env,
        DATABASE_URL: applicationUrl,
        TENANT_ISOLATION_ADMIN_DATABASE_URL: adminUrl,
        ...overrides,
      },
    });
    const output = result.stdout.trim();
    let report;
    if (output) {
      try {
        report = JSON.parse(output);
      } catch {
        assert.fail("Tenant-isolation probe emitted invalid JSON");
      }
    }
    return {
      code: result.status,
      stderr: result.stderr,
      report,
    };
  }

  test("strict proof runs as the non-owner application role using separate fixture administration", async () => {
    const result = probe();
    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.report.databaseRole, "docita_app");
    assert.deepEqual(result.report.preconditionFailures, []);
    assert.deepEqual(result.report.isolationFailures, []);
    assert.equal(
      result.report.results.find((r) => r.id === "S01-00").passed,
      true,
    );
    const leftovers = await admin.query(
      "SELECT nspname FROM pg_namespace WHERE nspname LIKE 'rls_isolation_probe%'",
    );
    assert.equal(leftovers.rowCount, 0);
  });

  test("strict proof rejects owner credentials even with a separate fixture administrator", () => {
    const result = probe({ DATABASE_URL: adminUrl });
    assert.equal(result.code, 1);
    assert.ok(result.report.preconditionFailures.includes("S01-00"));
  });

  test("owner login credentials cannot claim strict readiness by setting an application startup role", () => {
    const effectiveApp = new URL(adminUrl);
    effectiveApp.searchParams.set("options", "-c role=docita_app");
    const result = probe({ DATABASE_URL: effectiveApp.toString() });
    assert.equal(result.code, 1, result.stderr);
    assert.equal(result.report.databaseRole, "docita_app");
    assert.equal(result.report.matrixRole, "docita_app");
    assert.ok(result.report.preconditionFailures.includes("S01-00"));
  });

  test("a safe non-owner login can set the application startup role", async () => {
    const loginRole = `probe_login_${randomBytes(8).toString("hex")}`;
    const password = randomBytes(24).toString("hex");
    await admin.query(
      `CREATE ROLE ${loginRole} LOGIN NOINHERIT PASSWORD '${password}'`,
    );
    await admin.query(`GRANT docita_app TO ${loginRole}`);
    try {
      const effectiveApp = new URL(applicationUrl);
      effectiveApp.username = loginRole;
      effectiveApp.password = password;
      effectiveApp.searchParams.set("options", "-c role=docita_app");
      const result = probe({ DATABASE_URL: effectiveApp.toString() });
      assert.equal(result.code, 0, result.stderr);
      assert.equal(result.report.databaseRole, "docita_app");
      assert.equal(result.report.matrixRole, "docita_app");
      assert.deepEqual(result.report.preconditionFailures, []);
    } finally {
      await admin.query(`DROP ROLE ${loginRole}`);
    }
  });

  for (const capability of ["SUPERUSER", "BYPASSRLS", "TENANT_OWNER"]) {
    test(`strict proof rejects an indirectly reachable ${capability} role`, async () => {
      const suffix = randomBytes(8).toString("hex");
      const privilegedRole = `probe_privileged_${suffix}`;
      const intermediateRole = `probe_member_${suffix}`;
      await admin.query(
        `CREATE ROLE ${privilegedRole} NOLOGIN ${capability === "TENANT_OWNER" ? "" : capability}`,
      );
      await admin.query(`CREATE ROLE ${intermediateRole} NOLOGIN NOINHERIT`);
      await admin.query(
        `GRANT ${privilegedRole} TO ${intermediateRole} WITH INHERIT FALSE, SET TRUE`,
      );
      await admin.query(
        `GRANT ${intermediateRole} TO docita_app WITH INHERIT FALSE, SET TRUE`,
      );
      if (capability === "TENANT_OWNER") {
        await admin.query(
          `ALTER TABLE public."ProbeCovered" OWNER TO ${privilegedRole}`,
        );
      }
      try {
        const client = new pg.Client({ connectionString: applicationUrl });
        await client.connect();
        try {
          await client.query(`SET ROLE ${privilegedRole}`);
          const role = await client.query("SELECT current_user AS role");
          assert.equal(role.rows[0].role, privilegedRole);
        } finally {
          await client.end();
        }
        const result = probe();
        assert.equal(result.code, 1, result.stderr);
        assert.ok(result.report.preconditionFailures.includes("S01-00"));
      } finally {
        if (capability === "TENANT_OWNER") {
          const owner = await admin.query("SELECT current_user AS role");
          const quotedOwner = `"${owner.rows[0].role.replaceAll('"', '""')}"`;
          await admin.query(
            `ALTER TABLE public."ProbeCovered" OWNER TO ${quotedOwner}`,
          );
        }
        await admin.query(`DROP ROLE ${intermediateRole}`);
        await admin.query(`DROP ROLE ${privilegedRole}`);
      }
    });
  }

  test("PG16 membership with both SET and INHERIT disabled cannot assume a bypass role", async () => {
    const privilegedRole = `probe_unreachable_${randomBytes(8).toString("hex")}`;
    await admin.query(`CREATE ROLE ${privilegedRole} NOLOGIN BYPASSRLS`);
    await admin.query(
      `GRANT ${privilegedRole} TO docita_app WITH INHERIT FALSE, SET FALSE`,
    );
    try {
      const client = new pg.Client({ connectionString: applicationUrl });
      await client.connect();
      try {
        await assert.rejects(client.query(`SET ROLE ${privilegedRole}`), {
          code: "42501",
        });
      } finally {
        await client.end();
      }
      const result = probe();
      assert.equal(result.code, 0, result.stderr);
      assert.deepEqual(result.report.preconditionFailures, []);
    } finally {
      await admin.query(`DROP ROLE ${privilegedRole}`);
    }
  });

  test("strict application credentials require an explicit fixture administrator", () => {
    const result = probe({ TENANT_ISOLATION_ADMIN_DATABASE_URL: "" });
    assert.equal(result.code, 1);
    assert.match(
      result.stderr,
      /precondition.*TENANT_ISOLATION_ADMIN_DATABASE_URL/i,
    );
  });

  test("a policy on an unrelated table cannot conceal a tenant table missing its policy", async () => {
    await admin.query(`
      CREATE TABLE public."ProbeMissingPolicy" (id text PRIMARY KEY, "clinicId" text NOT NULL);
      ALTER TABLE public."ProbeMissingPolicy" ENABLE ROW LEVEL SECURITY;
      CREATE TABLE public."ProbeUnrelatedPolicy" (id text PRIMARY KEY);
      ALTER TABLE public."ProbeUnrelatedPolicy" ENABLE ROW LEVEL SECURITY;
      CREATE POLICY tenant_isolation ON public."ProbeUnrelatedPolicy" USING (true);
    `);
    try {
      const result = probe({ DATABASE_URL: adminUrl });
      assert.equal(result.code, 1);
      assert.ok(result.report.isolationFailures.includes("S01-16"));
      const coverage = result.report.results.find((r) => r.id === "S01-16");
      assert.match(coverage.detail, /ProbeMissingPolicy/);
    } finally {
      await admin.query('DROP TABLE public."ProbeMissingPolicy" CASCADE');
      await admin.query('DROP TABLE public."ProbeUnrelatedPolicy" CASCADE');
    }
  });

  test("a fixture administrator for a different database is rejected before setup", () => {
    const other = new URL(adminUrl);
    other.pathname = "/another_database";
    const result = probe({
      TENANT_ISOLATION_ADMIN_DATABASE_URL: other.toString(),
    });
    assert.equal(result.code, 1);
    assert.match(result.stderr, /same database/i);
  });

  test("administrator URL query parameters cannot redirect fixture mutations", () => {
    const other = new URL(adminUrl);
    other.searchParams.set("port", "1");
    const result = probe({
      TENANT_ISOLATION_ADMIN_DATABASE_URL: other.toString(),
    });
    assert.equal(result.code, 1);
    assert.match(result.stderr, /same database/i);
  });

  test("developer owner mode keeps policy evidence without claiming strict readiness", () => {
    const result = probe(
      { DATABASE_URL: adminUrl, TENANT_ISOLATION_ADMIN_DATABASE_URL: "" },
      ["--json"],
    );
    assert.equal(result.code, 0, result.stderr);
    assert.deepEqual(result.report.isolationFailures, []);
    assert.ok(result.report.preconditionFailures.includes("S01-00"));
  });

  test("the unscoped relation probe observes an existing global row", () => {
    const result = probe({ DATABASE_URL: adminUrl });
    const relation = result.report.results.find((r) => r.id === "S01-17");
    assert.equal(relation.passed, true);
    assert.match(relation.detail, /visible_rows=1/);
  });

  test("a probe never deletes another invocation's schema or role", async () => {
    await admin.query("CREATE SCHEMA rls_isolation_probe");
    await admin.query("CREATE TABLE rls_isolation_probe.sentinel (id text)");
    await admin.query("CREATE ROLE rls_isolation_probe_role NOLOGIN");
    try {
      const result = probe({ DATABASE_URL: adminUrl });
      assert.ok(result.report);
      const existing = await admin.query(`
        SELECT to_regclass('rls_isolation_probe.sentinel') IS NOT NULL AS schema_preserved,
          EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rls_isolation_probe_role') AS role_preserved
      `);
      assert.equal(existing.rows[0].schema_preserved, true);
      assert.equal(existing.rows[0].role_preserved, true);
    } finally {
      await admin.query("DROP SCHEMA IF EXISTS rls_isolation_probe CASCADE");
      await admin.query("DROP ROLE IF EXISTS rls_isolation_probe_role");
    }
  });
});
