import type { Pool } from "pg";

/**
 * Live saturation of a `pg` pool.
 *
 * `pg` exposes `totalCount` / `idleCount` / `waitingCount` directly, so the
 * only thing worth adding is how long callers have been *queued* — the signal
 * that a request is waiting for a connection rather than for the database. That
 * wait is invisible in query duration, which is why a saturated pool shows up
 * as unexplained latency and why `GET /operations/database/status` used to
 * report only a pool configuration that nothing applied.
 */
export interface PoolSaturationSnapshot {
  /** Configured upper bound (`pg` default is 10 when `max` is unset). */
  max: number;
  total: number;
  idle: number;
  /** Callers currently queued waiting for a connection. */
  waiting: number;
  /** True while at least one caller is queued. */
  saturated: boolean;
  /**
   * How long the queue has been non-empty, or `null` when it is empty. Sampled
   * on each `snapshot()` call, so it is "time waited so far", not a completed
   * acquisition measurement.
   */
  queuedForMs: number | null;
}

export interface PoolSaturationProbe {
  snapshot(now?: number): PoolSaturationSnapshot;
}

/**
 * Wraps a pool with queue-depth tracking. Sampling-based by design: it adds no
 * per-query work and cannot alter the acquire path it observes.
 */
export function createPoolSaturationProbe(pool: Pool): PoolSaturationProbe {
  let queuedSince: number | null = null;

  return {
    snapshot(now: number = Date.now()): PoolSaturationSnapshot {
      const waiting = pool.waitingCount;
      if (waiting > 0) {
        queuedSince ??= now;
      } else {
        queuedSince = null;
      }

      return {
        max: pool.options?.max ?? 10,
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting,
        saturated: waiting > 0,
        queuedForMs:
          queuedSince === null ? null : Math.max(0, now - queuedSince),
      };
    },
  };
}
