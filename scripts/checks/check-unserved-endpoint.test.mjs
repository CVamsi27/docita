import assert from "node:assert/strict";
import test from "node:test";

import {
  collectApiCalls,
  collectConstStrings,
  collectControllerRoutes,
  collectRouteManifestCalls,
  collapseInterpolations,
  findPathLiteral,
  findUnservedCalls,
  matchesRoute,
  normalizeCallPath,
  readCallArguments,
  toSegments,
} from "./check-unserved-endpoint.mjs";

/* ── Server side: route extraction ──────────────────────────────────────── */

test("collectControllerRoutes: combines prefix with the handler sub-path", () => {
  const routes = collectControllerRoutes(`
    @Controller('queue')
    export class QueueController {
      @Get('today')
      today() {}

      @Post('check-in/:appointmentId')
      checkIn() {}
    }
  `);
  assert.deepEqual(
    routes.map((r) => [r.verb, r.path]),
    [
      ["GET", "queue/today"],
      ["POST", "queue/check-in/:appointmentId"],
    ],
  );
});

test("collectControllerRoutes: bare @Get() serves the prefix itself", () => {
  // 37 handlers use this form. Reading only quoted arguments made every one of
  // them invisible, which reported `/search` as unserved on the first run.
  const routes = collectControllerRoutes(`
    @Controller('search')
    export class SearchController {
      @Get()
      search() {}
    }
  `);
  assert.deepEqual(routes.map((r) => r.path), ["search"]);
});

test("collectControllerRoutes: expands an array prefix", () => {
  // `@Controller(['subscriptions', 'subscription'])` is used by three
  // subscription controllers; reading only the first element reported the
  // entire billing checkout flow as unserved.
  const routes = collectControllerRoutes(`
    @Controller(['subscriptions', 'subscription'])
    export class SubscriptionsController {
      @Post('billing/checkout')
      checkout() {}
    }
  `);
  assert.deepEqual(routes.map((r) => r.path), [
    "subscriptions/billing/checkout",
    "subscription/billing/checkout",
  ]);
});

test("collectControllerRoutes: resolves a const prefix", () => {
  const routes = collectControllerRoutes(`
    const PREFIX = 'internal/clinics';
    @Controller(PREFIX)
    export class ClinicsController {
      @Get(':id')
      get() {}
    }
  `);
  assert.deepEqual(routes.map((r) => r.path), ["internal/clinics/:id"]);
});

test("collectControllerRoutes: resolves a template-literal handler path", () => {
  const routes = collectControllerRoutes(`
    @Controller('queue')
    export class QueueController {
      @Get(\`tokens/\${queueId}\`)
      get() {}
    }
  `);
  assert.deepEqual(routes.map((r) => r.path), ["queue/tokens/*"]);
});

test("collectControllerRoutes: two controllers in one file do not cross-product", () => {
  const routes = collectControllerRoutes(`
    @Controller('alpha')
    export class AlphaController {
      @Get('one')
      one() {}
    }

    @Controller('beta')
    export class BetaController {
      @Get('two')
      two() {}
    }
  `);
  assert.deepEqual(routes.map((r) => r.path), ["alpha/one", "beta/two"]);
});

test("collectControllerRoutes: records the decorator line", () => {
  const routes = collectControllerRoutes(`\n\n@Controller('queue')\nclass C {\n  @Get('today')\n  t() {}\n}`);
  assert.equal(routes[0].line, 5);
});

test("collectControllerRoutes: a controller-less file yields nothing", () => {
  assert.deepEqual(collectControllerRoutes("export const x = 1;"), []);
});

test("collectConstStrings: reads plain and static readonly constants", () => {
  const consts = collectConstStrings(`
    const PREFIX = 'internal';
    public static readonly BASE = 'v1';
  `);
  assert.equal(consts.get("PREFIX"), "internal");
  assert.equal(consts.get("BASE"), "v1");
});

/* ── Client side: call extraction ───────────────────────────────────────── */

test("collectApiCalls: reads apiFetch, api.post and api.validate literals", () => {
  const calls = collectApiCalls(`
    apiFetch("/queue/today");
    api.post("/appointments", body);
    api.validate("/queue", schema);
  `);
  assert.deepEqual(calls.map((c) => c.path), [
    "queue/today",
    "appointments",
    "queue",
  ]);
});

