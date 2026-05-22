import { type z } from 'zod';

/** Parse a Prisma Json column at the repository boundary; returns undefined when null. */
export function parsePrismaJsonColumn<T>(
  value: unknown,
  schema: z.ZodType<T>,
): T | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  return schema.parse(value);
}
