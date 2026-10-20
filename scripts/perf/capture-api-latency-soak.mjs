#!/usr/bin/env node

/**
 * Capture a staging API latency soak (backlog R02).
 *
 * This is the producer for `artifacts/api-latency-baseline.json`. Until it
 * existed, the workflow step "run the staging soak and export per-class
 * p95/p99" had no tool behind it, so the baseline could only be hand-authored
 * and `--require-baseline` could never be satisfied honestly.
 *
 * Usage:
 *   API_SOAK_TOKEN=<access token> pnpm perf:api-latency:soak -- \
 *     --base-url https://staging-api.example.com/api \
 *     --duration-minutes 10 \
 *     --output ./soak-metrics.json
 *   pnpm perf:api-latency:baseline -- ./soak-metrics.json   # then commit
 *
 * Design constraints, all of them load-bearing:
 *
 * - **Real routes only.** The probe list lives in `api-latency-soak-routes.mjs`
 *   and every entry is a customer route; `/health/live` is deliberately absent
 *   because its ~1ms response would collapse the distribution and make a broken
 *   API look fast (see `docs/operations/SLOS.md`).
 * - **Throttle-aware pacing.** The API allows 100 requests/minute per IP in
 *   production, so both the plan and actual dispatch space global starts and
 *   respect each route's interval, including retries. The artifact records the achieved rate;
 *   a soak is a *latency* measurement under a bounded rate, not a load test.
 * - **Incomplete evidence fails.** If a class is under-sampled, a request
 *   errors, or a route answers an unexpected status, the artifact is still
 *   written (for debugging) but marked `complete: false` and the process exits
 *   1. `check-api-latency-budget.mjs --write-baseline` refuses to convert an
 *   incomplete capture, so a bad run cannot silently become a committed
 *   baseline.
 * - **No credentials in evidence.** Response bodies are never read, request
 *   headers are never recorded, and only an allowlist of cache-relevant
 *   response headers is counted. The bearer token is read from the environment,
 *   never from argv, so it stays out of shell history and the process list.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import process from "node:process";
import { pathToFileURL } from "node:url";

import { API_LATENCY_SLOS } from "../checks/api-latency-slos.mjs";
import { fetchWithTimeout, sleep } from "../monitoring/synthetic/probe-lib.mjs";
import { SOAK_ROUTES } from "./api-latency-soak-routes.mjs";
import { captureTimingIssues } from "./api-latency-capture-integrity.mjs";

const MS_PER_MINUTE = 60_000;
const DEFAULT_DURATION_MINUTES = 10;
const DEFAULT_CONCURRENCY = 4;
/**
 * Default request rate for a soak.
 *
 * The API limits the same identity several ways: 100/min and 10/s per IP
 * (`apps/api/src/app.module.ts`), 120/min per user
 * (`apps/api/src/shared/modules/services/user-rate-limit.service.ts`), and
 * per-route overrides below that. A soak issues every request as one user from
 * one IP, so the strictest of those applies. 30/min leaves headroom for other
 * traffic sharing that identity; a run that still trips a limiter records the
 * 429 and refuses to produce a baseline rather than quietly measuring the rate
 * limiter instead of the API.
 */
const DEFAULT_MAX_REQUESTS_PER_MINUTE = 30;
const DEFAULT_MIN_SAMPLES = 20;
const DEFAULT_WARMUP_SAMPLES = 2;
const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * Response headers retained as cache state. Values are counted, never stored
 * verbatim beyond a bounded prefix, and no body or PHI is read.
 */
const CACHE_HEADERS = ["cache-control", "age", "x-cache", "cf-cache-status"];
const MAX_HEADER_VALUE_LENGTH = 80;
/**
 * A throttled response says nothing about the API's latency, so it is recorded
 * and retried once after the window instead of being kept as a sample.
 */
const MAX_THROTTLE_RETRIES = 1;
const DEFAULT_RETRY_AFTER_MS = 60_000;
const MAX_RETRY_AFTER_MS = 120_000;

/**
 * Nearest-rank percentile: the smallest sample at or above the requested rank.
 *
 * Chosen over interpolation because every reading is an observed round trip —
 * reporting p95 as "the 95th slowest request we actually made" keeps the
 * number defensible for a small sample count.
 *
 * @param {number[]} sortedAscending
 * @param {number} p - percentile in [0, 100]
 * @returns {number | null}
 */