test("collectApiCalls: reads the endpoint in any argument position", () => {
  const calls = collectApiCalls(`
    useAPIQuery(queryKeys.queue.list(), "/queue", { staleTime: 30_000 });
    useAPIMutation((id) => \`/queue/call/\${id}\`, "POST");
    withQueryString("/invoices", filters);
  `);
  assert.deepEqual(calls.map((c) => c.path), ["queue", "queue/call/*", "invoices"]);
  assert.equal(calls[1].dynamic, true);
});

test("collectApiCalls: ignores SPA routes", () => {
  // This is the dominant false positive in a naive implementation: `/search` and
  // `/today` are React Router paths, never API calls.
  const calls = collectApiCalls(`
    navigate("/search");
    <Link to="/patients">Patients</Link>;
    href="/settings";
    router.push("/today");
  `);
  assert.deepEqual(calls, []);
});

test("collectApiCalls: skips calls whose path comes from a variable", () => {
  const calls = collectApiCalls(`apiFetch(endpoint);`);
  assert.deepEqual(calls, []);
});

test("collectApiCalls: normalizes the internal portal base prefix", () => {
  const calls = collectApiCalls(`
    apiGet("/api/internal/clinics");
    apiGet("/api/v1/auth/validate");
  `);
  assert.deepEqual(calls.map((c) => c.path), ["internal/clinics", "auth/validate"]);
});

test("collectApiCalls: ignores a literal that is not the first path", () => {
  // Only the first `/`-prefixed literal in the argument list is the endpoint;
  // a body string must not be mistaken for one.
  const calls = collectApiCalls(`api.post("/invoices", { note: "/not/a/path" });`);
  assert.deepEqual(calls.map((c) => c.path), ["invoices"]);
});

/* ── Script route manifests (latency soak probes) ────────────────────────── */

test("collectRouteManifestCalls: reads method/path pairs from a manifest module", () => {
  // The staging soak (backlog R02) is the producer of the committed latency
  // baseline. If its probe paths drift away from the controllers, the probe
  // 404s and the baseline becomes a measurement of nothing.
  const calls = collectRouteManifestCalls(`
    export const SOAK_ROUTES = [
      {
        class: "crud",
        method: "GET",
        path: "/api/v1/patients?limit=1",
        rationale: "not a path",
      },
      {
        class: "webhooks",
        method: "POST",
        path: "/api/v1/webhooks/payments/razorpay",
      },
    ];
  `);
  assert.deepEqual(calls.map((c) => c.path), [
    "patients",
    "webhooks/payments/razorpay",
  ]);
});

test("collectRouteManifestCalls: does not borrow a neighbouring object's path", () => {
  // Brace balancing is what keeps `path` bound to its own `method`; a naive
  // windowed scan pairs `method` from one object with `path` from the next.
  const calls = collectRouteManifestCalls(`
    const first = { method: "GET", note: "no path here" };
    const second = { class: "crud", path: "/api/v1/patients" };
  `);
  assert.deepEqual(calls, []);
});

/* ── Parsing helpers ────────────────────────────────────────────────────── */

test("readCallArguments: returns argument text and the matching close paren", () => {
  const source = `api.post("/x", { a: fn(1, 2) }); trailing`;
  const call = readCallArguments(source, source.indexOf("("));
  assert.equal(call.args, '"/x", { a: fn(1, 2) }');
  assert.equal(source[call.end], ")");
});

test("readCallArguments: ignores parens inside string literals", () => {
  const source = `api.post("/x", "a)b"); after`;
  const call = readCallArguments(source, source.indexOf("("));
  assert.equal(call.args, '"/x", "a)b"');
});

test("readCallArguments: returns null for an unterminated call", () => {
  assert.equal(readCallArguments("api.post(", 8), null);
});

test("findPathLiteral: returns the first slash-prefixed literal", () => {
  assert.equal(findPathLiteral('key, "/queue/today", opts').raw, "/queue/today");
  assert.equal(findPathLiteral('key, opts'), null);
});

