import assert from "node:assert/strict";
import { test } from "node:test";
import type { Pool } from "pg";
import { createPoolSaturationProbe } from "../src/pool-saturation.ts";

interface MutableCounters {
  options: { max?: number };
  totalCount: number;
  idleCount: number;
  waitingCount: number;
}

/**
 * A fake pool is enough: the probe only reads `pg`'s own counters, so there is
 * no database in this test and no way for it to mask a counter mix-up. The
 * counters stay mutable behind this handle because `pg` declares them readonly.
 */
function fakePool(counters: {
  max?: number;
  total: number;
  idle: number;
  waiting: number;
}) {
  const state: MutableCounters = {
    options: counters.max === undefined ? {} : { max: counters.max },
    totalCount: counters.total,
    idleCount: counters.idle,
    waitingCount: counters.waiting,
  };
  return {
    pool: state as unknown as Pool,
    setWaiting(next: number) {
      state.waitingCount = next;
    },
  };
}

test("reports an idle pool with no queue", () => {
  const { pool } = fakePool({ max: 15, total: 3, idle: 3, waiting: 0 });
  const probe = createPoolSaturationProbe(pool);

  assert.deepEqual(probe.snapshot(1_000), {
    max: 15,
    total: 3,
    idle: 3,
    waiting: 0,
    saturated: false,
    queuedForMs: null,
  });
});

test("falls back to the pg default max when none is configured", () => {
  const { pool } = fakePool({ total: 1, idle: 1, waiting: 0 });
  const probe = createPoolSaturationProbe(pool);

  assert.equal(probe.snapshot(1_000).max, 10);
});

test("measures how long callers have been queued", () => {
  const handle = fakePool({ max: 15, total: 15, idle: 0, waiting: 0 });
  const probe = createPoolSaturationProbe(handle.pool);

  // Queue starts filling.
  handle.setWaiting(4);
  const first = probe.snapshot(2_000);
  assert.equal(first.saturated, true);
  assert.equal(first.queuedForMs, 0);

  // Still queued 750ms later.
  assert.equal(probe.snapshot(2_750).queuedForMs, 750);

  // Queue drains: the wait resets rather than accumulating forever.
  handle.setWaiting(0);
  const drained = probe.snapshot(3_000);
  assert.equal(drained.saturated, false);
  assert.equal(drained.queuedForMs, null);

  // A new queue starts a fresh measurement.
  handle.setWaiting(2);
  assert.equal(probe.snapshot(5_000).queuedForMs, 0);
  assert.equal(probe.snapshot(5_400).queuedForMs, 400);
});

test("never reports a negative wait when the clock moves backwards", () => {
  const { pool } = fakePool({ max: 2, total: 2, idle: 0, waiting: 1 });
  const probe = createPoolSaturationProbe(pool);

  probe.snapshot(10_000);
  assert.equal(probe.snapshot(9_000).queuedForMs, 0);
});