export function percentile(sortedAscending, p) {
  if (sortedAscending.length === 0) return null;
  const rank = Math.ceil((p / 100) * sortedAscending.length);
  const index = Math.min(sortedAscending.length - 1, Math.max(0, rank - 1));
  return sortedAscending[index];
}

/**
 * @param {number[]} samples - unsorted measured latencies in milliseconds
 * @returns {{ samples: number; p50: number | null; p95: number | null; p99: number | null; min: number | null; max: number | null } | null}
 */
export function summarizeSamples(samples) {
  if (samples.length === 0) return null;
  const sorted = [...samples].sort((a, b) => a - b);
  const round = (value) =>
    value === null ? null : Math.round(value * 10) / 10;
  return {
    samples: sorted.length,
    p50: round(percentile(sorted, 50)),
    p95: round(percentile(sorted, 95)),
    p99: round(percentile(sorted, 99)),
    min: round(sorted[0]),
    max: round(sorted[sorted.length - 1]),
  };
}

/**
 * Resolve a manifest route into a request. `{today}` is the only placeholder;
 * it is filled with the UTC date so the appointment probe always asks for a
 * bounded, current window.
 *
 * `--base-url` may be either the API origin or the `/api` root that
 * `NEXT_PUBLIC_API_URL` carries; the manifest paths already include `/api/v1`,
 * so a duplicated `/api` segment is collapsed rather than producing
 * `/api/api/v1/...`.
 *
 * @param {{ method: string; path: string }} route
 * @param {string} baseUrl
 * @returns {{ url: string; init: { method: string; headers: Record<string, string>; body?: string } }}
 */
export function resolveRouteRequest(route, baseUrl) {
  const base = new URL(baseUrl);
  const basePath = base.pathname.replace(/\/+$/, "");
  let routePath = route.path.replace(
    /\{today\}/g,
    new Date().toISOString().slice(0, 10),
  );
  if (basePath.endsWith("/api") && routePath.startsWith("/api/")) {
    routePath = routePath.slice("/api".length);
  }
  const headers = { accept: "application/json", ...(route.headers ?? {}) };
  const init = { method: route.method, headers };
  if (route.body) {
    headers["content-type"] = "application/json";
    init.body = JSON.stringify(route.body);
  }
  return { url: `${base.origin}${basePath}${routePath}`, init };
}

/**
 * Build the deterministic request plan.
 *
 * Space global starts and each route's starts. Round-robin tie breaking keeps
 * eligible routes balanced without letting a slow route block other routes.
 *
 * @param {Array<object>} routes
 * @param {{ durationMs: number; maxRequestsPerMinute: number }} options
 * @returns {Array<{ routeIndex: number; atMs: number }>}
 */
export function planRequests(routes, { durationMs, maxRequestsPerMinute }) {
  const globalBudget = Math.floor(
    (durationMs * maxRequestsPerMinute) / MS_PER_MINUTE,
  );
  const globalIntervalMs = Math.ceil(MS_PER_MINUTE / maxRequestsPerMinute);
  const routeNextAt = routes.map(() => 0);
  const plan = [];
  let globalNextAt = 0;
  let nextRoute = 0;
  while (routes.length > 0 && plan.length < globalBudget) {
    let routeIndex = nextRoute;
    let atMs = Infinity;
    for (let offset = 0; offset < routes.length; offset += 1) {
      const index = (nextRoute + offset) % routes.length;
      const candidate = Math.max(globalNextAt, routeNextAt[index]);
      if (candidate < atMs) {
        atMs = candidate;
        routeIndex = index;
      }
    }
    if (atMs >= durationMs) break;
    plan.push({ routeIndex, atMs });
    globalNextAt = atMs + globalIntervalMs;
    routeNextAt[routeIndex] = atMs + routes[routeIndex].minIntervalMs;
    nextRoute = (routeIndex + 1) % routes.length;
  }
  return plan;
}

/**
 * Parse a Netscape cookie jar (`curl -c`) into a `Cookie` header value.
 *
 * An operator gets a session from the staging UI or a single `curl` login;
 * the jar is a local file that never enters the artifact.
 *
 * @param {string} contents
 * @returns {string}
 */
