import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const PRIVATE = "synthetic-private-input-never-publish";
const IMAGE = `ghcr.io/cvamsi27/docita-backup@sha256:${"a".repeat(64)}`;
const launcher = new URL("./run-backup-container.mjs", import.meta.url);

function fixture(overrides = {}, scenario = {}) {
  const root = mkdtempSync(path.join(tmpdir(), "docita-backup-launcher-test-"));
  const events = path.join(root, "events.jsonl");
  const state = path.join(root, "container-active");
  writeFileSync(events, "");
  writeFileSync(
    path.join(root, "docker"),
    `#!${process.execPath}
import { appendFileSync, existsSync, rmSync, statSync, writeFileSync } from 'node:fs';
const args = process.argv.slice(2);
let input = '';
for await (const chunk of process.stdin) input += chunk;
appendFileSync(${JSON.stringify(events)}, JSON.stringify({ args, env: process.env, input, configMode: statSync(process.env.DOCKER_CONFIG).mode & 0o777 }) + '\\n');
process.stdout.write(${JSON.stringify(PRIVATE)});
process.stderr.write(${JSON.stringify(PRIVATE)});
if (args[0] === 'run') writeFileSync(${JSON.stringify(state)}, 'running');
if (args[0] === 'rm') rmSync(${JSON.stringify(state)}, { force: true });
if (args[0] === ${JSON.stringify(scenario.hang ?? "")}) {
  process.on('SIGTERM', () => {});
  setInterval(() => {}, 1000);
} else if (args[0] === ${JSON.stringify(scenario.fail ?? "")}) process.exit(42);
`,
    { mode: 0o700 },
  );
  const environment = {
    PATH: `${root}${path.delimiter}${process.env.PATH}`,
    GITHUB_REF: "refs/heads/main",
    GITHUB_REPOSITORY: "CVamsi27/docita",
    GITHUB_EVENT_NAME: "schedule",
    GITHUB_ACTOR: "CVamsi27",
    GITHUB_TOKEN: `${PRIVATE}-registry`,
    DOCITA_BACKUPS_ENABLED: "true",
    DOCITA_BACKUP_IMAGE: IMAGE,
    BACKUP_DATABASE_URL: `postgresql://docita_backup:${PRIVATE}@fixture.neon.tech/neondb?sslmode=verify-full`,
    BACKUP_ACCESS_KEY_ID: "writer-access",
    BACKUP_SECRET_ACCESS_KEY: `${PRIVATE}-writer`,
    BACKUP_S3_ENDPOINT: "https://fixture.r2.cloudflarestorage.com",
    BACKUP_BUCKET: "docita-db-backups",
    BACKUP_AGE_RECIPIENT: `age1${"q".repeat(58)}`,
    BACKUP_SOURCE_ID: "docita-production",
    BACKUP_MONITOR_ACCESS_KEY_ID: "reader-access",
    BACKUP_MONITOR_SECRET_ACCESS_KEY: `${PRIVATE}-reader`,
    BACKUP_MONITOR_S3_ENDPOINT: "https://fixture.r2.cloudflarestorage.com",
    BACKUP_MONITOR_BUCKET: "docita-db-backups",
    BACKUP_MONITOR_AGE_RECIPIENT: `age1${"q".repeat(58)}`,
    BACKUP_CYCLE_SENTRY_DSN: `https://${"b".repeat(32)}@fixture.ingest.sentry.io/42`,
    BACKUP_CYCLE_SENTRY_SLUG: "docita-backup-cycle",
    DATABASE_URL: PRIVATE,
    AWS_SECRET_ACCESS_KEY: PRIVATE,
    AWS_ACCESS_KEY_ID: PRIVATE,
    BACKUP_MONITOR_EMAIL_TOKEN: PRIVATE,
    BACKUP_MONITOR_ALERT_WEBHOOK_URL: PRIVATE,
    SENTRY_AUTH_TOKEN: PRIVATE,
    SENTRY_DSN: PRIVATE,
    DOCKER_HOST: "tcp://untrusted.invalid:2375",
    BACKUP_MAX_DURATION_SECONDS: "7200",
    BACKUP_MONITOR_MAX_DURATION_SECONDS: "600",
    BACKUP_MAX_BYTES: "4294967296",
    BACKUP_MONITOR_MAX_BYTES: "4294967296",
    BACKUP_TLS_CA_FILE: "/untrusted/ca.pem",
    BACKUP_TEMP_DIR: "/untrusted/tmp",
    ...overrides,
  };
  let output = "";
  const child = spawn(process.execPath, [launcher.pathname], {
    env: environment,
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk) => (output += chunk));
  child.stderr.on("data", (chunk) => (output += chunk));
  const deadline = setTimeout(() => child.kill("SIGKILL"), 10000);
  const finished = new Promise((resolve) =>
    child.once("close", (code, signal) => {
      clearTimeout(deadline);
      resolve({ code, signal, output });
    }),
  );
  const records = () =>
    readFileSync(events, "utf8")
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  return {
    child,
    records,
    finished,
    active: () => existsSync(state),
    close: () => rmSync(root, { recursive: true, force: true }),
  };
}

