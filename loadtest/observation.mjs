import http from "node:http";
import https from "node:https";
import { performance } from "node:perf_hooks";

export const rounded = (value) => Math.round(value * 1_000) / 1_000;

/** Nearest rank over the observed population; no interpolation or fabricated empty zero. */
function latencySummary(values) {
  const sorted = values
    .filter((value) => Number.isFinite(value) && value >= 0)
    .sort((a, b) => a - b);
  const percentile = (rank) =>
    sorted.length ? rounded(sorted[Math.ceil(rank * sorted.length) - 1]) : null;
  return {
    method: "nearest-rank",
    samples: sorted.length,
    p50: percentile(0.5),
    p95: percentile(0.95),
    p99: percentile(0.99),
    min: sorted.length ? rounded(sorted[0]) : null,
    max: sorted.length ? rounded(sorted.at(-1)) : null,
  };
}

/** Native HTTP does not follow redirects or use proxy environment variables. */
export function observeRequest({ origin, route, credential, limits, agent }) {
  const started = performance.now();
  let request;
  let finish;
  const promise = new Promise((resolve) => {
    let done = false;
    let bytes = 0;
    let statusCode = null;
    let timer;
    finish = (outcome, code = null) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve({
        outcome,
        statusCode,
        durationMs: rounded(performance.now() - started),
        responseBytes: bytes,
        code,
      });
    };
    try {
      const transport = origin.startsWith("https:") ? https : http;
      request = transport.request(
        new URL(route.path, origin),
        {
          method: "GET",
          agent,
          headers: {
            authorization: `Bearer ${credential.bearerToken}`,
            accept: "application/json",
          },
        },
        (response) => {
          statusCode = response.statusCode ?? null;
          if (statusCode !== route.expectedStatus) {
            const outcome =
              statusCode === 429
                ? "throttled"
                : statusCode >= 300 && statusCode < 400
                  ? "redirect"
                  : "http-error";
            finish(outcome);
            response.destroy();
            return;
          }
          // Discard chunks immediately: neither successful PHI nor error bodies enter artifacts.
          response.on("data", (chunk) => {
            bytes += chunk.length;
            if (bytes > limits.maxResponseBytes) {
              finish("response-too-large");
              response.destroy();
              request.destroy();
            }
          });
          response.on("end", () => finish("success"));
          response.on("aborted", () =>
            finish("network-error", "RESPONSE_ABORTED"),
          );
          response.on("error", () => finish("network-error", "RESPONSE_ERROR"));
        },
      );
      request.on("error", (error) => {
        const code = /^[A-Z0-9_]{1,32}$/.test(error.code ?? "")
          ? error.code
          : "REQUEST_ERROR";
        finish("network-error", code);
      });
      timer = setTimeout(() => {
        finish("timeout");
        request.destroy();
      }, limits.timeoutMs);
      request.end();
    } catch {
      finish("network-error", "REQUEST_SETUP");
      request?.destroy();
    }
  });
  return {
    promise,
    abort: () => {
      finish("cancelled");
      request?.destroy();
    },
  };
}

export function summarize(samples) {
  const count = (outcome) =>
    samples.filter((row) => row.outcome === outcome).length;
  const dispatched = samples.filter((row) => row.dispatchedOffsetMs !== null);
  return {
    offered: samples.length,
    dispatched: dispatched.length,
    success: count("success"),
    httpErrors: count("http-error"),
    throttled: count("throttled"),
    redirects: count("redirect"),
    timeouts: count("timeout"),
    networkErrors: count("network-error"),
    responseTooLarge: count("response-too-large"),
    cancelled: count("cancelled"),
    clientCapacityDrops: count("client-capacity"),
    clientLagDrops: count("client-lag"),
    successfulLatencyMs: latencySummary(
      samples
        .filter((row) => row.outcome === "success")
        .map((row) => row.durationMs),
    ),
    allAttemptDurationsMs: latencySummary(
      dispatched.map((row) => row.durationMs),
    ),
  };
}
