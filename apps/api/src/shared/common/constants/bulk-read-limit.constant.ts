/**
 * Default cap for unbounded bulk reads (e.g. background scheduler pulls,
 * reporting exports). Picked to comfortably exceed any single-tenant
 * realistic upper bound while keeping accidental cartesian fetches cheap.
 *
 * Use this for `findMany` calls that intentionally have no pagination. Any
 * user-facing list endpoint should paginate via the cursor helpers in
 * `@/shared/common/pagination.helper` instead.
 */
export const BULK_READ_LIMIT = 1000;

/**
 * Higher cap for cross-tenant scheduler sweeps (e.g. iterating every
 * active subscription in the system). These are single-tick batch
 * operations that fan out through Promise.allSettled — at 10k items
 * the scheduler tick stays well under its 1-minute budget. Reserve
 * for global / `runUnrestricted` reads that intentionally span all
 * tenants; per-tenant reads should use {@link BULK_READ_LIMIT}.
 */
export const GLOBAL_BULK_READ_LIMIT = 10000;