test("runs only the approved digest with bounded isolation and explicit credential names", async () => {
  const run = fixture();
  try {
    const result = await run.finished;
    assert.equal(result.code, 0, result.output);
    assert.doesNotMatch(result.output, new RegExp(PRIVATE));
    const records = run.records();
    assert.deepEqual(
      records.map((record) => record.args[0]),
      ["login", "pull", "run", "rm"],
    );
    assert.deepEqual(records[0].args, [
      "login",
      "ghcr.io",
      "--username",
      "CVamsi27",
      "--password-stdin",
    ]);
    assert.equal(records[0].input, `${PRIVATE}-registry\n`);
    assert.deepEqual(records[1].args, ["pull", IMAGE]);
    const container = records[2];
    assert.equal(container.args.at(-1), IMAGE);
    for (const [flag, value] of [
      ["--memory", "512m"],
      ["--memory-swap", "512m"],
      ["--cpus", "1"],
      ["--pids-limit", "128"],
      ["--user", "node"],
      ["--cap-drop", "ALL"],
      ["--security-opt", "no-new-privileges"],
      [
        "--tmpfs",
        "/tmp:rw,nosuid,nodev,noexec,size=160m,uid=1000,gid=1000,mode=0700",
      ],
    ])
      assert.equal(container.args[container.args.indexOf(flag) + 1], value);
    assert.ok(container.args.includes("--read-only"));
    assert.ok(!container.args.includes("--privileged"));
    assert.ok(!container.args.includes("--volume"));
    assert.doesNotMatch(
      JSON.stringify(records.map((record) => record.args)),
      new RegExp(PRIVATE),
    );
    for (const record of records) {
      assert.equal(record.configMode, 0o700);
      assert.equal(existsSync(record.env.DOCKER_CONFIG), false);
      for (const name of [
        "GITHUB_TOKEN",
        "DATABASE_URL",
        "AWS_SECRET_ACCESS_KEY",
        "AWS_ACCESS_KEY_ID",
        "BACKUP_MONITOR_EMAIL_TOKEN",
        "BACKUP_MONITOR_ALERT_WEBHOOK_URL",
        "SENTRY_AUTH_TOKEN",
        "SENTRY_DSN",
        "DOCKER_HOST",
      ])
        assert.equal(record.env[name], undefined, name);
    }
    for (const record of [records[0], records[1], records[3]])
      assert.equal(record.env.BACKUP_DATABASE_URL, undefined);
    assert.equal(container.env.BACKUP_MAX_BYTES, "67108864");
    assert.equal(container.env.BACKUP_MONITOR_MAX_BYTES, "67108864");
    assert.equal(container.env.BACKUP_MAX_DURATION_SECONDS, "1200");
    assert.equal(container.env.BACKUP_MONITOR_MAX_DURATION_SECONDS, "300");
    assert.equal(container.env.BACKUP_TLS_CA_FILE, "system");
    assert.equal(container.env.BACKUP_TEMP_DIR, "/tmp");
    for (const name of [
      "BACKUP_DATABASE_URL",
      "BACKUP_ACCESS_KEY_ID",
      "BACKUP_SECRET_ACCESS_KEY",
      "BACKUP_MONITOR_ACCESS_KEY_ID",
      "BACKUP_MONITOR_SECRET_ACCESS_KEY",
      "BACKUP_CYCLE_SENTRY_DSN",
    ])
      assert.ok(container.args.includes(name), name);
    assert.equal(run.active(), false);
  } finally {
    run.close();
  }
});

