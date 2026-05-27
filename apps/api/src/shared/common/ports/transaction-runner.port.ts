import type { Prisma } from '@workspace/db';

/**
 * Injectable wrapper around `prisma.$transaction(fn)`.
 *
 * Lets application-layer services compose atomic, multi-repository writes
 * without importing `PrismaService` directly — the boundary check
 * `scripts/checks/check-prisma-boundary.js` requires Prisma access to stay
 * behind a port in the application layer.
 *
 * Repositories accept an optional `tx: Prisma.TransactionClient`; the
 * service obtains one by calling `runner.runInTransaction(async (tx) => ...)`
 * and threads it through.
 */
export interface ITransactionRunner {
  runInTransaction<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T>;
}

export const TRANSACTION_RUNNER_PORT = 'ITransactionRunner';
