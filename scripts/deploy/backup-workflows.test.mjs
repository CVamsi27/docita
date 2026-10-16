import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";
import YAML from "yaml";

const root = path.resolve(new URL("../../", import.meta.url).pathname);
const SHA = "c".repeat(40);
const DIGEST = `sha256:${"d".repeat(64)}`;
const PRIVATE = "synthetic-publish-token-never-print";
const PUBLIC_FILES = [
  "backup.Dockerfile",
  "backup-database.mjs",
  "backup-database-role.mjs",
  "backup-environment.mjs",
  "backup-alerts.mjs",
  "check-backup-freshness.mjs",
  "run-backup-monitor.mjs",
  "run-backup-writer.mjs",
  "backup-job-lifecycle.mjs",
  "run-backup-cycle.mjs",
];

function workflow(name) {
  return YAML.parse(
    readFileSync(path.join(root, ".github/workflows", name), "utf8"),
  );
}

function allowed(expression, overrides = {}, vars = {}) {
  return runInNewContext(expression.replace(/^\$\{\{\s*|\s*\}\}$/g, ""), {
    github: {
      ref: "refs/heads/main",
      repository: "CVamsi27/docita",
      event_name: "workflow_dispatch",
      ...overrides,
    },
    vars,
  });
}

test("scheduled backups run only from the activated production repository with read-only permissions", () => {
  const source = workflow("database-backup.yml");
  assert.deepEqual(Object.keys(source.on).sort(), [
    "schedule",
    "workflow_dispatch",
  ]);
  assert.deepEqual(source.on.schedule, [{ cron: "17 * * * *" }]);
  assert.deepEqual(source.permissions, { contents: "read", packages: "read" });
  assert.equal(source.concurrency["cancel-in-progress"], false);
  assert.equal(Object.keys(source.jobs).length, 1);
  const job = Object.values(source.jobs)[0];
  assert.equal(job["runs-on"], "ubuntu-24.04");
  assert.equal(job["timeout-minutes"], 35);
  assert.equal(job.environment, "Database Backups");
  assert.equal(allowed(job.if, {}, { DOCITA_BACKUPS_ENABLED: "true" }), true);
  for (const override of [
    { ref: "refs/heads/feature" },
    { repository: "someone/docita" },
    { event_name: "pull_request" },
  ])
    assert.equal(
      allowed(job.if, override, { DOCITA_BACKUPS_ENABLED: "true" }),
      false,
    );
  assert.equal(allowed(job.if, {}, {}), false);
  assert.equal(allowed(job.if, {}, { DOCITA_BACKUPS_ENABLED: "false" }), false);
  const execution = job.steps.find(
    (step) => step.run === "node scripts/deploy/run-backup-container.mjs",
  );
  assert.ok(execution);
  assert.equal(
    execution.env.DOCITA_BACKUP_IMAGE,
    "${{ vars.DOCITA_BACKUP_IMAGE }}",
  );
  assert.equal(execution.env.GITHUB_TOKEN, "${{ github.token }}");
  for (const name of Object.keys(execution.env))
    assert.ok(
      !/EMAIL|WEBHOOK|AUTH_TOKEN|^AWS_|^DATABASE_URL$/.test(name),
      name,
    );
  for (const step of job.steps.filter((entry) => entry.uses)) {
    assert.match(step.uses, /@[a-f0-9]{40}$/);
    if (step.uses.startsWith("actions/checkout@")) {
      assert.equal(step.with["persist-credentials"], false);
      assert.equal(step.with.ref, "${{ github.sha }}");
    }
  }
});

