import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdtempSync,
  mkdirSync,
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
  new URL("./check-backup-freshness.mjs", import.meta.url),
);
const RECIPIENT = `age1${"q".repeat(58)}`;
const SECRET = "synthetic-monitor-credential-never-log";
const ID = "3a48abdd-bb40-4f18-bf30-bdafc01c914d";

function fixture(scenario = {}, overrides = {}) {
  const root = mkdtempSync(path.join(tmpdir(), "docita-freshness-test-"));
  const bin = path.join(root, "bin");
  mkdirSync(bin);
  const startedAt = new Date(
    Date.now() -
      (scenario.stale ? 3 * 3600000 : (scenario.ageMinutes ?? 10) * 60000),
  ).toISOString();
  const completedAt = new Date(Date.parse(startedAt) + 30000).toISOString();
  const cipher = Buffer.from(
    "age-encryption.org/v1\nopaque synthetic ciphertext",
  );
  const key = `docita-production/${startedAt.slice(0, 10)}/${ID}.dump.age`;
  const manifest = {
    version: 1,
    backupId: ID,
    sourceId: "docita-production",
    format: "postgresql-custom-age-v1",
    objectKey: key,
    startedAt,
    completedAt,
    ciphertextBytes: cipher.length,
    sha256: createHash("sha256").update(cipher).digest("hex"),
    recipientSha256: createHash("sha256").update(RECIPIENT).digest("hex"),
    pgDumpMajor: 17,
    ...scenario.manifest,
  };
  const events = path.join(root, "events.jsonl");
  writeFileSync(events, "");
  const executable = `#!${process.execPath}
const fs=require('node:fs');
const args=process.argv.slice(2), scenario=${JSON.stringify(scenario)}, key=${JSON.stringify(key)}, manifest=${JSON.stringify(manifest)};
fs.appendFileSync(${JSON.stringify(events)},JSON.stringify({args,env:process.env})+'\\n');
if(scenario.hang){process.on('SIGTERM',()=>{});setInterval(()=>{},100);}
else if(scenario.failure){process.stderr.write(${JSON.stringify(SECRET)});process.exit(1);}
else if(args.includes('--version'))process.stdout.write('aws-cli/2.32.7 Python/3.12 Linux');
else if(args.includes('list-objects-v2')){
 const prefix=args[args.indexOf('--prefix')+1], page=args.includes('--continuation-token');
 const objects=scenario.missing?[]:[{Key:key,LastModified:manifest.completedAt,Size:${cipher.length}},{Key:key.replace('.dump.age','.completed.json'),LastModified:manifest.completedAt,Size:600}];
 if(scenario.orphanMinutes)objects.push({Key:key.replace(${JSON.stringify(ID)},'34f4a949-d3c3-4710-8282-0e15f6a411c1'),LastModified:new Date(Date.now()-scenario.orphanMinutes*60000).toISOString(),Size:120});
 const listed=objects.filter(o=>o.Key.startsWith(prefix));
 process.stdout.write(scenario.badListing?'not-json':JSON.stringify({Contents:scenario.paginate&&!page?[]:listed,IsTruncated:!!(scenario.paginate&&!page),...(scenario.paginate&&!page?{NextContinuationToken:'fixture-next'}:{})}));
}else if(args.includes('cp')){
 const requested=args[args.indexOf('cp')+1];
 if(!requested.endsWith(key)&&!requested.endsWith(key.replace('.dump.age','.completed.json')))process.exit(42);
 else if(requested.endsWith('.json'))process.stdout.write(scenario.badManifest?'not-json':JSON.stringify(manifest));
 else if(scenario.flood){const emit=()=>{while(process.stdout.write(Buffer.alloc(65536))){};};process.stdout.on('drain',emit);emit();}
 else process.stdout.write(scenario.corrupt?'broken':Buffer.from(${JSON.stringify(cipher.toString("base64"))},'base64'));
}else process.exit(43);
`;
  writeFileSync(path.join(bin, "aws"), executable, { mode: 0o755 });
  const env = {
    PATH: bin,
    BACKUP_MONITOR_S3_ENDPOINT: "https://fixture.r2.cloudflarestorage.com",
    BACKUP_MONITOR_BUCKET: "docita-fixture-backups",
    BACKUP_MONITOR_AGE_RECIPIENT: RECIPIENT,
    BACKUP_MONITOR_ACCESS_KEY_ID: "synthetic-read-only-access",
    BACKUP_MONITOR_SECRET_ACCESS_KEY: SECRET,
    BACKUP_MONITOR_MAX_DURATION_SECONDS: "3",
    BACKUP_MONITOR_MAX_BYTES: "65536",
    BACKUP_DATABASE_URL:
      "postgresql://writer:never-inherit@production.invalid/db",
    BACKUP_SECRET_ACCESS_KEY: "writer-secret-never-inherit",
    AWS_PROFILE: "personal-profile-never-inherit",
    AGE_SECRET_KEY: "private-identity-never-inherit",
    ...overrides,
  };
  return {
    root,
    env,
    async run(args = ["--check-only"]) {
      const child = spawn(process.execPath, [RUNNER, ...args], {
        env,
        stdio: ["ignore", "pipe", "pipe"],
      });
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
        child.once("close", (status, signal) =>
          resolve({ status, signal, stdout, stderr }),
        );
      });
      clearTimeout(guard);
      assert.equal(result.signal, null, result.stderr);
      assert.equal((result.stdout + result.stderr).includes(SECRET), false);
      return result;
    },
    events: () =>
      readFileSync(events, "utf8")
        .trim()
        .split("\n")
        .filter(Boolean)
        .map(JSON.parse),
    clean: () => rmSync(root, { recursive: true, force: true }),
  };
}

