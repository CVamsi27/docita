import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildArtifact,
  parseCookieJar,
  percentile,
  planRequests,
  readCacheHeaders,
  readRetryAfterMs,
  resolveRouteRequest,
  summarizeSamples,
} from "./capture-api-latency-soak.mjs";
import { SOAK_ROUTES } from "./api-latency-soak-routes.mjs";
import { API_LATENCY_SLOS } from "../checks/api-latency-slos.mjs";

/**
 * Regression suite for the staging soak capture (backlog R02).
 *
 * The soak is the only honest producer of the committed latency baseline, so
 * these tests pin the properties that make a capture usable as release
 * evidence: correct percentiles, throttle-aware pacing, completeness rules
 * that reject under-sampled or mis-targeted runs, and no credential in the
 * artifact. Network behaviour is exercised against a local stub server, so
 * the suite needs no staging access and no API.
 */
const scriptPath = fileURLToPath(
  new URL("./capture-api-latency-soak.mjs", import.meta.url),
);
const fixtureDir = mkdtempSync(path.join(os.tmpdir(), "api-latency-soak-"));

test.after(() => {
  rmSync(fixtureDir, { recursive: true, force: true });
});

/**
 * Start a stub API that answers every soak route with its documented status
 * (200 for reads, 401 for the webhook ingress reject) unless overridden.
 *
 * @param {Record<string, number>} statusByPathPrefix - path prefix -> status
 */
