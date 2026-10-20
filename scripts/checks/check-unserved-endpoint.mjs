#!/usr/bin/env node

/**
 * check:unserved-endpoint.
 *
 * Flags frontend API paths that no NestJS controller in 'apps/api' can serve.
 *
 * ## Why this exists
 *
 * A path literal that matches no route is invisible at build time and at
 * review time. It compiles, it looks plausible next to its siblings, and the
 * request simply 404s at runtime. Two real instances shipped on routed pages:
 *
 *   1. '/hospital/beds'. The page is mounted at '/hospital/beds' and rendered a
 *      permanent error state because no '@Controller('hospital/beds')' has ever
 *      existed.
 *   2. The consultation dashboard called '/consultation/stats', '/consultation/
 *      queue', '/consultation/doctor-next/:id' and '/consultation/start/:id' —
 *      and there is **no '@Controller('consultation')' anywhere in 'apps/api'**.
 *      All four queries 404'd, so the live '/consultation' route could only ever
 *      render its error state.
 *
 * In both cases the endpoint was wrong, not the design. Nothing in CI noticed.
 *
 * ## How paths are matched
 *
 * Server side: every '@Controller('a/b')' prefix combined with each
 * '@Get/Post/...('sub/:id')' handler in the same file (bare '@Get()' included —
 * 37 handlers use that form, and missing it produced a false positive on the
 * very first run). 'const'-referenced and template-literal prefixes resolve via
 * a per-file 'const' table. 'main.ts' sets 'setGlobalPrefix('api')', so the
 * comparison happens against the controller-relative path and the client's base
 * prefix is stripped from the call side.
 *
 * Client side: the first '/'-prefixed string literal inside a call to a
 * *recognized API helper* — 'apiFetch', 'api.*', 'client.*', 'withQueryString',
 * 'useAPIQuery', 'useAPIMutation', 'apiGet/apiPost/...'. Recognizing helpers
 * rather than bare string literals is what keeps SPA routes ('navigate("/x")',
 * '<Link to="/x">') out of the report; that is the dominant false positive in a
 * naive implementation.
 *
 * Matching is per segment: a route ':param' matches any one call segment, and a
 * call segment built from a '${...}' interpolation matches any route segment.
 * Query strings and hashes are discarded. '/api/internal/...' and '/api/v1/...'
 * are normalized to '/internal/...' and '/...' respectively, mirroring
 * 'normalizeInternalPath' in the internal portal's API client.
 *
 * ## Known limitations (measured, not assumed)
 *
 * - A path passed through a variable ('apiFetch(endpoint)') cannot be resolved
 *   statically and is skipped. Coverage is therefore a floor, not a ceiling.
 * - A dynamic call segment matches any route segment. This is deliberately
 *   permissive: a '${doctorId}' that turns out to be a route prefix would be
 *   missed rather than falsely reported.
 * - Only controllers under 'apps/api' are considered. Anything served by the
 *   Cloudflare Worker (apps/app/api, apps/internal/api) rather than NestJS
 * is out of scope.
 *
 * Genuine exceptions live in 'scripts/checks/allowlists/unserved-endpoint.json'
 * with a reason.
 *
 * Usage:
 *   node scripts/checks/check-unserved-endpoint.mjs           # report only
 *   node scripts/checks/check-unserved-endpoint.mjs --enforce # fail on findings
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import process from "node:process";

import { gitLsSourceFiles, reportFindingsAndExit } from "../lib/check-runner.mjs";

const REPO_ROOT = process.cwd();
const SERVER_ROOTS = ["apps/api/src"];
const CLIENT_ROOTS = ["apps/app/src", "apps/internal/src", "packages/data-access/src"];
/**
 * The staging latency soak probes the API from outside `apps/`
 * (`scripts/perf/api-latency-soak-routes.mjs`). Its routes are the evidence
 * behind the committed latency baseline, so a controller rename must fail here
 * rather than 404 the probe and silently produce a fast number.
 */
