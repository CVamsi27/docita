import { PrismaService } from '@/prisma/prisma.service';

function lockId(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash) % 2147483647;
}

export async function withAdvisoryLock<T>(
  prisma: PrismaService,
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
 * Function shape exported for test-time injection. The service that
 * uses this lock takes a `WithAdvisoryLock<T>` parameter so it can
 * be swapped for an in-process stub under jest without spinning up
 * a real Prisma client + Postgres session.
 */
export type WithAdvisoryLock<T> = (
  prisma: PrismaService,
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
