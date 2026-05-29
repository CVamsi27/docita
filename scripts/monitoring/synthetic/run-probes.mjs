#!/usr/bin/env node

/**
 * Production synthetic uptime probes. Run locally or from CI:
 *   pnpm monitor:synthetic
 *
 * Env:
 *   SYNTHETIC_API_BASE_URL  (default https://api.docita.work/api/v1)
 *   SYNTHETIC_APP_BASE_URL  (default https://app.docita.work)
 *   SYNTHETIC_MONITOR_EMAIL / SYNTHETIC_MONITOR_PASSWORD (optional staff login probe)
 *   SENTRY_DSN              (optional — emits error event on failure)
 */

import {
  fetchWithTimeout,
  ProbeFailure,
  reportProbeFailureToSentry,
  runProbe,
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

const FETCH_TIMEOUT_MS = 5_000;

const LATENCY_TARGETS_MS = {
  "api-health-live": 2_000,
  "daily-thought": 3_000,
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

    if (latencyMs > LATENCY_TARGETS_MS["api-health-live"]) {
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
  const password = process.env.SYNTHETIC_MONITOR_PASSWORD;

  if (!email || !password) {
    process.stdout.write(
      "staff-login: skipped (set SYNTHETIC_MONITOR_EMAIL and SYNTHETIC_MONITOR_PASSWORD)\n",
    );
    return { probeName: "staff-login", ok: true, skipped: true };
  }

  return runProbe("staff-login", async () => {
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

    if (response.status !== 200 && response.status !== 201) {
      throw new Error(`Expected 2xx login, got ${response.status}`);
    }

    const setCookie = response.headers.get("set-cookie") ?? "";
    if (!setCookie.includes("access_token=")) {
      throw new Error("Login response missing access_token cookie");
    }

    if (latencyMs > LATENCY_TARGETS_MS["staff-login"]) {
      throw new Error(
        `Latency ${latencyMs}ms exceeds ${LATENCY_TARGETS_MS["staff-login"]}ms target`,
      );
    }

    return { latencyMs };
  });
}

async function main() {
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
