#!/usr/bin/env node

/**
 * Production synthetic uptime probes. Run locally or from CI:
 *   pnpm monitor:synthetic
 *
 * Env:
 *   SYNTHETIC_API_BASE_URL  (default https://api.docita.work/api/v1)
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

const API_ORIGIN =
  process.env.SYNTHETIC_API_ORIGIN?.replace(/\/$/, "") ??
  "https://api.docita.work/api";
const API_V1 =
  process.env.SYNTHETIC_API_BASE_URL?.replace(/\/$/, "") ?? `${API_ORIGIN}/v1`;
const APP_BASE =
  process.env.SYNTHETIC_APP_BASE_URL?.replace(/\/$/, "") ??
  "https://app.docita.work";
const SENTRY_DSN = process.env.SENTRY_DSN ?? "";
const OPS_ALERT_WEBHOOK_URL = process.env.OPS_ALERT_WEBHOOK_URL ?? "";
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

async function probeApiHealthLive() {
  return runProbe("api-health-live", async () => {
    const url = `${API_ORIGIN}/health/live`;
    const attempts = IS_POST_DEPLOY ? 1 : SCHEDULED_PROBE_ATTEMPTS;
    let lastError = "api-health-live probe failed";

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const { response, latencyMs } = await fetchWithTimeout(
          url,
          { headers: { Accept: "application/json" } },
          FETCH_TIMEOUT_MS,
        );

        await assertApiHealthLiveResponse(response, latencyMs);

        if (attempt > 1) {
          process.stdout.write(
            `api-health-live: succeeded on attempt ${attempt}/${attempts} (${latencyMs}ms)\n`,
          );
        }

        return { latencyMs };
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);

        if (attempt < attempts) {
          process.stdout.write(
            `api-health-live: attempt ${attempt}/${attempts} failed (${lastError}); retrying in ${SCHEDULED_PROBE_RETRY_DELAY_MS}ms...\n`,
          );
          await sleep(SCHEDULED_PROBE_RETRY_DELAY_MS);
        }
      }
    }

    throw new Error(lastError);
  });
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

  if (latencyMs > LATENCY_TARGETS_MS["daily-thought"]) {
    throw new Error(
      `Latency ${latencyMs}ms exceeds ${LATENCY_TARGETS_MS["daily-thought"]}ms target`,
    );
  }
}

async function probeDailyThought() {
  return runProbe("daily-thought", async () => {
    const url = `${APP_BASE}/api/v1/public/daily-thought`;
    // The app origin (OpenNext on Cloudflare) and the API behind it can cold
    // start from a non-warm CI runner, so the first request of a 5-minute cycle
    // can time out while the platform wakes. Retry like api-health-live so a
    // cold start warms the path instead of paging.
    const attempts = IS_POST_DEPLOY ? 1 : SCHEDULED_PROBE_ATTEMPTS;
    let lastError = "daily-thought probe failed";

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const { response, latencyMs } = await fetchWithTimeout(
          url,
          { headers: { Accept: "application/json" } },
          FETCH_TIMEOUT_MS,
        );

        await assertDailyThoughtResponse(response, latencyMs);

        if (attempt > 1) {
          process.stdout.write(
            `daily-thought: succeeded on attempt ${attempt}/${attempts} (${latencyMs}ms)\n`,
          );
        }

        return { latencyMs };
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);

        if (attempt < attempts) {
          process.stdout.write(
            `daily-thought: attempt ${attempt}/${attempts} failed (${lastError}); retrying in ${SCHEDULED_PROBE_RETRY_DELAY_MS}ms...\n`,
          );
          await sleep(SCHEDULED_PROBE_RETRY_DELAY_MS);
        }
      }
    }

    throw new Error(lastError);
  });
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

  return runProbe("staff-login", async () => {
    let lastError = "Expected 2xx login";

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      let response;
      let latencyMs;

      try {
        ({ response, latencyMs } = await fetchWithTimeout(
          `${API_V1}/auth/login`,
          {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, password }),
          },
          FETCH_TIMEOUT_MS,
        ));
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        if (!isRetryableStaffLoginFailure(null, error) || attempt >= attempts) {
          break;
        }
        process.stdout.write(
          `staff-login: attempt ${attempt}/${attempts} failed (${lastError}); retrying in ${retryDelayMs}ms...\n`,
        );
        await sleep(retryDelayMs);
        continue;
      }

      if (response.status === 200 || response.status === 201) {
        const body = await response.json().catch(() => null);
        if (
          body &&
          typeof body === "object" &&
          body.mfa_required === true
        ) {
          throw new Error(
            "Monitor account has MFA enabled; disable MFA on the synthetic monitor user or extend the probe to verify MFA",
          );
        }

        const setCookie = response.headers.get("set-cookie") ?? "";
        if (!setCookie.includes("access_token=")) {
          throw new Error("Login response missing access_token cookie");
        }

        if (
          !IS_POST_DEPLOY &&
          latencyMs > LATENCY_TARGETS_MS["staff-login"]
        ) {
          throw new Error(
            `Latency ${latencyMs}ms exceeds ${LATENCY_TARGETS_MS["staff-login"]}ms target`,
          );
        }

        if (attempt > 1) {
          process.stdout.write(
            `staff-login: succeeded on attempt ${attempt}/${attempts} (${latencyMs}ms)\n`,
          );
        }

        return { latencyMs };
      }

      const detail = await readHttpErrorDetail(response);
      lastError = detail
        ? `Expected 2xx login, got ${response.status} (${detail})`
        : `Expected 2xx login, got ${response.status}`;

      if (!isRetryableStaffLoginFailure(response, null) || attempt >= attempts) {
        break;
      }

      process.stdout.write(
        `staff-login: attempt ${attempt}/${attempts} failed (${lastError}); retrying in ${retryDelayMs}ms...\n`,
      );
      await sleep(retryDelayMs);
    }

    throw new Error(
      `${lastError}. Verify SYNTHETIC_MONITOR_EMAIL and SYNTHETIC_MONITOR_PASSWORD GitHub secrets match the production monitor user (no trailing whitespace; account not locked; MFA disabled).`,
    );
  });
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
  );

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const { response, latencyMs } = await fetchWithTimeout(
        url,
        { headers: { Accept: "application/json" } },
        FETCH_TIMEOUT_MS,
      );

      await validate(response, latencyMs);

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
        throw new Error(`Unexpected readiness payload: ${JSON.stringify(body)}`);
      }
    },
  });
}

async function main() {
  if (IS_POST_DEPLOY) {
    await waitForApiWarmAfterDeploy();
  }

  const results = [];
  const failures = [];
  let apiHealthPassed = false;

  async function runProbeStep(probe) {
    try {
      const result = await probe();
      results.push(result);
      if (!result.skipped) {
        process.stdout.write(
          `${result.probeName}: PASS (${result.latencyMs ?? "?"}ms)\n`,
        );
      }
      return result;
    } catch (error) {
      const failure =
        error instanceof ProbeFailure
          ? error
          : new ProbeFailure(
              "unknown",
              error instanceof Error ? error.message : String(error),
            );
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
  }

  const healthResult = await runProbeStep(probeApiHealthLive);
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
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
