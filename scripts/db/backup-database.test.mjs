import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  accessSync,
  constants,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const RUNNER = fileURLToPath(new URL("./backup-database.mjs", import.meta.url));
const DUMP_SECRET = "synthetic-patient-row-never-log";
const PASSWORD = "synthetic-database-password-never-log";
const STORAGE_SECRET = "synthetic-storage-secret-never-log";

function fixture(scenario = {}, overrides = {}) {
  const root = mkdtempSync(path.join(tmpdir(), "docita-backup-test-"));
  const externalBin = process.env.BACKUP_TEST_EXECUTABLE_DIR;
  const bin = externalBin
    ? mkdtempSync(path.join(externalBin, "backup-boundary-"))
    : path.join(root, "bin");
  const objects = path.join(root, "objects");
  const temporary = path.join(root, "temporary");
  for (const dir of [bin, objects, temporary])
    mkdirSync(dir, { recursive: true });
  const events = path.join(root, "events.jsonl");
  writeFileSync(events, "");
  const boundary = `#!${process.execPath}
import { appendFileSync, copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const scenario = ${JSON.stringify(scenario)};
const args = process.argv.slice(2);
const command = path.basename(process.argv[1]);
const events = ${JSON.stringify(events)};
const objects = ${JSON.stringify(objects)};
appendFileSync(events, JSON.stringify({ command, args, env: process.env }) + '\\n');
if (args.includes('--version')) {
  if (scenario.ignoreTermination && command === 'pg_dump') { process.on('SIGTERM', () => {}); setInterval(() => {}, 100); }
  else {
  process.stdout.write(command === 'pg_dump' ? (scenario.version ?? 'pg_dump (PostgreSQL) 17.9') : command === 'age' ? (scenario.ageVersion ?? 'v1.2.1') : (scenario.awsVersion ?? 'aws-cli/2.32.7 Python/3.12 Linux'));
  process.exit(0);
  }
} else if (command === 'pg_dump') {
  if (scenario.hang) { setInterval(() => {}, 100); }
  else {
    process.stdout.write(scenario.invalidDump ? 'invalid archive' : ${JSON.stringify("PGDMP" + DUMP_SECRET)});
    if (scenario.dumpFails) { process.stderr.write(${JSON.stringify(PASSWORD + DUMP_SECRET)}); process.exitCode = 1; }
  }
} else if (command === 'age') {
  if (scenario.ageFails) { process.stderr.write(${JSON.stringify(DUMP_SECRET)}); process.exit(1); }
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  process.stdout.write('age-encryption.org/v1\\n' + Buffer.concat(chunks).toString('base64'));
} else if (command === 'aws') {
  const action = args.includes('s3api') ? args[args.indexOf('s3api') + 1] : 'stream-object';
  const key = action === 'stream-object' ? args[args.indexOf('cp') + 1].split('/').slice(3).join('/') : args[args.indexOf('--key') + 1];
  const object = path.join(objects, key);
  if (action === 'put-object') {
    const manifest = key.endsWith('.json');
    if (scenario.uploadFails && !manifest || scenario.manifestFails && manifest) {
      process.stderr.write(${JSON.stringify(STORAGE_SECRET)}); process.exit(1);
    }
    if (!args.includes('--if-none-match') || args[args.indexOf('--if-none-match') + 1] !== '*') process.exit(97);
    if (existsSync(object)) process.exit(98);
    mkdirSync(path.dirname(object), { recursive: true });
    copyFileSync(args[args.indexOf('--body') + 1], object);
  } else if (action === 'get-object' || action === 'stream-object') {
    if (scenario.downloadFails) process.exit(1);
    const data = scenario.corrupt ? Buffer.from('corrupt') : readFileSync(object);
    if (action === 'stream-object') {
      if (scenario.floodDownload) { const flood = () => { while (process.stdout.write(Buffer.alloc(65536))) {} }; process.stdout.on('drain', flood); flood(); }
      else process.stdout.write(data);
    } else {
      if (scenario.floodDownload) { writeFileSync(args.at(-1), Buffer.alloc(1_000_000)); setInterval(() => {}, 100); }
      else writeFileSync(args.at(-1), data);
    }
  } else process.exit(96);
} else process.exit(95);
`;
  for (const name of ["pg_dump", "age", "aws"]) {
    writeFileSync(path.join(bin, name), boundary, { mode: 0o755 });
  }
  const env = {
    PATH: bin,
    BACKUP_DATABASE_URL: `postgresql://backup:${PASSWORD}@ep-owned-fixture.neon.tech/docita_fixture?sslmode=verify-full`,
    BACKUP_AGE_RECIPIENT: `age1${"q".repeat(58)}`,
    BACKUP_SOURCE_ID: "synthetic-fixture",
    BACKUP_BUCKET: "docita-fixture-backups",
    BACKUP_S3_ENDPOINT: "https://example.r2.cloudflarestorage.com",
    BACKUP_ACCESS_KEY_ID: "synthetic-backup-access",
    BACKUP_SECRET_ACCESS_KEY: STORAGE_SECRET,
    BACKUP_TEMP_DIR: temporary,
    BACKUP_MAX_DURATION_SECONDS: "5",
    DATABASE_URL: "postgresql://wrong:wrong@production.invalid/wrong",
    AWS_PROFILE: "must-not-be-inherited",
    PGOPTIONS: "-c TimeZone=Asia/Kolkata",
    ...overrides,
  };
  return {
    root,
    bin,
    objects,
    temporary,
    env,
    events: () =>
      readFileSync(events, "utf8")
        .trim()
        .split("\n")
        .filter(Boolean)
        .map(JSON.parse),
    run: () =>
      spawnSync(process.execPath, [RUNNER], {
        env,
        encoding: "utf8",
        timeout: 10_000,
        killSignal: "SIGKILL",
      }),
    clean: () => {
      rmSync(root, { recursive: true, force: true });
      if (externalBin) rmSync(bin, { recursive: true, force: true });
    },
  };
}

