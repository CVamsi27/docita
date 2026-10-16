import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { createEnvironmentReader } from "./backup-environment.mjs";

export const BACKUP_WRITER_ENVIRONMENT = [
  "BACKUP_DATABASE_URL",
  "BACKUP_S3_ENDPOINT",
  "BACKUP_BUCKET",
  "BACKUP_AGE_RECIPIENT",
  "BACKUP_SOURCE_ID",
  "BACKUP_ACCESS_KEY_ID",
  "BACKUP_SECRET_ACCESS_KEY",
  "BACKUP_MAX_DURATION_SECONDS",
  "BACKUP_MAX_BYTES",
  "BACKUP_TLS_CA_FILE",
  "BACKUP_TEMP_DIR",
];
export const BACKUP_READER_ENVIRONMENT = [
  "BACKUP_MONITOR_S3_ENDPOINT",
  "BACKUP_MONITOR_BUCKET",
  "BACKUP_MONITOR_AGE_RECIPIENT",
  "BACKUP_MONITOR_ACCESS_KEY_ID",
  "BACKUP_MONITOR_SECRET_ACCESS_KEY",
  "BACKUP_MONITOR_MAX_DURATION_SECONDS",
  "BACKUP_MONITOR_MAX_BYTES",
];

export function backupCheckInConfiguration(dsnName, slugName, Failure) {
  const { required } = createEnvironmentReader(Failure);
  const dsn = new URL(required(dsnName));
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
    throw new Failure("invalid explicit monitor DSN");
  const slug = required(slugName);
  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(slug))
    throw new Failure("invalid explicit monitor slug");
  return {
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
      ? { monitor_config: config.monitorConfig }
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

async function runChild(config, signal) {
  const environment = {
    PATH: process.env.PATH ?? "",
    TZ: "UTC",
    NODE_ENV: "production",
  };
  for (const name of config.environmentNames) {
    if (process.env[name] !== undefined) environment[name] = process.env[name];
  }
  const child = spawn(
    process.execPath,
    [fileURLToPath(config.script), ...config.args],
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
  const interrupted = () => stop(`${config.label} interrupted`);
  signal.addEventListener("abort", interrupted, { once: true });
  if (signal.aborted) interrupted();
  // Leave room for child-owned cleanup and the reader's bounded failure alert.
  const timer = setTimeout(
    () => stop(`${config.label} deadline exceeded`),
    config.duration + 7000,
  );
  for (const stream of [child.stdout, child.stderr])
    stream.on("data", (chunk) => {
      outputBytes += chunk.length;
      if (outputBytes > 262144) stop(`${config.label} output limit exceeded`);
    });
  try {
    const status = await new Promise((resolve) => {
      child.once("error", () => {
        failure = `${config.label} could not start`;
        resolve(null);
      });
      child.once("close", (code) => resolve(code));
    });
    await termination;
    if (failure || status !== 0)
      throw new config.Failure(failure ?? `${config.label} reported failure`);
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", interrupted);
    kill("SIGKILL");
  }
}

export async function runBackupLifecycle(config) {
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
        throw new config.Failure("job interrupted");
      for (const step of config.steps ?? [config]) {
        if (controller.signal.aborted)
          throw new config.Failure("job interrupted");
        await runChild({ ...config, ...step }, controller.signal);
      }
    } catch (error) {
      failure =
        error instanceof config.Failure
          ? error
          : new config.Failure("job failed safely");
    }
    if (!config.checkOnly) {
      const terminalAccepted = await checkIn(
        config,
        failure || controller.signal.aborted || !checkedIn ? "error" : "ok",
        (performance.now() - started) / 1000,
      );
      if (!checkedIn || !terminalAccepted)
        failure ??= new config.Failure("job check-in delivery failed");
    }
    if (controller.signal.aborted)
      failure ??= new config.Failure("job interrupted");
    if (failure) throw failure;
    process.stdout.write(
      `${JSON.stringify({ event: config.event, checkOnly: config.checkOnly })}\n`,
    );
  } finally {
    process.removeListener("SIGTERM", interrupt);
    process.removeListener("SIGINT", interrupt);
  }
}
