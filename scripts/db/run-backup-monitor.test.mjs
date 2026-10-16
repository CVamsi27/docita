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
import { fileURLToPath } from "node:url";

const RUNNER = fileURLToPath(
  new URL("./run-backup-monitor.mjs", import.meta.url),
);
const PRIVATE = "synthetic-private-input-never-log";

async function fixture(scenario = {}, overrides = {}) {
  const root = mkdtempSync(path.join(tmpdir(), "docita-monitor-wrapper-test-"));
  const events = path.join(root, "reader.json");
  if (existsSync(RUNNER))
    copyFileSync(RUNNER, path.join(root, "run-backup-monitor.mjs"));
  copyFileSync(
    new URL("./backup-environment.mjs", import.meta.url),
    path.join(root, "backup-environment.mjs"),
  );
  copyFileSync(
    new URL("./backup-job-lifecycle.mjs", import.meta.url),
    path.join(root, "backup-job-lifecycle.mjs"),
  );
  writeFileSync(
    path.join(root, "check-backup-freshness.mjs"),
    `
import { writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
const scenario = ${JSON.stringify(scenario)};
const record = { args: process.argv.slice(2), env: process.env, pid: process.pid };
writeFileSync(${JSON.stringify(events)}, JSON.stringify(record));
process.stdout.write(${JSON.stringify(PRIVATE)});
process.stderr.write(${JSON.stringify(PRIVATE)});
if (scenario.flood) {
  const emit = () => { while (process.stdout.write(Buffer.alloc(65536))) {} };
  process.stdout.on('drain', emit); emit();
} else if (scenario.descendant) {
  const child = spawn(process.execPath, ['-e', "process.on('SIGTERM',()=>{});process.send('ready');setInterval(()=>{},100);"], { stdio: ['ignore', 'ignore', 'ignore', 'ipc'] });
  child.once('message', () => { record.descendant = child.pid; writeFileSync(${JSON.stringify(events)}, JSON.stringify(record)); process.exit(0); });
} else if (scenario.cleanupDelay) {
  process.on('SIGTERM', () => setTimeout(() => { record.cleaned = true; writeFileSync(${JSON.stringify(events)}, JSON.stringify(record)); process.exit(1); }, 800));
  setInterval(() => {}, 100);
} else if (scenario.hang) {
  process.on('SIGTERM', () => {}); setInterval(() => {}, 100);
} else process.exit(scenario.failed ? 1 : 0);
`,
  );
  const requests = [];
  const server = http.createServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += chunk;
    const lines = body.trimEnd().split("\n");
    requests.push({
      method: request.method,
      url: request.url,
      headers: request.headers,
      lines,
    });
    const status = JSON.parse(lines[2] ?? "{}").status;
    if (scenario.httpHang && status === "in_progress") return;
    if (scenario.reject === status) {
      response.writeHead(429);
      response.end(PRIVATE);
    } else if (scenario.redirect) {
      response.writeHead(302, { Location: "/leak" });
      response.end();
    } else if (scenario.oversized) response.end("x".repeat(17000));
    else {
      response.writeHead(200);
      response.end("{}");
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const env = {
    PATH: process.env.PATH,
    BACKUP_MONITOR_SENTRY_DSN: `http://${"a".repeat(32)}@127.0.0.1:${server.address().port}/42`,
    BACKUP_MONITOR_SENTRY_SLUG: "docita-backup-freshness",
    BACKUP_MONITOR_MAX_DURATION_SECONDS: "1",
    BACKUP_MONITOR_ALERT_PROVIDER: "zeptomail",
    BACKUP_MONITOR_EMAIL_TOKEN: PRIVATE,
    BACKUP_MONITOR_ACCESS_KEY_ID: "synthetic-read-only",
    BACKUP_MONITOR_SECRET_ACCESS_KEY: PRIVATE,
    BACKUP_DATABASE_URL: PRIVATE,
    DATABASE_URL: PRIVATE,
    AGE_SECRET_KEY: PRIVATE,
    SENTRY_DSN: "https://ambient-must-not-be-used.invalid/1",
    NODE_OPTIONS: "--trace-warnings",
    AWS_PROFILE: PRIVATE,
    ...overrides,
  };
  let child;
  return {
    requests,
    reader: () =>
      existsSync(events) ? JSON.parse(readFileSync(events, "utf8")) : null,
    start(args = []) {
      child = spawn(
        process.execPath,
        [path.join(root, "run-backup-monitor.mjs"), ...args],
        {
          env,
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      let stdout = "",
        stderr = "";
      child.stdout.on("data", (chunk) => {
        stdout += chunk;
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk;
      });
      const guard = setTimeout(() => child.kill("SIGKILL"), 14000);
      return new Promise((resolve, reject) => {
        child.once("error", reject);
        child.once("close", (status, signal) => {
          clearTimeout(guard);
          assert.equal(signal, null, stderr);
          assert.equal((stdout + stderr).includes(PRIVATE), false);
          resolve({ status, stdout, stderr });
        });
      });
    },
    signal: (signal) => child.kill(signal),
    async ready() {
      for (let count = 0; count < 100; count++) {
        if (existsSync(events)) return;
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      assert.fail("reader did not start");
    },
    async clean() {
      child?.kill("SIGKILL");
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
      rmSync(root, { recursive: true, force: true });
    },
  };
}

test("brackets a successful reader with one Sentry execution and explicit hourly schedule", async () => {
  const setup = await fixture();
  try {
    const result = await setup.start();
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).event, "backup_monitor_verified");
    assert.equal(setup.requests.length, 2);
    const [started, ended] = setup.requests.map((request) =>
      JSON.parse(request.lines[2]),
    );
    assert.equal(started.status, "in_progress");
    assert.equal(ended.status, "ok");
    assert.match(started.check_in_id, /^[a-f0-9]{32}$/);
    assert.equal(ended.check_in_id, started.check_in_id);
    assert.equal(started.monitor_slug, "docita-backup-freshness");
    assert.deepEqual(started.monitor_config, {
      schedule: { type: "crontab", value: "15 * * * *" },
      timezone: "Etc/UTC",
      checkin_margin: 10,
      max_runtime: 11,
      failure_issue_threshold: 1,
      recovery_threshold: 1,
    });
    assert.equal(typeof ended.duration, "number");
    for (const request of setup.requests) {
      assert.equal(request.method, "POST");
      assert.equal(request.url, "/api/42/envelope/");
      assert.equal(
        request.headers["content-type"],
        "application/x-sentry-envelope",
      );
      assert.equal(
        request.headers["x-sentry-auth"],
        `Sentry sentry_version=7,sentry_key=${"a".repeat(32)}`,
      );
      const item = JSON.parse(request.lines[1]);
      assert.equal(item.type, "check_in");
      assert.equal(item.length, Buffer.byteLength(request.lines[2]));
      assert.equal(request.lines.join("\n").includes(PRIVATE), false);
    }
    const reader = setup.reader();
    assert.deepEqual(reader.args, []);
    assert.equal(reader.env.BACKUP_MONITOR_EMAIL_TOKEN, PRIVATE);
    for (const name of [
      "BACKUP_DATABASE_URL",
      "DATABASE_URL",
      "AGE_SECRET_KEY",
      "SENTRY_DSN",
      "BACKUP_MONITOR_SENTRY_DSN",
      "NODE_OPTIONS",
      "AWS_PROFILE",
    ])
      assert.equal(reader.env[name], undefined, name);
  } finally {
    await setup.clean();
  }
});

test("a reader failure remains failure and sends error instead of ok", async () => {
  const setup = await fixture({ failed: true });
  try {
    const result = await setup.start();
    assert.equal(result.status, 1);
    assert.deepEqual(
      setup.requests.map((request) => JSON.parse(request.lines[2]).status),
      ["in_progress", "error"],
    );
  } finally {
    await setup.clean();
  }
});

for (const failed of [false, true])
  test(`check-only bypasses all check-ins and retains reader ${failed ? "failure" : "success"}`, async () => {
    const setup = await fixture(
      { failed },
      { BACKUP_MONITOR_SENTRY_DSN: "bad", BACKUP_MONITOR_SENTRY_SLUG: "" },
    );
    try {
      const result = await setup.start(["--check-only"]);
      assert.equal(result.status, failed ? 1 : 0);
      assert.equal(setup.requests.length, 0);
      assert.deepEqual(setup.reader().args, ["--check-only"]);
      assert.equal(setup.reader().env.BACKUP_MONITOR_EMAIL_TOKEN, undefined);
    } finally {
      await setup.clean();
    }
  });

for (const overrides of [
  { BACKUP_MONITOR_SENTRY_DSN: "" },
  { BACKUP_MONITOR_SENTRY_SLUG: "" },
  { BACKUP_MONITOR_SENTRY_SLUG: "has space" },
  {
    BACKUP_MONITOR_SENTRY_DSN:
      "http://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa@public.invalid/42",
  },
  {
    BACKUP_MONITOR_SENTRY_DSN:
      "https://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa:secret@example.invalid/42",
  },
  {
    BACKUP_MONITOR_SENTRY_DSN:
      "https://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa@example.invalid/42?secret=1",
  },
  { BACKUP_MONITOR_MAX_DURATION_SECONDS: "601" },
])
  test(`rejects invalid explicit wrapper configuration ${Object.keys(overrides).join()}`, async () => {
    const setup = await fixture({}, overrides);
    try {
      assert.equal((await setup.start()).status, 1);
      assert.equal(setup.requests.length, 0);
      assert.equal(setup.reader(), null);
    } finally {
      await setup.clean();
    }
  });

for (const reject of ["in_progress", "ok"])
  test(`rejected ${reject} check-in cannot report monitor success`, async () => {
    const setup = await fixture({ reject });
    try {
      assert.equal((await setup.start()).status, 1);
      assert.notEqual(setup.reader(), null);
      assert.equal(setup.requests.length, 2);
    } finally {
      await setup.clean();
    }
  });

for (const scenario of [
  { redirect: true },
  { oversized: true },
  { httpHang: true },
])
  test(`check-in boundary rejects ${Object.keys(scenario).join()} without retry`, async () => {
    const setup = await fixture(scenario);
    try {
      const began = Date.now();
      assert.equal((await setup.start()).status, 1);
      assert.equal(setup.requests.length, 2);
      assert.ok(Date.now() - began < 11000);
      assert.notEqual(setup.reader(), null);
    } finally {
      await setup.clean();
    }
  });

for (const scenario of [{ hang: true }, { flood: true }])
  test(`terminates a reader that exceeds its ${Object.keys(scenario).join()} bound`, async () => {
    const setup = await fixture(scenario);
    try {
      const began = Date.now();
      assert.equal((await setup.start()).status, 1);
      assert.ok(Date.now() - began < 11000);
      const reader = setup.reader();
      assert.throws(() => process.kill(reader.pid, 0), { code: "ESRCH" });
      assert.deepEqual(
        setup.requests.map((request) => JSON.parse(request.lines[2]).status),
        ["in_progress", "error"],
      );
    } finally {
      await setup.clean();
    }
  });

test("SIGTERM cleans up the reader and records failure", async () => {
  const setup = await fixture(
    { hang: true },
    { BACKUP_MONITOR_MAX_DURATION_SECONDS: "5" },
  );
  try {
    const result = setup.start();
    await setup.ready();
    setup.signal("SIGTERM");
    assert.equal((await result).status, 1);
    assert.throws(() => process.kill(setup.reader().pid, 0), { code: "ESRCH" });
    assert.deepEqual(
      setup.requests.map((request) => JSON.parse(request.lines[2]).status),
      ["in_progress", "error"],
    );
  } finally {
    await setup.clean();
  }
});

test("reader completion also removes descendants left in its process group", async () => {
  const setup = await fixture({ descendant: true });
  try {
    assert.equal((await setup.start()).status, 0);
    const descendant = setup.reader().descendant;
    assert.equal(typeof descendant, "number");
    assert.throws(() => process.kill(descendant, 0), { code: "ESRCH" });
  } finally {
    await setup.clean();
  }
});

test("unsupported arguments fail before any check-in or reader starts", async () => {
  const setup = await fixture();
  try {
    assert.equal((await setup.start(["--check-only", "unexpected"])).status, 1);
    assert.equal(setup.requests.length, 0);
    assert.equal(setup.reader(), null);
  } finally {
    await setup.clean();
  }
});

test("termination leaves the reader time to finish bounded descendant cleanup", async () => {
  const setup = await fixture(
    { cleanupDelay: true },
    { BACKUP_MONITOR_MAX_DURATION_SECONDS: "5" },
  );
  try {
    const result = setup.start();
    await setup.ready();
    setup.signal("SIGTERM");
    assert.equal((await result).status, 1);
    assert.equal(setup.reader().cleaned, true);
    assert.throws(() => process.kill(setup.reader().pid, 0), { code: "ESRCH" });
  } finally {
    await setup.clean();
  }
});
