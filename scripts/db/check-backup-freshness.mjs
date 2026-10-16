#!/usr/bin/env node
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createEnvironmentReader } from "./backup-environment.mjs";
import { backupAlertConfiguration, sendBackupAlert } from "./backup-alerts.mjs";

class FreshnessFailure extends Error {}

const { required, integer } = createEnvironmentReader(FreshnessFailure);

function configuration() {
  const checkOnly =
    process.argv.length === 3 && process.argv[2] === "--check-only";
  if (!checkOnly && process.argv.length !== 2)
    throw new FreshnessFailure("unsupported arguments");
  const endpoint = new URL(required("BACKUP_MONITOR_S3_ENDPOINT"));
  if (
    endpoint.protocol !== "https:" ||
    endpoint.username ||
    endpoint.password ||
    endpoint.pathname !== "/" ||
    endpoint.search ||
    endpoint.hash
  ) {
    throw new FreshnessFailure("monitor endpoint must be an HTTPS origin");
  }
  const bucket = required("BACKUP_MONITOR_BUCKET");
  const recipient = required("BACKUP_MONITOR_AGE_RECIPIENT");
  if (
    !/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket) ||
    !/^age1[ac-hj-np-z02-9]{58}$/.test(recipient)
  ) {
    throw new FreshnessFailure("invalid monitor bucket or public recipient");
  }
  const alert = checkOnly
    ? undefined
    : backupAlertConfiguration(FreshnessFailure);
  return {
    checkOnly,
    endpoint: endpoint.origin,
    bucket,
    alert,
    recipientSha256: createHash("sha256").update(recipient).digest("hex"),
    accessKey: required("BACKUP_MONITOR_ACCESS_KEY_ID"),
    secretKey: required("BACKUP_MONITOR_SECRET_ACCESS_KEY"),
    duration: integer("BACKUP_MONITOR_MAX_DURATION_SECONDS", 300, 600) * 1000,
    maxBytes: integer("BACKUP_MONITOR_MAX_BYTES", 1024 ** 3, 4 * 1024 ** 3),
  };
}

