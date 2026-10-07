import { Prisma } from '@workspace/db';

/** SQLSTATE `exclusion_violation` (Postgres). */
const EXCLUSION_VIOLATION_SQLSTATE = '23P01';

/**
 * Postgres raises SQLSTATE 23P01 ("exclusion_violation") when an EXCLUDE
 * constraint rejects an INSERT/UPDATE. The error shape reaching the
 * repository depends on how the client was constructed:
 *
 * - With the pg driver adapter (the production setup via `PrismaPg`), the
 *   driver error surfaces as `DriverAdapterError` with the SQLSTATE on
 *   `cause.code` — not as a Known/UnknownRequestError, so a class-only gate
 *   misses it and a raced booking would surface as a 500 instead of a
 *   conflict.
 * - The classic client embeds the constraint name and the literal text
 *   "exclusion constraint" in the message of a Known/UnknownRequestError
 *   (Prisma assigns no P-code to exclusion violations).
 *
 * Matching on the constraint name keeps either path precise.
 */
export function isPrismaExclusionViolation(
  error: unknown,
  constraintName: string,
): boolean {
  if (!(error instanceof Error)) return false;

  if (
    'cause' in error &&
    typeof error.cause === 'object' &&
    error.cause !== null &&
    'code' in error.cause &&
    error.cause.code === EXCLUSION_VIOLATION_SQLSTATE
  ) {
    return error.message.includes(constraintName);
  }

  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) &&
    !(error instanceof Prisma.PrismaClientUnknownRequestError)
  ) {
    return false;
  }

  const message = error.message ?? '';
  return (
    message.includes(constraintName) && message.includes('exclusion constraint')
  );
}
