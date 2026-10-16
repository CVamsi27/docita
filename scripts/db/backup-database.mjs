#!/usr/bin/env node
import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createEnvironmentReader } from "./backup-environment.mjs";

class BackupFailure extends Error {}

const { required, integer } = createEnvironmentReader(BackupFailure);

function parseUrl(value, name) {
  try {
    return new URL(value);
  } catch {
    throw new BackupFailure(`${name} is invalid.`);
  }
}

function configuration() {
  const database = parseUrl(
    required("BACKUP_DATABASE_URL"),
    "BACKUP_DATABASE_URL",
  );
  if (
    !["postgres:", "postgresql:"].includes(database.protocol) ||
    !database.hostname ||
    !database.username ||
    !database.password ||
    !/^\/[^/]+$/.test(database.pathname) ||
    database.hash ||
    database.hostname.includes("-pooler") ||
    [...database.searchParams.keys()].some((key) => key !== "sslmode") ||
    (database.searchParams.has("sslmode") &&
      database.searchParams.get("sslmode") !== "verify-full")
  ) {
    throw new BackupFailure(
      "BACKUP_DATABASE_URL must use a direct endpoint and verified TLS.",
    );
  }
  let user, password, dbname;
  try {
    user = decodeURIComponent(database.username);
    password = decodeURIComponent(database.password);
    dbname = decodeURIComponent(database.pathname.slice(1));
  } catch {
    throw new BackupFailure("BACKUP_DATABASE_URL has invalid encoding.");
  }
  if ([user, password, dbname].some((value) => /[\r\n\0]/.test(value))) {
    throw new BackupFailure(
      "BACKUP_DATABASE_URL contains invalid connection fields.",
    );
  }
  const endpoint = parseUrl(
    required("BACKUP_S3_ENDPOINT"),
    "BACKUP_S3_ENDPOINT",
  );
  if (
    endpoint.protocol !== "https:" ||
    endpoint.username ||
    endpoint.password ||
    endpoint.search ||
    endpoint.hash ||
    endpoint.pathname !== "/"
  ) {
    throw new BackupFailure(
      "BACKUP_S3_ENDPOINT must be an HTTPS service origin.",
    );
  }
  const recipient = required("BACKUP_AGE_RECIPIENT");
  if (!/^age1[ac-hj-np-z02-9]{58}$/.test(recipient)) {
    throw new BackupFailure(
      "BACKUP_AGE_RECIPIENT must be an age public recipient.",
    );
  }
  const sourceId = required("BACKUP_SOURCE_ID");
  if (!/^[a-z0-9][a-z0-9-]{1,62}$/.test(sourceId)) {
    throw new BackupFailure(
      "BACKUP_SOURCE_ID must be an opaque lowercase identifier.",
    );
  }
  const bucket = required("BACKUP_BUCKET");
  if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket)) {
    throw new BackupFailure("BACKUP_BUCKET must be a dedicated bucket name.");
  }
  const ca = process.env.BACKUP_TLS_CA_FILE ?? "system";
  if (ca !== "system" && !path.isAbsolute(ca)) {
    throw new BackupFailure(
      "BACKUP_TLS_CA_FILE must be an absolute CA file path.",
    );
  }
  return {
    database: {
      PGHOST: database.hostname,
      PGPORT: database.port || "5432",
      PGDATABASE: dbname,
      PGUSER: user,
      PGPASSWORD: password,
    },
    endpoint: endpoint.origin,
    bucket,
    recipient,
    sourceId,
    ca,
    accessKey: required("BACKUP_ACCESS_KEY_ID"),
    secretKey: required("BACKUP_SECRET_ACCESS_KEY"),
    duration: integer("BACKUP_MAX_DURATION_SECONDS", 1200, 7200) * 1000,
    // Single-part conditional S3 puts avoid incomplete multipart uploads and replacements.
    maxBytes: integer("BACKUP_MAX_BYTES", 1024 ** 3, 4 * 1024 ** 3),
    temporaryParent: process.env.BACKUP_TEMP_DIR ?? tmpdir(),
  };
}