const SCRIPT_ROUTE_MANIFESTS = ["scripts/perf/api-latency-soak-routes.mjs"];
const ALLOWLIST_PATH = join(
  REPO_ROOT,
  "scripts/checks/allowlists/unserved-endpoint.json",
);
const CHECK_NAME = "unserved-endpoint check";

const HTTP_VERBS = [
  "Get",
  "Post",
  "Put",
  "Patch",
  "Delete",
  "Options",
  "Head",
  "All",
];

/**
 * Client helpers whose arguments are inspected for a `/`-prefixed literal.
 *
 * Kept as an explicit list on purpose: scanning every string literal in every
 * frontend file pulls in SPA routes (`navigate("/search")`) and produces a wall
 * of false positives. Each entry here is a network call by construction.
 */
const CLIENT_HELPERS = [
  "apiFetch",
  "apiGet",
  "apiPost",
  "apiPut",
  "apiPatch",
  "apiDelete",
  "fetchAPI",
  "withQueryString",
  "useAPIQuery",
  "useAPIMutation",
  "api\\.get",
  "api\\.post",
  "api\\.put",
  "api\\.patch",
  "api\\.delete",
  "api\\.validate",
  "api\\.upload",
  "client\\.get",
  "client\\.post",
  "client\\.put",
  "client\\.patch",
  "client\\.delete",
  "client\\.request",
];

/**
 * Read the first argument of a call whose `(` sits at `openIndex`.
 *
 * Returns the raw argument text (quotes included) so the caller can tell a
 * string literal from a bare identifier, plus the text up to and including the
 * matching `)`.
 *
 * @param {string} source
 * @param {number} openIndex - index of the opening `(`
 * @returns {{ args: string; end: number } | null}
 */
export function readCallArguments(source, openIndex) {
  let depth = 0;
  let quote = null;
  for (let i = openIndex; i < source.length; i += 1) {
    const char = source[i];
    if (quote) {
      if (char === "\\") {
        i += 1;
        continue;
      }
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "(" || char === "[" || char === "{") depth += 1;
    else if (char === ")" || char === "]" || char === "}") {
      depth -= 1;
      if (depth === 0) {
        return { args: source.slice(openIndex + 1, i), end: i };
      }
    }
  }
  return null;
}

/**
 * Extract the first `/`-prefixed string literal from a call's argument text.
 *
 * Scanning the whole argument list rather than argument 1 is what lets one
 * helper cover `useAPIQuery(queryKey, "/queue/today", options)` (path in
 * position 2) and `useAPIMutation((id) => `/queue/call/${id}`)` (path nested in
 * a callback) without enumerating arities.
 *
 * @param {string} args
 * @returns {{ raw: string; dynamic: boolean } | null}
 */
export function findPathLiteral(args) {
  for (let i = 0; i < args.length; i += 1) {
    const char = args[i];
    if (char !== '"' && char !== "'" && char !== "`") continue;
    let value = "";
    let j = i + 1;
    for (; j < args.length; j += 1) {
      const inner = args[j];
      if (inner === "\\") {
        value += inner + (args[j + 1] ?? "");
        j += 1;
        continue;
      }
      if (inner === char) break;
      value += inner;
    }
    if (value.startsWith("/")) {
      return { raw: value, dynamic: char === "`" };
    }
    i = j;
  }
  return null;
}

/**
 * Collapse each `${...}` in a template literal, tracking balanced braces so
 * nested expressions such as `${String(x?.id)}` survive.
 *
 * Two kinds of interpolation exist and they mean different things:
 *
 *   - a *path* interpolation, bounded by `/` on at least one side
 *     (`/patients/${id}/timeline`), becomes the wildcard segment `*`;
 *   - a *query* interpolation, glued to a segment (`/invoices${filters}`,
 *     `/analytics/trends?from=${from}`), is dropped, because the query string
 *     never participates in route matching.
 *
 * Collapsing the second kind to `*` glued onto its segment produced
 * `invoices*` and `analytics/disease-trends*`, which match no route and
 * reported thirteen healthy data-access hooks as broken.
 *
 * @param {string} text
 * @returns {string}
 */
