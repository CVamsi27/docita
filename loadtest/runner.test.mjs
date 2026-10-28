import assert from "node:assert/strict";
import test from "node:test";
import http from "node:http";
import { credentialFixture } from "./test/test-helpers.mjs";
import { runCapacity } from "./runner.mjs";
import { summarize } from "./observation.mjs";
const latencySummary = (values) =>
  summarize(
    values.map((durationMs) => ({
      outcome: "success",
      dispatchedOffsetMs: 0,
      durationMs,
    })),
  ).successfulLatencyMs;

async function stub(t, handler) {
  const received = [];
  const server = http.createServer((request, response) => {
    received.push({
      url: request.url,
      authorization: request.headers.authorization,
    });
    handler(request, response, received.length);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(
    () =>
      new Promise((resolve) => {
        server.close(resolve);
        server.closeAllConnections();
      }),
  );
  return { target: `http://127.0.0.1:${server.address().port}`, received };
}

const shortPlan = {
  phase: "headroom",
  durationSeconds: 0.12,
  referenceDate: "2026-10-28",
};

test("dry-run makes zero requests and reports no measured latency", async (t) => {
  const api = await stub(t, (_, response) => response.end("{}"));
  const artifact = await runCapacity({
    baseUrl: api.target,
    dryRun: true,
    planOptions: shortPlan,
  });
  assert.equal(api.received.length, 0);
  assert.equal(artifact.evidenceKind, "dry-run-no-http-observations");
  assert.equal(artifact.summary.offered, 0);
  assert.equal(artifact.summary.successfulLatencyMs.p95, null);
  assert.equal(artifact.plan.totalPlannedRequests, 4);
  assert.deepEqual(artifact.phases, []);
});

test("real local HTTP samples select distinct tenant credentials and never retain bodies or tokens", async (t) => {
  const body = "synthetic-patient-name-never-retain";
  const api = await stub(t, (_, response) => response.end(body));
  const credentials = credentialFixture();
  const artifact = await runCapacity({
    baseUrl: api.target,
    credentials,
    planOptions: shortPlan,
  });
  assert.equal(api.received.length, 4);
  assert.equal(new Set(api.received.map((row) => row.authorization)).size, 4);
  assert.equal(artifact.summary.success, 4);
  assert.equal(artifact.phases[0].coverage.successfulTenants, 4);
  assert.equal(artifact.phases[0].coverage.completeTenantRouteMatrix, false);
  assert.equal(artifact.summary.successfulLatencyMs.samples, 4);
  assert.equal(artifact.evidenceKind, "isolated-local-http-observations");
  assert.equal(artifact.capacitySupport, "not-established-by-read-only-runner");
  const json = JSON.stringify(artifact);
  assert.ok(!json.includes(body));
  for (const entry of credentials.tenants) {
    assert.ok(!json.includes(entry.bearerToken));
    assert.ok(!json.includes(entry.clinicId));
  }
});

test("unexpected statuses, throttles and redirects remain failed outcomes; redirects are never followed", async (t) => {
  const destination = await stub(t, (_, response) => response.end("{}"));
  const api = await stub(t, (_, response, index) => {
    const status = [401, 429, 500, 302][index - 1];
    response.writeHead(status, {
      location: destination.target + "/credential-leak",
    });
    response.end("do-not-retain-error-payload");
  });
  const artifact = await runCapacity({
    baseUrl: api.target,
    credentials: credentialFixture(),
    planOptions: shortPlan,
  });
  assert.equal(destination.received.length, 0);
  assert.equal(artifact.summary.success, 0);
  assert.equal(artifact.summary.httpErrors, 2);
  assert.equal(artifact.summary.throttled, 1);
  assert.equal(artifact.summary.redirects, 1);
  assert.equal(artifact.summary.successfulLatencyMs.p99, null);
  assert.equal(artifact.complete, false);
  assert.ok(!JSON.stringify(artifact).includes("do-not-retain-error-payload"));
});

test("absolute timeouts are retained rather than converted into fast successes", async (t) => {
  const api = await stub(t, () => {});
  const artifact = await runCapacity({
    baseUrl: api.target,
    credentials: credentialFixture(),
    planOptions: { ...shortPlan, timeoutMs: 20 },
  });
  assert.equal(artifact.summary.timeouts, 4);
  assert.equal(artifact.summary.successfulLatencyMs.samples, 0);
  assert.ok(artifact.phases[0].samples.every((row) => row.durationMs >= 15));
});

test("open arrivals do not wait for response slots or silently lower offered load", async (t) => {
  const api = await stub(t, (_, response) => {
    setTimeout(() => response.end("{}"), 100);
  });
  const artifact = await runCapacity({
    baseUrl: api.target,
    credentials: credentialFixture(),
    planOptions: { ...shortPlan, maxInFlight: 1, timeoutMs: 500 },
  });
  assert.equal(artifact.summary.offered, 4);
  assert.equal(artifact.summary.dispatched, 1);
  assert.equal(artifact.summary.clientCapacityDrops, 3);
  assert.equal(api.received.length, 1);
  assert.equal(artifact.phases[0].offeredRequestsPerSecond, 4 / 0.12);
  assert.equal(artifact.complete, false);
});

test("outstanding work at arrival end and drain deadline is explicitly reported", async (t) => {
  const api = await stub(t, () => {});
  const artifact = await runCapacity({
    baseUrl: api.target,
    credentials: credentialFixture(),
    planOptions: {
      ...shortPlan,
      durationSeconds: 0.06,
      timeoutMs: 500,
      drainTimeoutMs: 10,
    },
  });
  assert.equal(artifact.phases[0].outstandingAtArrivalEnd, 2);
  assert.equal(artifact.phases[0].unfinishedAtDrainDeadline, 2);
  assert.equal(artifact.phases[0].outstandingAfterDrain, 0);
  assert.equal(artifact.summary.cancelled, 2);
});

test("bounded response streaming fails oversized replies without saving their content", async (t) => {
  const api = await stub(t, (_, response) =>
    response.end("too-large-private-response"),
  );
  const artifact = await runCapacity({
    baseUrl: api.target,
    credentials: credentialFixture(),
    planOptions: { ...shortPlan, maxResponseBytes: 8 },
  });
  assert.equal(artifact.summary.responseTooLarge, 4);
  assert.equal(artifact.summary.success, 0);
  assert.ok(!JSON.stringify(artifact).includes("too-large-private-response"));
});

test("missing credentials and unsafe targets fail before dispatch", async (t) => {
  const api = await stub(t, (_, response) => response.end("{}"));
  await assert.rejects(
    runCapacity({ baseUrl: api.target, planOptions: shortPlan }),
  );
  await assert.rejects(
    runCapacity({
      baseUrl: "https://api.docita.work",
      credentials: credentialFixture(),
      planOptions: shortPlan,
    }),
  );
  assert.equal(api.received.length, 0);
});

test("nearest-rank percentiles include sample size and empty populations remain unavailable", () => {
  const stats = latencySummary([20, 10, 30, 100]);
  assert.equal(stats.samples, 4);
  assert.equal(stats.p50, 20);
  assert.equal(stats.p95, 100);
  assert.equal(stats.p99, 100);
  assert.equal(latencySummary([]).p99, null);
});
