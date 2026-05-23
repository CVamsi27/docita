// check-as-cast-density: allow-file — canonical Prisma InputJsonValue serialization boundary
import { Prisma } from '@workspace/db';

/** Serialize domain JSON payloads for Prisma `InputJsonValue` columns. */
export function toPrismaInputJsonValue(value: unknown): Prisma.InputJsonValue {
  const seen = new WeakSet<object>();

  const normalize = (input: unknown): unknown => {
    if (typeof input === 'bigint') {
      return input.toString();
    }

    if (input instanceof Date) {
      return input.toISOString();
    }

    if (Array.isArray(input)) {
      return input.map((item) => normalize(item) ?? null);
    }

    if (input !== null && typeof input === 'object') {
      if (seen.has(input)) {
        return '[Circular]';
      }
      seen.add(input);

      return Object.fromEntries(
        Object.entries(input).flatMap(([key, childValue]) => {
          const normalizedChildValue = normalize(childValue);
          return normalizedChildValue === undefined
            ? []
            : [[key, normalizedChildValue]];
        }),
      );
    }

    return input;
  };

  return normalize(value) as Prisma.InputJsonValue;
}

/** Read-model alias for persisted JSON columns (`JsonValue` vs `InputJsonValue`). */
export function toPrismaJsonValue(value: unknown): Prisma.JsonValue {
  return toPrismaInputJsonValue(value) as Prisma.JsonValue;
}
