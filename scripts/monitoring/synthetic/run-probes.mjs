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

const FETCH_TIMEOUT_MS = IS_POST_DEPLOY ? 60_000 : 5_000;
const POST_DEPLOY_WARMUP_ATTEMPTS = 8;
const POST_DEPLOY_WARMUP_DELAY_MS = 10_000;
const POST_DEPLOY_STAFF_LOGIN_ATTEMPTS = 4;
const POST_DEPLOY_STAFF_LOGIN_DELAY_MS = 10_000;

const LATENCY_TARGETS_MS = {
  "api-health-live": 2_000,
  // App origin cold starts (OpenNext on Cloudflare) can exceed 3s from CI runners.
  "daily-thought": 5_000,
  "staff-login": 1_500,
};

async function probeApiHealthLive() {
  return runProbe("api-health-live", async () => {
    const { response, latencyMs } = await fetchWithTimeout(
      `${API_ORIGIN}/health/live`,
      { headers: { Accept: "application/json" } },
      FETCH_TIMEOUT_MS,
    );

    if (!response.ok) {
      throw new Error(`Expected 200, got ${response.status}`);
    }

    const body = await response.json();
    if (body.status !== "ok" || body.service !== "docita-api") {
      throw new Error(`Unexpected liveness payload: ${JSON.stringify(body)}`);
    }

    if (
      !IS_POST_DEPLOY &&
      latencyMs > LATENCY_TARGETS_MS["api-health-live"]
    ) {
      throw new Error(
        `Latency ${latencyMs}ms exceeds ${LATENCY_TARGETS_MS["api-health-live"]}ms target`,
      );
    }

    return { latencyMs };
  });
}

async function probeDailyThought() {
  return runProbe("daily-thought", async () => {
    const { response, latencyMs } = await fetchWithTimeout(
      `${APP_BASE}/api/daily-thought`,
      { headers: { Accept: "application/json" } },
      FETCH_TIMEOUT_MS,
    );

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

    return { latencyMs };
  });
}

async function probeStaffLogin() {
  const email = process.env.SYNTHETIC_MONITOR_EMAIL?.trim();
  const password = process.env.SYNTHETIC_MONITOR_PASSWORD?.trim();

  if (!email || !password) {
    process.stdout.write(
      "staff-login: skipped (set SYNTHETIC_MONITOR_EMAIL and SYNTHETIC_MONITOR_PASSWORD)\n",
    );
    return { probeName: "staff-login", ok: true, skipped: true };
  }

  const attempts = IS_POST_DEPLOY ? POST_DEPLOY_STAFF_LOGIN_ATTEMPTS : 1;

  return runProbe("staff-login", async () => {
    let lastError = "Expected 2xx login";

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      const { response, latencyMs } = await fetchWithTimeout(
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
      );

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

        if (IS_POST_DEPLOY && attempt > 1) {
          process.stdout.write(
            `staff-login: succeeded on attempt ${attempt}/${attempts}\n`,
          );
        }

        return { latencyMs };
      }

      const detail = await readHttpErrorDetail(response);
      lastError = detail
        ? `Expected 2xx login, got ${response.status} (${detail})`
        : `Expected 2xx login, got ${response.status}`;

      if (attempt < attempts) {
        process.stdout.write(
          `staff-login: attempt ${attempt}/${attempts} failed (${lastError}); retrying in ${POST_DEPLOY_STAFF_LOGIN_DELAY_MS}ms...\n`,
        );
        await sleep(POST_DEPLOY_STAFF_LOGIN_DELAY_MS);
      }
    }

    throw new Error(
      `${lastError}. Verify SYNTHETIC_MONITOR_EMAIL and SYNTHETIC_MONITOR_PASSWORD GitHub secrets match the production monitor account (no trailing whitespace; account not locked).`,
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

  const probes = [probeApiHealthLive, probeDailyThought, probeStaffLogin];
  const results = [];
  const failures = [];

  for (const probe of probes) {
    try {
      const result = await probe();
      results.push(result);
      if (!result.skipped) {
        process.stdout.write(
          `${result.probeName}: PASS (${result.latencyMs ?? "?"}ms)\n`,
        );
      }
    } catch (error) {
      const failure =
        error instanceof ProbeFailure
          ? error
          : new ProbeFailure("unknown", error instanceof Error ? error.message : String(error));
      failures.push(failure);
      process.stderr.write(`${failure.message}\n`);
      await reportProbeFailureToSentry(SENTRY_DSN, failure.probeName, failure.message, failure.details);
      await reportOpsAlertToWebhook(
        OPS_ALERT_WEBHOOK_URL,
        "Synthetic probe failed",
        failure.message,
        { probe: failure.probeName, source: "synthetic-monitoring" },
      );
    }
  }

  if (failures.length > 0) {
    process.stderr.write(
      `\nSynthetic monitoring failed: ${failures.length}/${probes.length} probe(s).\n`,
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