test("image publication accepts only manual main execution with the minimal write permission", () => {
  const source = workflow("publish-backup-image.yml");
  assert.deepEqual(Object.keys(source.on), ["workflow_dispatch"]);
  assert.equal(
    source.on.workflow_dispatch.inputs.expected_commit.required,
    true,
  );
  const job = Object.values(source.jobs)[0];
  assert.equal(job["runs-on"], "ubuntu-24.04");
  assert.equal(job["timeout-minutes"], 15);
  assert.deepEqual(source.permissions, { contents: "read", packages: "write" });
  assert.equal(allowed(job.if), true);
  for (const override of [
    { ref: "refs/heads/feature" },
    { repository: "someone/docita" },
    { event_name: "push" },
  ])
    assert.equal(allowed(job.if, override), false);
  const checkout = job.steps.find((step) =>
    step.uses?.startsWith("actions/checkout@"),
  );
  assert.match(checkout.uses, /@[a-f0-9]{40}$/);
  assert.equal(checkout.with["persist-credentials"], false);
  assert.equal(checkout.with.ref, "${{ github.sha }}");
  const scanner = job.steps.find((step) =>
    step.uses?.startsWith("aquasecurity/setup-trivy@"),
  );
  assert.ok(scanner, "Publication must install the official image scanner");
  assert.match(scanner.uses, /@[a-f0-9]{40}$/);
  assert.match(scanner.with.version, /^v\d+\.\d+\.\d+$/);
});

async function publish({
  expected = SHA,
  visibility = "private",
  fail = "",
  digest = DIGEST,
} = {}) {
  const temporary = mkdtempSync(
    path.join(tmpdir(), "docita-publish-workflow-test-"),
  );
  const bin = path.join(temporary, "bin");
  mkdirSync(bin);
  mkdirSync(path.join(temporary, "scripts/db"), { recursive: true });
  for (const name of PUBLIC_FILES)
    writeFileSync(
      path.join(temporary, "scripts/db", name),
      `public fixture: ${name}`,
    );
  writeFileSync(path.join(temporary, "scripts/db/.env.git"), PRIVATE);
  writeFileSync(
    path.join(temporary, "scripts/db/backup-secret.identity"),
    PRIVATE,
  );
  writeFileSync(path.join(temporary, ".env.git"), PRIVATE);
  const events = path.join(temporary, "events.jsonl");
  writeFileSync(events, "");
  writeFileSync(
    path.join(bin, "docker"),
    `#!${process.execPath}
import { appendFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const args = process.argv.slice(2);
const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const input = Buffer.concat(chunks);
const archive = args[0] === 'build' ? spawnSync('tar', ['-tf', '-'], { input, encoding:'utf8' }).stdout.trim().split('\\n') : [];
appendFileSync(${JSON.stringify(events)}, JSON.stringify({ args, archive, input: args[0] === 'login' ? input.toString() : '', config:process.env.DOCKER_CONFIG, tokenInEnvironment:process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN })+'\\n');
if (args[0] === ${JSON.stringify(fail)}) process.exit(42);
if (args[0] === 'buildx') process.stdout.write(JSON.stringify({digest:${JSON.stringify(digest)}}));
`,
    { mode: 0o700 },
  );
  writeFileSync(
    path.join(bin, "trivy"),
    `#!${process.execPath}
import { appendFileSync } from 'node:fs';
const args = process.argv.slice(2);
appendFileSync(${JSON.stringify(events)}, JSON.stringify({ scanner:args, config:process.env.DOCKER_CONFIG })+'\\n');
if (${JSON.stringify(fail === "scan")}) process.exit(42);
`,
    { mode: 0o700 },
  );
  writeFileSync(
    path.join(bin, "gh"),
    `#!${process.execPath}
import { appendFileSync } from 'node:fs';
appendFileSync(${JSON.stringify(events)}, JSON.stringify({ api:process.argv.slice(2) })+'\\n');
process.stdout.write(${JSON.stringify(visibility)}+'\\n');
`,
    { mode: 0o700 },
  );
  const source = workflow("publish-backup-image.yml");
  const commands = Object.values(source.jobs)[0]
    .steps.filter((step) => step.run)
    .map((step) => step.run);
  let output = "";
  let code;
  try {
    for (const command of commands) {
      const child = spawn("bash", ["-euo", "pipefail", "-c", command], {
        cwd: temporary,
        env: {
          PATH: `${bin}${path.delimiter}${process.env.PATH}`,
          GITHUB_REF: "refs/heads/main",
          GITHUB_REPOSITORY: "CVamsi27/docita",
          GITHUB_EVENT_NAME: "workflow_dispatch",
          GITHUB_SHA: SHA,
          GITHUB_ACTOR: "CVamsi27",
          EXPECTED_COMMIT: expected,
          GITHUB_TOKEN: PRIVATE,
          GITHUB_OUTPUT: path.join(temporary, "outputs"),
          GITHUB_STEP_SUMMARY: path.join(temporary, "summary"),
        },
        stdio: ["ignore", "pipe", "pipe"],
      });
      child.stdout.on("data", (chunk) => (output += chunk));
      child.stderr.on("data", (chunk) => (output += chunk));
      code = await new Promise((resolve) => child.once("close", resolve));
      if (code !== 0) break;
    }
    return {
      code,
      output,
      records: readFileSync(events, "utf8")
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line)),
      handoff: existsSync(path.join(temporary, "outputs"))
        ? readFileSync(path.join(temporary, "outputs"), "utf8")
        : "",
    };
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