test("collapseInterpolations: collapses nested braces", () => {
  assert.equal(
    collapseInterpolations("/admins/${String(x?.id)}/activate"),
    "/admins/*/activate",
  );
  assert.equal(collapseInterpolations("/queue/today"), "/queue/today");
});

test("normalizeCallPath: strips query, hash and client base prefixes", () => {
  assert.equal(normalizeCallPath("/search?q=abc"), "search");
  assert.equal(normalizeCallPath("/patients#top"), "patients");
  assert.equal(normalizeCallPath("/api/v1/invoices"), "invoices");
  assert.equal(normalizeCallPath("/api/internal/admins"), "internal/admins");
  assert.equal(normalizeCallPath("//queue//today"), "queue//today");
});

test("toSegments: drops empty segments", () => {
  assert.deepEqual(toSegments("/a//b/"), ["a", "b"]);
  assert.deepEqual(toSegments(""), []);
});

/* ── Matching ───────────────────────────────────────────────────────────── */

test("matchesRoute: a route param absorbs one call segment", () => {
  assert.ok(matchesRoute(["patients", "p1"], ["patients", ":id"]));
  assert.ok(!matchesRoute(["patients"], ["patients", ":id"]));
});

test("matchesRoute: a dynamic call segment absorbs a literal route segment", () => {
  assert.ok(matchesRoute(["patients", "*"], ["patients", "me"]));
  assert.ok(!matchesRoute(["patients", "me", "x"], ["patients", "me"]));
});

test("matchesRoute: length must agree", () => {
  assert.ok(!matchesRoute(["queue", "today", "extra"], ["queue", "today"]));
});

/* ── End to end over the two real bugs ──────────────────────────────────── */

const SERVER = `
  @Controller('queue')
  export class QueueController {
    @Get()
    get() {}

    @Get('today')
    today() {}
  }

  @Controller('appointments')
  export class AppointmentsController {
    @Post(':id/start-consultation')
    start() {}
  }
`;

test("findUnservedCalls: reports the unserved /consultation/* dashboard paths", () => {
  // The bug this check exists for: there is no @Controller('consultation') in
  // apps/api, so all four dashboard queries 404'd on the live /consultation
  // route.
  const routes = collectControllerRoutes(SERVER).map((r) => r.path);
  const calls = collectApiCalls(`
    api.validate("/consultation/stats", schema);
    api.validate("/consultation/queue", schema);
    apiFetch(\`/consultation/doctor-next/\${doctorId}\`);
    apiFetch(\`/consultation/start/\${appointmentId}\`);
  `);
  assert.deepEqual(
    findUnservedCalls(calls, routes).map((c) => c.path),
    [
      "consultation/stats",
      "consultation/queue",
      "consultation/doctor-next/*",
      "consultation/start/*",
    ],
  );
});

test("findUnservedCalls: accepts the real queue endpoints after the fix", () => {
  const routes = collectControllerRoutes(SERVER).map((r) => r.path);
  const calls = collectApiCalls(`
    api.validate("/queue/today", schema);
    api.validate("/queue", schema);
    api.post("/appointments/apt-9/start-consultation", {});
  `);
  assert.deepEqual(findUnservedCalls(calls, routes), []);
});

test("findUnservedCalls: reports the /hospital/beds 404 page", () => {
  const routes = collectControllerRoutes(`
    @Controller('referrals')
    export class ReferralsController {
      @Get()
      list() {}
    }
  `).map((r) => r.path);
  const calls = collectApiCalls(`apiGet("/hospital/beds");`);
  assert.deepEqual(findUnservedCalls(calls, routes).map((c) => c.path), [
    "hospital/beds",
  ]);
});

test("findUnservedCalls: an empty route set flags every call", () => {
  // Guards against a silently empty server scan reporting "passed".
  const calls = collectApiCalls(`apiFetch("/queue/today");`);
  assert.deepEqual(findUnservedCalls(calls, []).map((c) => c.path), [
    "queue/today",
  ]);
});

test("findUnservedCalls: an empty call set flags nothing", () => {
  const routes = collectControllerRoutes(SERVER).map((r) => r.path);
  assert.deepEqual(findUnservedCalls([], routes), []);
});