// check-as-cast-density: allow-file — canonical Prisma InputJsonValue serialization boundary
import { Prisma } from '@workspace/db';

/** Serialize domain JSON payloads for Prisma `InputJsonValue` columns. */
export function toPrismaInputJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