function objectFiles(dir) {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(entry.parentPath, entry.name));
}

function assertPrivate(result, setup) {
  for (const secret of [DUMP_SECRET, PASSWORD, STORAGE_SECRET]) {
    assert.equal(`${result.stdout}${result.stderr}`.includes(secret), false);
    assert.equal(
      JSON.stringify(setup.events().map(({ args }) => args)).includes(secret),
      false,
    );
  }
  assert.deepEqual(readdirSync(setup.temporary), []);
}

function assertFailed(result, setup) {
  assert.notEqual(result.status, 0);
  assert.equal(result.stdout.includes('"event":"backup_completed"'), false);
  assert.match(result.stderr, /^Backup failed:/m);
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(
    objectFiles(setup.objects).some((file) => file.endsWith(".json")),
    false,
  );
  assertPrivate(result, setup);
}

test("streams a dump into encryption, verifies stored bytes, then publishes its manifest", () => {
  const setup = fixture();
  try {
    const result = setup.run();
    assert.equal(result.status, 0, result.stderr);
    const files = objectFiles(setup.objects);
    assert.equal(files.length, 2);
    const archive = files.find((file) => file.endsWith(".dump.age"));
    const manifest = JSON.parse(
      readFileSync(
        files.find((file) => file.endsWith(".json")),
        "utf8",
      ),
    );
    const ciphertext = readFileSync(archive);
    assert.equal(ciphertext.includes(DUMP_SECRET), false);
    assert.equal(manifest.ciphertextBytes, ciphertext.length);
    assert.equal(
      manifest.sha256,
      createHash("sha256").update(ciphertext).digest("hex"),
    );
    assert.equal(manifest.sourceId, "synthetic-fixture");
    assert.match(
      manifest.objectKey,
      /synthetic-fixture\/\d{4}-\d\d-\d\d\/[a-f0-9-]+\.dump\.age$/,
    );
    assert.equal(manifest.format, "postgresql-custom-age-v1");
    const transfers = setup
      .events()
      .filter(
        ({ command, args }) => command === "aws" && !args.includes("--version"),
      );
    assert.deepEqual(
      transfers.map(({ args }) =>
        args.includes("s3api")
          ? args[args.indexOf("s3api") + 1]
          : "stream-object",
      ),
      ["put-object", "stream-object", "put-object"],
    );
    assert.equal(
      transfers[2].args[transfers[2].args.indexOf("--key") + 1],
      manifest.objectKey.replace(/\.dump\.age$/, ".completed.json"),
    );
    const dump = setup
      .events()
      .find(
        ({ command, args }) =>
          command === "pg_dump" && !args.includes("--version"),
      );
    assert.equal(dump.env.PGSSLMODE, "verify-full");
    assert.equal(dump.env.PGSSLROOTCERT, "system");
    assert.equal(dump.env.PGOPTIONS, "-c TimeZone=UTC");
    assert.equal(dump.env.PGPASSWORD, PASSWORD);
    assert.equal(dump.env.DATABASE_URL, undefined);
    assert.equal(transfers[0].env.PGPASSWORD, undefined);
    assert.equal(transfers[0].env.AWS_PROFILE, undefined);
    assert.equal(transfers[0].env.AWS_EC2_METADATA_DISABLED, "true");
    assert.equal(transfers[0].env.AWS_SECRET_ACCESS_KEY, STORAGE_SECRET);
    assertPrivate(result, setup);
  } finally {
    setup.clean();
  }
});

