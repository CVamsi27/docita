export interface SecurityHeaderEntry {
  key: string;
  value: string;
}

interface HeaderBearingResponse {
  headers: { set(key: string, value: string): void };
}

/**
 * Security headers shared across Docita's web surfaces (landing, internal
 * console, ...). Content-Security-Policy is intentionally excluded — it's the
 * one header whose directives genuinely differ per surface (different script
 * origins, connect targets, nonce handling, etc.), so each app builds its own
 * CSP entry and prepends this shared baseline alongside it.
 */
export const BASE_SECURITY_HEADERS: readonly SecurityHeaderEntry[] = [
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
];

/**
 * Applies an ordered list of security headers to a `Response`-shaped object
 * (works for both the standard `Response` and Next.js' `NextResponse`) and
 * returns it for chaining.
 */
export function applySecurityHeaders<TResponse extends HeaderBearingResponse>(
  response: TResponse,
  headers: readonly SecurityHeaderEntry[],
): TResponse {
  for (const { key, value } of headers) {
    response.headers.set(key, value);
  }

  return response;
}
