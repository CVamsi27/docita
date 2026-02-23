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

export function buildURL(
  baseURL: string,
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined | null>,
): string {
  const normalizedEndpoint = endpoint.startsWith("/")
    ? endpoint.substring(1)
    : endpoint;
  const url = new URL(
    normalizedEndpoint,
    baseURL.endsWith("/") ? baseURL : `${baseURL}/`,
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
