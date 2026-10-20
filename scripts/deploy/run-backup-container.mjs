#!/usr/bin/env node
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createEnvironmentReader } from "../db/backup-environment.mjs";

class ContainerFailure extends Error {}
const { required } = createEnvironmentReader(ContainerFailure);

const BACKUP_ENVIRONMENT = [
  "BACKUP_DATABASE_URL",
  "BACKUP_S3_ENDPOINT",
  "BACKUP_BUCKET",
  "BACKUP_AGE_RECIPIENT",
  "BACKUP_SOURCE_ID",
  "BACKUP_ACCESS_KEY_ID",
  "BACKUP_SECRET_ACCESS_KEY",
  "BACKUP_MONITOR_S3_ENDPOINT",
  "BACKUP_MONITOR_BUCKET",
  "BACKUP_MONITOR_AGE_RECIPIENT",
  "BACKUP_MONITOR_ACCESS_KEY_ID",
  "BACKUP_MONITOR_SECRET_ACCESS_KEY",
  "BACKUP_CYCLE_SENTRY_DSN",
  "BACKUP_CYCLE_SENTRY_SLUG",
];

function configuration() {
  if (process.argv.length !== 2)
    throw new ContainerFailure("unsupported arguments");
  if (
    required("GITHUB_REF") !== "refs/heads/main" ||
    required("GITHUB_REPOSITORY") !== "CVamsi27/docita" ||
    !["schedule", "workflow_dispatch"].includes(
      required("GITHUB_EVENT_NAME"),
    ) ||
    required("DOCITA_BACKUPS_ENABLED") !== "true"
  )
    throw new ContainerFailure("backup execution context is not approved");
  const image = required("DOCITA_BACKUP_IMAGE");
  if (!/^ghcr\.io\/cvamsi27\/docita-backup@sha256:[a-f0-9]{64}$/.test(image))
    throw new ContainerFailure(
      "an approved immutable backup image is required",
    );
  const actor = required("GITHUB_ACTOR");
  if (!/^[a-zA-Z0-9][a-zA-Z0-9-]{0,63}(?:\[bot\])?$/.test(actor))
    throw new ContainerFailure("invalid registry identity");
  const token = required("GITHUB_TOKEN");
  const environment = Object.fromEntries(
    BACKUP_ENVIRONMENT.map((name) => [name, required(name)]),
  );
  const database = new URL(environment.BACKUP_DATABASE_URL);
  if (
    !["postgres:", "postgresql:"].includes(database.protocol) ||
    database.username !== "docita_backup" ||
    !database.password ||
    !database.hostname ||
    database.hostname.includes("-pooler") ||
    !/^\/[^/]+$/.test(database.pathname) ||
    database.hash ||
    database.search !== "?sslmode=verify-full"
  )
    throw new ContainerFailure(
      "a dedicated direct TLS backup credential is required",
    );
  const endpoint = new URL(environment.BACKUP_S3_ENDPOINT);
  const dsn = new URL(environment.BACKUP_CYCLE_SENTRY_DSN);
  if (
    endpoint.protocol !== "https:" ||
    endpoint.username ||
    endpoint.password ||
    endpoint.pathname !== "/" ||
    endpoint.search ||
    endpoint.hash ||
    environment.BACKUP_BUCKET !== "docita-db-backups" ||
    environment.BACKUP_SOURCE_ID !== "docita-production" ||
    !/^age1[ac-hj-np-z02-9]{58}$/.test(environment.BACKUP_AGE_RECIPIENT) ||
    dsn.protocol !== "https:" ||
    !/^[a-f0-9]{32}$/.test(dsn.username) ||
    dsn.password ||
    !/^\/[1-9]\d*$/.test(dsn.pathname) ||
    dsn.search ||
    dsn.hash ||
    !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(environment.BACKUP_CYCLE_SENTRY_SLUG)
  )
    throw new ContainerFailure("invalid explicit backup configuration");
  for (const [writer, reader] of [
    ["BACKUP_S3_ENDPOINT", "BACKUP_MONITOR_S3_ENDPOINT"],
    ["BACKUP_BUCKET", "BACKUP_MONITOR_BUCKET"],
    ["BACKUP_AGE_RECIPIENT", "BACKUP_MONITOR_AGE_RECIPIENT"],
  ])
    if (environment[writer] !== environment[reader])
      throw new ContainerFailure("writer and reader identity differs");
  if (
    environment.BACKUP_ACCESS_KEY_ID ===
    environment.BACKUP_MONITOR_ACCESS_KEY_ID
  )
    throw new ContainerFailure(
      "separate reader storage credentials are required",
    );
  Object.assign(environment, {
    BACKUP_MAX_BYTES: "67108864",
    BACKUP_MONITOR_MAX_BYTES: "67108864",
    BACKUP_MAX_DURATION_SECONDS: "1200",
    BACKUP_MONITOR_MAX_DURATION_SECONDS: "300",
    BACKUP_TLS_CA_FILE: "system",
    BACKUP_TEMP_DIR: "/tmp",
  });
  return { image, actor, token, environment };
}

