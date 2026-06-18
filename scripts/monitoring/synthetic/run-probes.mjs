#!/usr/bin/env node

/**
 * Production synthetic uptime probes. Run locally or from CI:
 *   pnpm monitor:synthetic
 *
 * Env:
 *   SYNTHETIC_API_BASE_URL  (default https://api.docita.work/api/v1)
 *   SYNTHETIC_FLY_API_ORIGIN (optional direct Fly origin for post-deploy warmup)
 *   SYNTHETIC_APP_BASE_URL  (default https://app.docita.work)
 *   SYNTHETIC_MONITOR_EMAIL / SYNTHETIC_MONITOR_PASSWORD (optional staff login probe)
 *   SYNTHETIC_POST_DEPLOY     (optional — longer timeouts + API warmup after Fly deploy)
 *   SENTRY_DSN              (optional — emits error event on failure)
 *   OPS_ALERT_WEBHOOK_URL   (optional — Slack/PagerDuty-compatible webhook)
 */

import {
  fetchWithTimeout,
  ProbeFailure,
  readHttpErrorDetail,
  reportOpsAlertToWebhook,
  reportProbeFailureToSentry,
  runProbe,
  sleep,
} from "./probe-lib.mjs";
import {
  isFlyRecoveryEnabled,
  restartFlyAppMachines,
  shouldAttemptFlyRecovery,
} from "./fly-recovery.mjs";

const API_ORIGIN =
  process.env.SYNTHETIC_API_ORIGIN?.replace(/\/$/, "") ??
  "https://api.docita.work/api";
const API_V1 =
  process.env.SYNTHETIC_API_BASE_URL?.replace(/\/$/, "") ?? `${API_ORIGIN}/v1`;
const FLY_API_ORIGIN =
  process.env.SYNTHETIC_FLY_API_ORIGIN?.replace(/\/$/, "") ?? "";
const APP_BASE =
  process.env.SYNTHETIC_APP_BASE_URL?.replace(/\/$/, "") ??
  "https://app.docita.work";
const SENTRY_DSN = process.env.SENTRY_DSN ?? "";
const OPS_ALERT_WEBHOOK_URL = process.env.OPS_ALERT_WEBHOOK_URL ?? "";
const FLY_APP_NAME = process.env.FLY_API_APP_NAME?.trim() || "docita-api";
const FLY_PROCESS_GROUP = process.env.FLY_API_PROCESS_GROUP?.trim() || "app";
// Settle window between a recovery restart reporting `started` and the re-probe,
// so the in-VM cold boot has a head start before the first retry attempt.
const RECOVERY_SETTLE_MS = 8_000;
const IS_POST_DEPLOY =
  process.env.SYNTHETIC_POST_DEPLOY === "1" ||
  process.env.SYNTHETIC_POST_DEPLOY === "true";

const FETCH_TIMEOUT_MS = IS_POST_DEPLOY ? 60_000 : 15_000;
const POST_DEPLOY_WARMUP_ATTEMPTS = 8;
const POST_DEPLOY_WARMUP_DELAY_MS = 10_000;
const POST_DEPLOY_STAFF_LOGIN_ATTEMPTS = 4;
const POST_DEPLOY_STAFF_LOGIN_DELAY_MS = 10_000;
/** Fly suspend + cross-region CI runners often need multiple wakes before 200. */
const SCHEDULED_PROBE_ATTEMPTS = 3;
const SCHEDULED_PROBE_RETRY_DELAY_MS = 5_000;

const LATENCY_TARGETS_MS = {
  // Fly autostart from GitHub Actions (non-Mumbai) can exceed 2s on a warm machine.
  "api-health-live": 5_000,
  // App origin cold starts (OpenNext on Cloudflare) can exceed 3s from CI runners.
  "daily-thought": 5_000,
  "staff-login": 5_000,
};