test("publication passes only public tooling files and returns the inspected registry digest", async () => {
  const result = await publish();
  assert.equal(result.code, 0, result.output);
  assert.doesNotMatch(result.output, new RegExp(PRIVATE));
  const records = result.records.filter((record) => record.args);
  assert.deepEqual(
    records.map((record) => record.args[0]),
    ["login", "build", "push", "buildx"],
  );
  const build = records.find((record) => record.args[0] === "build");
  assert.deepEqual(build.archive.sort(), PUBLIC_FILES.toSorted());
  assert.equal(build.args[build.args.indexOf("--target") + 1], "cycle");
  assert.equal(build.args[build.args.indexOf("--platform") + 1], "linux/amd64");
  assert.equal(build.args.at(-1), "-");
  assert.equal(records[0].input, PRIVATE);
  const scan = result.records.find((record) => record.scanner);
  assert.ok(scan, "An image must be scanned before it can be published");
  assert.deepEqual(scan.scanner, [
    "image",
    "--config",
    "/dev/null",
    "--image-src",
    "docker",
    "--scanners",
    "vuln",
    "--pkg-types",
    "os,library",
    "--severity",
    "HIGH,CRITICAL",
    "--exit-code",
    "1",
    "--ignorefile",
    "/dev/null",
    "--format",
    "json",
    "--output",
    `${scan.config}/trivy.json`,
    `ghcr.io/cvamsi27/docita-backup:sha-${SHA}`,
  ]);
  assert.ok(
    result.records.indexOf(scan) <
      result.records.findIndex((record) => record.args?.[0] === "push"),
  );
  for (const record of records) {
    assert.equal(record.tokenInEnvironment, undefined);
    assert.equal(existsSync(record.config), false);
    assert.doesNotMatch(JSON.stringify(record.args), new RegExp(PRIVATE));
  }
  assert.match(
    result.handoff,
    new RegExp(`ghcr.io/cvamsi27/docita-backup@${DIGEST}`),
  );
  assert.match(result.handoff, new RegExp(SHA));
});

for (const expected of ["short", "e".repeat(40), `${SHA}\nextra`])
  test("publication refuses an unreviewed or malformed expected source identity", async () => {
    const result = await publish({ expected });
    assert.notEqual(result.code, 0);
    assert.deepEqual(result.records, []);
  });

test("publication refuses an existing public package before login or push", async () => {
  const result = await publish({ visibility: "public" });
  assert.notEqual(result.code, 0);
  assert.equal(
    result.records.some((record) => record.args),
    false,
  );
});

for (const fail of ["build", "push"])
  test(`publication cleans registry authentication when ${fail} fails`, async () => {
    const result = await publish({ fail });
    assert.notEqual(result.code, 0);
    assert.equal(result.handoff, "");
    for (const record of result.records.filter((record) => record.config))
      assert.equal(existsSync(record.config), false);
    assert.doesNotMatch(result.output, new RegExp(PRIVATE));
  });

test("publication rejects the rebuilt image on scanner failure without pushing and removes registry authentication", async () => {
  const result = await publish({ fail: "scan" });
  assert.notEqual(result.code, 0);
  assert.equal(
    result.records.some((record) => record.args?.[0] === "push"),
    false,
  );
  assert.equal(result.handoff, "");
  for (const record of result.records.filter((record) => record.config))
    assert.equal(existsSync(record.config), false);
});

test("publication refuses a malformed registry digest rather than handing off a tag", async () => {
  const result = await publish({ digest: "not-a-registry-digest" });
  assert.notEqual(result.code, 0);
  assert.equal(result.handoff, "");
});
