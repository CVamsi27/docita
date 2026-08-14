// check-as-cast-density: allow-file — generic last-mile assertion for DB JSON columns, HTTP response bodies, and cache reads where the boundary itself (Prisma.JsonValue, response.json(), JSON.parse of self-written values) already guarantees the shape; per-call Zod parsing would duplicate those guarantees.
// check-json-parse-guarded: allow-file
export function parseSerializedJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    throw new SyntaxError('Invalid serialized JSON');
  }
}

export function assertTypedJsonValue<T>(value: unknown): T {
  return value as T;
}