function object(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function timestamp(value) {
  if (typeof value !== "string") return NaN;
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString() === value
    ? time
    : NaN;
}

async function check(config) {
  process.umask(0o077);
  const temporary = await mkdtemp(
    path.join(tmpdir(), "docita-backup-monitor-"),
  );
  const children = new Set();
  const terminations = [];
  const controller = new AbortController();
  let failure;
  const stop = (reason) => {
    failure ??= reason;
    controller.abort();
    const pending = [...children];
    for (const child of pending) {
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch {
        child.kill("SIGTERM");
      }
    }
    if (pending.length)
      terminations.push(
        new Promise((resolve) => {
          setTimeout(() => {
            for (const child of pending) {
              try {
                process.kill(-child.pid, "SIGKILL");
              } catch {
                child.kill("SIGKILL");
              }
            }
            resolve();
          }, 500);
        }),
      );
  };
  const interrupted = () => stop("monitor interrupted");
  process.once("SIGTERM", interrupted);
  process.once("SIGINT", interrupted);
  const deadline = setTimeout(
    () => stop("monitor deadline exceeded"),
    config.duration,
  );
  const env = {
    PATH: process.env.PATH,
    HOME: temporary,
    TMPDIR: temporary,
    LANG: "C.UTF-8",
    TZ: "UTC",
    AWS_ACCESS_KEY_ID: config.accessKey,
    AWS_SECRET_ACCESS_KEY: config.secretKey,
    AWS_DEFAULT_REGION: "auto",
    AWS_EC2_METADATA_DISABLED: "true",
    AWS_PAGER: "",
    AWS_CONFIG_FILE: path.join(temporary, "no-config"),
    AWS_SHARED_CREDENTIALS_FILE: path.join(temporary, "no-credentials"),
    AWS_MAX_ATTEMPTS: "2",
    AWS_RETRY_MODE: "standard",
  };
  const aws = async (args, limit = 262144, consume) => {
    if (controller.signal.aborted) throw new FreshnessFailure(failure);
    const child = spawn("aws", args, {
      env,
      detached: true,
      stdio: ["ignore", "pipe", "ignore"],
    });
    children.add(child);
    const chunks = [];
    let size = 0,
      failed = false;
    child.stdout.on("data", (chunk) => {
      if (controller.signal.aborted) return;
      size += chunk.length;
      if (size > limit) {
        failed = true;
        stop("storage response budget exceeded");
        return;
      }
      if (consume) consume(chunk);
      else chunks.push(chunk);
    });
    child.stdout.once("error", () => {
      failed = true;
      stop("storage response failed");
    });
    child.once("error", () => {
      failed = true;
    });
    const code = await new Promise((resolve) => child.once("close", resolve));
    children.delete(child);
    if (code !== 0 || failed || controller.signal.aborted)
      throw new FreshnessFailure(failure ?? "storage command failed");
    return consume ? size : Buffer.concat(chunks).toString("utf8");
  };
  const common = [
    "--endpoint-url",
    config.endpoint,
    "--no-cli-pager",
    "--cli-connect-timeout",
    "5",
    "--cli-read-timeout",
    "30",
  ];
  const download = (key, limit, consume) =>
    aws(
      [
        ...common,
        "s3",
        "cp",
        `s3://${config.bucket}/${key}`,
        "-",
        "--only-show-errors",
        "--no-progress",
      ],
      limit,
      consume,
    );
  const json = (value) => {
    try {
      return JSON.parse(value);
    } catch {
      throw new FreshnessFailure("invalid storage metadata");
    }
  };
  try {
    if (!/^aws-cli\/2\./.test(await aws(["--version"])))
      throw new FreshnessFailure("AWS CLI v2 is required");
    const now = Date.now(),
      objects = [];
    for (const day of [now, now - 86400000]) {
      const prefix = `docita-production/${new Date(day).toISOString().slice(0, 10)}/`;
      let token;
      const tokens = new Set();
      for (let page = 0; page < 10; page++) {
        const result = json(
          await aws([
            ...common,
            "s3api",
            "list-objects-v2",
            "--bucket",
            config.bucket,
            "--prefix",
            prefix,
            "--max-keys",
            "1000",
            "--no-paginate",
            "--output",
            "json",
            ...(token ? ["--continuation-token", token] : []),
          ]),
        );
        if (
          !object(result) ||
          !Array.isArray(result.Contents ?? []) ||
          typeof result.IsTruncated !== "boolean"
        )
          throw new FreshnessFailure("invalid storage listing");
        for (const entry of result.Contents ?? []) {
          if (
            !object(entry) ||
            typeof entry.Key !== "string" ||
            !entry.Key.startsWith(prefix)
          )
            throw new FreshnessFailure("unexpected storage object");
          const modified = Date.parse(entry.LastModified);
          if (
            !Number.isFinite(modified) ||
            modified > Date.now() + 60000 ||
            !Number.isSafeInteger(entry.Size) ||
            entry.Size < 1
          )
            throw new FreshnessFailure("invalid storage object metadata");
          objects.push(entry);
          if (objects.length > 512)
            throw new FreshnessFailure("storage listing budget exceeded");
        }
        if (!result.IsTruncated) break;
        token = result.NextContinuationToken;
        if (
          typeof token !== "string" ||
          !token ||
          token.length > 2048 ||
          tokens.has(token) ||
          page === 9
        )
          throw new FreshnessFailure("invalid storage pagination");
        tokens.add(token);
      }
    }
    const pattern =
      /^docita-production\/\d{4}-\d{2}-\d{2}\/([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.completed\.json$/;
    let latest;
    const seen = new Set();
    for (const entry of objects) {
      const match = pattern.exec(entry.Key);
      if (!match) continue;
      if (seen.has(entry.Key))
        throw new FreshnessFailure("duplicate completion object");
      seen.add(entry.Key);
      const manifest = json(await download(entry.Key, 16384));
      const start = timestamp(manifest?.startedAt),
        completed = timestamp(manifest?.completedAt);
      if (
        !object(manifest) ||
        manifest.version !== 1 ||
        manifest.backupId !== match[1] ||
        manifest.sourceId !== "docita-production" ||
        manifest.format !== "postgresql-custom-age-v1" ||
        manifest.pgDumpMajor !== 17 ||
        manifest.objectKey !==
          entry.Key.replace(/\.completed\.json$/, ".dump.age") ||
        manifest.recipientSha256 !== config.recipientSha256 ||
        !/^[0-9a-f]{64}$/.test(manifest.sha256) ||
        !Number.isSafeInteger(manifest.ciphertextBytes) ||
        manifest.ciphertextBytes < 1 ||
        manifest.ciphertextBytes > config.maxBytes ||
        !Number.isFinite(start) ||
        !Number.isFinite(completed) ||
        completed < start ||
        completed > Date.now() + 60000 ||
        !entry.Key.startsWith(
          `docita-production/${manifest.startedAt.slice(0, 10)}/`,
        )
      ) {
        throw new FreshnessFailure("invalid completion manifest");
      }
      const archive = objects.find((item) => item.Key === manifest.objectKey);
      if (!archive || archive.Size !== manifest.ciphertextBytes)
        throw new FreshnessFailure(
          "completed ciphertext is missing or has changed size",
        );
      if (!latest || start > latest.start) latest = { manifest, start };
    }
    if (!latest)
      throw new FreshnessFailure("no completed production backup found");
    const newestCompletion = Math.max(
      ...objects
        .filter((entry) => pattern.test(entry.Key))
        .map((entry) => Date.parse(entry.LastModified)),
    );
    const abandonedUpload = objects.some(
      (entry) =>
        pattern.test(entry.Key.replace(/\.dump\.age$/, ".completed.json")) &&
        entry.Key.endsWith(".dump.age") &&
        !seen.has(entry.Key.replace(/\.dump\.age$/, ".completed.json")) &&
        Date.parse(entry.LastModified) > newestCompletion &&
        Date.now() - Date.parse(entry.LastModified) > 1800000,
    );
    if (abandonedUpload)
      throw new FreshnessFailure(
        "newer upload has no completion after thirty minutes",
      );
    if (Date.now() - latest.start > 7200000)
      throw new FreshnessFailure("latest backup start is older than two hours");
    const hash = createHash("sha256");
    const size = await download(
      latest.manifest.objectKey,
      latest.manifest.ciphertextBytes,
      (chunk) => hash.update(chunk),
    );
    if (
      size !== latest.manifest.ciphertextBytes ||
      hash.digest("hex") !== latest.manifest.sha256
    )
      throw new FreshnessFailure("stored ciphertext verification failed");
    if (Date.now() - latest.start > 7200000)
      throw new FreshnessFailure("latest backup start is older than two hours");
    return {
      event: "backup_freshness_verified",
      backupId: latest.manifest.backupId,
      startedAt: latest.manifest.startedAt,
      ciphertextBytes: size,
      ageSeconds: Math.floor((Date.now() - latest.start) / 1000),
      alertSent: false,
    };
  } finally {
    clearTimeout(deadline);
    stop("monitor cleanup");
    await Promise.all(terminations);
    process.removeListener("SIGTERM", interrupted);
    process.removeListener("SIGINT", interrupted);
    await rm(temporary, { recursive: true, force: true });
  }
}

let config;
try {
  config = configuration();
  process.stdout.write(`${JSON.stringify(await check(config))}\n`);
} catch (error) {
  const reason =
    error instanceof FreshnessFailure ? error.message : "monitor failed safely";
  let alert = "alert delivery unavailable";
  if (config?.alert) {
    alert = (await sendBackupAlert(config.alert, reason))
      ? "alert accepted by endpoint"
      : "alert delivery failed";
  } else if (config?.checkOnly) alert = "check-only; no alert sent";
  process.stderr.write(`Backup freshness failed: ${reason}; ${alert}.\n`);
  process.exitCode = 1;
}
