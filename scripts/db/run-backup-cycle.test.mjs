import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import http from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const PRIVATE = "synthetic-cycle-private-input-never-log";

async function fixture(scenario = {}, overrides = {}) {
  const root = mkdtempSync(path.join(tmpdir(), "docita-cycle-test-"));
  const events = path.join(root, "events.jsonl");
  writeFileSync(events, "");
  for (const name of [
    "run-backup-cycle.mjs",
    "backup-job-lifecycle.mjs",
    "backup-environment.mjs",
  ]) {
    const source = new URL(`./${name}`, import.meta.url);
    if (existsSync(source)) copyFileSync(source, path.join(root, name));
  }
  for (const [script, label] of [
    ["backup-database.mjs", "writer"],
    ["check-backup-freshness.mjs", "reader"],
  ]) {
    writeFileSync(
      path.join(root, script),
      `
import {appendFileSync} from 'node:fs';
appendFileSync(${JSON.stringify(events)}, JSON.stringify({label:${JSON.stringify(label)},env:process.env,args:process.argv.slice(2)})+'\\n');
process.stdout.write(${JSON.stringify(PRIVATE)});
process.stderr.write(${JSON.stringify(PRIVATE)});
process.exit(${JSON.stringify(scenario.fail === label ? 1 : 0)});
`,
    );
  }
  const requests = [];
  const server = http.createServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += chunk;
    requests.push(JSON.parse(body.trimEnd().split("\n")[2]));
    response.writeHead(
      scenario.rejectStart && requests.length === 1 ? 429 : 200,
    );
    response.end("{}");
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const env = {
    PATH: process.env.PATH,
    BACKUP_CYCLE_SENTRY_DSN: `http://${"a".repeat(32)}@127.0.0.1:${server.address().port}/42`,
    BACKUP_CYCLE_SENTRY_SLUG: "docita-backup-cycle",
    BACKUP_MAX_DURATION_SECONDS: "1200",
    BACKUP_MONITOR_MAX_DURATION_SECONDS: "300",
    BACKUP_DATABASE_URL: PRIVATE,
    BACKUP_SECRET_ACCESS_KEY: PRIVATE,
    BACKUP_ACCESS_KEY_ID: "writer-access",
    BACKUP_SOURCE_ID: "docita-production",
    BACKUP_BUCKET: "docita-fixture-backups",
    BACKUP_S3_ENDPOINT: "https://fixture.r2.cloudflarestorage.com",
    BACKUP_AGE_RECIPIENT: `age1${"q".repeat(58)}`,
    BACKUP_MONITOR_SECRET_ACCESS_KEY: "separate-reader-secret",
    BACKUP_MONITOR_ACCESS_KEY_ID: "reader-access",
    BACKUP_MONITOR_BUCKET: "docita-fixture-backups",
    BACKUP_MONITOR_S3_ENDPOINT: "https://fixture.r2.cloudflarestorage.com",
    BACKUP_MONITOR_AGE_RECIPIENT: `age1${"q".repeat(58)}`,
    BACKUP_MONITOR_ALERT_PROVIDER: "zeptomail",
    BACKUP_MONITOR_EMAIL_TOKEN: PRIVATE,
    BACKUP_MONITOR_ALERT_EMAIL_TO: "not-inherited@example.invalid",
    BACKUP_SENTRY_DSN: PRIVATE,
    BACKUP_SENTRY_SLUG: "writer-not-used",
    BACKUP_MONITOR_SENTRY_DSN: PRIVATE,
    BACKUP_MONITOR_SENTRY_SLUG: "reader-not-used",
    SENTRY_DSN: PRIVATE,
    DATABASE_URL: PRIVATE,
    AGE_SECRET_KEY: PRIVATE,
    NODE_OPTIONS: "--trace-warnings",
    ...overrides,
  };
  return {
    requests,
    events: () =>
      readFileSync(events, "utf8")
        .trim()
        .split("\n")
        .filter(Boolean)
        .map(JSON.parse),
    async run(args = []) {
      const child = spawn(
        process.execPath,
        [path.join(root, "run-backup-cycle.mjs"), ...args],
        { env, stdio: ["ignore", "pipe", "pipe"] },
      );
      let stdout = "",
        stderr = "";
      child.stdout.on("data", (value) => {
        stdout += value;
      });
      child.stderr.on("data", (value) => {
        stderr += value;
      });
      const guard = setTimeout(() => child.kill("SIGKILL"), 10000);
      const result = await new Promise((resolve, reject) => {
        child.once("error", reject);
        child.once("close", (status, signal) => {
          clearTimeout(guard);
          resolve({ status, signal, stdout, stderr });
        });
      });
      assert.equal(result.signal, null, result.stderr);
      assert.equal((stdout + stderr).includes(PRIVATE), false);
      return result;
    },
    async clean() {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
      rmSync(root, { recursive: true, force: true });
    },
  };
}

