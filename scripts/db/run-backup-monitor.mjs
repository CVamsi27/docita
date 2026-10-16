#!/usr/bin/env node
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { createEnvironmentReader } from "./backup-environment.mjs";

class MonitorFailure extends Error {}

const { required, integer } = createEnvironmentReader(MonitorFailure);
const CHECKER = fileURLToPath(
  new URL("./check-backup-freshness.mjs", import.meta.url),
);
const READER_ENVIRONMENT = [
  "BACKUP_MONITOR_S3_ENDPOINT",
  "BACKUP_MONITOR_BUCKET",
  "BACKUP_MONITOR_AGE_RECIPIENT",
  "BACKUP_MONITOR_ACCESS_KEY_ID",
  "BACKUP_MONITOR_SECRET_ACCESS_KEY",
  "BACKUP_MONITOR_MAX_DURATION_SECONDS",
  "BACKUP_MONITOR_MAX_BYTES",
];
const ALERT_ENVIRONMENT = [
  "BACKUP_MONITOR_ALERT_PROVIDER",
  "BACKUP_MONITOR_ALERT_WEBHOOK_URL",
  "BACKUP_MONITOR_EMAIL_API_URL",
  "BACKUP_MONITOR_EMAIL_TOKEN",
  "BACKUP_MONITOR_EMAIL_FROM",
  "BACKUP_MONITOR_ALERT_EMAIL_TO",
];

function configuration() {
  const checkOnly =
    process.argv.length === 3 && process.argv[2] === "--check-only";
  if (!checkOnly && process.argv.length !== 2)
    throw new MonitorFailure("unsupported arguments");
  const duration =
    integer("BACKUP_MONITOR_MAX_DURATION_SECONDS", 300, 600) * 1000;
  if (checkOnly) return { checkOnly, duration };
  const dsn = new URL(required("BACKUP_MONITOR_SENTRY_DSN"));
  const local =
    dsn.protocol === "http:" && ["127.0.0.1", "[::1]"].includes(dsn.hostname);
  if (
    (!local && dsn.protocol !== "https:") ||
    !/^[a-f0-9]{32}$/.test(dsn.username) ||
    dsn.password ||
    !/^\/[1-9]\d*$/.test(dsn.pathname) ||
    dsn.search ||
    dsn.hash
  )
    throw new MonitorFailure("invalid explicit monitor DSN");
  const slug = required("BACKUP_MONITOR_SENTRY_SLUG");
  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(slug))
    throw new MonitorFailure("invalid explicit monitor slug");
  return {
    checkOnly,
    duration,
    endpoint: new URL(`/api${dsn.pathname}/envelope/`, dsn.origin),
    key: dsn.username,
    slug,
    id: randomUUID().replaceAll("-", ""),
  };
}

async function checkIn(config, status, duration, signal) {
  const payload = JSON.stringify({
    check_in_id: config.id,
    monitor_slug: config.slug,
    status,
    ...(status === "in_progress"
      ? {
          monitor_config: {
            schedule: { type: "crontab", value: "15 * * * *" },
            timezone: "Etc/UTC",
            checkin_margin: 10,
            max_runtime: 11,
            failure_issue_threshold: 1,
            recovery_threshold: 1,
          },
        }
      : { duration }),
  });
  try {
    const response = await fetch(config.endpoint, {
      method: "POST",
      redirect: "error",
      signal: signal
        ? AbortSignal.any([AbortSignal.timeout(5000), signal])
        : AbortSignal.timeout(5000),
      headers: {
        "Content-Type": "application/x-sentry-envelope",
        "X-Sentry-Auth": `Sentry sentry_version=7,sentry_key=${config.key}`,
      },
      body: [
        JSON.stringify({ sent_at: new Date().toISOString() }),
        JSON.stringify({
          type: "check_in",
          length: Buffer.byteLength(payload),
        }),
        payload,
        "",
      ].join("\n"),
    });
    if (!response.ok) {
      await response.body?.cancel();
      return false;
    }
    let bytes = 0;
    for await (const chunk of response.body ?? []) {
      bytes += chunk.length;
      if (bytes > 16384) return false;
    }
    return true;
  } catch {
    // Delivery can be uncertain; never repeat an accepted check-in blindly.
    return false;
  }
}