export function parseCookieJar(contents) {
  const cookies = [];
  for (const rawLine of contents.split("\n")) {
    const line = rawLine.trim();
    // `#HttpOnly_` is a real cookie prefix, not a comment.
    const isHttpOnly = line.startsWith("#HttpOnly_");
    if (!line || (line.startsWith("#") && !isHttpOnly)) continue;
    const body = isHttpOnly ? line.slice("#HttpOnly_".length) : line;
    const fields = body.split("\t");
    // Netscape layout: domain, include-subdomains, path, secure, expires, name, value.
    if (fields.length < 7) continue;
    const expires = fields[4];
    const name = fields[5];
    const value = fields[6];
    if (Number.isNaN(Number(expires))) continue;
    cookies.push(`${name}=${value}`);
  }
  return cookies.join("; ");
}

/** @param {string} host */
function isLoopbackHost(host) {
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.startsWith("[::1]")
  );
}

/**
 * Build the evidence artifact from raw observations.
 *
 * Exported (and pure) so the completeness rules can be tested without a
 * network or a clock.
 *
 * @param {object} input
 * @returns {object}
 */
export function buildArtifact({
  baseUrl,
  routes,
  observations,
  durationMs,
  concurrency,
  maxRequestsPerMinute,
  warmupSamples,
  minSamples,
  plannedRequests,
  completedRequests,
  timing,
  provenance,
}) {
  const perRoute = routes.map((route, routeIndex) => {
    const own = observations.filter((o) => o.routeIndex === routeIndex);
    const isExpected = (observation) =>
      observation.status != null &&
      route.expectedStatuses.includes(Number(observation.status));
    // Only a documented status is a sample of the path the manifest claims.
    // A 401 from an expired token or a 500 from a broken query is excluded from
    // the percentiles *and* fails the run, so a broken target can never look
    // like a fast one.
    const usable = own.filter((o) => o.kind === "measured" && isExpected(o));
    return {
      class: route.class,
      method: route.method,
      path: route.path,
      minIntervalMs: route.minIntervalMs,
      expectedStatuses: route.expectedStatuses,
      samples: usable.length,
      unusableSamples: own.filter(
        (o) => o.kind === "measured" && !isExpected(o),
      ).length,
      warmupSamples: own.filter((o) => o.kind === "warmup").length,
      // A throttled attempt is reported as `throttled`, not as a status: it was
      // retried and never became a latency sample.
      statuses: own.reduce((acc, o) => {
        if (o.kind === "throttled") return acc;
        if (o.status) acc[o.status] = (acc[o.status] ?? 0) + 1;
        return acc;
      }, {}),
      errors: own.filter((o) => o.kind === "error").length,
      throttled: own.filter((o) => o.kind === "throttled").length,
      // Distinct failure reasons, bounded: an operator needs to know whether
      // the run timed out, was refused or hit a DNS/TLS failure.
      errorReasons: [
        ...new Set(
          own
            .filter((o) => o.kind === "error")
            .map((o) => (o.error ?? "unknown").slice(0, 120)),
        ),
      ],
      cacheHeaders: own.reduce((acc, o) => {
        for (const [header, value] of Object.entries(o.cache ?? {})) {
          acc[header] = acc[header] ?? {};
          acc[header][value] = (acc[header][value] ?? 0) + 1;
        }
        return acc;
      }, {}),
    };
  });

  const endpoints = {};
  for (const sloClass of Object.keys(API_LATENCY_SLOS)) {
    const samples = perRoute
      .filter((route) => route.class === sloClass)
      .flatMap((route) => {
        const index = perRoute.indexOf(route);
        return observations
          .filter((observation) => {
            if (
              observation.routeIndex !== index ||
              observation.kind !== "measured"
            ) {
              return false;
            }
            return routes[index].expectedStatuses.includes(
              Number(observation.status),
            );
          })
          .map((observation) => observation.latencyMs);
      });
    endpoints[sloClass] = summarizeSamples(samples) ?? {
      samples: 0,
      p50: null,
      p95: null,
      p99: null,
      min: null,
      max: null,
    };
  }

  const errors = observations.filter((o) => o.kind === "error");

  const incompleteReasons = captureTimingIssues({
    durationMs,
    plannedRequests,
    completedRequests,
    ...timing,
  });
  for (const [sloClass, summary] of Object.entries(endpoints)) {
    if (summary.samples < minSamples) {
      incompleteReasons.push(
        `${sloClass}: ${summary.samples} sample(s), minimum ${minSamples}`,
      );
    }
  }
  if (errors.length > 0) {
    incompleteReasons.push(`${errors.length} request error(s)/timeout(s)`);
  }
  const throttled = observations.filter((o) => o.kind === "throttled").length;
  if (throttled > 0) {
    incompleteReasons.push(
      `${throttled} throttled request(s); reduce the rate and re-run`,
    );
  }

  // A route answering anything but its documented status did not measure the
  // path the manifest claims (expired token, renamed controller, wrong host),
  // so its sample counts toward nothing and fails the run.
  const unexpected = [];
  perRoute.forEach((route, index) => {
    for (const status of Object.keys(route.statuses)) {
      if (!routes[index].expectedStatuses.includes(Number(status))) {
        unexpected.push(
          `${routes[index].method} ${routes[index].path} -> ${status}`,
        );
      }
    }
  });
  if (unexpected.length > 0) {
    incompleteReasons.push(
      `${unexpected.length} unexpected status sample(s): ${unexpected.slice(0, 5).join(", ")}`,
    );
  }

  // An access token minted before a 10-minute window commonly expires partway
  // through it. Saying so turns a confusing artifact into one action.
  const authFailedRoutes = perRoute.filter(
    (route, index) =>
      routes[index].auth &&
      Object.keys(route.statuses).some(
        (status) => status === "401" || status === "403",
      ),
  );
  if (authFailedRoutes.length > 0) {
    incompleteReasons.push(
      `authentication failed on ${authFailedRoutes
        .map((route) => `${route.method} ${route.path}`)
        .join(
          ", ",
        )} — mint a fresh API_SOAK_TOKEN (or cookie jar) and re-run; a token that expires mid-run truncates the capture`,
    );
  }

  return {
    complete: incompleteReasons.length === 0,
    incompleteReasons,
    capturedAt: timing?.finishedAt ?? new Date().toISOString(),
    target: {
      baseUrl,
      durationMs,
      ...timing,
      concurrency,
      maxRequestsPerMinute,
      warmupSamples,
      minSamplesPerClass: minSamples,
      plannedRequests,
      completedRequests,
      observedRequests: observations.length,
      achievedRequestsPerMinute:
        !Number.isFinite(timing?.elapsedMs) || timing.elapsedMs <= 0
          ? null
          : observations.length === 0
            ? 0
            : Math.round(
                (observations.length / (timing.elapsedMs / MS_PER_MINUTE)) * 10,
              ) / 10,
      mode: "read-only, authenticated, non-mutating except the PHI read-audit trail",
    },
    provenance,
    endpoints,
    workload: { perRoute },
  };
}

