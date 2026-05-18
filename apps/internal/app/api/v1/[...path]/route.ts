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

function buildUpstreamUrl(pathSegments: string[], requestUrl: string) {
  const upstreamBase = normalizeUpstreamApiUrl(UPSTREAM_API_URL);
  const path = pathSegments.map(encodeURIComponent).join("/");
  const search = new URL(requestUrl).search;

  return `${upstreamBase}/${path}${search}`;
}

function normalizeUpstreamApiUrl(value: string) {
  const trimmed = value.replace(/\/$/, "");
  const url = new URL(trimmed);
  const pathname = url.pathname.replace(/\/$/, "");

  if (pathname === "" || pathname === "/") {
    return `${url.origin}/api/v1`;
  }

  return `${url.origin}${pathname}`;
}

function createProxyHeaders(request: Request) {
  const headers = new Headers(request.headers);

  for (const header of HOP_BY_HOP_HEADERS) {
    headers.delete(header);
  }

  return headers;
}

function createResponseHeaders(upstreamHeaders: Headers) {
  const headers = new Headers();
  const getSetCookie = (
    upstreamHeaders as Headers & { getSetCookie?: () => string[] }
  ).getSetCookie;
  const setCookies = getSetCookie?.call(upstreamHeaders) ?? [];

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

async function proxyRequest(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const method = request.method.toUpperCase();
  const body =
    method === "GET" || method === "HEAD"
      ? undefined
      : await request.arrayBuffer();
  const upstreamResponse = await fetch(buildUpstreamUrl(path, request.url), {
    method,
    headers: createProxyHeaders(request),
    body,
    redirect: "manual",
  });

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: createResponseHeaders(upstreamResponse.headers),
  });
}

export const dynamic = "force-dynamic";

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