async function runReader(config, signal) {
  const environment = {
    PATH: process.env.PATH ?? "",
    TZ: "UTC",
    NODE_ENV: "production",
  };
  for (const name of [
    ...READER_ENVIRONMENT,
    ...(config.checkOnly ? [] : ALERT_ENVIRONMENT),
  ]) {
    if (process.env[name] !== undefined) environment[name] = process.env[name];
  }
  const child = spawn(
    process.execPath,
    [CHECKER, ...(config.checkOnly ? ["--check-only"] : [])],
    {
      env: environment,
      detached: process.platform !== "win32",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let failure;
  let outputBytes = 0;
  let termination;
  const kill = (name) => {
    try {
      if (process.platform === "win32") child.kill(name);
      else if (child.pid) process.kill(-child.pid, name);
    } catch {
      child.kill(name);
    }
  };
  const stop = (reason) => {
    failure ??= reason;
    if (!termination) {
      kill("SIGTERM");
      termination = new Promise((resolve) => {
        setTimeout(() => {
          kill("SIGKILL");
          resolve();
        }, 1000);
      });
    }
  };
  const interrupted = () => stop("reader interrupted");
  signal.addEventListener("abort", interrupted, { once: true });
  if (signal.aborted) interrupted();
  // The reader owns a 500ms child drain and a bounded five-second failure alert.
  const timer = setTimeout(
    () => stop("reader deadline exceeded"),
    config.duration + 7000,
  );
  for (const stream of [child.stdout, child.stderr])
    stream.on("data", (chunk) => {
      outputBytes += chunk.length;
      if (outputBytes > 262144) stop("reader output limit exceeded");
    });
  try {
    const status = await new Promise((resolve) => {
      child.once("error", () => {
        failure = "reader could not start";
        resolve(null);
      });
      child.once("close", (code) => resolve(code));
    });
    await termination;
    if (failure || status !== 0)
      throw new MonitorFailure(failure ?? "reader reported failure");
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", interrupted);
    kill("SIGKILL");
  }
}

async function main() {
  const config = configuration();
  const controller = new AbortController();
  const interrupt = () => controller.abort();
  process.once("SIGTERM", interrupt);
  process.once("SIGINT", interrupt);
  const started = performance.now();
  let checkedIn = true;
  let failure;
  try {
    if (!config.checkOnly)
      checkedIn = await checkIn(
        config,
        "in_progress",
        undefined,
        controller.signal,
      );
    try {
      if (controller.signal.aborted)
        throw new MonitorFailure("monitor interrupted");
      await runReader(config, controller.signal);
    } catch (error) {
      failure =
        error instanceof MonitorFailure
          ? error
          : new MonitorFailure("reader failed safely");
    }
    if (!config.checkOnly) {
      const terminalAccepted = await checkIn(
        config,
        failure || controller.signal.aborted || !checkedIn ? "error" : "ok",
        (performance.now() - started) / 1000,
      );
      if (!checkedIn || !terminalAccepted)
        failure ??= new MonitorFailure("monitor check-in delivery failed");
    }
    if (controller.signal.aborted)
      failure ??= new MonitorFailure("monitor interrupted");
    if (failure) throw failure;
    process.stdout.write(
      `${JSON.stringify({ event: "backup_monitor_verified", checkOnly: config.checkOnly })}\n`,
    );
  } finally {
    process.removeListener("SIGTERM", interrupt);
    process.removeListener("SIGINT", interrupt);
  }
}

main().catch((error) => {
  const reason =
    error instanceof MonitorFailure ? error.message : "monitor failed safely";
  process.stderr.write(`Backup monitor failed: ${reason}.\n`);
  process.exitCode = 1;
});
