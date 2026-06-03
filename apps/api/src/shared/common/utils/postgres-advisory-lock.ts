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
    if (!acquired[0]?.pg_try_advisory_xact_lock) {
      return null;
    }
    return fn();
  });
}
