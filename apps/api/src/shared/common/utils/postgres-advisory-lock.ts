import { type Prisma } from '@workspace/db';
import { type PrismaDelegatePort } from '@/shared/modules/database/prisma-delegate.port';

function lockId(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash) % 2147483647;
}

export async function withAdvisoryLock<T>(
  prisma: PrismaDelegatePort,
  lockName: string,
  fn: () => Promise<T>,
  _timeoutMs = 5_000,
): Promise<T | null> {
  const id = lockId(lockName);
  return prisma.$transaction(async (tx) => {
    const acquired = await tx.$queryRaw<
      Array<{ pg_try_advisory_xact_lock: boolean }>
    >`
      SELECT pg_try_advisory_xact_lock(${id}) AS pg_try_advisory_xact_lock
    `;
    if (!acquired[0]?.pg_try_advisory_xact_lock) return null;
    return fn();
  });
}

/**
 * Blocking sibling of {@link withAdvisoryLock} for admission-control flows.
 * A try-lock returns `null` while another claim holds the lock, and letting
 * the caller proceed unguarded would reopen exactly the race the lock exists
 * to close (parallel callers all passing a last-unit check). Callers that
 * serialize check-then-write admission must wait their turn instead of
 * skipping the gate. The transaction commits (and releases the lock) as soon
 * as `fn` settles, so waiters queue only for the duration of the check.
 */
export async function withBlockingAdvisoryLock<T>(
  prisma: PrismaDelegatePort,
  lockName: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  const id = lockId(lockName);
  return prisma.$transaction(async (tx) => {
    // Project an integer: pg_advisory_xact_lock returns void, which
    // $queryRaw cannot deserialize.
    await tx.$queryRaw`SELECT 1 FROM (SELECT pg_advisory_xact_lock(${id})) AS advisory_lock`;
    return fn(tx);
  });
}

/**
 * Function shape exported for test-time injection. The service that
 * uses this lock takes a `WithAdvisoryLock<T>` parameter so it can
 * be swapped for an in-process stub under jest without spinning up
 * a real Prisma client + Postgres session.
 */
export type WithAdvisoryLock<T> = (
  prisma: PrismaDelegatePort,
  lockName: string,
  fn: () => Promise<T>,
  timeoutMs?: number,
) => Promise<T | null>;

/**
 * DI token for the advisory-lock helper. Services that need a
 * Postgres-level cross-process lock inject `WITH_ADVISORY_LOCK_TOKEN`
 * so they can be stubbed under jest without module-level mocking.
 */
export const WITH_ADVISORY_LOCK_TOKEN = 'WithAdvisoryLock';
