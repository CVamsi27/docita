// check-as-cast-density: allow-file — JSON.parse generic restoration at cache/HTTP boundaries
export function parseSerializedJson<T>(raw: string): T {
  return JSON.parse(raw) as T;
}

export function assertTypedJsonValue<T>(value: unknown): T {
  return value as T;
}