test("one complete cycle checks writer then independently credentialed reader before one success", async () => {
  const setup = await fixture();
  try {
    const result = await setup.run();
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).event, "backup_cycle_verified");
    assert.equal(setup.requests.length, 2);
    const [start, end] = setup.requests;
    assert.equal(start.status, "in_progress");
    assert.equal(end.status, "ok");
    assert.equal(start.check_in_id, end.check_in_id);
    assert.equal(start.monitor_slug, "docita-backup-cycle");
    assert.deepEqual(start.monitor_config, {
      schedule: { type: "interval", value: 1, unit: "hour" },
      timezone: "Etc/UTC",
      checkin_margin: 15,
      max_runtime: 26,
      failure_issue_threshold: 1,
      recovery_threshold: 1,
    });
    const events = setup.events();
    assert.deepEqual(
      events.map((event) => event.label),
      ["writer", "reader"],
    );
    assert.deepEqual(events[0].args, []);
    assert.deepEqual(events[1].args, ["--check-only"]);
    assert.equal(events[0].env.BACKUP_DATABASE_URL, PRIVATE);
    assert.equal(events[0].env.BACKUP_MONITOR_ACCESS_KEY_ID, undefined);
    assert.equal(events[1].env.BACKUP_MONITOR_ACCESS_KEY_ID, "reader-access");
    assert.equal(
      events[1].env.BACKUP_MONITOR_SECRET_ACCESS_KEY,
      "separate-reader-secret",
    );
    for (const name of [
      "BACKUP_DATABASE_URL",
      "BACKUP_ACCESS_KEY_ID",
      "BACKUP_SECRET_ACCESS_KEY",
    ])
      assert.equal(events[1].env[name], undefined, name);
    for (const event of events)
      for (const name of [
        "BACKUP_CYCLE_SENTRY_DSN",
        "BACKUP_SENTRY_DSN",
        "BACKUP_MONITOR_SENTRY_DSN",
        "BACKUP_MONITOR_EMAIL_TOKEN",
        "BACKUP_MONITOR_ALERT_EMAIL_TO",
        "SENTRY_DSN",
        "DATABASE_URL",
        "AGE_SECRET_KEY",
        "NODE_OPTIONS",
      ])
        assert.equal(event.env[name], undefined, name);
  } finally {
    await setup.clean();
  }
});

for (const fail of ["writer", "reader"])
  test(`${fail} failure preserves cycle failure without false success`, async () => {
    const setup = await fixture({ fail });
    try {
      assert.equal((await setup.run()).status, 1);
      assert.deepEqual(
        setup.requests.map((event) => event.status),
        ["in_progress", "error"],
      );
      assert.deepEqual(
        setup.events().map((event) => event.label),
        fail === "writer" ? ["writer"] : ["writer", "reader"],
      );
    } finally {
      await setup.clean();
    }
  });

test("rejected cycle start still attempts both steps but remains failed", async () => {
  const setup = await fixture({ rejectStart: true });
  try {
    assert.equal((await setup.run()).status, 1);
    assert.deepEqual(
      setup.events().map((event) => event.label),
      ["writer", "reader"],
    );
    assert.deepEqual(
      setup.requests.map((event) => event.status),
      ["in_progress", "error"],
    );
  } finally {
    await setup.clean();
  }
});

test("cycle runtime includes both configured budgets", async () => {
  const setup = await fixture(
    {},
    {
      BACKUP_MAX_DURATION_SECONDS: "7200",
      BACKUP_MONITOR_MAX_DURATION_SECONDS: "600",
    },
  );
  try {
    assert.equal((await setup.run()).status, 0);
    assert.equal(setup.requests[0].monitor_config.max_runtime, 131);
  } finally {
    await setup.clean();
  }
});

for (const overrides of [
  { BACKUP_CYCLE_SENTRY_DSN: "" },
  { BACKUP_CYCLE_SENTRY_SLUG: "" },
  { BACKUP_MAX_DURATION_SECONDS: "7201" },
  { BACKUP_MONITOR_MAX_DURATION_SECONDS: "601" },
])
  test(`cycle fails closed for invalid ${Object.keys(overrides).join()}`, async () => {
    const setup = await fixture({}, overrides);
    try {
      assert.equal((await setup.run()).status, 1);
      assert.equal(setup.requests.length, 0);
      assert.deepEqual(setup.events(), []);
    } finally {
      await setup.clean();
    }
  });

test("check-only argument cannot unexpectedly dump a production database", async () => {
  const setup = await fixture();
  try {
    assert.equal((await setup.run(["--check-only"])).status, 1);
    assert.equal(setup.requests.length, 0);
    assert.deepEqual(setup.events(), []);
  } finally {
    await setup.clean();
  }
});

for (const overrides of [
  { BACKUP_MONITOR_BUCKET: "other-backup-bucket" },
  { BACKUP_MONITOR_S3_ENDPOINT: "https://other.r2.cloudflarestorage.com" },
  { BACKUP_MONITOR_AGE_RECIPIENT: `age1${"p".repeat(58)}` },
  { BACKUP_SOURCE_ID: "synthetic-fixture" },
  { BACKUP_MONITOR_ACCESS_KEY_ID: "writer-access" },
])
  test(`cycle refuses an unrelated reader ${Object.keys(overrides).join()}`, async () => {
    const setup = await fixture({}, overrides);
    try {
      assert.equal((await setup.run()).status, 1);
      assert.equal(setup.requests.length, 0);
      assert.deepEqual(setup.events(), []);
    } finally {
      await setup.clean();
    }
  });
