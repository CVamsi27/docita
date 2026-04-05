import type { APIRoute } from "astro";

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
]);

function buildHeaders(headers: Headers): Headers {
  const nextHeaders = new Headers();

  for (const [key, value] of headers.entries()) {
    if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      continue;
    }
    nextHeaders.set(key, value);
  }

  return nextHeaders;
}

export const ALL: APIRoute = async ({ params, request }) => {
  const path = params["path"];

  if (!path) {
    return new Response("Missing path", { status: 400 });
  }

  const targetBase = (import.meta.env["API_PROXY_TARGET"] || "http://localhost:3001").replace(
    /\/+$/,
    "",
  );

  const targetUrl = new URL(`${targetBase}/api/${path}`);
  const requestUrl = new URL(request.url);
  targetUrl.search = requestUrl.search;

  const method = request.method.toUpperCase();
  const init: RequestInit = {
    method,
    headers: buildHeaders(request.headers),
    redirect: "manual",
  };

  if (method !== "GET" && method !== "HEAD") {
    init.body = request.body ?? null;
  }

  const upstream = await fetch(targetUrl.toString(), init);
  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete("content-length");

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
};