/**
 * Run the plan against a target and collect observations.
 *
 * @param {object} options
 * @returns {Promise<object>}
 */
export async function runPlan({
  plan,
  routes,
  baseUrl,
  headers,
  timeoutMs,
  concurrency,
  warmupSamples,
  durationMs,
  maxRequestsPerMinute,
  runtime = {
    now: () => performance.now(),
    wallNow: () => Date.now(),
    sleep,
    request: fetchWithTimeout,
  },
}) {
  const observations = [];
  const completedPerRoute = new Map();
  let cursor = 0;
  const startedAt = runtime.now();
  const startedAtUtc = new Date(runtime.wallNow()).toISOString();
  const endAt = startedAt + durationMs;
  const globalIntervalMs = Math.ceil(MS_PER_MINUTE / maxRequestsPerMinute);
  let globalNextAt = startedAt;
  const routeNextAt = routes.map(() => startedAt);
  let completedRequests = 0;
  let admission = Promise.resolve();

  // Admission is serialized, including retries. A slot is based on the actual
  // wakeup time, so delayed workers never spend accumulated rate "credit".
  const admit = (routeIndex, notBefore, startRequest) => {
    const granted = admission.then(async () => {
      while (runtime.now() < endAt) {
        const dueAt = Math.max(
          notBefore,
          globalNextAt,
          routeNextAt[routeIndex],
        );
        const now = runtime.now();
        if (now < dueAt) {
          await runtime.sleep(Math.min(dueAt, endAt) - now);
          continue;
        }
        let response;
        try {
          // Start before releasing admission: an event-loop pause between a
          // granted slot and fetch must not let a second worker burst beside it.
          response = startRequest();
        } catch (error) {
          response = Promise.reject(error);
        }
        const dispatchedAt = runtime.now();
        globalNextAt = dispatchedAt + globalIntervalMs;
        routeNextAt[routeIndex] =
          dispatchedAt + routes[routeIndex].minIntervalMs;
        return { dispatchedAtMs: dispatchedAt - startedAt, response };
      }
      return null;
    });
    admission = granted.then(() => undefined);
    return granted;
  };

  const worker = async () => {
    while (cursor < plan.length) {
      const step = plan[cursor];
      cursor += 1;
      const route = routes[step.routeIndex];
      const { url, init } = resolveRouteRequest(route, baseUrl);
      const seenForRoute = completedPerRoute.get(step.routeIndex) ?? 0;
      completedPerRoute.set(step.routeIndex, seenForRoute + 1);
      const kind = seenForRoute < warmupSamples ? "warmup" : "measured";
      let attempt = 0;
      let notBefore = startedAt + step.atMs;
      while (true) {
        const dispatch = await admit(step.routeIndex, notBefore, () =>
          runtime.request(
            url,
            { ...init, headers: { ...init.headers, ...headers } },
            timeoutMs,
          ),
        );
        if (dispatch === null) break;
        const { dispatchedAtMs } = dispatch;
        try {
          const { response, latencyMs } = await dispatch.response;
          if (response.status === 429 && attempt < MAX_THROTTLE_RETRIES) {
            const waitMs = readRetryAfterMs(
              response.headers,
              runtime.wallNow(),
            );
            observations.push({
              routeIndex: step.routeIndex,
              kind: "throttled",
              status: 429,
              latencyMs: null,
              throttleWaitMs: waitMs,
              dispatchedAtMs,
            });
            notBefore = runtime.now() + waitMs;
            attempt += 1;
            continue;
          }
          observations.push({
            routeIndex: step.routeIndex,
            kind,
            status: response.status,
            latencyMs: Math.round(latencyMs * 10) / 10,
            cache: readCacheHeaders(response.headers),
            dispatchedAtMs,
          });
        } catch (error) {
          observations.push({
            routeIndex: step.routeIndex,
            kind: "error",
            status: null,
            latencyMs: null,
            error: error instanceof Error ? error.message : String(error),
            dispatchedAtMs,
          });
        }
        completedRequests += 1;
        break;
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.max(1, concurrency) }, () => worker()),
  );
  while (runtime.now() < endAt) await runtime.sleep(endAt - runtime.now());
  return {
    observations,
    plannedRequests: plan.length,
    completedRequests,
    timing: {
      startedAt: startedAtUtc,
      finishedAt: new Date(runtime.wallNow()).toISOString(),
      elapsedMs: runtime.now() - startedAt,
    },
  };
}

