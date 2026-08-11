// jscpd:ignore-start
// check-as-cast-density: allow-file — `require("hono") as typeof import("hono")`
// is the documented bridge for a lazy require of an optional peerDependency
// (Hono is only required at the production call site; tests pass options.app
// to avoid loading the runtime). No other cast in this file.
// Shared factory for the Cloudflare Worker API proxies that live next to
// the Vite SPA bundles (apps/app/api/index.ts, apps/internal/api/index.ts).
// The factory wires the canonical /api/v1/*, /api/*, and /socket.io/* routes
// against the same `extractApiV1PathSegments` / `proxyUpstreamApiRequest`
// helpers used by the legacy single-bundle proxies. Each app supplies its
// own `BACKEND` URL and exports the Hono `app` as default — the only per-app
// difference is the public host the proxy runs under.

import type { Hono, Context } from "hono";
import {
  extractApiV1PathSegments,
  proxyUpstreamApiRequest,
  resolveUpstreamApiBaseUrl,
} from "./upstream-api-proxy.js";

export interface CloudflareApiProxyOptions {
  /**
   * Override for the upstream API base URL. Defaults to
   * `process.env.API_PROXY_TARGET` and falls back to
   * `https://api.docita.work` (the production API host).
   */
  backend?: string;
  /**
   * Inject for tests. When set, replaces the default `process.env` lookup
   * so the proxy factory can be exercised without mutating global state.
   */
  env?: Record<string, string | undefined>;
  /**
   * Optional Hono instance to extend (e.g. for app-specific middleware). When
   * omitted, the factory creates a fresh `new Hono()` (Hono must then be a
   * direct dependency of the caller).
   */
  app?: Hono;
}

export function createCloudflareApiProxy(
  options: CloudflareApiProxyOptions = {},
): Hono {
  const BACKEND =
    options.backend ??
    options.env?.["API_PROXY_TARGET"] ??
    process.env["API_PROXY_TARGET"] ??
    "https://api.docita.work";

  const app = options.app ?? createHono();

  /**
   * Build an upstream `Request` that preserves the inbound body and query
   * but rewrites the URL and sets X-Forwarded-* headers. The forwarded
   * headers are applied AFTER the new Request is constructed so the
   * `Request` constructor does not stomp them with the inbound `Host`.
   */
  const withForwardedHeaders = (request: Request, targetUrl: string): Request => {
    const inboundUrl = new URL(request.url);
    const out = new Request(targetUrl, request);
    out.headers.set("X-Forwarded-Proto", inboundUrl.protocol.replace(":", ""));
    out.headers.set("X-Forwarded-Host", inboundUrl.hostname);
    return out;
  };

  app.all("/api/v1/*", async (c: Context) => {
    const pathSegments = extractApiV1PathSegments(
      new URL(c.req.url).pathname,
    );
    if (!pathSegments) return c.text("Not found", 404);
    // The /api/v1/* branch reuses `proxyUpstreamApiRequest`, which builds
    // its own upstream URL from the path segments. We pass the inbound
    // request as-is so the X-Forwarded-* headers can be derived from it
    // inside the helper.
    return proxyUpstreamApiRequest(
      c.req.raw,
      pathSegments,
      resolveUpstreamApiBaseUrl({
        API_PROXY_TARGET: BACKEND,
        ...(options.env ?? {}),
      }),
    );
  });

  app.all("/api/*", async (c: Context) => {
    const url = new URL(c.req.url);
    const targetUrl = `${BACKEND}${url.pathname}${url.search}`;
    return fetch(withForwardedHeaders(c.req.raw, targetUrl));
  });

  app.all("/socket.io/*", async (c: Context) => {
    const url = new URL(c.req.url);
    const targetUrl = `${BACKEND}${url.pathname}${url.search}`;
    return fetch(withForwardedHeaders(c.req.raw, targetUrl));
  });

  return app;
}

function createHono(): Hono {
  // Lazy require: hono is an optional peerDependency, only required when the
  // caller does not pass their own Hono instance (i.e. the production call
  // site). Tests pass `options.app` to avoid loading the runtime.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Hono: HonoCtor } = require("hono") as typeof import("hono");
  return new HonoCtor();
}
// jscpd:ignore-end

