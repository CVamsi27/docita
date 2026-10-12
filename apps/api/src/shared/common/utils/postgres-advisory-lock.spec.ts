import type { Prisma } from '@workspace/db';
import { asType } from '@/test-utils';
import type { PrismaService } from '@/prisma/prisma.service';
import { withAdvisoryLock } from './postgres-advisory-lock';

describe('withAdvisoryLock transaction lifetime', () => {
  it.each([
    [60_000, 60_000],
    [5_000, 30_000],
  ])(
    'allows a requested %sms lifetime without shrinking shared defaults',
    async (requested, expected) => {
      const transaction = jest.fn(
        async (fn: (tx: Prisma.TransactionClient) => Promise<string>) =>
          fn(
            asType<Prisma.TransactionClient>({
              $queryRaw: async () => [{ pg_try_advisory_xact_lock: true }],
            }),
          ),
      );
      const result = await withAdvisoryLock(
        asType<PrismaService>({ $transaction: transaction }),
        'synthetic-lock',
        async () => 'completed',
        requested,
      );
      expect(result).toBe('completed');
      expect(transaction).toHaveBeenCalledWith(expect.any(Function), {
        maxWait: 8_000,
        timeout: expected,
      });
    },
  );
});
