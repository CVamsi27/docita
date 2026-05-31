import { Prisma } from '@workspace/db';
import {
  isPrismaTransactionAcquireTimeout,
  isPrismaTransactionApiError,
} from './prisma-transaction-acquire-timeout';

describe('isPrismaTransactionAcquireTimeout', () => {
  it('returns true for Prisma P2028 transaction acquire errors', () => {
    const error = new Prisma.PrismaClientKnownRequestError(
      'Transaction API error: Unable to start a transaction in the given time.',
      { code: 'P2028', clientVersion: 'test' },
    );
    expect(isPrismaTransactionAcquireTimeout(error)).toBe(true);
  });

  it('returns true for matching generic Error messages', () => {
    expect(
      isPrismaTransactionAcquireTimeout(
        new Error(
          'Transaction API error: Unable to start a transaction in the given time.',
        ),
      ),
    ).toBe(true);
  });

  it('returns false for unrelated errors', () => {
    expect(isPrismaTransactionAcquireTimeout(new Error('not found'))).toBe(
      false,
    );
  });

  it('detects expired interactive transaction errors', () => {
    expect(
      isPrismaTransactionApiError(
        new Error(
          'Invalid `prisma.patient.count()` invocation: Transaction API error: A query cannot be executed on an expired transaction.',
        ),
      ),
    ).toBe(true);
  });
});