test("verifies a completed fresh ciphertext without inheriting writer, database or identity credentials", async () => {
  const setup = fixture();
  try {
    const result = await setup.run();
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).event, "backup_freshness_verified");
    assert.equal(JSON.parse(result.stdout).alertSent, false);
    for (const event of setup.events()) {
      assert.equal(event.env.BACKUP_DATABASE_URL, undefined);
      assert.equal(event.env.BACKUP_SECRET_ACCESS_KEY, undefined);
      assert.equal(event.env.AGE_SECRET_KEY, undefined);
      assert.equal(event.env.AWS_PROFILE, undefined);
      assert.equal(event.env.AWS_SECRET_ACCESS_KEY, SECRET);
      assert.equal(event.args.includes(SECRET), false);
      assert.equal(
        event.args.some((value) => /put-object|delete-object/.test(value)),
        false,
      );
    }
  } finally {
    setup.clean();
  }
});

for (const [name, scenario] of [
  ["missing completion", { missing: true }],
  ["stale backup start", { stale: true }],
  [
    "old backup started before a recent completion",
    { stale: true, manifest: { completedAt: new Date().toISOString() } },
  ],
  [
    "newer upload missing a completion for over thirty minutes",
    { ageMinutes: 90, orphanMinutes: 35 },
  ],
  ["ciphertext corruption", { corrupt: true }],
  ["malformed listing", { badListing: true }],
  ["malformed manifest", { badManifest: true }],
  [
    "synthetic source",
    { manifest: { sourceId: "synthetic-recovery-fixture" } },
  ],
  ["wrong recipient", { manifest: { recipientSha256: "f".repeat(64) } }],
  [
    "future timestamp",
    { manifest: { completedAt: "2999-01-01T00:00:00.000Z" } },
  ],
  [
    "object substitution",
    { manifest: { objectKey: "docita-production/other.dump.age" } },
  ],
  ["zero ciphertext size", { manifest: { ciphertextBytes: 0 } }],
  ["untrusted provider error", { failure: true }],
  ["unbounded download", { flood: true }],
  ["child ignoring termination", { hang: true }],
]) {
  test(`fails closed on ${name}`, async () => {
    const setup = fixture(
      scenario,
      name === "child ignoring termination"
        ? { BACKUP_MONITOR_MAX_DURATION_SECONDS: "1" }
        : {},
    );
    try {
      const result = await setup.run();
      assert.equal(result.status, 1, result.stdout);
      assert.equal(result.stdout.includes("backup_freshness_verified"), false);
      assert.match(result.stderr, /Backup freshness failed:/);
    } finally {
      setup.clean();
    }
  });
}

test("follows an explicit continuation token before accepting a paginated completion", async () => {
  const setup = fixture({ paginate: true });
  try {
    const result = await setup.run();
    assert.equal(result.status, 0, result.stderr);
    assert.equal(
      setup.events().some((event) => event.args.includes("fixture-next")),
      true,
    );
  } finally {
    setup.clean();
  }
});

test("does not silently reuse the writer's credentials or omit live alert configuration", async () => {
  for (const overrides of [
    { BACKUP_MONITOR_SECRET_ACCESS_KEY: "" },
    { BACKUP_MONITOR_S3_ENDPOINT: "" },
    {},
  ]) {
    const setup = fixture({}, overrides);
    try {
      const result = await setup.run(
        overrides.BACKUP_MONITOR_SECRET_ACCESS_KEY === "" ||
          overrides.BACKUP_MONITOR_S3_ENDPOINT === ""
          ? ["--check-only"]
          : [],
      );
      assert.equal(result.status, 1);
      assert.deepEqual(setup.events(), []);
    } finally {
      setup.clean();
    }
  }
});

for (const status of [204, 500]) {
  test(`reports a failed check to a synthetic receiver and handles HTTP ${status}`, async () => {
    let received;
    const server = http.createServer(async (request, response) => {
      let body = "";
      for await (const chunk of request) body += chunk;
      received = { method: request.method, body: JSON.parse(body) };
      response.writeHead(status);
      response.end("synthetic receiver");
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const setup = fixture(
      { missing: true },
      {
        BACKUP_MONITOR_ALERT_WEBHOOK_URL: `http://127.0.0.1:${server.address().port}/synthetic`,
      },
    );
    try {
      const result = await setup.run([]);
      assert.equal(result.status, 1);
      assert.ok(received, "failed check must deliver an alert to the receiver");
      assert.equal(received.method, "POST");
      assert.match(received.body.text, /Docita database backup/);
      assert.equal(JSON.stringify(received).includes(SECRET), false);
      assert.match(
        result.stderr,
        status === 204 ? /alert accepted by endpoint/ : /alert delivery failed/,
      );
    } finally {
      setup.clean();
      await new Promise((resolve) => server.close(resolve));
    }
  });
}
