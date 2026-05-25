const UPSTREAM_API_URL =
  process.env["API_URL"] ||
  process.env["API_PROXY_TARGET"] ||
  "https://api.docita.work/api/v1";

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

export function buildUpstreamApiUrl(pathSegments: string[], requestUrl: string) {
  const upstreamBase = normalizeUpstreamApiUrl(UPSTREAM_API_URL);
  const path = pathSegments.map(encodeURIComponent).join("/");
  const search = new URL(requestUrl).search;

  return `${upstreamBase}/${path}${search}`;
}

export function normalizeUpstreamApiUrl(value: string) {
  const trimmed = value.replace(/\/$/, "");
  const url = new URL(trimmed);
  const pathname = url.pathname.replace(/\/$/, "");

  if (pathname === "" || pathname === "/") {
    return `${url.origin}/api/v1`;
  }

  return `${url.origin}${pathname}`;
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
    headers.append("set-cookie", cookie);
  }

  return headers;
}

export async function proxyUpstreamApiRequest(
  request: Request,
  pathSegments: string[],
) {
  const method = request.method.toUpperCase();
  const body =
    method === "GET" || method === "HEAD"
      ? undefined
      : await request.arrayBuffer();
  const upstreamResponse = await fetch(buildUpstreamApiUrl(pathSegments, request.url), {
    method,
    headers: createUpstreamProxyRequestHeaders(request),
    body,
    redirect: "manual",
  });

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: createUpstreamProxyResponseHeaders(upstreamResponse.headers),
  });
}
