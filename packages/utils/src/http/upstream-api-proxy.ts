const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-encoding",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

export function normalizeUpstreamApiUrl(value: string) {
  const trimmed = value.replace(/\/$/, "");
  const url = new URL(trimmed);
  const pathname = url.pathname.replace(/\/$/, "");

  if (pathname === "" || pathname === "/") {
    return `${url.origin}/api/v1`;
  }

  return `${url.origin}${pathname}`;
}

export function resolveUpstreamApiBaseUrl(
  env: Record<string, string | undefined> = process.env,
) {
  const upstream =
    env["API_URL"] ||
    env["API_PROXY_TARGET"] ||
    "https://api.docita.work/api/v1";

  return normalizeUpstreamApiUrl(upstream);
}

export function buildUpstreamApiUrl(
  pathSegments: string[],
  requestUrl: string,
  upstreamBase = resolveUpstreamApiBaseUrl(),
) {
  const path = pathSegments.map(encodeURIComponent).join("/");
  const search = new URL(requestUrl).search;

  return `${upstreamBase}/${path}${search}`;
}

export function rewriteSetCookieForAppProxy(cookie: string): string {
  return cookie
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && !/^domain=/i.test(part))
    .join("; ");
}

export function createUpstreamProxyRequestHeaders(request: Request) {
  const headers = new Headers(request.headers);

  for (const header of HOP_BY_HOP_HEADERS) {
    headers.delete(header);
  }

  return headers;
}

export function createUpstreamProxyResponseHeaders(upstreamHeaders: Headers) {
  const headers = new Headers();
  const setCookies =
    "getSetCookie" in upstreamHeaders &&
    typeof upstreamHeaders.getSetCookie === "function"
      ? upstreamHeaders.getSetCookie()
      : [];

  upstreamHeaders.forEach((value, key) => {
    const normalizedKey = key.toLowerCase();
    if (
      HOP_BY_HOP_HEADERS.has(normalizedKey) ||
      normalizedKey.startsWith("access-control-") ||
      (normalizedKey === "set-cookie" && setCookies.length > 0)
    ) {
      return;
    }

    headers.append(key, value);
  });

  for (const cookie of setCookies) {
    headers.append("set-cookie", rewriteSetCookieForAppProxy(cookie));
  }

  return headers;
}

export async function proxyUpstreamApiRequest(
  request: Request,
  pathSegments: string[],
  upstreamBase?: string,
) {
  const method = request.method.toUpperCase();
  const body: BodyInit | null =
    method === "GET" || method === "HEAD"
      ? null
      : await request.arrayBuffer();
  const upstreamResponse = await fetch(
    buildUpstreamApiUrl(pathSegments, request.url, upstreamBase),
    {
      method,
      headers: createUpstreamProxyRequestHeaders(request),
      body,
      redirect: "manual",
    },
  );

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: createUpstreamProxyResponseHeaders(upstreamResponse.headers),
  });
}

export function extractApiV1PathSegments(pathname: string): string[] | null {
  if (!pathname.startsWith("/api/v1/")) {
    return null;
  }

  const remainder = pathname.slice("/api/v1/".length);
  if (!remainder) return [];

  return remainder.split("/").filter(Boolean);
}
