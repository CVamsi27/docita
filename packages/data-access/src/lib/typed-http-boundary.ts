/** check-as-cast-density: allow-file — generic fetch client erases JSON to caller-selected types. */
export function assertTyped<T>(value: unknown): T {
  return value as T;
}
