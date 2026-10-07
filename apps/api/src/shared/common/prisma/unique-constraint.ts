import { Prisma } from '@workspace/db';

/**
 * Field names reported by the Postgres driver adapter keep the SQL quoting
 * used in the constraint definition, so a camelCase unique column arrives as
 * `"pendingSlotKey"` and would never match a clean name.
 */
function normalizeFieldName(field: string): string {
  return field.replace(/^["'`]+/, '').replace(/["'`]+$/, '');
}

/**
 * The constrained fields of a Prisma P2002.
 *
 * Prisma's classic shape is `meta.target` (string[]); the driver-adapter shape
 * (Prisma 5+ with the new query engine) nests it at
 * `meta.driverAdapterError.cause.constraint.fields`. Both must be recognized or
 * a concurrent-submit race surfaces as a 500 instead of being re-routed, and
 * both can carry SQL-quoted names that must be normalized before matching.
 */
export function uniqueConstraintTargets(error: unknown): string[] {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return [];
  if (error.code !== 'P2002') return [];
  const meta = error.meta as
    | { target?: unknown; driverAdapterError?: unknown }
    | undefined;
  if (!meta) return [];
  const driverAdapterFields = (
    meta.driverAdapterError as {
      cause?: { constraint?: { fields?: unknown } };
    } | null
  )?.cause?.constraint?.fields;
  const target = meta.target ?? driverAdapterFields;
  return Array.isArray(target)
    ? target
        .filter((field): field is string => typeof field === 'string')
        .map(normalizeFieldName)
    : [];
}

/** Whether a P2002 names `field` among its constrained columns. */
export function isUniqueConstraintOn(error: unknown, field: string): boolean {
  return uniqueConstraintTargets(error).includes(field);
}
