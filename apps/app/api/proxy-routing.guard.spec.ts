// @vitest-environment node
// Runtime guard for the Cloudflare proxy Workers (apps/<app>/api/index.ts).
//
// The static check (scripts/checks/check-route-shadowing.mjs, Pass 3) parses
// single-line and multi-line `app.<method>("path", ...)` registrations plus
// named `app.route("/prefix", sub)` mounts, but it cannot see anonymous
// inline mounts (`app.route("/api", new Hono())`), multi-line route() calls,
// or any non-literal registration form. This spec closes that remaining gap
// at runtime by reading Hono's actual route table (`app.routes`, which every
// registration lands in through `#addRoute` — including `route()` mounts) and
// by dispatching real requests through the proxies.
//
// ROUTING SEMANTICS (verified empirically against hono@4.13.0, the version
// both proxies install — the fixtures in the "first-registration wins"
// describe block are live dispatch probes, not assumptions):
//
//   Hono matches by REGISTRATION ORDER, not by specificity. The production
//   router is SmartRouter: on the first dispatch it replays every registration
//   into RegExpRouter and caches it if that succeeds; if RegExpRouter rejects
//   the pattern set with UnsupportedPathError (e.g. a :param and a static
//   literal sharing a depth), it falls back to TrieRouter. Both routers are
//   first-match-in-registration-order:
//     - RegExpRouter compiles all routes into a single regex whose alternation
//       is emitted in registration order, so the first matching alternative
//       wins.
//     - TrieRouter walks its trie in insertion order.
//   A Hono trailing `*` spans segment boundaries (/api/* matches
//   /api/v1/me), so the Express/Nest literal-after-:param hazard DOES apply
//   to the proxies: a literal registered after a matching wildcard or :param
//   is unreachable.
//
//   The proxies are correctly ordered today (/api/v1/* before /api/* before
//   /socket.io/* — more specific first). This spec pins that ordering so a
//   future literal or narrower wildcard added after a broader one cannot
//   silently die.