async function run(config) {
  process.umask(0o077);
  const temporary = await mkdtemp(path.join(tmpdir(), "docita-backup-docker-"));
  const environment = {
    PATH: process.env.PATH ?? "",
    HOME: temporary,
    DOCKER_CONFIG: temporary,
    LANG: "C.UTF-8",
    TZ: "UTC",
  };
  const name = `docita-backup-${randomUUID()}`;
  let active;
  let interrupted = false;
  let containerAttempted = false;
  const terminate = (child) => {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {
      child.kill("SIGTERM");
    }
    const timer = setTimeout(() => {
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch {
        child.kill("SIGKILL");
      }
    }, 1000);
    child.once("close", () => clearTimeout(timer));
  };
  const handleSignal = () => {
    interrupted = true;
    if (active) terminate(active);
  };
  process.on("SIGTERM", handleSignal);
  process.on("SIGINT", handleSignal);
  const command = async (args, seconds, extra = {}, cleanup = false, input) => {
    if (interrupted && !cleanup)
      throw new ContainerFailure("backup execution interrupted");
    const child = spawn("docker", args, {
      env: { ...environment, ...extra },
      detached: true,
      stdio: [input ? "pipe" : "ignore", "pipe", "pipe"],
    });
    active = child;
    let bytes = 0;
    let failed = false;
    const stop = () => {
      if (failed) return;
      failed = true;
      terminate(child);
    };
    const deadline = setTimeout(stop, seconds * 1000);
    for (const stream of [child.stdout, child.stderr]) {
      stream.on("data", (chunk) => {
        bytes += chunk.length;
        if (bytes > 262144) stop();
      });
      stream.once("error", stop);
    }
    child.once("error", () => {
      failed = true;
    });
    if (input) {
      child.stdin.once("error", stop);
      child.stdin.end(input);
    }
    const code = await new Promise((resolve) => child.once("close", resolve));
    clearTimeout(deadline);
    active = undefined;
    if (code !== 0 || failed || (interrupted && !cleanup))
      throw new ContainerFailure(
        cleanup
          ? "owned container cleanup failed"
          : "container command failed safely",
      );
  };
  let failure;
  try {
    await command(
      ["login", "ghcr.io", "--username", config.actor, "--password-stdin"],
      120,
      {},
      false,
      `${config.token}\n`,
    );
    await command(["pull", config.image], 300);
    containerAttempted = true;
    await command(
      [
        "run",
        "--name",
        name,
        "--memory",
        "512m",
        "--memory-swap",
        "512m",
        "--cpus",
        "1",
        "--pids-limit",
        "128",
        "--read-only",
        "--user",
        "node",
        "--cap-drop",
        "ALL",
        "--security-opt",
        "no-new-privileges",
        "--tmpfs",
        "/tmp:rw,nosuid,nodev,noexec,size=160m,uid=1000,gid=1000,mode=0700",
        ...Object.keys(config.environment).flatMap((key) => ["--env", key]),
        config.image,
      ],
      1600,
      config.environment,
    );
  } catch (error) {
    failure = error;
  } finally {
    if (containerAttempted) {
      try {
        await command(["rm", "--force", name], 15, {}, true);
      } catch {
        failure ??= new ContainerFailure(
          "owned container cleanup could not be confirmed",
        );
      }
    }
    try {
      await rm(temporary, { recursive: true, force: true });
    } catch {
      failure ??= new ContainerFailure("registry credential cleanup failed");
    }
    process.off("SIGTERM", handleSignal);
    process.off("SIGINT", handleSignal);
  }
  if (failure) throw failure;
  process.stdout.write("Backup cycle container completed successfully.\n");
}

Promise.resolve()
  .then(() => configuration())
  .then(run)
  .catch((error) => {
    const reason =
      error instanceof ContainerFailure
        ? error.message
        : "backup container failed safely";
    process.stderr.write(`Backup container failed: ${reason}.\n`);
    process.exitCode = 1;
  });
