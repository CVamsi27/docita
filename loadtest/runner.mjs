import http from "node:http";
import https from "node:https";
import { performance } from "node:perf_hooks";
import { buildPlan, buildArrivalSchedule } from "./model.mjs";
import {
  validateTarget,
  validateCredentials,
  validateRoute,
} from "./safety.mjs";
import { observeRequest, rounded, summarize } from "./observation.mjs";
import { sourceProvenance, resourceDeclaration } from "./provenance.mjs";

const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, Math.max(0, milliseconds)));

function grouped(samples, keys, field) {
  return Object.fromEntries(
    keys.map((key) => [
      key,
      summarize(samples.filter((row) => row[field] === key)),
    ]),
  );
}

async function runPhase(phase, plan, origin, credentials, agent) {
  const samples = [];
  const pending = new Map();
  const started = performance.now();
  const startedAt = new Date().toISOString();
  const arrivals = buildArrivalSchedule(phase, plan.routes);
  const routes = new Map(plan.routes.map((route) => [route.id, route]));
  const tenants = new Map(credentials.map((entry) => [entry.alias, entry]));
  for (const arrival of arrivals) {
    await delay(started + arrival.plannedOffsetMs - performance.now());
    const dispatchOffset = performance.now() - started;
    const arrivalLagMs = rounded(
      Math.max(0, dispatchOffset - arrival.plannedOffsetMs),
    );
    const sample = {
      ...arrival,
      phase: phase.name,
      arrivalLagMs,
      dispatchedOffsetMs: null,
      statusCode: null,
      durationMs: null,
      responseBytes: 0,
      code: null,
    };
    if (arrivalLagMs > plan.limits.maxLagMs) {
      samples.push({ ...sample, outcome: "client-lag" });
      continue;
    }
    if (pending.size >= plan.limits.maxInFlight) {
      samples.push({ ...sample, outcome: "client-capacity" });
      continue;
    }
    sample.dispatchedOffsetMs = rounded(dispatchOffset);
    const observation = observeRequest({
      origin,
      route: routes.get(arrival.routeId),
      credential: tenants.get(arrival.tenantAlias),
      limits: plan.limits,
      agent,
    });
    const completion = observation.promise
      .then((result) => samples.push({ ...sample, ...result }))
      .finally(() => pending.delete(arrival.sequence));
    pending.set(arrival.sequence, { ...observation, completion });
  }
  await delay(started + phase.durationMs - performance.now());
  const outstandingAtArrivalEnd = pending.size;
  let drainTimer;
  if (pending.size) {
    try {
      await Promise.race([
        Promise.all([...pending.values()].map((row) => row.completion)),
        new Promise((resolve) => {
          drainTimer = setTimeout(resolve, plan.limits.drainTimeoutMs);
        }),
      ]);
    } finally {
      clearTimeout(drainTimer);
    }
  }
  const unfinishedAtDrainDeadline = pending.size;
  const remaining = [...pending.values()];
  remaining.forEach((row) => row.abort());
  await Promise.all(remaining.map((row) => row.completion));
  samples.sort((left, right) => left.sequence - right.sequence);
  const summary = summarize(samples);
  const elapsedMs = performance.now() - started;
  const successful = samples.filter((row) => row.outcome === "success");
  const matrix = new Set(
    successful.map((row) => `${row.tenantAlias}:${row.routeId}`),
  );
  const coverage = {
    declaredTenants: 25,
    expectedTenantRoutePairs: 25 * plan.routes.length,
    successfulTenants: new Set(successful.map((row) => row.tenantAlias)).size,
    successfulRoutes: new Set(successful.map((row) => row.routeId)).size,
    successfulTenantRoutePairs: matrix.size,
    completeTenantRouteMatrix: matrix.size === 25 * plan.routes.length,
  };
  return {
    ...phase,
    startedAt,
    elapsedMs: rounded(elapsedMs),
    offeredRequestsPerSecond:
      phase.plannedRequests / (phase.durationMs / 1_000),
    dispatchedRequestsPerSecond: rounded(
      summary.dispatched / (phase.durationMs / 1_000),
    ),
    achievedSuccessfulRequestsPerSecond: rounded(
      summary.success / (elapsedMs / 1_000),
    ),
    outstandingAtArrivalEnd,
    unfinishedAtDrainDeadline,
    outstandingAfterDrain: pending.size,
    summary,
    coverage,
    complete:
      summary.success === phase.plannedRequests &&
      coverage.completeTenantRouteMatrix &&
      !unfinishedAtDrainDeadline,
    byRoute: grouped(
      samples,
      plan.routes.map((route) => route.id),
      "routeId",
    ),
    byTenant: grouped(
      samples,
      credentials.map((row) => row.alias),
      "tenantAlias",
    ),
    samples,
  };
}

export async function runCapacity({
  baseUrl = "http://127.0.0.1:3001",
  credentials,
  dryRun = false,
  planOptions = {},
  resources = {},
} = {}) {
  const origin = validateTarget(baseUrl);
  const plan = buildPlan(planOptions);
  plan.routes.forEach(validateRoute);
  const artifact = {
    version: 1,
    generatedAt: new Date().toISOString(),
    evidenceKind: dryRun
      ? "dry-run-no-http-observations"
      : "isolated-local-http-observations",
    environment: "isolated-local",
    targetOrigin: origin,
    targetIdentity:
      "Operator-declared local API; actual database/provider isolation must be verified separately.",
    source: sourceProvenance(),
    resources: resourceDeclaration(resources),
    plan,
    phases: [],
    summary: summarize([]),
    complete: false,
    capacitySupport: "not-established-by-read-only-runner",
    measurement: {
      arrivalModel:
        "open-loop with late/capacity-limited arrivals dropped and retained, without catch-up bursts",
      successfulLatency:
        "Monotonic client dispatch through complete bounded response-body drain; success-only percentiles.",
      otherAttemptDurations:
        "Time until an HTTP rejection, redirect, network failure, deadline or cancellation is detected.",
      percentileMethod: "nearest-rank",
      warmup: "none; temperature is operator-declared, not inferred",
      credentialIdentity:
        "25 distinct declared JWT clinic/subject pairs; API verifies signatures and current database membership.",
      limitations: [
        "GET read paths only; no booking/payment/PDF-write correctness proof.",
        "Not production adoption, all-workflow capacity or achieved SLO evidence.",
        "Small sample tails remain small samples; retain per-route sample counts and failed outcomes.",
      ],
    },
  };
  if (dryRun) return artifact;
  const minValidityMs = plan.phases.reduce(
    (sum, phase) => sum + phase.durationMs + plan.limits.drainTimeoutMs,
    0,
  );
  const tenants = validateCredentials(credentials, { minValidityMs });
  const Agent = origin.startsWith("https:") ? https.Agent : http.Agent;
  const agent = new Agent({
    keepAlive: true,
    maxSockets: plan.limits.maxInFlight,
    maxFreeSockets: plan.limits.maxInFlight,
  });
  try {
    for (const phase of plan.phases)
      artifact.phases.push(await runPhase(phase, plan, origin, tenants, agent));
  } finally {
    agent.destroy();
  }
  artifact.summary = summarize(
    artifact.phases.flatMap((phase) => phase.samples),
  );
  artifact.complete = artifact.phases.every((phase) => phase.complete);
  return artifact;
}
