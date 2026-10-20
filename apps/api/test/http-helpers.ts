/**
 * Small HTTP-level helpers shared by the API e2e suites.
 *
 * `getCsrfHeaders` (see `./csrf-helpers`) mints the httpOnly `XSRF-TOKEN`
 * cookie from `GET /health`; these helpers turn that pair into request
 * headers and read cookies back out of a response.
 */

export interface CsrfHeaders {
  cookie: string;
  token: string;
}

/** Header set that satisfies the CSRF double-submit on a mutation. */
export function csrfHeaders(headers: CsrfHeaders): {
  Cookie: string;
  'X-XSRF-TOKEN': string;
} {
  return { Cookie: headers.cookie, 'X-XSRF-TOKEN': headers.token };
}

/** Extracts one cookie value from a response's `Set-Cookie` headers. */
export function extractCookie(
  headers: Record<string, unknown>,
  name: string,
): string | undefined {
  const setCookie = headers['set-cookie'] as string[] | undefined;
  if (!setCookie) return undefined;
  for (const entry of setCookie) {
    const match = entry.match(new RegExp(`${name}=([^;]+)`));
    if (match) return match[1];
  }
  return undefined;
}
