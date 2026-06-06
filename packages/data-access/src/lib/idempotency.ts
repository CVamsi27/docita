import type { RequestConfig } from "./types";

export const IDEMPOTENCY_HEADER = "Idempotency-Key";

/**
 * Generate a UUID v4 idempotency key using the platform crypto API.
 *
 * The previous Math.random fallback has been removed: every runtime we
 * support (browsers since 2021, Node 19+, Cloudflare/edge) exposes
 * `crypto.randomUUID`. Falling back to Math.random produced
 * predictable keys that could collide across tabs and weakened the
 * idempotency guarantee. If the platform truly lacks crypto we'd
 * rather throw than silently weaken security.
 */
export function generateIdempotencyKey(): string {
  const cryptoApi =
    typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (typeof cryptoApi?.randomUUID === "function") return cryptoApi.randomUUID();
  throw new Error(
    "crypto.randomUUID is unavailable in this runtime; idempotency keys cannot be generated safely.",
  );
}

/**
 * Decorate a RequestConfig with an Idempotency-Key header. Pass the same key
 * to every retry of the same logical mutation so the server returns the
 * cached response instead of double-creating. Generate the key with
 * `generateIdempotencyKey()` at the call site (e.g. once per form submission)
 * so component re-renders do not change it.
 *
 * @example
 *   const key = useMemo(generateIdempotencyKey, []);
 *   await client.post('/appointments', body, withIdempotencyKey({}, key));
 */
export function withIdempotencyKey(
  options: RequestConfig | undefined,
  key: string,
): RequestConfig {
  return {
    ...(options ?? {}),
    headers: {
      ...(options?.headers ?? {}),
      [IDEMPOTENCY_HEADER]: key,
    },
  };
}