function isRetryableStaffLoginFailure(response, error) {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (
      message.includes("timed out") ||
      message.includes("fetch failed") ||
      message.includes("aborterror") ||
      message.includes("econnrefused") ||
      message.includes("enotfound")
    ) {
      return true;
    }
  }

  if (!response) {
    return true;
  }

  if (response.status >= 502 || response.status === 429) {
    return true;
  }

  return false;
}

async function assertApiHealthLiveResponse(response, latencyMs) {
  if (!response.ok) {
    const detail = await readHttpErrorDetail(response);
    throw new Error(
      detail
        ? `Expected 200, got ${response.status} (${detail})`
        : `Expected 200, got ${response.status}`,
    );
  }

  const body = await response.json();
  if (body.status !== "ok" || body.service !== "docita-api") {
    throw new Error(`Unexpected liveness payload: ${JSON.stringify(body)}`);
  }

  if (!IS_POST_DEPLOY && latencyMs > LATENCY_TARGETS_MS["api-health-live"]) {
    throw new Error(
      `Latency ${latencyMs}ms exceeds ${LATENCY_TARGETS_MS["api-health-live"]}ms target`,
    );
  }
}

/**
 * Shared retry loop for the simple GET-and-assert probes (`api-health-live`,
 * `daily-thought`): fetch with a timeout, run the probe-specific assertion,
 * and retry with backoff until `SCHEDULED_PROBE_ATTEMPTS` is exhausted. Both
 * probes need this because Fly autostart / OpenNext cold starts can fail the
 * first request of a cycle — only the URL and response assertion differ.
 */
async function runRetryableGetProbe(probeName, url, assertResponse) {
  const attempts = IS_POST_DEPLOY ? 1 : SCHEDULED_PROBE_ATTEMPTS;
// jscpd:ignore-start
  let lastError = `${probeName} probe failed`;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const { response, latencyMs } = await fetchWithTimeout(
        url,
        { headers: { Accept: "application/json" } },
        FETCH_TIMEOUT_MS,
      );

      await assertResponse(response, latencyMs);
// jscpd:ignore-end

      if (attempt > 1) {
        process.stdout.write(
          `${probeName}: succeeded on attempt ${attempt}/${attempts} (${latencyMs}ms)\n`,
        );
      }

      return { latencyMs };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);

      if (attempt < attempts) {
        process.stdout.write(
          `${probeName}: attempt ${attempt}/${attempts} failed (${lastError}); retrying in ${SCHEDULED_PROBE_RETRY_DELAY_MS}ms...\n`,
        );
        await sleep(SCHEDULED_PROBE_RETRY_DELAY_MS);
      }
    }
  }

  throw new Error(lastError);
}

async function probeApiHealthLive() {
  return runProbe("api-health-live", () =>
    runRetryableGetProbe(
      "api-health-live",
      `${API_ORIGIN}/health/live`,
      assertApiHealthLiveResponse,
    ),
  );
}

async function assertDailyThoughtResponse(response, latencyMs) {
  if (!response.ok) {
    throw new Error(`Expected 200, got ${response.status}`);
  }

  const body = await response.json();
  if (typeof body.quote !== "string" || body.quote.trim().length === 0) {
    throw new Error("Response missing non-empty quote field");
  }

  const cacheControl = response.headers.get("cache-control") ?? "";
  if (!cacheControl.toLowerCase().includes("public")) {
    throw new Error(`Expected public Cache-Control, got "${cacheControl}"`);
  }

  if (!IS_POST_DEPLOY && latencyMs > LATENCY_TARGETS_MS["daily-thought"]) {
    throw new Error(
      `Latency ${latencyMs}ms exceeds ${LATENCY_TARGETS_MS["daily-thought"]}ms target`,
    );
  }
}