test("requires dedicated backup credentials instead of inherited application or AWS credentials", () => {
  const setup = fixture(
    {},
    { BACKUP_SECRET_ACCESS_KEY: "", AWS_SECRET_ACCESS_KEY: STORAGE_SECRET },
  );
  try {
    const result = setup.run();
    assertFailed(result, setup);
    assert.match(result.stderr, /BACKUP_SECRET_ACCESS_KEY/);
    assert.deepEqual(setup.events(), []);
  } finally {
    setup.clean();
  }
});

for (const [name, override] of [
  [
    "weak database TLS",
    {
      BACKUP_DATABASE_URL:
        "postgresql://backup:secret@ep-fixture.neon.tech/db?sslmode=require",
    },
  ],
  [
    "a pooled endpoint",
    {
      BACKUP_DATABASE_URL:
        "postgresql://backup:secret@ep-fixture-pooler.neon.tech/db?sslmode=verify-full",
    },
  ],
  ["HTTP object storage", { BACKUP_S3_ENDPOINT: "http://storage.invalid" }],
  [
    "an identity in place of a public recipient",
    { BACKUP_AGE_RECIPIENT: "AGE-SECRET-KEY-NEVER-ACCEPT" },
  ],
  ["a traversal source label", { BACKUP_SOURCE_ID: "../clinic" }],
  ["an unbounded timeout", { BACKUP_MAX_DURATION_SECONDS: "0" }],
]) {
  test(`rejects ${name} before spawning tools`, () => {
    const setup = fixture({}, override);
    try {
      assertFailed(setup.run(), setup);
      assert.deepEqual(setup.events(), []);
    } finally {
      setup.clean();
    }
  });
}

for (const [name, scenario] of [
  ["dump", { dumpFails: true }],
  ["invalid dump archive", { invalidDump: true }],
  ["encryption", { ageFails: true }],
  ["upload", { uploadFails: true }],
  ["download", { downloadFails: true }],
  ["readback corruption", { corrupt: true }],
  ["completion upload", { manifestFails: true }],
  ["incompatible pg_dump", { version: "pg_dump (PostgreSQL) 16.15" }],
]) {
  test(`${name} failure cannot publish a completed backup or reveal provider diagnostics`, () => {
    const setup = fixture(scenario);
    try {
      assertFailed(setup.run(), setup);
    } finally {
      setup.clean();
    }
  });
}

test("rejects ciphertext above its byte budget before any upload", () => {
  const setup = fixture({}, { BACKUP_MAX_BYTES: "16" });
  try {
    const result = setup.run();
    assertFailed(result, setup);
    assert.equal(objectFiles(setup.objects).length, 0);
  } finally {
    setup.clean();
  }
});

test("terminates stalled children within its deadline and removes owned temporary files", () => {
  const setup = fixture({ hang: true }, { BACKUP_MAX_DURATION_SECONDS: "1" });
  try {
    const start = Date.now();
    assertFailed(setup.run(), setup);
    assert.ok(Date.now() - start < 5000);
  } finally {
    setup.clean();
  }
});