async function startStub(statusByPathPrefix = {}, throttleOncePaths = []) {
  const requests = [];
  const throttled = new Set();
  const overrides = {
    "/api/v1/webhooks/payments/razorpay": 401,
    ...statusByPathPrefix,
  };
  const server = http.createServer((req, res) => {
    requests.push({ method: req.method, url: req.url, headers: req.headers });
    for (const prefix of throttleOncePaths) {
      if (req.url.startsWith(prefix) && !throttled.has(prefix)) {
        throttled.add(prefix);
        res.writeHead(429, {
          "content-type": "application/json",
          "retry-after": "1",
        });
        res.end("{}");
        return;
      }
    }
    for (const [prefix, status] of Object.entries(overrides)) {
      if (req.url.startsWith(prefix)) {
        res.writeHead(status, { "content-type": "application/json" });
        res.end("{}");
        return;
      }
    }
    res.writeHead(200, {
      "content-type": "application/json",
      "cache-control": "public, max-age=60",
      "age": "3",
    });
    res.end("{}");
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  return {
    baseUrl: `http://127.0.0.1:${port}/api`,
    requests,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

/**
 * Run the CLI and resolve with its exit status and streams.
 *
 * `spawn` rather than `spawnSync`: the stub API lives in this process, so a
 * synchronous child would block the event loop that has to answer its
 * requests — every sample would time out.
 *
 * @param {string[]} args
 * @param {Record<string, string>} env
 * @returns {Promise<{ status: number | null; stdout: string; stderr: string }>}
 */
function runCapture(args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      env: { ...process.env, ...env },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (status) => resolve({ status, stdout, stderr }));
  });
}

test("percentile uses the nearest rank over observed samples", () => {
  const samples = Array.from({ length: 100 }, (_, i) => i + 1);
  assert.equal(percentile(samples, 50), 50);
  assert.equal(percentile(samples, 95), 95);
  assert.equal(percentile(samples, 99), 99);
  assert.equal(percentile([7], 95), 7);
  assert.equal(percentile([], 95), null);
});

test("summarizeSamples reports counts and percentiles, and nothing for an empty set", () => {
  const summary = summarizeSamples([120, 10, 300, 40, 90]);
  assert.equal(summary.samples, 5);
  assert.equal(summary.min, 10);
  assert.equal(summary.max, 300);
  assert.equal(summary.p50, 90);
  assert.equal(summarizeSamples([]), null);
});

test("planRequests honours each route interval and the global per-minute budget", () => {
  const routes = [
    { minIntervalMs: 1_000 },
    { minIntervalMs: 500 },
  ];
  const plan = planRequests(routes, {
    durationMs: 60_000,
    maxRequestsPerMinute: 120,
  });

  // Global budget 120 split across two routes = 60 each; route 1's own
  // interval only allows 60 samples in a minute, so nothing is clipped away.
  assert.equal(plan.filter((s) => s.routeIndex === 0).length, 60);
  assert.equal(plan.filter((s) => s.routeIndex === 1).length, 60);
  assert.ok(plan.every((s) => s.atMs < 60_000));

  const clipped = planRequests(routes, {
    durationMs: 60_000,
    maxRequestsPerMinute: 4,
  });
  assert.equal(clipped.length, 4, "a tight cap must clip the plan");
});

test("resolveRouteRequest fills {today} and serialises the webhook body", () => {
  const appointment = SOAK_ROUTES.find((route) =>
    route.path.includes("/api/v1/appointments"),
  );
  const resolved = resolveRouteRequest(appointment, "https://api.example/api");
  assert.match(resolved.url, /\/api\/v1\/appointments\?date=\d{4}-\d{2}-\d{2}/);
  assert.equal(resolved.init.method, "GET");

  const webhook = SOAK_ROUTES.find(
    (route) => route.path === "/api/v1/webhooks/payments/razorpay",
  );
  const webhookRequest = resolveRouteRequest(
    webhook,
    "https://api.example/api",
  );
  assert.equal(webhookRequest.init.method, "POST");
  assert.equal(
    JSON.parse(webhookRequest.init.body).event,
    webhook.body.event,
  );
  assert.equal(
    webhookRequest.init.headers["x-razorpay-signature"],
    webhook.headers["x-razorpay-signature"],
  );
});

test("resolveRouteRequest collapses a duplicated /api when the base URL already carries it", () => {
  const route = { method: "GET", path: "/api/v1/patients?limit=1" };
  assert.equal(
    resolveRouteRequest(route, "https://api.example.com/api").url,
    "https://api.example.com/api/v1/patients?limit=1",
  );
  assert.equal(
    resolveRouteRequest(route, "https://api.example.com").url,
    "https://api.example.com/api/v1/patients?limit=1",
  );
});

test("parseCookieJar keeps HttpOnly cookies, skips comments and the header block", () => {
  const jar = [
    "# Netscape HTTP Cookie File",
    "# This is a generated file! Do not edit.",
    "",
    "#HttpOnly_.example.com\tTRUE\t/\tFALSE\t1735689600\taccessToken\ttoken-value",
    ".example.com\tTRUE\t/\tFALSE\t1735689600\trefreshToken\trefresh-value",
    "# a trailing comment",
  ].join("\n");
  assert.equal(
    parseCookieJar(jar),
    "accessToken=token-value; refreshToken=refresh-value",
  );
  assert.equal(parseCookieJar("# nothing here\n"), "");
  // Session cookies (expiry 0) still authenticate a staging session.
  assert.equal(
    parseCookieJar("localhost\tFALSE\t/\tFALSE\t0\tsession\tvalue"),
    "session=value",
  );
});

test("readCacheHeaders keeps only the cache allowlist and truncates values", () => {
  const headers = new Headers({
    "cache-control": `public, max-age=${"9".repeat(120)}`,
    "x-cache": "HIT",
    "set-cookie": "session=super-secret",
  });
  const observed = readCacheHeaders(headers);
  assert.equal(observed["x-cache"], "HIT");
  assert.ok(observed["cache-control"].length <= 80);
  assert.equal(observed["set-cookie"], undefined);
});

test("readRetryAfterMs honours both Retry-After spellings and bounds the wait", () => {
  assert.equal(readRetryAfterMs(new Headers({ "retry-after": "2" })), 2_000);
  assert.equal(
    readRetryAfterMs(new Headers({ "retry-after": "99999" })),
    120_000,
  );
  assert.equal(readRetryAfterMs(new Headers({})), 60_000);
  const now = Date.parse("2026-10-04T12:00:00.000Z");
  assert.equal(
    readRetryAfterMs(
      new Headers({ "retry-after": "Sat, 04 Oct 2026 12:00:30 GMT" }),
      now,
    ),
    30_000,
  );
});

test("buildArtifact rejects a capture whose classes are under-sampled", () => {
  const artifact = buildArtifact({
    baseUrl: "https://api.example/api",
    routes: SOAK_ROUTES,
    observations: [
      { routeIndex: 0, kind: "measured", status: 200, latencyMs: 12 },
    ],
    durationMs: 60_000,
    concurrency: 4,
    maxRequestsPerMinute: 90,
    warmupSamples: 0,
    minSamples: 20,
    plannedRequests: 1,
    provenance: {},
  });

  assert.equal(artifact.complete, false);
  assert.ok(
    artifact.incompleteReasons.some((reason) =>
      reason.startsWith("crud: 0 sample(s)"),
    ),
  );
});

test("buildArtifact rejects an unexpected status and a request error", () => {
  const observations = [];
  for (const routeIndex of [0, 1, 2, 3, 4, 5]) {
    for (let i = 0; i < 20; i += 1) {
      observations.push({
        routeIndex,
        kind: "measured",
        status: routeIndex === 5 ? 401 : 200,
        latencyMs: 20,
        cache: {},
      });
    }
  }
  observations.push({
    routeIndex: 0,
    kind: "error",
    status: null,
    latencyMs: null,
    error: "Request timed out after 100ms",
  });

  const artifact = buildArtifact({
    baseUrl: "https://api.example/api",
    routes: SOAK_ROUTES,
    observations,
    durationMs: 60_000,
    concurrency: 4,
    maxRequestsPerMinute: 90,
    warmupSamples: 0,
    minSamples: 20,
    plannedRequests: observations.length,
    provenance: {},
  });

  assert.equal(artifact.complete, false);
  assert.ok(
    artifact.incompleteReasons.some((reason) =>
      reason.includes("1 request error(s)"),
    ),
  );
});

test("buildArtifact names an authentication failure instead of leaving it implicit", () => {
  // A token that expires mid-run turns the tail of the capture into 401s. The
  // operator needs to be told to mint a fresh token, not to read a status list.
  const observations = [];
  for (const [routeIndex, route] of SOAK_ROUTES.entries()) {
    for (let i = 0; i < 20; i += 1) {
      const expired = route.auth && i >= 5;
      observations.push({
        routeIndex,
        kind: "measured",
        status: expired ? 401 : route.expectedStatuses[0],
        latencyMs: 20,
        cache: {},
      });
    }
  }
  const artifact = buildArtifact({
    baseUrl: "https://api.example/api",
    routes: SOAK_ROUTES,
    observations,
    durationMs: 60_000,
    concurrency: 4,
    maxRequestsPerMinute: 30,
    warmupSamples: 0,
    minSamples: 5,
    plannedRequests: observations.length,
    provenance: {},
  });

  assert.equal(artifact.complete, false);
  assert.ok(
    artifact.incompleteReasons.some((reason) =>
      /mint a fresh API_SOAK_TOKEN/.test(reason),
    ),
    artifact.incompleteReasons.join(" | "),
  );
});

test("buildArtifact marks a fully sampled capture complete", () => {
  const observations = [];
  for (const [routeIndex, route] of SOAK_ROUTES.entries()) {
    for (let i = 0; i < 20; i += 1) {
      observations.push({
        routeIndex,
        kind: "measured",
        status: route.expectedStatuses[0],
        latencyMs: 30 + i,
        cache: { "x-cache": "HIT" },
      });
    }
  }

  const artifact = buildArtifact({
    baseUrl: "https://api.example/api",
    routes: SOAK_ROUTES,
    observations,
    durationMs: 60_000,
    concurrency: 4,
    maxRequestsPerMinute: 90,
    warmupSamples: 0,
    minSamples: 20,
    plannedRequests: observations.length,
    provenance: { gitSha: "abc123" },
  });

  assert.equal(artifact.complete, true);
  assert.deepEqual(artifact.incompleteReasons, []);
  for (const sloClass of Object.keys(API_LATENCY_SLOS)) {
    assert.ok(artifact.endpoints[sloClass].p95 > 0, sloClass);
  }
  assert.equal(
    artifact.workload.perRoute[0].cacheHeaders["x-cache"].HIT,
    20,
  );
});

test("the manifest covers every published SLO class", () => {
  const covered = new Set(SOAK_ROUTES.map((route) => route.class));
  for (const sloClass of Object.keys(API_LATENCY_SLOS)) {
    assert.ok(covered.has(sloClass), `no soak route for ${sloClass}`);
  }
  for (const route of SOAK_ROUTES) {
    assert.ok(
      API_LATENCY_SLOS[route.class],
      `unknown SLO class ${route.class}`,
    );
    assert.ok(route.minIntervalMs > 0, route.path);
    assert.ok(
      Array.isArray(route.expectedStatuses) && route.expectedStatuses.length > 0,
      route.path,
    );
  }
  // A health probe would collapse the distribution it is supposed to measure.
  for (const route of SOAK_ROUTES) {
    assert.doesNotMatch(route.path, /health/i, route.path);
  }
});

test("capture against a stub API produces convertible evidence with no credentials in it", async () => {
  const stub = await startStub();
  const output = path.join(fixtureDir, "soak-metrics.json");
  try {
    const result = await runCapture(
      [
        "--base-url",
        stub.baseUrl,
        "--duration-minutes",
        "0.05",
        "--concurrency",
        "6",
        "--max-requests-per-minute",
        "6000",
        "--min-samples",
        "1",
        "--warmup-samples",
        "0",
        "--timeout-ms",
        "3000",
        "--output",
        output,
      ],
      { API_SOAK_TOKEN: "super-secret-token-value" },
    );

    assert.equal(result.status, 0, result.stderr);
    const raw = readFileSync(output, "utf8");
    assert.doesNotMatch(raw, /super-secret-token-value/);

    const artifact = JSON.parse(raw);
    assert.equal(artifact.complete, true, JSON.stringify(artifact.incompleteReasons));
    assert.equal(artifact.target.baseUrl, stub.baseUrl);
    for (const sloClass of Object.keys(API_LATENCY_SLOS)) {
      assert.ok(artifact.endpoints[sloClass].samples >= 1, sloClass);
    }
    // Every sampled route must have been requested; the plan is not decorative.
    assert.ok(stub.requests.length > 0);
    assert.ok(
      stub.requests.some((request) =>
        request.url.startsWith("/api/v1/webhooks/payments/razorpay"),
      ),
    );
  } finally {
    await stub.close();
  }
});

test("capture fails when a route answers an unexpected status", async () => {
  const stub = await startStub({
    "/api/v1/patients": 500,
    "/api/v1/appointments": 503,
  });
  const output = path.join(fixtureDir, "unexpected-status.json");
  try {
    const result = await runCapture(
      [
        "--base-url",
        stub.baseUrl,
        "--duration-minutes",
        "0.05",
        "--max-requests-per-minute",
        "6000",
        "--min-samples",
        "1",
        "--warmup-samples",
        "0",
        "--timeout-ms",
        "3000",
        "--output",
        output,
      ],
      { API_SOAK_TOKEN: "super-secret-token-value" },
    );

    assert.equal(result.status, 1);
    assert.match(result.stderr, /INCOMPLETE/);
    assert.match(result.stderr, /unexpected status/i);
    const artifact = JSON.parse(readFileSync(output, "utf8"));
    assert.equal(artifact.complete, false);
    // A 500/503 is not a latency sample of the documented path: it is
    // excluded from the percentiles *and* fails the run.
    assert.equal(artifact.endpoints.crud.samples, 0);
    assert.equal(artifact.endpoints.search.samples, 0);
    assert.equal(
      artifact.workload.perRoute[1].unusableSamples > 0,
      true,
      "the 500 sample must still be recorded",
    );
    assert.equal(artifact.workload.perRoute[1].samples, 0);
  } finally {
    await stub.close();
  }
});

test("a throttled request is retried once and recorded, not sampled", async () => {
  // A 429 measures the rate limiter, not the API. The capture must retry after
  // the window and keep the retried response as the sample.
  const stub = await startStub({}, ["/api/v1/analytics/revenue"]);
  const output = path.join(fixtureDir, "throttled.json");
  try {
    const result = await runCapture(
      [
        "--base-url",
        stub.baseUrl,
        "--duration-minutes",
        "0.05",
        "--max-requests-per-minute",
        "6000",
        "--min-samples",
        "1",
        "--warmup-samples",
        "0",
        "--timeout-ms",
        "5000",
        "--output",
        output,
      ],
      { API_SOAK_TOKEN: "super-secret-token-value" },
    );

    assert.equal(result.status, 0, result.stderr);
    const artifact = JSON.parse(readFileSync(output, "utf8"));
    const reportsRoute = artifact.workload.perRoute.find((route) =>
      route.path.startsWith("/api/v1/analytics/revenue"),
    );
    assert.equal(reportsRoute.throttled, 1);
    assert.ok(reportsRoute.samples >= 1, "the retried response is the sample");
  } finally {
    await stub.close();
  }
});

test("the pnpm `--` separator does not become a flag value", async () => {
  // `pnpm perf:api-latency:soak -- --base-url ...` forwards a literal `--`;
  // without stripping it the soak would try to use `--` as the base URL.
  const result = await runCapture([
    "--",
    "--base-url",
    "https://staging.example.com/api",
    "--duration-minutes",
    "10",
    "--dry-run",
  ]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Would issue \d+ request/);
  assert.doesNotMatch(result.stdout, /refusing to soak/);
});

test("capture refuses a plaintext remote host", async () => {
  const result = await runCapture([
    "--base-url",
    "http://staging-api.example.com/api",
  ]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /refusing to soak a non-HTTPS host/);
});

test("capture refuses to run the authenticated plan without credentials", async () => {
  const result = await runCapture(["--base-url", "http://127.0.0.1:9/api"], {
    API_SOAK_TOKEN: "",
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /no credentials were supplied/i);
});

test("--dry-run plans the workload without issuing a request", async () => {
  const stub = await startStub();
  try {
    const result = await runCapture([
      "--base-url",
      stub.baseUrl,
      "--duration-minutes",
      "10",
      "--dry-run",
    ]);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Would issue \d+ request/);
    assert.equal(stub.requests.length, 0);
  } finally {
    await stub.close();
  }
});