import { afterAll, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";

// Deterministic upstream for URL assertions; stubbed before the proxies are
// imported because they read process.env.API_PROXY_TARGET at module scope.
vi.stubEnv("API_PROXY_TARGET", "https://upstream.test");

const { default: appProxy } = await import("./index");
const { default: internalProxy } = await import("../../internal/api/index");

afterAll(() => {
  vi.unstubAllEnvs();
});

const proxies: Array<{ name: string; app: Hono }> = [
  { name: "apps/app/api/index.ts", app: appProxy },
  { name: "apps/internal/api/index.ts", app: internalProxy },
];

const EXPECTED_WILDCARDS = ["ALL /api/v1/*", "ALL /api/*", "ALL /socket.io/*"];

function routeKeys(app: Hono): string[] {
  return app.routes.map((r) => `${r.method} ${r.path}`);
}

function findDuplicateRegistrations(app: Hono): string[] {
  const seen = new Map<string, number>();
  for (const key of routeKeys(app)) {
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  return [...seen.entries()]
    .filter(([, count]) => count > 1)
    .map(([key]) => key);
}

async function fetchUrlOf(call: unknown[]): Promise<string> {
  const input = call[0];
  return input instanceof Request ? input.url : String(input);
}

describe("Hono proxy routing guard", () => {
  describe("runtime route tables (closes the static regex silent-gap)", () => {
    for (const { name, app } of proxies) {
      it(`${name} registers the three expected wildcards`, () => {
        const keys = routeKeys(app);
        for (const expected of EXPECTED_WILDCARDS) {
          expect(keys).toContain(expected);
        }
      });

      it(`${name} has no duplicate (method, path) registrations`, () => {
        expect(findDuplicateRegistrations(app)).toEqual([]);
      });
    }

    it("detects duplicates that the static regex cannot see (multi-line + app.route mount)", () => {
      const sub = new Hono();
      // Multi-line registration: invisible to the Pass-3 line regex.
      sub.get(
        "/v1/health",
        (c) => c.text("ok"),
      );
      const app = new Hono();
      app.get("/api/v1/health", (c) => c.text("one"));
      app.route("/api", sub); // adds GET /api/v1/health a second time

      // The runtime route table sees both; the regex would only see the
      // single-line `app.get("/api/v1/health"` above.
      expect(findDuplicateRegistrations(app)).toEqual(["GET /api/v1/health"]);
    });

    it("does not flag a clean route() mount as a duplicate", () => {
      const sub = new Hono();
      sub.get("/v1/status", (c) => c.text("ok"));
      const app = new Hono();
      app.route("/api", sub);
      expect(findDuplicateRegistrations(app)).toEqual([]);
    });
  });

  describe("first-registration wins (registration order, not specificity)", () => {
    it("wildcard registered before a literal swallows it (hazard)", async () => {
      const app = new Hono();
      app.all("/api/*", (c) => c.text("wildcard"));
      app.get("/api/v1/health", (c) => c.text("static")); // registered later

      const res = await app.request("/api/v1/health");
      expect(await res.text()).toBe("wildcard");
    });

    it("literal registered before a wildcard wins (safe pattern)", async () => {
      const app = new Hono();
      app.get("/api/v1/health", (c) => c.text("static"));
      app.all("/api/*", (c) => c.text("wildcard"));

      expect(await (await app.request("/api/v1/health")).text()).toBe(
        "static",
      );
      expect(await (await app.request("/api/other")).text()).toBe("wildcard");
    });

    it(":param registered before a literal swallows it (hazard)", async () => {
      const app = new Hono();
      app.get("/api/v1/:id", (c) => c.text(`param:${c.req.param("id")}`));
      app.get("/api/v1/health", (c) => c.text("static")); // registered later

      const res = await app.request("/api/v1/health");
      expect(await res.text()).toBe("param:health");
    });

    it("broader wildcard registered first swallows a more-specific one (hazard)", async () => {
      const app = new Hono();
      app.all("/api/*", (c) => c.text("broad"));
      app.all("/api/v1/*", (c) => c.text("v1")); // registered later

      expect(await (await app.request("/api/v1/foo")).text()).toBe("broad");
    });

    it("more-specific wildcard registered first wins over a broader one (the proxy pattern)", async () => {
      const app = new Hono();
      app.all("/api/v1/*", (c) => c.text("v1"));
      app.all("/api/*", (c) => c.text("broad")); // registered later

      expect(await (await app.request("/api/v1/foo")).text()).toBe("v1");
      expect(await (await app.request("/api/other")).text()).toBe("broad");
    });

    it("exact duplicate: the first registration wins", async () => {
      const app = new Hono();
      app.get("/x", (c) => c.text("first"));
      app.get("/x", (c) => c.text("second")); // unreachable

      expect(await (await app.request("/x")).text()).toBe("first");
    });
  });

  describe("real proxies dispatch through the correct handler (registered-first)", () => {
    for (const { name, app } of proxies) {
      it(`${name} routes /api/v1/* to the v1 proxy handler (registered before /api/*)`, async () => {
        const fetchMock = vi
          .fn()
          .mockResolvedValue(new Response("upstream", { status: 201 }));
        vi.stubGlobal("fetch", fetchMock);

        const res = await app.request("/api/v1/clinics/settings");
        expect(fetchMock).toHaveBeenCalledTimes(1);
        // The v1 handler proxies via proxyUpstreamApiRequest, which passes an
        // init with redirect:"manual" — the generic /api/* handler does not.
        expect(fetchMock.mock.calls[0][1]?.redirect).toBe("manual");
        expect(await fetchUrlOf(fetchMock.mock.calls[0])).toBe(
          "https://upstream.test/api/v1/clinics/settings",
        );
        expect(res.status).toBe(201);
      });

      it(`${name} routes non-v1 /api/* to the generic proxy handler`, async () => {
        const fetchMock = vi
          .fn()
          .mockResolvedValue(new Response("upstream", { status: 200 }));
        vi.stubGlobal("fetch", fetchMock);

        const res = await app.request("/api/non-v1/foo");
        expect(fetchMock).toHaveBeenCalledTimes(1);
        // Generic handler passes a single Request argument, no init.
        expect(fetchMock.mock.calls[0][1]).toBeUndefined();
        expect(await fetchUrlOf(fetchMock.mock.calls[0])).toBe(
          "https://upstream.test/api/non-v1/foo",
        );
        expect(res.status).toBe(200);
      });

      it(`${name} routes /socket.io/* to the socket proxy handler`, async () => {
        const fetchMock = vi
          .fn()
          .mockResolvedValue(new Response("upstream", { status: 200 }));
        vi.stubGlobal("fetch", fetchMock);

        const res = await app.request("/socket.io/connect");
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][1]).toBeUndefined();
        expect(await fetchUrlOf(fetchMock.mock.calls[0])).toBe(
          "https://upstream.test/socket.io/connect",
        );
        expect(res.status).toBe(200);
      });

      it(`${name} returns 404 for paths matching no registration`, async () => {
        vi.stubGlobal(
          "fetch",
          vi.fn().mockResolvedValue(new Response("upstream", { status: 200 })),
        );
        const res = await app.request("/healthz");
        expect(res.status).toBe(404);
      });
    }
  });
});
