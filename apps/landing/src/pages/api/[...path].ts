import type { APIRoute } from "astro";

import {
  buildLandingUpstreamApiUrl,
  createLandingProxyRequestHeaders,
  createLandingProxyResponseHeaders,
} from "@/lib/landing-api-proxy";

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export const ALL: APIRoute = async ({ params, request }) => {
  const path = params["path"];
  if (!path) return jsonError(400, "We could not find what you were looking for");
  const targetBase = import.meta.env["API_PROXY_TARGET"] || "http://localhost:3001";
  const method = request.method.toUpperCase();
  const init: RequestInit = {
    method,
    headers: createLandingProxyRequestHeaders(request.headers),
    redirect: "manual",
  };
  if (method !== "GET" && method !== "HEAD") {
    init.body = request.body ?? null;
  }
  try {
    const upstream = await fetch(
      buildLandingUpstreamApiUrl(targetBase, path, request.url),
      init,
    );
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: createLandingProxyResponseHeaders(upstream.headers),
    });
  } catch {
    return jsonError(502, "We could not connect right now. Please try again in a few minutes.");
  }
};
