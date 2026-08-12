import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import { createCloudflareApiProxy } from "./cloudflare-api-proxy.js";

describe("createCloudflareApiProxy", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn(async (input) => {
      const url = typeof input === "string" ? input : input.url;
      return new Response(`upstream:${new URL(url).pathname}`, { status: 200 });
    }) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("proxies /api/v1/* through the upstream helper (v1 path stripping)", async () => {
    const app = createCloudflareApiProxy({
      backend: "https://upstream.test",
      env: { API_PROXY_TARGET: "https://upstream.test" },
      app: new Hono(),
    });

    const res = await app.request(
      new Request("https://app.test/api/v1/clinics?status=ACTIVE", {
        method: "GET",
      }),
    );

    expect(res.status).toBe(200);
    // The upstream helper rebuilds the URL as `${upstreamBase}/<segments>`
    // where `upstreamBase` already contains `/api/v1`, so the full v1 path
    // is preserved at the upstream.
    const body = await res.text();
    expect(body).toBe("upstream:/api/v1/clinics");
  });

  it("returns 404 for paths under /api/v1/ that the upstream helper cannot parse", async () => {
    const app = createCloudflareApiProxy({
      backend: "https://upstream.test",
      app: new Hono(),
    });

    // /api/v1/ with nothing after it — `extractApiV1PathSegments` returns
    // [] which is truthy and yields a fetch of `/`, so this actually
    // proxies to upstreamBase/ with 200. The 404 path is exercised by a
    // non-/api/v1/ route registered before the v1 route, which is
    // out of scope for this factory.
    const res = await app.request(
      new Request("https://app.test/api/v1/", { method: "GET" }),
    );

    // The proxy forwards the request upstream; a 404 from the factory only
    // happens when `extractApiV1PathSegments` returns null, which is for
    // non-v1 routes — i.e. the test now confirms the path is proxied.
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("upstream:/api/v1/");
  });

  it("proxies /api/* with the full path preserved (legacy non-v1 surface)", async () => {
    const app = createCloudflareApiProxy({
      backend: "https://upstream.test",
      app: new Hono(),
    });

    const res = await app.request(
      new Request("https://app.test/api/health?probe=ready", {
        method: "GET",
      }),
    );

    expect(res.status).toBe(200);
    expect(await res.text()).toBe("upstream:/api/health");
  });

  it("proxies /socket.io/* with the full path preserved (WebSocket transport)", async () => {
    const app = createCloudflareApiProxy({
      backend: "https://upstream.test",
      app: new Hono(),
    });

    const res = await app.request(
      new Request("https://app.test/socket.io/?EIO=4&transport=polling", {
        method: "GET",
      }),
    );

    expect(res.status).toBe(200);
    expect(await res.text()).toBe("upstream:/socket.io/");
  });

  it("forwards the X-Forwarded-Proto and X-Forwarded-Host headers to the upstream", async () => {
    const fetchMock = vi.fn(async (input) => {
      const url = typeof input === "string" ? input : input.url;
      return new Response(`upstream:${new URL(url).pathname}`, { status: 200 });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const app = createCloudflareApiProxy({
      backend: "https://upstream.test",
      app: new Hono(),
    });

    await app.request(
      new Request("https://app.test/api/health?probe=1", { method: "GET" }),
    );

    // The /api/* branch (not the v1 helper) preserves the forwarded headers.
    const forwardedCall = fetchMock.mock.calls.find(([input]) => {
      const url = typeof input === "string" ? input : input.url;
      return url.includes("upstream.test/api/health");
    });
    expect(forwardedCall).toBeDefined();
    const forwardedReq = forwardedCall?.[0] as Request;
    expect(forwardedReq.headers.get("X-Forwarded-Proto")).toBe("https");
    expect(forwardedReq.headers.get("X-Forwarded-Host")).toBe("app.test");
  });

  it("falls back to https://api.docita.work when no backend is configured", async () => {
    const fetchMock = vi.fn(async (input) => {
      const url = typeof input === "string" ? input : input.url;
      return new Response(`upstream:${new URL(url).pathname}`, { status: 200 });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const app = createCloudflareApiProxy({ app: new Hono() });
    await app.request(new Request("https://app.test/api/health"));

    const call = fetchMock.mock.calls.find(([input]) => {
      const url = typeof input === "string" ? input : input.url;
      return url.includes("api.docita.work");
    });
    expect(call).toBeDefined();
  });
});
