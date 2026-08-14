// check-as-cast-density: allow-file — canonical Prisma InputJsonValue
// serialization boundary. The local JsonValue shape (which includes top-level
// null and arrays) is not assignable to Prisma's InputJsonValue (which rejects
// top-level null in favour of sentinels), and consumers have heterogeneous
// field types (strict InputJsonValue vs InputJsonValue | JsonNull sentinels),
// so no cast-free return type satisfies all — the seam cast is the only
// uniform contract (same category as typed-http-boundary).
import { Prisma } from '@workspace/db';

type JsonLeaf = string | number | boolean | null;
type JsonValue = JsonLeaf | { [key: string]: JsonValue } | JsonValue[];

interface CircularAware {
  seen: WeakSet<object>;
}

/**
 * Normalize a domain value for Prisma `InputJsonValue` columns:
 *
 * - BigInts → decimal strings (Prisma JSON has no native BigInt)
 * - Date → ISO 8601 string
 * - Arrays → recursively normalized
 * - Objects → shallow copy with normalized values; circular refs
 *   replaced with the literal "[Circular]" string
 * - `undefined` values are dropped from object entries
 *
 * The function is split from `toPrismaInputJsonValue` so each branch can be
 * unit-tested in isolation; the wrapper just sets up the cycle tracker and
 * returns the typed result.
 */
export function normalizeForPrismaInput(
  value: unknown,
  ctx: CircularAware = { seen: new WeakSet<object>() },
): JsonValue | undefined {
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (value === undefined) return undefined;

  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeForPrismaInput(item, ctx))
      .filter((entry): entry is JsonValue => entry !== undefined);
  }

  if (value !== null && typeof value === 'object') {
    if (ctx.seen.has(value)) return '[Circular]';
    ctx.seen.add(value);

    const result: Record<string, JsonValue> = {};
    for (const [key, childValue] of Object.entries(value)) {
      const normalized = normalizeForPrismaInput(childValue, ctx);
      if (normalized !== undefined) {
        result[key] = normalized;
      }
    }
    return result;
  }

  if (value === null) return null;
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }
  return undefined;
}

/** Serialize domain JSON payloads for Prisma `InputJsonValue` columns. */
export function toPrismaInputJsonValue(value: unknown): Prisma.InputJsonValue {
  const seen = new WeakSet<object>();
  const ctx: CircularAware = { seen };
  return normalizeForPrismaInput(value, ctx) as Prisma.InputJsonValue;
}
