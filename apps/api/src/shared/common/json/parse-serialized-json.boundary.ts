// check-as-cast-density: allow-file
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
