import assert from "node:assert/strict";
import test from "node:test";
import { buildPlan, buildArrivalSchedule } from "./model.mjs";

test("the explicit 25-clinic model preserves visits, people and artifact units", () => {
  const model = buildPlan().model;
  assert.equal(model.inputs.clinics, 25);
  assert.equal(model.monthly.completedAppointments, 26_000);
  assert.equal(model.monthly.prescriptionRecords, 20_800);
  assert.equal(model.monthly.invoices, 26_000);
  assert.equal(model.monthly.distinctClinicPatients, 20_000);
  assert.equal(model.monthly.appointmentLinkedApiRequests, 520_000);
  assert.equal(model.staffAccounts, 200);
  assert.equal(model.status, "hypothetical-workload-not-operating-records");
});

test("ordinary, busy and artificial headroom keep distinct offered rates", () => {
  const plan = buildPlan({ durationSeconds: 180, referenceDate: "2026-10-28" });
  assert.equal(plan.phases.length, 3);
  assert.equal(plan.phases[0].requestsPerSecond, 20_000 / 28_800);
  assert.equal(plan.phases[1].requestsPerSecond, 10 / 3);
  assert.equal(plan.phases[2].requestsPerSecond, 100 / 3);
  assert.deepEqual(
    plan.phases.map((phase) => phase.plannedRequests),
    [125, 600, 6_000],
  );
  assert.equal(plan.totalPlannedRequests, 6_725);
  assert.equal(plan.temperature, "unknown");
});

test("open arrivals cover every tenant/route combination without waiting for responses", () => {
  const plan = buildPlan({
    phase: "busy",
    durationSeconds: 30,
    referenceDate: "2026-10-28",
  });
  const arrivals = buildArrivalSchedule(plan.phases[0], plan.routes);
  assert.equal(arrivals.length, 100);
  assert.deepEqual(
    arrivals.slice(0, 3).map((row) => row.plannedOffsetMs),
    [0, 300, 600],
  );
  assert.equal(new Set(arrivals.map((row) => row.tenantAlias)).size, 25);
  assert.equal(
    new Set(arrivals.map((row) => `${row.tenantAlias}:${row.routeId}`)).size,
    100,
  );
  assert.ok(arrivals.every((row) => row.plannedOffsetMs < 30_000));
});

test("unsafe or contradictory resource limits fail before a run", () => {
  for (const options of [
    { phase: "production" },
    { durationSeconds: 0 },
    { durationSeconds: 901 },
    { maxInFlight: 0 },
    { maxInFlight: 65 },
    { timeoutMs: 0 },
    { maxRequests: 100 },
    { temperature: "fast" },
    { referenceDate: "2026-02-31" },
    { referenceDate: "2026-10-28?token=x" },
  ])
    assert.throws(() => buildPlan(options));
});