/**
 * @param {Headers} headers
 * @returns {Record<string, string>}
 */
export function readCacheHeaders(headers) {
  const observed = {};
  for (const name of CACHE_HEADERS) {
    const value = headers.get(name);
    if (!value) continue;
    observed[name] = value.slice(0, MAX_HEADER_VALUE_LENGTH);
  }
  return observed;
}

/**
 * How long to wait before retrying a throttled request.
 *
 * Accepts both `Retry-After` spellings (delta-seconds and HTTP-date) and bounds
 * the wait, so a misconfigured header cannot stall a soak indefinitely.
 *
 * @param {Headers} headers
 * @param {number} [now]
 * @returns {number}
 */
export function readRetryAfterMs(headers, now = Date.now()) {
  const raw = headers.get("retry-after");
  if (!raw) return DEFAULT_RETRY_AFTER_MS;
  const seconds = Number(raw);
  if (Number.isFinite(seconds)) {
    return Math.min(Math.max(0, seconds * 1000), MAX_RETRY_AFTER_MS);
  }
  const asDate = Date.parse(raw);
  if (Number.isNaN(asDate)) return DEFAULT_RETRY_AFTER_MS;
  return Math.min(Math.max(0, asDate - now), MAX_RETRY_AFTER_MS);
}

function gitProvenance() {
  const read = (args) => {
    try {
      return execFileSync("git", args, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
    } catch {
      return "unknown";
    }
  };
  return {
    gitSha: read(["rev-parse", "HEAD"]),
    gitRef: read(["rev-parse", "--abbrev-ref", "HEAD"]),
    dirty: read(["status", "--porcelain"]) !== "" ? true : false,
    tool: "scripts/perf/capture-api-latency-soak.mjs",
    routesManifest: "scripts/perf/api-latency-soak-routes.mjs",
    sloModule: "scripts/checks/api-latency-slos.mjs",
  };
}

function readNumberArg(argv, flag, fallback) {
  const index = argv.indexOf(flag);
  if (index === -1) return fallback;
  const raw = argv[index + 1];
  const parsed = Number(raw);
  if (
    raw === undefined ||
    raw.startsWith("--") ||
    !Number.isFinite(parsed) ||
    parsed <= 0
  ) {
    console.error(
      `${flag} expects a positive number, received "${raw ?? ""}".`,
    );
    process.exit(1);
  }
  return parsed;
}

/**
 * `--warmup-samples 0` is meaningful (measure cold behaviour deliberately), so
 * this reader accepts zero while `readNumberArg` does not.
 */
function readNonNegativeNumberArg(argv, flag, fallback) {
  const index = argv.indexOf(flag);
  if (index === -1) return fallback;
  const raw = argv[index + 1];
  const parsed = Number(raw);
  if (
    raw === undefined ||
    raw.startsWith("--") ||
    !Number.isFinite(parsed) ||
    parsed < 0
  ) {
    console.error(
      `${flag} expects a non-negative number, received "${raw ?? ""}".`,
    );
    process.exit(1);
  }
  return parsed;
}

function readStringArg(argv, flag) {
  const index = argv.indexOf(flag);
  return index === -1 ? undefined : argv[index + 1];
}

/**
 * `pnpm run x -- <args>` forwards a literal `--`; the documented invocation is
 * `pnpm perf:api-latency:soak -- --base-url ...`, so the separator is stripped
 * before any flag value is read.
 *
 * @param {string[]} [args]
 */
export async function main(args = process.argv.slice(2)) {
  const argv = args.filter((arg) => arg !== "--");
  const baseUrlRaw =
    readStringArg(argv, "--base-url") ?? process.env.API_SOAK_BASE_URL ?? "";
  const baseUrl = baseUrlRaw.replace(/\/+$/, "");
  if (!baseUrl) {
    console.error(
      "capture-api-latency-soak: --base-url (or API_SOAK_BASE_URL) is required, " +
        "e.g. --base-url https://staging-api.example.com/api",
    );
    process.exit(1);
  }

  let base;
  try {
    base = new URL(baseUrl);
  } catch {
    console.error(`capture-api-latency-soak: "${baseUrl}" is not a valid URL.`);
    process.exit(1);
  }
  if (base.protocol !== "https:" && !isLoopbackHost(base.hostname)) {
    console.error(
      `capture-api-latency-soak: refusing to soak a non-HTTPS host (${base.host}). ` +
        "Bearer tokens must never cross plaintext HTTP; use a loopback URL for local runs.",
    );
    process.exit(1);
  }

  const durationMinutes = readNumberArg(
    argv,
    "--duration-minutes",
    DEFAULT_DURATION_MINUTES,
  );
  const concurrency = readNumberArg(argv, "--concurrency", DEFAULT_CONCURRENCY);
  const maxRequestsPerMinute = readNumberArg(
    argv,
    "--max-requests-per-minute",
    DEFAULT_MAX_REQUESTS_PER_MINUTE,
  );
  const minSamples = readNumberArg(argv, "--min-samples", DEFAULT_MIN_SAMPLES);
  const warmupSamples = readNonNegativeNumberArg(
    argv,
    "--warmup-samples",
    DEFAULT_WARMUP_SAMPLES,
  );
  const timeoutMs = readNumberArg(argv, "--timeout-ms", DEFAULT_TIMEOUT_MS);
  const outputPath = readStringArg(argv, "--output") ?? "soak-metrics.json";

  const routes = SOAK_ROUTES;
  const authHeaders = {};
  const bearer = process.env.API_SOAK_TOKEN?.trim();
  const cookieFile = readStringArg(argv, "--cookie-file");
  if (bearer) {
    authHeaders.authorization = `Bearer ${bearer}`;
  } else if (cookieFile) {
    if (!fs.existsSync(cookieFile)) {
      console.error(
        `capture-api-latency-soak: cookie file not found: ${cookieFile}`,
      );
      process.exit(1);
    }
    const cookie = parseCookieJar(fs.readFileSync(cookieFile, "utf8"));
    if (!cookie) {
      console.error(
        `capture-api-latency-soak: no usable cookies in ${cookieFile}. ` +
          "Create it with `curl -c <jar> .../api/v1/auth/login` or copy it from the browser.",
      );
      process.exit(1);
    }
    authHeaders.cookie = cookie;
  }

  const durationMs = Math.round(durationMinutes * MS_PER_MINUTE);
  const plan = planRequests(routes, { durationMs, maxRequestsPerMinute });

  if (plan.length === 0) {
    console.error(
      "capture-api-latency-soak: the request plan is empty. Increase " +
        "--duration-minutes or --max-requests-per-minute.",
    );
    process.exit(1);
  }

  // A dry run plans the workload without touching the API, so it must not
  // require credentials either.
  if (argv.includes("--dry-run")) {
    console.log(
      `Would issue ${plan.length} request(s) across ${routes.length} route(s) ` +
        `over ${(durationMs / MS_PER_MINUTE).toFixed(1)} minute(s) at concurrency ${concurrency}.`,
    );
    routes.forEach((route, index) => {
      const count = plan.filter((step) => step.routeIndex === index).length;
      console.log(
        `  ${route.class.padEnd(8)} ${route.method} ${route.path} x${count}`,
      );
    });
    process.exit(0);
  }

  const needsAuth = routes.filter((route) => route.auth).map((r) => r.class);
  if (needsAuth.length > 0 && !bearer && !authHeaders.cookie) {
    console.error(
      "capture-api-latency-soak: authenticated routes are in the plan but no " +
        "credentials were supplied. Set API_SOAK_TOKEN=<access token> or pass " +
        `--cookie-file <jar>. Affected classes: ${[...new Set(needsAuth)].join(", ")}.`,
    );
    process.exit(1);
  }

  console.log(
    `Soaking ${base.host}${base.pathname} for ${durationMinutes} minute(s) ` +
      `(${plan.length} planned request(s), concurrency ${concurrency}, ` +
      `cap ${maxRequestsPerMinute}/min)...`,
  );

  const capture = await runPlan({
    plan,
    routes,
    baseUrl,
    headers: authHeaders,
    timeoutMs,
    concurrency,
    warmupSamples,
    durationMs,
    maxRequestsPerMinute,
  });

  const artifact = buildArtifact({
    baseUrl,
    routes,
    ...capture,
    durationMs,
    concurrency,
    maxRequestsPerMinute,
    warmupSamples,
    minSamples,
    plannedRequests: plan.length,
    provenance: gitProvenance(),
  });

  fs.writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`);

  console.log(`\nSoak written to ${outputPath}`);
  for (const [sloClass, summary] of Object.entries(artifact.endpoints)) {
    console.log(
      `  ${sloClass.padEnd(8)} p50=${summary.p50}ms p95=${summary.p95}ms ` +
        `p99=${summary.p99}ms samples=${summary.samples}`,
    );
  }
  console.log(
    `  achieved ${artifact.target.achievedRequestsPerMinute} req/min ` +
      `(cap ${maxRequestsPerMinute}/min, ${artifact.target.observedRequests} observed)`,
  );

  if (!artifact.complete) {
    console.error("\nSoak INCOMPLETE — this capture cannot become a baseline:");
    for (const reason of artifact.incompleteReasons) {
      console.error(`  - ${reason}`);
    }
    console.error(
      "Re-run until `complete: true` (longer window, valid credentials, or a " +
        "route that answers its documented status), then run " +
        "`pnpm perf:api-latency:baseline -- <soak-metrics.json>`.",
    );
    process.exit(1);
  }

  console.log(
    "\nSoak COMPLETE. Convert it with " +
      "`pnpm perf:api-latency:baseline -- <soak-metrics.json>` and commit the baseline.",
  );
  process.exit(0);
}

// Guarded so importing the pure helpers from a test never starts a soak.
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main();
}
