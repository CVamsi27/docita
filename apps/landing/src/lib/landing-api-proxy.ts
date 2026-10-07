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

function copyProxyHeaders(headers: Headers): Headers {
  const copied = new Headers();
  for (const [key, value] of headers.entries()) {
    const normalizedKey = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(normalizedKey) || normalizedKey.startsWith("access-control-")) continue;
    copied.append(key, value);
  }
  return copied;
}

export function createLandingProxyRequestHeaders(headers: Headers): Headers {
  return copyProxyHeaders(headers);
}

export function createLandingProxyResponseHeaders(headers: Headers): Headers {
  return copyProxyHeaders(headers);
}

export function buildLandingUpstreamApiUrl(targetBase: string, path: string, requestUrl: string): string {
  const normalizedBase = targetBase.replace(/\/+$/, "");
  const pathSegments = path.split("/").filter(Boolean);
  if (pathSegments.some((segment) => segment === "." || segment === "..")) {
    throw new Error("Landing proxy path contains a traversal segment");
  }
  const normalizedPath = pathSegments.map(encodeURIComponent).join("/");
  const targetUrl = new URL(`${normalizedBase}/api/${normalizedPath}`);
  targetUrl.search = new URL(requestUrl).search;
  return targetUrl.toString();
}