export function collapseInterpolations(text) {
  let out = "";
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] !== "$" || text[i + 1] !== "{") {
      out += text[i];
      continue;
    }
    let depth = 1;
    let j = i + 2;
    for (; j < text.length && depth > 0; j += 1) {
      if (text[j] === "{") depth += 1;
      else if (text[j] === "}") depth -= 1;
    }
    const boundedBySlash =
      out.endsWith("/") || text.slice(j, j + 1) === "/";
    if (boundedBySlash) out += "*";
    i = j - 1;
  }
  return out;
}

/** Strip query/hash, slashes, and the client base prefix (`/api/v1`, `/api`). */
export function normalizeCallPath(raw) {
  const withoutQuery = raw.split("?")[0].split("#")[0];
  let path = withoutQuery.replace(/^\/+/, "");
  for (const base of ["api/v1/", "api/"]) {
    if (path.startsWith(base)) {
      path = path.slice(base.length);
      break;
    }
  }
  return path;
}

/** Split into segments, dropping empty ones so `/a//b` and `/a/b` agree. */
export function toSegments(path) {
  return path.split("/").filter(Boolean);
}

/**
 * Per-segment match. A route `:param` absorbs any one call segment, and a call
 * segment that came from a `${...}` interpolation absorbs any route segment.
 *
 * @param {string[]} callSegs
 * @param {string[]} routeSegs
 * @returns {boolean}
 */
export function matchesRoute(callSegs, routeSegs) {
  if (callSegs.length !== routeSegs.length) return false;
  return callSegs.every((seg, i) => {
    const route = routeSegs[i];
    if (route === "*" || route.startsWith(":")) return true;
    if (seg === "*") return true;
    return seg === route;
  });
}

/**
 * Read a decorator's own argument, which is a single value rather than an
 * argument list.
 *
 * Covers the forms NestJS accepts in practice: `@Get('sub/:id')`, a template
 * literal with interpolation, `@Get(PREFIX)` pointing at a `const` in the same
 * file, and an array of prefixes. `@Get()` yields `[]`, meaning "the controller
 * prefix itself".
 *
 * @param {string} arg - argument text between the parentheses, quotes included
 * @param {Map<string, string>} consts
 * @returns {string[]} zero or more resolved path fragments
 */
function resolvePathArg(arg, consts) {
  const trimmed = arg.trim();
  if (trimmed.startsWith("[")) {
    // NestJS accepts an array of prefixes, and three subscription controllers
    // use `@Controller(['subscriptions', 'subscription'])` so both spellings
    // resolve. Reading only the first element reported the whole billing
    // checkout/activate/preview flow as unserved.
    return trimmed
      .slice(1, trimmed.lastIndexOf("]"))
      .split(",")
      .flatMap((entry) => resolvePathArg(entry, consts));
  }
  const first = trimmed[0];
  if (first === '"' || first === "'" || first === "`") {
    const end = trimmed.indexOf(first, 1);
    if (end === -1) return [];
    return [collapseInterpolations(trimmed.slice(1, end))];
  }
  return consts.has(trimmed) ? [consts.get(trimmed)] : [];
}