test("SIGTERM terminates a live pipeline without a completion marker", async () => {
  const setup = fixture({ hang: true });
  try {
    const child = spawn(process.execPath, [RUNNER], { env: setup.env });
    let stdout = "",
      stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    const closed = new Promise((resolve) =>
      child.once("close", (status) => resolve({ status, stdout, stderr })),
    );
    for (let attempt = 0; attempt < 100; attempt++) {
      if (
        setup
          .events()
          .some(
            ({ command, args }) =>
              command === "pg_dump" && !args.includes("--version"),
          )
      )
        break;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    child.kill("SIGTERM");
    assertFailed(await closed, setup);
  } finally {
    setup.clean();
  }
});

test("stops an oversized ciphertext readback before the overall deadline", () => {
  const setup = fixture(
    { floodDownload: true },
    { BACKUP_MAX_BYTES: "1024", BACKUP_MAX_DURATION_SECONDS: "4" },
  );
  try {
    const start = Date.now();
    const result = setup.run();
    assertFailed(result, setup);
    assert.ok(Date.now() - start < 3000);
    assert.match(result.stderr, /ciphertext verification failed/);
  } finally {
    setup.clean();
  }
});

test("separate invocations create different conditional object keys", () => {
  const setup = fixture();
  try {
    assert.equal(setup.run().status, 0);
    assert.equal(setup.run().status, 0);
    const manifests = objectFiles(setup.objects).filter((file) =>
      file.endsWith(".json"),
    );
    assert.equal(manifests.length, 2);
    const keys = manifests.map(
      (file) => JSON.parse(readFileSync(file, "utf8")).objectKey,
    );
    assert.equal(new Set(keys).size, 2);
  } finally {
    setup.clean();
  }
});

if (process.env.BACKUP_REAL_TOOL_TEST === "1") {
  test("real PostgreSQL 17 and age produce an authenticated, restorable synthetic backup", async () => {
    assert.ok(
      process.env.BACKUP_REAL_FIXTURE_DATABASE_URL,
      "Explicit owned fixture URL is required",
    );
    const database = new URL(process.env.BACKUP_REAL_FIXTURE_DATABASE_URL);
    assert.ok(["localhost", "127.0.0.1"].includes(database.hostname));
    assert.match(database.pathname, /^\/docita_backup_fixture_[a-z0-9_]+$/);
    assert.equal(database.searchParams.get("sslmode"), "verify-full");
    const setup = fixture();
    const restoreDatabase = `docita_backup_fixture_restore_${process.pid}`;
    const readerRole = `docita_backup_fixture_reader_${process.pid}`;
    const pgEnv = {
      PATH: process.env.PATH,
      PGHOST: database.hostname,
      PGPORT: database.port || "5432",
      PGUSER: decodeURIComponent(database.username),
      PGPASSWORD: decodeURIComponent(database.password),
      PGDATABASE: decodeURIComponent(database.pathname.slice(1)),
      PGSSLMODE: "verify-full",
      PGSSLROOTCERT: process.env.BACKUP_REAL_FIXTURE_CA_FILE || "system",
      PGCHANNELBINDING: "require",
      PGOPTIONS: "-c TimeZone=UTC",
      PGPASSFILE: "/dev/null",
    };
    function real(command, args, input, env = pgEnv) {
      const result = spawnSync(command, args, {
        input,
        env,
        encoding: "utf8",
        timeout: 30_000,
      });
      assert.equal(result.status, 0, `${command} fixture command failed`);
      return result.stdout;
    }
    const identity = path.join(setup.root, "disposable-recovery-identity");
    try {
      for (const name of ["pg_dump", "age"]) {
        rmSync(path.join(setup.bin, name));
        const installed = process.env.PATH.split(path.delimiter)
          .map((directory) => path.join(directory, name))
          .find((candidate) => {
            try {
              accessSync(candidate, constants.X_OK);
              return true;
            } catch {
              return false;
            }
          });
        assert.ok(installed, `The real ${name} tool must be installed`);
        symlinkSync(realpathSync(installed), path.join(setup.bin, name));
      }
      real("age-keygen", ["--output", identity], undefined, {
        PATH: process.env.PATH,
      });
      const recipient = real("age-keygen", ["-y", identity], undefined, {
        PATH: process.env.PATH,
      }).trim();
      real(
        "psql",
        ["--no-password", "--no-psqlrc", "--set", "ON_ERROR_STOP=1"],
        "CREATE TABLE backup_fixture (id integer PRIMARY KEY, tenant_id text NOT NULL, payload text NOT NULL); INSERT INTO backup_fixture VALUES (1, 'tenant-a', 'synthetic-one'), (2, 'tenant-b', 'synthetic-two'); ALTER TABLE backup_fixture ENABLE ROW LEVEL SECURITY; CREATE POLICY tenant_scope ON backup_fixture USING (tenant_id = current_setting('app.tenant_id', true));",
      );
      Object.assign(setup.env, {
        BACKUP_DATABASE_URL: database.href,
        BACKUP_AGE_RECIPIENT: recipient,
        BACKUP_TLS_CA_FILE: pgEnv.PGSSLROOTCERT,
        BACKUP_MAX_DURATION_SECONDS: "30",
      });
      const result = setup.run();
      assert.equal(result.status, 0, result.stderr);
      assertPrivate(result, setup);
      const files = objectFiles(setup.objects);
      const archive = files.find((file) => file.endsWith(".dump.age"));
      assert.ok(archive);
      assert.equal(readFileSync(archive).includes("synthetic-one"), false);
      real("createdb", ["--no-password", restoreDatabase]);
      const decrypt = spawn(
        "age",
        ["--decrypt", "--identity", identity, archive],
        {
          env: { PATH: process.env.PATH },
          stdio: ["ignore", "pipe", "ignore"],
        },
      );
      const restore = spawn(
        "pg_restore",
        [
          "--dbname",
          restoreDatabase,
          "--exit-on-error",
          "--single-transaction",
          "--no-owner",
          "--no-acl",
        ],
        {
          env: { ...pgEnv, PGDATABASE: restoreDatabase },
          stdio: ["pipe", "ignore", "ignore"],
        },
      );
      const statuses = Promise.all(
        [decrypt, restore].map(
          (child) => new Promise((resolve) => child.once("close", resolve)),
        ),
      );
      decrypt.stdout.pipe(restore.stdin);
      assert.deepEqual(await statuses, [0, 0]);
      const rows = real(
        "psql",
        [
          "--no-password",
          "--no-psqlrc",
          "--tuples-only",
          "--no-align",
          "--set",
          "ON_ERROR_STOP=1",
        ],
        "SELECT id || ':' || payload FROM backup_fixture ORDER BY id;",
        { ...pgEnv, PGDATABASE: restoreDatabase },
      );
      assert.equal(rows, "1:synthetic-one\n2:synthetic-two\n");
      const scoped = real(
        "psql",
        [
          "--no-password",
          "--no-psqlrc",
          "--tuples-only",
          "--no-align",
          "--quiet",
          "--set",
          "ON_ERROR_STOP=1",
        ],
        `CREATE ROLE ${readerRole} NOLOGIN; GRANT USAGE ON SCHEMA public TO ${readerRole}; GRANT SELECT ON backup_fixture TO ${readerRole}; SET ROLE ${readerRole}; SET app.tenant_id='tenant-a'; SELECT count(*) FROM backup_fixture; SELECT count(*) FROM backup_fixture WHERE tenant_id='tenant-b';`,
        { ...pgEnv, PGDATABASE: restoreDatabase },
      );
      assert.equal(scoped, "1\n0\n");
      const corrupted = path.join(setup.root, "corrupted.dump.age");
      const damaged = readFileSync(archive);
      damaged[damaged.length - 1] ^= 1;
      writeFileSync(corrupted, damaged, { mode: 0o600 });
      const authentication = spawnSync(
        "age",
        ["--decrypt", "--identity", identity, corrupted],
        {
          env: { PATH: process.env.PATH },
          stdio: ["ignore", "ignore", "ignore"],
          timeout: 10_000,
        },
      );
      assert.notEqual(authentication.status, 0);
      const event = JSON.parse(result.stdout);
      assert.equal(event.event, "backup_completed");
    } finally {
      try {
        real("dropdb", ["--no-password", "--if-exists", restoreDatabase]);
        real(
          "psql",
          ["--no-password", "--no-psqlrc", "--set", "ON_ERROR_STOP=1"],
          `DROP ROLE IF EXISTS ${readerRole};`,
        );
      } finally {
        setup.clean();
      }
    }
  });
}

test("deadline force-kills a validation tool that ignores SIGTERM", () => {
  const setup = fixture(
    { ignoreTermination: true },
    { BACKUP_MAX_DURATION_SECONDS: "1" },
  );
  try {
    const start = Date.now();
    assertFailed(setup.run(), setup);
    assert.ok(Date.now() - start < 4000);
  } finally {
    setup.clean();
  }
});

test("accepts the Alpine age tool's unprefixed version output", () => {
  const setup = fixture({ ageVersion: "1.2.1" });
  try {
    const result = setup.run();
    assert.equal(result.status, 0, result.stderr);
    assertPrivate(result, setup);
  } finally {
    setup.clean();
  }
});