async function probeDailyThought() {
  // The app origin (OpenNext on Cloudflare) and the API behind it can cold
  // start from a non-warm CI runner, so the first request of a scheduled cycle
  // can time out while the platform wakes. Retry like api-health-live so a
  // cold start warms the path instead of paging.
  return runProbe("daily-thought", () =>
    runRetryableGetProbe(
      "daily-thought",
      `${APP_BASE}/api/v1/public/daily-thought`,
      assertDailyThoughtResponse,
    ),
  );
}

async function probeStaffLogin({ apiReachable = true } = {}) {
  const email = process.env.SYNTHETIC_MONITOR_EMAIL?.trim();
  const password = process.env.SYNTHETIC_MONITOR_PASSWORD?.trim();

  if (!email || !password) {
    process.stdout.write(
      "staff-login: skipped (set SYNTHETIC_MONITOR_EMAIL and SYNTHETIC_MONITOR_PASSWORD)\n",
    );
    return { probeName: "staff-login", ok: true, skipped: true };
  }

  if (!apiReachable) {
    process.stdout.write(
      "staff-login: skipped (api-health-live did not pass — login probe is not meaningful)\n",
    );
    return { probeName: "staff-login", ok: true, skipped: true };
  }

  const attempts = IS_POST_DEPLOY
    ? POST_DEPLOY_STAFF_LOGIN_ATTEMPTS
    : SCHEDULED_PROBE_ATTEMPTS;
  const retryDelayMs = IS_POST_DEPLOY
    ? POST_DEPLOY_STAFF_LOGIN_DELAY_MS
    : SCHEDULED_PROBE_RETRY_DELAY_MS;

  return runProbe("staff-login", () =>
    runStaffLoginAttempts({ email, password, attempts, retryDelayMs }),
  );
}

async function runStaffLoginAttempts({
  email,
  password,
  attempts,
  retryDelayMs,
}) {
  let lastError = "Expected 2xx login";
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const result = await runStaffLoginAttempt({
      email,
      password,
      attempt,
      attempts,
    });
    if (result.ok) return result.value;
    lastError = result.error;
    if (!result.retryable || attempt >= attempts) break;
    await retryStaffLogin(attempt, attempts, retryDelayMs, lastError);
  }
  throw new Error(
    `${lastError}. Verify SYNTHETIC_MONITOR_EMAIL and SYNTHETIC_MONITOR_PASSWORD GitHub secrets match the production monitor user (no trailing whitespace; account not locked; MFA disabled).`,
  );
}

async function runStaffLoginAttempt({ email, password, attempt, attempts }) {
  try {
    const { response, latencyMs } = await fetchWithTimeout(
      `${API_V1}/auth/login`,
      staffLoginRequest(email, password),
      FETCH_TIMEOUT_MS,
    );
    return await evaluateStaffLoginResponse(
      response,
      latencyMs,
      attempt,
      attempts,
    );
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      retryable: isRetryableStaffLoginFailure(null, error),
    };
  }
}

function staffLoginRequest(email, password) {
  return {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  };
}

async function evaluateStaffLoginResponse(
  response,
  latencyMs,
  attempt,
  attempts,
) {
  if (response.status !== 200 && response.status !== 201) {
    return {
      ok: false,
      error: await staffLoginHttpError(response),
      retryable: isRetryableStaffLoginFailure(response, null),
    };
  }
  await assertStaffLoginBody(response);
  assertStaffLoginLatency(latencyMs);
  if (attempt > 1) {
    process.stdout.write(
      `staff-login: succeeded on attempt ${attempt}/${attempts} (${latencyMs}ms)\n`,
    );
  }
  return { ok: true, value: { latencyMs } };
}

async function staffLoginHttpError(response) {
  const detail = await readHttpErrorDetail(response);
  return detail
    ? `Expected 2xx login, got ${response.status} (${detail})`
    : `Expected 2xx login, got ${response.status}`;
}

