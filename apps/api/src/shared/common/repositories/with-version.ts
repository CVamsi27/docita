/**
 * Optimistic-concurrency helper.
 *
 * Repositories that update mutable rows should call `withVersion(...)`
 * to wrap their write so a stale `version` returns a typed conflict
 * error rather than silently overwriting a concurrent edit.
 *
 * SYSTEM_DESIGN_AND_PATTERNS.md §28.4 item 22.
 *
 * Usage:
 *   const next = await withVersion(
 *     async (tx) => tx.appointment.update({
 *       where: { id, version: currentVersion },
 *       data: { ...patch, version: { increment: 1 } },
 *     }),
 *     this.prisma,
 *   );
 *
 * When the update returns no rows (the predicate `version === currentVersion`
 * fails), the helper throws `ConcurrencyConflictError`.
 */
import { Prisma } from '@workspace/db';
import type { PrismaService } from '@/prisma/prisma.service';

export class ConcurrencyConflictError extends Error {
  constructor(public readonly entity: string) {
    super(
      `${entity} was modified by another writer; refresh and retry the update.`,
    );
    this.name = 'ConcurrencyConflictError';
  }
}

/**
 * @param run Callback that performs the version-gated update. MUST
 *   include `where: { id, version: currentVersion }` and
 *   `data: { version: { increment: 1 }, ... }`.
 * @param prisma Prisma client.
 * @param entityName Used in the error message (e.g., "Appointment").
 */
export async function withVersion<T>(
  run: (tx: PrismaService) => Promise<T>,
  prisma: PrismaService,
  entityName = 'Resource',
): Promise<T> {
  try {
    return await run(prisma);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      // P2025 = "An operation failed because it depends on one or more
      // records that were required but not found."
      error.code === 'P2025'
    ) {
      throw new ConcurrencyConflictError(entityName);
    }
    throw error;
  }
}
