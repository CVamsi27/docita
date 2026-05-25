import { Prisma } from '@workspace/db';

/**
 * Postgres raises SQLSTATE 23P01 ("exclusion_violation") when an EXCLUDE
 * constraint rejects an INSERT/UPDATE. Prisma does not assign a P-code to
 * exclusion violations, so they surface as either:
 *   - `PrismaClientKnownRequestError` whose message embeds the constraint
 *     name and the literal text "exclusion constraint", or
 *   - `PrismaClientUnknownRequestError` for the same reason.
 *
 * Matching on the constraint name is more precise than a free-form regex and
 * keeps the helper safe even if the underlying driver text changes.
 */
export function isPrismaExclusionViolation(
  error: unknown,
  constraintName: string,
): boolean {
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
