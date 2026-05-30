import { Prisma } from '@workspace/db';

/** P2028: interactive transaction pool wait or execution lifecycle failures. */
export function isPrismaTransactionApiError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P2028';
  }
  if (error instanceof Error) {
    const message = error.message;
    return (
      message.includes('Unable to start a transaction in the given time') ||
      message.includes('cannot be executed on an expired transaction') ||
      message.includes(
        'A commit cannot be executed on an expired transaction',
      )
    );
  }
  return false;
}

/** True when Prisma could not start an interactive transaction (pool maxWait). */
export function isPrismaTransactionAcquireTimeout(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return (
      error.code === 'P2028' &&
      error.message.includes('Unable to start a transaction in the given time')
    );
  }
  if (error instanceof Error) {
    return error.message.includes(
      'Unable to start a transaction in the given time',
    );
  }
  return false;
}