/** Per-file table of `const NAME = 'value'` declarations. */
export function collectConstStrings(source) {
  const consts = new Map();
  const pattern =
    /(?:const|static\s+readonly)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]*)?=\s*(['"`])([^'"`]*)\2/g;
  for (const match of source.matchAll(pattern)) {
    consts.set(match[1], match[3]);
  }
  return consts;
}

/**
 * Every servable route declared in one controller file.
 *
 * A handler is attributed to the nearest `@Controller` above it, so a file
 * holding two controllers does not produce the cross product.
 *
 * @param {string} source
 * @returns {Array<{ verb: string; path: string; line: number }>}
 */
export function collectControllerRoutes(source) {
  const consts = collectConstStrings(source);
  const routes = [];
  let prefixes = [];

  const decoratorPattern = new RegExp(
    `@(Controller|${HTTP_VERBS.join("|")})\\s*\\(`,
    "g",
  );

  for (const match of source.matchAll(decoratorPattern)) {
    const kind = match[1];
    const openIndex = match.index + match[0].length - 1;
    const call = readCallArguments(source, openIndex);
    if (!call) continue;
    const resolved = resolvePathArg(call.args, consts);

    if (kind === "Controller") {
      prefixes = resolved.map((value) => value.replace(/^\/+|\/+$/g, ""));
      continue;
    }

    // `@Get()` with no path serves the controller prefix itself. Omitting this
    // form reported 37 real routes as missing on the first run.
    for (const sub of resolved.length > 0 ? resolved : [""]) {
      const trimmedSub = sub.replace(/^\/+|\/+$/g, "");
      for (const prefix of prefixes.length > 0 ? prefixes : [""]) {
        routes.push({
          verb: kind.toUpperCase(),
          path: [prefix, trimmedSub].filter(Boolean).join("/"),
          line: source.slice(0, match.index).split("\n").length,
        });
      }
    }
  }
  return routes;
}

/**
 * Every API path literal called from one client file.
 *
 * @param {string} source
 * @returns {Array<{ path: string; line: number; dynamic: boolean }>}
 */
export function collectApiCalls(source) {
  const calls = [];
  // The optional generic argument matters: `apiFetch<WardWithBeds[]>("/ipd/wards")`
  // is the single most common call shape in this repo, and requiring a bare `(`
  // silently skipped all of them — which hid the `/hospital/beds` bug class
  // from the check entirely.
  const helperPattern = new RegExp(
    `\\b(?:${CLIENT_HELPERS.join("|")})\\s*(?:<[^()<>]*>)?\\s*\\(`,
    "g",
  );

  for (const match of source.matchAll(helperPattern)) {
    const openIndex = match.index + match[0].length - 1;
    const call = readCallArguments(source, openIndex);
    if (!call) continue;
    const literal = findPathLiteral(call.args);
    if (!literal) continue;
    calls.push({
      path: normalizeCallPath(collapseInterpolations(literal.raw)),
      line: source.slice(0, match.index).split("\n").length,
      dynamic: literal.dynamic,
    });
  }
  return calls;
}

/**
 * Call-site paths that no route serves.
 *
 * @param {Array<{ path: string; line: number; dynamic: boolean }>} calls
 * @param {string[]} routes - route paths from {@link collectControllerRoutes}
 * @returns {Array<{ path: string; line: number; dynamic: boolean }>}
 */
export function findUnservedCalls(calls, routes) {
  const routeSegs = routes.map((route) => toSegments(route));
  const unserved = [];
  for (const call of calls) {
    const callSegs = toSegments(call.path);
    if (callSegs.length === 0) continue;
    const hit = routeSegs.some((segs) => matchesRoute(callSegs, segs));
    if (!hit) unserved.push(call);
  }
  return unserved;
}

/**
 * API paths declared by a route-manifest module outside the client roots.
 *
 * These files describe calls as `{ method: "GET", path: "/api/v1/..." }`
 * objects rather than as helper invocations, so the helper scan above cannot
 * see them. The enclosing object literal is read with the same brace balancing
 * used for call arguments, so a `path` belonging to a neighbouring object is
 * never picked up.
 *
 * @param {string} source
 * @returns {Array<{ path: string; line: number; dynamic: boolean }>}
 */
export function collectRouteManifestCalls(source) {
  const calls = [];
  for (const match of source.matchAll(/\bmethod:\s*"([A-Za-z]+)"/g)) {
    const blockStart = source.lastIndexOf("{", match.index);
    if (blockStart === -1) continue;
    let depth = 0;
    let quote = null;
    let end = -1;
    for (let i = blockStart; i < source.length; i += 1) {
      const char = source[i];
      if (quote) {
        if (char === "\\") i += 1;
        else if (char === quote) quote = null;
        continue;
      }
      if (char === '"' || char === "'" || char === "`") quote = char;
      else if (char === "{") depth += 1;
      else if (char === "}") {
        depth -= 1;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end === -1) continue;
    const literal = findPathLiteral(source.slice(blockStart, end + 1));
    if (!literal) continue;
    calls.push({
      path: normalizeCallPath(collapseInterpolations(literal.raw)),
      line: source.slice(0, match.index).split("\n").length,
      dynamic: literal.dynamic,
    });
  }
  return calls;
}

function loadAllowlist() {
  if (!existsSync(ALLOWLIST_PATH)) return [];
  return JSON.parse(readFileSync(ALLOWLIST_PATH, "utf8"));
}

function main() {
  if (!existsSync(ALLOWLIST_PATH)) {
    process.stderr.write(
      `${CHECK_NAME}: allowlist missing at ${ALLOWLIST_PATH}\n`,
    );
    process.exit(1);
  }
  const allowlist = loadAllowlist();

  const routes = [];
  for (const file of gitLsSourceFiles(SERVER_ROOTS, {
    extensions: [".ts"],
    include: [/\.controller\.ts$/],
  })) {
    for (const route of collectControllerRoutes(
      readFileSync(join(REPO_ROOT, file), "utf8"),
    )) {
      routes.push(route.path);
    }
  }

  const findings = [];
  let callsScanned = 0;
  for (const file of gitLsSourceFiles(CLIENT_ROOTS, {
    extensions: [".ts", ".tsx"],
    exclude: [
      /\.(test|spec|stories)\.[tj]sx?$/,
      ...allowlist.map((entry) => new RegExp(escapeRegExp(entry.file))),
    ],
  })) {
    const calls = collectApiCalls(readFileSync(join(REPO_ROOT, file), "utf8"));
    callsScanned += calls.length;
    for (const call of findUnservedCalls(calls, routes)) {
      findings.push(`${file}:${call.line} GET "${call.path}"`);
    }
  }

  for (const manifest of SCRIPT_ROUTE_MANIFESTS) {
    const manifestPath = join(REPO_ROOT, manifest);
    if (!existsSync(manifestPath)) continue;
    const manifestCalls = collectRouteManifestCalls(
      readFileSync(manifestPath, "utf8"),
    );
    callsScanned += manifestCalls.length;
    for (const call of findUnservedCalls(manifestCalls, routes)) {
      findings.push(`${manifest}:${call.line} "${call.path}"`);
    }
  }

  // Printed on every run so a green result carries its own evidence: a check
  // that silently selected zero call sites would also "pass".
  console.log(
    `${CHECK_NAME} matched ${callsScanned} client API call(s) against ` +
      `${routes.length} controller route(s).`,
  );

  reportFindingsAndExit(CHECK_NAME, findings, {
    extraMessage:
      `\n${CHECK_NAME} matched ${callsScanned} client API call(s) against ` +
      `${routes.length} controller route(s). A path with no controller can only ` +
      "404 at runtime while still compiling and passing review. Check the " +
      "controller prefix (and whether the route is really served elsewhere) " +
      "before adding an entry to scripts/checks/allowlists/unserved-endpoint.json.",
  });
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Only run the scan when executed directly. Without this guard the unit test
// importing the exported helpers would trigger the scan on import, and
// `reportFindingsAndExit` would call `process.exit()` mid-suite — silently
// reducing the test count and making every assertion vacuous.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}