for (const [label, overrides] of [
  ["feature ref", { GITHUB_REF: "refs/heads/fix/unreviewed" }],
  ["foreign repository", { GITHUB_REPOSITORY: "someone/docita" }],
  ["pull request event", { GITHUB_EVENT_NAME: "pull_request" }],
  ["disabled schedule", { DOCITA_BACKUPS_ENABLED: "false" }],
  [
    "tagged image",
    { DOCITA_BACKUP_IMAGE: "ghcr.io/cvamsi27/docita-backup:latest" },
  ],
  [
    "foreign registry image",
    {
      DOCITA_BACKUP_IMAGE: `evil.invalid/cvamsi27/docita-backup@sha256:${"a".repeat(64)}`,
    },
  ],
  ["missing writer secret", { BACKUP_SECRET_ACCESS_KEY: "" }],
  ["missing reader secret", { BACKUP_MONITOR_SECRET_ACCESS_KEY: "" }],
  ["missing registry token", { GITHUB_TOKEN: "" }],
  ["missing cycle DSN", { BACKUP_CYCLE_SENTRY_DSN: "" }],
  [
    "non-TLS DSN",
    {
      BACKUP_CYCLE_SENTRY_DSN: `http://${"b".repeat(32)}@fixture.ingest.sentry.io/42`,
    },
  ],
  ["missing activation", { DOCITA_BACKUPS_ENABLED: "" }],
  [
    "pooled database endpoint",
    {
      BACKUP_DATABASE_URL: `postgresql://docita_backup:${PRIVATE}@fixture-pooler.neon.tech/neondb?sslmode=verify-full`,
    },
  ],
  [
    "unverified database TLS",
    {
      BACKUP_DATABASE_URL: `postgresql://docita_backup:${PRIVATE}@fixture.neon.tech/neondb?sslmode=require`,
    },
  ],
  [
    "owner database role",
    {
      BACKUP_DATABASE_URL: `postgresql://neondb_owner:${PRIVATE}@fixture.neon.tech/neondb?sslmode=verify-full`,
    },
  ],
  ["reader identity mismatch", { BACKUP_MONITOR_BUCKET: "another-bucket" }],
  [
    "shared writer credential",
    { BACKUP_MONITOR_ACCESS_KEY_ID: "writer-access" },
  ],
  ["configuration newline", { BACKUP_BUCKET: "docita-db-backups\nprivate" }],
])
  test(`rejects ${label} before registry or container work`, async () => {
    const run = fixture(overrides);
    try {
      const result = await run.finished;
      assert.equal(result.code, 1);
      assert.equal(result.signal, null);
      assert.doesNotMatch(result.output, new RegExp(PRIVATE));
      assert.deepEqual(run.records(), []);
    } finally {
      run.close();
    }
  });

for (const command of ["login", "pull", "run"]) {
  test(`fails safely and removes owned resources when docker ${command} fails`, async () => {
    const run = fixture({}, { fail: command });
    try {
      const result = await run.finished;
      assert.equal(result.code, 1);
      assert.doesNotMatch(result.output, new RegExp(PRIVATE));
      const records = run.records();
      assert.equal(
        records.some((record) => record.args[0] === "rm"),
        command === "run",
      );
      for (const record of records)
        assert.equal(existsSync(record.env.DOCKER_CONFIG), false);
      assert.equal(run.active(), false);
    } finally {
      run.close();
    }
  });
}

test("interrupting an unresponsive run removes its owned container and registry credentials", async () => {
  const run = fixture(
    { GITHUB_EVENT_NAME: "workflow_dispatch" },
    { hang: "run" },
  );
  try {
    const started = Date.now();
    while (!run.active()) {
      assert.ok(Date.now() - started < 5000, "container did not start");
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    run.child.kill("SIGTERM");
    const result = await run.finished;
    assert.equal(result.code, 1);
    assert.equal(result.signal, null);
    assert.doesNotMatch(result.output, new RegExp(PRIVATE));
    const records = run.records();
    assert.equal(records.at(-1).args[0], "rm");
    assert.equal(run.active(), false);
    for (const record of records)
      assert.equal(existsSync(record.env.DOCKER_CONFIG), false);
  } finally {
    run.close();
  }
});
