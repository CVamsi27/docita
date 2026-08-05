/**
 * check-as-cast-density: allow-file — sanctioned seam (P5.2j): generic
 * last-mile assertion of untyped JSON to a caller-selected `T`. The zod-parse
 * mitigation cannot target an unknown generic `T`, and the single consumer
 * (`browserJson<T>` in app-vite) is itself generic — its only caller passes
 * `unknown`. Same class as `assertTypedJsonValue`
 * (parse-serialized-json.boundary.ts, P5.2b) and `coerceQueueJob` (P5.2d).
 */
export function assertTyped<T>(value: unknown): T {
  return value as T;
}
