import { Prisma } from '@workspace/db';

/** P2028: interactive transaction could not acquire a pool connection within maxWait. */
export function isPrismaTransactionAcquireTimeout(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P2028';
  }
  if (error instanceof Error) {
    return error.message.includes(
      'Unable to start a transaction in the given time',
    );
  }
  return false;
}
