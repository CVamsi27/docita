export function normalizeHeaders(headers?: HeadersInit): string {
  if (!headers) {
    return "";
  }

  const headerEntries =
    headers instanceof Headers
      ? Array.from(headers.entries())
      : Array.isArray(headers)
        ? headers
        : Object.entries(headers);

  return headerEntries
    .map(([key, value]) => [key.toLowerCase(), String(value)] as const)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([key, value]) => `${key}:${value}`)
    .join("|");
}

/**
 * Collapse case-variant duplicate header keys into a single canonical entry,
 * keeping the LAST value seen.
 *
 * A plain headers object can legitimately carry both `X-XSRF-TOKEN` and
 * `x-xsrf-token` as distinct keys — e.g. a caller sets one casing manually and
 * the client's `onRequest` interceptor injects the other. Passing that object
 * straight to `fetch` makes the `Headers` constructor *combine* them into
 * `x-xsrf-token: <a>, <b>`, which then fails the backend CSRF double-submit
 * check (it compares the header against a single-value cookie). Building the
 * `Headers` via repeated `.set()` overwrites case-insensitively, so the
 * last-written value (the interceptor's freshly-resolved token) wins and no
 * doubled header is ever sent.
 */
export function dedupeHeaders(headers?: HeadersInit): Headers {
  const result = new Headers();
  if (!headers) {
    return result;
  }

  const entries =
    headers instanceof Headers
      ? Array.from(headers.entries())
      : Array.isArray(headers)
        ? headers
        : Object.entries(headers);

  for (const [key, value] of entries) {
    result.set(key, String(value));
  }

  return result;
}

export function buildURL(
  baseURL: string,
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined | null>,
): string {
  const normalizedEndpoint = endpoint.startsWith("/")
    ? endpoint.substring(1)
    : endpoint;
  const resolvedBaseURL = resolveRequestBaseURL(baseURL);
  const url = new URL(
    normalizedEndpoint,
    resolvedBaseURL.endsWith("/") ? resolvedBaseURL : `${resolvedBaseURL}/`,
  );

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  return url.toString();
}

export function resolveRequestBaseURL(baseURL: string): string {
  if (/^https?:\/\//i.test(baseURL)) {
    return baseURL;
  }

  const runtimeOrigin =
    typeof window !== "undefined" ? window.location.origin : undefined;

  if (!runtimeOrigin) {
    return baseURL;
  }

  return new URL(baseURL, runtimeOrigin).toString();
}