async function assertStaffLoginBody(response) {
  const body = await response.json().catch(() => null);
  if (body && typeof body === "object" && body.mfa_required === true) {
    throw new Error(
      "Monitor account has MFA enabled; disable MFA on the synthetic monitor user or extend the probe to verify MFA",
    );
  }
  const setCookie = response.headers.get("set-cookie") ?? "";
  if (!setCookie.includes("access_token=")) {
    throw new Error("Login response missing access_token cookie");
  }
}

function assertStaffLoginLatency(latencyMs) {
  if (!IS_POST_DEPLOY && latencyMs > LATENCY_TARGETS_MS["staff-login"]) {
    throw new Error(
      `Latency ${latencyMs}ms exceeds ${LATENCY_TARGETS_MS["staff-login"]}ms target`,
    );
  }
}

async function retryStaffLogin(attempt, attempts, retryDelayMs, lastError) {
  process.stdout.write(
    `staff-login: attempt ${attempt}/${attempts} failed (${lastError}); retrying in ${retryDelayMs}ms...\n`,
  );
  await sleep(retryDelayMs);
}

async function waitForEndpointReady({
  label,
  url,
  validate,
  attempts = POST_DEPLOY_WARMUP_ATTEMPTS,
  delayMs = POST_DEPLOY_WARMUP_DELAY_MS,
}) {
  process.stdout.write(
    `Post-deploy warmup: polling ${label} (${url}, up to ${attempts} attempts)...\n`,
// jscpd:ignore-start
  );

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const { response, latencyMs } = await fetchWithTimeout(
        url,
        { headers: { Accept: "application/json" } },
        FETCH_TIMEOUT_MS,
      );

      await validate(response, latencyMs);
// jscpd:ignore-end

      process.stdout.write(
        `Post-deploy warmup: ${label} ready on attempt ${attempt}/${attempts} (${latencyMs}ms)\n`,
      );
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      process.stdout.write(
        `Post-deploy warmup: ${label} attempt ${attempt}/${attempts} failed (${message})\n`,
      );

      if (attempt < attempts) {
        await sleep(delayMs);
      }
    }
  }

  throw new ProbeFailure(
    label,
    `${label} did not become ready within ${attempts} warmup attempts`,
  );
}

async function waitForApiWarmAfterDeploy() {
  if (FLY_API_ORIGIN) {
    await waitForEndpointReady({
      label: "fly-api-health-live",
      url: `${FLY_API_ORIGIN}/health/live`,
      validate: async (response) => {
        if (!response.ok) {
          throw new Error(`Expected 200, got ${response.status}`);
        }

        const body = await response.json();
        if (body.status !== "ok" || body.service !== "docita-api") {
          throw new Error(
            `Unexpected liveness payload: ${JSON.stringify(body)}`,
          );
        }
      },
    });
  }

  await waitForEndpointReady({
    label: "api-health-live",
    url: `${API_ORIGIN}/health/live`,
    validate: async (response) => {
      if (!response.ok) {
        throw new Error(`Expected 200, got ${response.status}`);
      }

      const body = await response.json();
      if (body.status !== "ok" || body.service !== "docita-api") {
        throw new Error(`Unexpected liveness payload: ${JSON.stringify(body)}`);
      }
    },
  });

  await waitForEndpointReady({
    label: "api-health-ready",
    url: `${API_ORIGIN}/health/ready`,
    validate: async (response) => {
      if (!response.ok) {
        const detail = await readHttpErrorDetail(response);
        throw new Error(
          detail
            ? `Expected 200, got ${response.status} (${detail})`
            : `Expected 200, got ${response.status}`,
        );
      }

      const body = await response.json();
      if (body.ready !== true) {
        throw new Error(
          `Unexpected readiness payload: ${JSON.stringify(body)}`,
        );
      }
    },
  });
}

function toProbeFailure(error) {
  return error instanceof ProbeFailure
    ? error
    : new ProbeFailure(
        "unknown",
        error instanceof Error ? error.message : String(error),
      );
}

