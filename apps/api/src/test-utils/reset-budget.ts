/**
 * Budget guard for the API e2e database-reset path (apps/api/test/setup.ts).
 *
 * Purpose: make a regression in the reset path fail loudly as a red run with
 * a clear message instead of silently re-introducing the shard flake fixed in
 * #295 (per-suite schema pushes + 55 sequential truncate round-trips blowing
 * the 30s jest hook budget under CI I/O pressure, surfacing only as generic
 * `Exceeded timeout of 30000 ms for a hook` failures).
 *
 * Threshold rationale (measured 2026-08-17, local Postgres, 12 samples):
 * - single-statement TRUNCATE of the 55-table list: 410-505 ms (median ~430 ms)
 * - memoized `prisma db push --force-reset` schema build: 0.7-1.4 s warm
 * The reset thresholds are deliberately ~12x (warn) and ~35x (fail) the
 * measured median so ordinary runner variance never false-reds, while the
 * pre-#295 regression (a per-table loop, or any multi-statement reset) crosses
 * them long before the 30s hook timeout — and the fail level fires before the
 * hook timeout, so the run fails with this guard's message, not jest's generic
 * one.
 *
 * The schema push is guarded by a deterministic COUNT (exactly one push per
 * jest process — the #295 memoization contract), because a duration fail on
 * the push would false-red on cold runners (first schema build after a fresh
 * container is legitimately slower) and the 30s hook already bounds it. The
 * push duration is warn-only.
 */

type ResetBudgetLevel = 'pass' | 'warn' | 'fail';

interface ResetBudgetVerdict {
  level: ResetBudgetLevel;
  message: string;
}

export const RESET_WARN_MS = 5_000;
export const RESET_FAIL_MS = 15_000;
export const SCHEMA_PUSH_WARN_MS = 20_000;
export const MAX_SCHEMA_PUSHES_PER_PROCESS = 1;

function verdict(
  level: ResetBudgetLevel,
  message: string,
): ResetBudgetVerdict {
  return { level, message };
}

export function evaluateResetDuration(durationMs: number): ResetBudgetVerdict {
  if (durationMs >= RESET_FAIL_MS) {
    return verdict(
      'fail',
      `Database reset took ${Math.round(durationMs)}ms (fail threshold ` +
        `${RESET_FAIL_MS}ms). The reset path has regressed — a single ` +
        `TRUNCATE ... CASCADE should take under a second (measured median ` +
        `~430ms). Check apps/api/test/setup.ts resetDatabase for a reintroduced ` +
        `per-statement loop or extra statements (see #295).`,
    );
  }
  if (durationMs >= RESET_WARN_MS) {
    return verdict(
      'warn',
      `Database reset took ${Math.round(durationMs)}ms (warn threshold ` +
        `${RESET_WARN_MS}ms). Out of family for the single-statement reset ` +
        `(measured median ~430ms) — watch for reset-path drift.`,
    );
  }
  return verdict('pass', '');
}

export function evaluateSchemaPushCount(count: number): ResetBudgetVerdict {
  if (count > MAX_SCHEMA_PUSHES_PER_PROCESS) {
    return verdict(
      'fail',
      `Schema push executed ${count} times in one jest process (max ` +
        `${MAX_SCHEMA_PUSHES_PER_PROCESS}). The memoized schema-preparation ` +
        `contract from #295 was broken — suite isolation is by truncation, not ` +
        `schema recreation. Check apps/api/test/setup.ts setupTestDatabase.`,
    );
  }
  return verdict('pass', '');
}

export function evaluateSchemaPushDuration(durationMs: number): ResetBudgetVerdict {
  if (durationMs >= SCHEMA_PUSH_WARN_MS) {
    return verdict(
      'warn',
      `Schema push took ${Math.round(durationMs)}ms (warn threshold ` +
        `${SCHEMA_PUSH_WARN_MS}ms). Close to the 30s hook budget — the runner ` +
        `is under I/O pressure, or the schema build regressed.`,
    );
  }
  return verdict('pass', '');
}
