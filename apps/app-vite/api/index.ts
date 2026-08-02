import { Hono } from "hono";
import {
  extractApiV1PathSegments,
  proxyUpstreamApiRequest,
  resolveUpstreamApiBaseUrl,
} from "@workspace/utils/http/upstream-api-proxy";

const app = new Hono();

const BACKEND = process.env.API_PROXY_TARGET || "https://api.docita.work";

function withForwardedHeaders(request: Request): Request {
  const url = new URL(request.url);
  const headers = new Headers(request.headers);
  headers.set("X-Forwarded-Proto", url.protocol.replace(":", ""));
  headers.set("X-Forwarded-Host", url.hostname);
  return new Request(request, { headers });
}

app.all("/api/v1/*", async (c) => {
  const pathSegments = extractApiV1PathSegments(new URL(c.req.url).pathname);
  if (!pathSegments) return c.text("Not found", 404);
  return proxyUpstreamApiRequest(
    withForwardedHeaders(c.req.raw),
    pathSegments,
    resolveUpstreamApiBaseUrl({ API_PROXY_TARGET: BACKEND }),
  );
});

app.all("/api/*", async (c) => {
  const url = new URL(c.req.url);
  const targetUrl = `${BACKEND}${url.pathname}${url.search}`;
  return fetch(withForwardedHeaders(new Request(targetUrl, c.req.raw)));
});

app.all("/socket.io/*", async (c) => {
  const url = new URL(c.req.url);
  const targetUrl = `${BACKEND}${url.pathname}${url.search}`;
  return fetch(new Request(targetUrl, c.req.raw));
});

export default app;