async function main() {
  const config = configuration();
  process.umask(0o077);
  const temporary = await mkdtemp(
    path.join(config.temporaryParent, "docita-encrypted-backup-"),
  );
  const children = new Set();
  const killTimers = new Set();
  const controller = new AbortController();
  let stage = "tool validation";
  let interruption;
  let completed;
  const stop = (reason) => {
    interruption ??= reason;
    controller.abort();
    const pending = [...children];
    for (const { child } of pending) {
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch {
        child.kill("SIGTERM");
      }
    }
    const force = setTimeout(() => {
      for (const { child } of pending) {
        try {
          process.kill(-child.pid, "SIGKILL");
        } catch {
          child.kill("SIGKILL");
        }
      }
    }, 500);
    force.unref();
    killTimers.add(force);
  };
  const signal = () => stop("interrupted");
  process.once("SIGINT", signal);
  process.once("SIGTERM", signal);
  const deadline = setTimeout(() => stop("deadline exceeded"), config.duration);
  const baseEnv = {
    PATH: process.env.PATH,
    HOME: temporary,
    TMPDIR: temporary,
    LANG: "C.UTF-8",
    TZ: "UTC",
  };
  const pgEnv = {
    ...baseEnv,
    ...config.database,
    PGSSLMODE: "verify-full",
    PGSSLROOTCERT: config.ca,
    PGCHANNELBINDING: "require",
    PGCONNECT_TIMEOUT: "30",
    PGOPTIONS: "-c TimeZone=UTC",
    PGPASSFILE: "/dev/null",
    PGSERVICEFILE: "/dev/null",
    PGAPPNAME: "docita-independent-backup",
  };
  const awsEnv = {
    ...baseEnv,
    AWS_ACCESS_KEY_ID: config.accessKey,
    AWS_SECRET_ACCESS_KEY: config.secretKey,
    AWS_DEFAULT_REGION: "auto",
    AWS_EC2_METADATA_DISABLED: "true",
    AWS_CONFIG_FILE: "/dev/null",
    AWS_SHARED_CREDENTIALS_FILE: "/dev/null",
    AWS_PAGER: "",
    AWS_MAX_ATTEMPTS: "2",
    AWS_RETRY_MODE: "standard",
    AWS_CLI_AUTO_PROMPT: "off",
  };
  function start(command, args, env, input = "ignore") {
    if (controller.signal.aborted)
      throw new BackupFailure("Backup interrupted.");
    const child = spawn(command, args, {
      env,
      detached: true,
      stdio: [input, "pipe", "ignore"],
      signal: controller.signal,
    });
    const entry = { child, closed: undefined };
    entry.closed = new Promise((resolve) => {
      child.once("error", () => {});
      child.once("close", (code) => {
        children.delete(entry);
        resolve(code);
      });
    });
    children.add(entry);
    return entry;
  }
  async function command(commandName, args, env, capture = false) {
    const entry = start(commandName, args, env);
    let output = "";
    for await (const chunk of entry.child.stdout) {
      if (capture && output.length < 4096)
        output += chunk.toString().slice(0, 4096 - output.length);
    }
    if ((await entry.closed) !== 0)
      throw new BackupFailure("External command failed.");
    return output;
  }
  const s3 = (action, args) =>
    command(
      "aws",
      [
        "--endpoint-url",
        config.endpoint,
        "--no-cli-pager",
        "--cli-connect-timeout",
        "30",
        "--cli-read-timeout",
        "60",
        "s3api",
        action,
        "--bucket",
        config.bucket,
        ...args,
      ],
      awsEnv,
    );
  async function fingerprint(file) {
    const size = (await stat(file)).size;
    if (!size || size > config.maxBytes)
      throw new BackupFailure("Invalid ciphertext size.");
    const hash = createHash("sha256");
    for await (const chunk of createReadStream(file, {
      signal: controller.signal,
    }))
      hash.update(chunk);
    return { size, sha256: hash.digest("hex") };
  }
  try {
    const dumpVersion = await command("pg_dump", ["--version"], baseEnv, true);
    const ageVersion = await command("age", ["--version"], baseEnv, true);
    const awsVersion = await command("aws", ["--version"], awsEnv, true);
    if (
      !/^pg_dump \(PostgreSQL\) 17\./.test(dumpVersion) ||
      !/^v?1\.(?:[2-9]|[1-9]\d+)\./.test(ageVersion) ||
      !/^aws-cli\/2\./.test(awsVersion)
    ) {
      throw new BackupFailure(
        "Compatible PostgreSQL 17, age and AWS CLI v2 tools are required.",
      );
    }
    const startedAt = new Date().toISOString();
    const id = randomUUID();
    const objectKey = `${config.sourceId}/${startedAt.slice(0, 10)}/${id}.dump.age`;
    const ciphertext = path.join(temporary, "database.dump.age");
    stage = "encrypted dump";
    const dump = start(
      "pg_dump",
      [
        "--format=custom",
        "--compress=6",
        "--no-owner",
        "--no-acl",
        "--no-password",
        "--lock-wait-timeout=60000",
      ],
      pgEnv,
    );
    const encrypt = start(
      "age",
      ["--encrypt", "--recipient", config.recipient],
      baseEnv,
      "pipe",
    );
    let bytes = 0;
    const bound = new Transform({
      transform(chunk, _encoding, callback) {
        bytes += chunk.length;
        callback(
          bytes > config.maxBytes
            ? new BackupFailure("Ciphertext budget exceeded.")
            : null,
          chunk,
        );
      },
    });
    let header = Buffer.alloc(0);
    const archiveCheck = new Transform({
      transform(chunk, _encoding, callback) {
        if (header.length === 5) {
          callback(null, chunk);
          return;
        }
        const needed = 5 - header.length;
        header = Buffer.concat([header, chunk.subarray(0, needed)]);
        if (header.length < 5) {
          callback();
          return;
        }
        if (header.toString("ascii") !== "PGDMP") {
          callback(new BackupFailure("Invalid custom dump archive."));
          return;
        }
        callback(null, Buffer.concat([header, chunk.subarray(needed)]));
      },
      flush(callback) {
        callback(
          header.length === 5
            ? null
            : new BackupFailure("Incomplete dump archive."),
        );
      },
    });
    const streaming = Promise.all([
      pipeline(dump.child.stdout, archiveCheck, encrypt.child.stdin, {
        signal: controller.signal,
      }),
      pipeline(
        encrypt.child.stdout,
        bound,
        createWriteStream(ciphertext, { flags: "wx", mode: 0o600 }),
        { signal: controller.signal },
      ),
    ]);
    await streaming;
    if ((await dump.closed) !== 0 || (await encrypt.closed) !== 0)
      throw new BackupFailure("Dump or encryption failed.");
    const original = await fingerprint(ciphertext);
    stage = "ciphertext upload";
    await s3("put-object", [
      "--key",
      objectKey,
      "--body",
      ciphertext,
      "--if-none-match",
      "*",
      "--content-type",
      "application/octet-stream",
    ]);
    stage = "ciphertext verification";
    const downloaded = path.join(temporary, "readback.dump.age");
    const download = start(
      "aws",
      [
        "--endpoint-url",
        config.endpoint,
        "--no-cli-pager",
        "--cli-connect-timeout",
        "30",
        "--cli-read-timeout",
        "60",
        "s3",
        "cp",
        `s3://${config.bucket}/${objectKey}`,
        "-",
        "--only-show-errors",
        "--no-progress",
      ],
      awsEnv,
    );
    let downloadedBytes = 0;
    const readbackBound = new Transform({
      transform(chunk, _encoding, callback) {
        downloadedBytes += chunk.length;
        callback(
          downloadedBytes > config.maxBytes
            ? new BackupFailure("Readback budget exceeded.")
            : null,
          chunk,
        );
      },
    });
    await pipeline(
      download.child.stdout,
      readbackBound,
      createWriteStream(downloaded, { flags: "wx", mode: 0o600 }),
      { signal: controller.signal },
    );
    if ((await download.closed) !== 0)
      throw new BackupFailure("Ciphertext download failed.");
    const readback = await fingerprint(downloaded);
    if (original.size !== readback.size || original.sha256 !== readback.sha256)
      throw new BackupFailure("Ciphertext readback does not match.");
    const manifest = {
      version: 1,
      backupId: id,
      sourceId: config.sourceId,
      format: "postgresql-custom-age-v1",
      objectKey,
      startedAt,
      completedAt: new Date().toISOString(),
      ciphertextBytes: original.size,
      sha256: original.sha256,
      recipientSha256: createHash("sha256")
        .update(config.recipient)
        .digest("hex"),
      pgDumpMajor: 17,
    };
    const manifestFile = path.join(temporary, "completed.json");
    await writeFile(manifestFile, `${JSON.stringify(manifest)}\n`, {
      mode: 0o600,
      flag: "wx",
    });
    stage = "completion manifest upload";
    await s3("put-object", [
      "--key",
      objectKey.replace(/\.dump\.age$/, ".completed.json"),
      "--body",
      manifestFile,
      "--if-none-match",
      "*",
      "--content-type",
      "application/json",
    ]);
    completed = {
      event: "backup_completed",
      backupId: id,
      sourceId: config.sourceId,
      ciphertextBytes: original.size,
      completedAt: manifest.completedAt,
    };
  } catch {
    throw new BackupFailure(
      `${interruption ?? `${stage} failed`}. No backup completion was confirmed.`,
    );
  } finally {
    clearTimeout(deadline);
    stop("cleanup");
    await Promise.all([...children].map(({ closed }) => closed));
    for (const timer of killTimers) clearTimeout(timer);
    process.removeListener("SIGINT", signal);
    process.removeListener("SIGTERM", signal);
    await rm(temporary, { recursive: true, force: true });
  }
  process.stdout.write(`${JSON.stringify(completed)}\n`);
}

main().catch((error) => {
  // External diagnostics can contain connection strings, SQL or patient data.
  const reason =
    error instanceof BackupFailure
      ? error.message
      : "The backup runner failed safely.";
  process.stderr.write(`Backup failed: ${reason}\n`);
  process.exitCode = 1;
});
