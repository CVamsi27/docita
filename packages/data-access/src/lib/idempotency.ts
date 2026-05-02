import type { RequestConfig } from "./types";

export const IDEMPOTENCY_HEADER = "Idempotency-Key";

/**
 * Generate a UUID v4 idempotency key. Uses the platform crypto API when
 * available (browser, Node 19+, edge runtimes), with a small Math.random
 * fallback for legacy environments.
 */
export function generateIdempotencyKey(): string {
  const cryptoApi = (
    typeof globalThis !== "undefined" ? globalThis.crypto : undefined
  ) as { randomUUID?: () => string } | undefined;

  if (cryptoApi?.randomUUID) {
    return cryptoApi.randomUUID();
  }

  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i += 1) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
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