/**
 * Auto-recovery hook for `api-health-live`: when the failure looks like an
 * unreachable/frozen API (timeout, connection refused, `PR01`, 5xx gateway),
 * issue a single Fly machine restart and let the caller re-probe. Returns true
 * only if a restart was actually performed, so the caller knows to retry.
 * No-op (returns false) outside scheduled runs, when `FLY_API_TOKEN` is unset,
 * or when the failure isn't restart-recoverable (e.g. latency breach).
 */
async function recoverApiViaFlyRestart(failure) {
  if (IS_POST_DEPLOY || !isFlyRecoveryEnabled()) {
    return false;
  }
  if (!shouldAttemptFlyRecovery(failure.message)) {
    return false;
  }

  process.stdout.write(
    `api-health-live: failure looks like an unreachable/frozen API — restarting ${FLY_APP_NAME} machine(s)...\n`,
  );

  const outcome = await restartFlyAppMachines({
    app: FLY_APP_NAME,
    processGroup: FLY_PROCESS_GROUP,
  });

  if (!outcome.ok) {
    process.stderr.write(
      `api-health-live: auto-recovery restart failed (${outcome.error})\n`,
    );
    return false;
  }

  process.stdout.write(
    `api-health-live: restarted machine(s) ${outcome.machineIds.join(", ")}; settling ${RECOVERY_SETTLE_MS}ms before re-probe...\n`,
  );
  await sleep(RECOVERY_SETTLE_MS);

  // Informational page so the recovery is visible without a red CI run — a
  // machine that needs restarting every cycle is still worth a human's eyes.
  await reportOpsAlertToWebhook(
    OPS_ALERT_WEBHOOK_URL,
    "Synthetic auto-recovery",
    `Restarted ${FLY_APP_NAME} machine(s) ${outcome.machineIds.join(", ")} after: ${failure.message}`,
    {
      probe: failure.probeName,
      source: "synthetic-monitoring",
      action: "fly-machine-restart",
    },
  );

  return true;
}

async function main() {
  if (IS_POST_DEPLOY) {
    await waitForApiWarmAfterDeploy();
  }

  const results = [];
  const failures = [];
  let apiHealthPassed = false;

  function recordPass(result) {
    results.push(result);
    if (!result.skipped) {
      process.stdout.write(
        `${result.probeName}: PASS (${result.latencyMs ?? "?"}ms)\n`,
      );
    }
    return result;
  }

  async function reportFailure(failure) {
    failures.push(failure);
    process.stderr.write(`${failure.message}\n`);
    await reportProbeFailureToSentry(
      SENTRY_DSN,
      failure.probeName,
      failure.message,
      failure.details,
    );
    await reportOpsAlertToWebhook(
      OPS_ALERT_WEBHOOK_URL,
      "Synthetic probe failed",
      failure.message,
      { probe: failure.probeName, source: "synthetic-monitoring" },
    );
    return null;
  }

  async function runProbeStep(probe, { recover } = {}) {
    try {
      return recordPass(await probe());
    } catch (error) {
      const failure = toProbeFailure(error);
      if (recover && (await recover(failure))) {
        try {
          return recordPass(await probe());
        } catch (retryError) {
          return reportFailure(toProbeFailure(retryError));
        }
      }
      return reportFailure(failure);
    }
  }
  const healthResult = await runProbeStep(probeApiHealthLive, {
    recover: recoverApiViaFlyRestart,
  });
  if (healthResult && !healthResult.skipped) {
    apiHealthPassed = true;
  }
  await runProbeStep(probeDailyThought);
  await runProbeStep(() => probeStaffLogin({ apiReachable: apiHealthPassed }));
  if (failures.length > 0) {
    process.stderr.write(
      `\nSynthetic monitoring failed: ${failures.length} probe(s).\n`,
    );
    process.exit(1);
  }
  const ran = results.filter((r) => !r.skipped).length;
  process.stdout.write(`\nSynthetic monitoring passed (${ran} probe(s)).\n`);
}

main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exit(1);
});
