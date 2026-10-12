#!/usr/bin/env node

/**
 * check:internal-only-client-call.
 *
 * Flags clinician-app API call sites whose only matching server routes require
 * `Role.INTERNAL` — the role reserved for the internal-admin portal
 * (`apps/internal`), never for a doctor, nurse, receptionist, admin or patient.
 *
 * ## Why this exists
 *
 * `apps/internal` and `apps/app` are different products behind the same API.
 * Twelve controllers carry a controller-level `@Roles(Role.INTERNAL)`, so every
 * route they expose answers 403 with `INSUFFICIENT_PERMISSIONS` for any
 * clinician role. Nothing about such a call site looks wrong in review: it is a
 * normal-looking `api.get("/clinics")` next to normal-looking siblings.
 *
 * One instance shipped on a routed page. `/clinic-selection` listed candidate
 * facilities with `GET /api/v1/clinics`, which is `ClinicsController.findAll()`
 * — `@Controller('clinics')` + `@Roles(Role.INTERNAL)`. The page was reachable
 * by URL and could only ever render its error state, and its hand-written
 * response shape declared `role: string`, a field that has never existed on a
 * clinic. The route had zero inbound links, because the working join flow is
 * `GET /clinics/search-for-join` (`@AllowNoClinic()`) behind `/join-clinic`.
 *
 * The same call site reached from the internal portal is correct, so the check
 * deliberately scans `apps/app/src` and `packages/data-access/src` only.
 *
 * ## How a route is classified
 *
 * `RolesGuard` reads roles with `getAllAndOverride`, so a handler-level
 * `@Roles(...)` *overrides* the controller-level one; a handler with no
 * `@Roles` inherits the controller's. A route is internal-only when that
 * effective list is non-empty and every entry is `INTERNAL`. `@Public()` and
 * `@UploadSessionSecret()` bypass the guard entirely
 * (`bypassesSessionGuards`), so those routes are never internal-only.
 *
 * ## Route shadowing
 *
 * Several prefixes are declared twice — `@Controller('clinics')` appears on
 * both the INTERNAL `ClinicsController` and the clinician-facing
 * `ClinicSettingsController`. A client path is reported only when **every**
 * route it can match is internal-only. `clinics/settings` matches the
 * INTERNAL `clinics/:id` as well as the clinician `clinics/settings`, so it is
 * left alone; reporting it would have produced twelve false positives on the
 * first run. The rule is deliberately one-sided: a shadowed path is a routing
 * bug, not a permissions bug, and `check:route-shadowing` owns it.
 *
 * Path matching, interpolation handling and base-prefix normalization are
 * reused from `check-unserved-endpoint.mjs` so both gates agree on what a path
 * is.
 *
 * ## Known limitations (measured, not assumed)
 *
 * - A path passed through a variable (`apiFetch(endpoint)`) cannot be resolved
 *   statically and is skipped. Coverage is a floor, not a ceiling.
 * - Role names are read lexically from `@Roles(...)`. A roles array built at
 *   runtime (none exist today) would be invisible.
 * - Only `Role.INTERNAL` is treated as admin-only. Other privilege boundaries
 *   (tier, feature gates, ABAC policies) are out of scope here.
 *
 * Usage:
 *   node scripts/checks/check-internal-only-client-call.mjs
 *   node scripts/checks/check-internal-only-client-call.mjs --enforce
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import process from "node:process";

import { gitLsSourceFiles, reportFindingsAndExit } from "../lib/check-runner.mjs";
import {
  collectApiCalls,
  collectConstStrings,
  matchesRoute,
  toSegments,
} from "./check-unserved-endpoint.mjs";

const REPO_ROOT = process.cwd();
const SERVER_ROOTS = ["apps/api/src"];
const CLIENT_ROOTS = ["apps/app/src", "packages/data-access/src"];
const ALLOWLIST_PATH = join(
  REPO_ROOT,
  "scripts/checks/allowlists/internal-only-client-call.json",
);
const CHECK_NAME = "internal-only client call check";

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

/** Decorators that short-circuit `RolesGuard` entirely. */
const GUARD_BYPASS_DECORATORS = new Set(["Public", "UploadSessionSecret"]);

/**
 * Every decorator in a file, with the full text of its argument list.
 *
 * Multi-line `@Roles(\n  Role.ADMIN,\n  ...\n)` argument lists are common in
 * this repo, so the argument span is found with a balanced scan rather than a
 * line regex.
 *
 * @param {string} source
 * @returns {Array<{ name: string; args: string; start: number; end: number }>}
 */
export function collectDecorators(source) {
  const decorators = [];
  const pattern = /@([A-Za-z_$][\w$]*)\s*(\()?/g;
  for (const match of source.matchAll(pattern)) {
    const start = match.index;
    let end = start + match[0].length;
    let args = "";
    if (match[2] === "(") {
      const call = readArgs(source, end - 1);
      if (!call) continue;
      args = call.args;
      end = call.end + 1;
    }
    decorators.push({ name: match[1], args, start, end });
  }
  return decorators;
}

/**
 * Balanced-paren argument reader.
 *
 * Imported lazily because `check-unserved-endpoint.mjs` is the canonical owner
 * of this primitive, but it is not exported under a name this file can rely on
 * being stable; a local copy keeps the dependency one-directional.
 *
 * @param {string} source
 * @param {number} openIndex
 * @returns {{ args: string; end: number } | null}
 */
function readArgs(source, openIndex) {
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
      if (depth === 0) return { args: source.slice(openIndex + 1, i), end: i };
    }
  }
  return null;
}

/**
 * Index of the next character that is not whitespace or a comment.
 *
 * @param {string} source
 * @param {number} index
 * @returns {number}
 */
function nextSignificantIndex(source, index) {
  let i = index;
  for (;;) {
    while (i < source.length && /\s/.test(source[i])) i += 1;
    if (source.startsWith("//", i)) {
      while (i < source.length && source[i] !== "\n") i += 1;
      continue;
    }
    if (source.startsWith("/*", i)) {
      const close = source.indexOf("*/", i + 2);
      i = close === -1 ? source.length : close + 2;
      continue;
    }
    return i;
  }
}

/**
 * Decorators stacked directly above position `index`, innermost first.
 *
 * "Directly above" means only whitespace and comments separate them, so a
 * handler's `@Roles` is attributed to that handler rather than leaking from an
 * unrelated decorator earlier in the class body.
 *
 * @param {string} source
 * @param {Array<{ name: string; args: string; start: number; end: number }>} decorators
 * @param {number} index - index into `decorators`
 * @returns {Array<{ name: string; args: string; start: number; end: number }>}
 */
export function decoratorsAbove(source, decorators, index) {
  const found = [];
  for (let i = index - 1; i >= 0; i -= 1) {
    if (nextSignificantIndex(source, decorators[i].end) !== decorators[i + 1].start) {
      break;
    }
    found.push(decorators[i]);
  }
  return found;
}

/** Role names in a `@Roles(...)` argument list, e.g. `Role.INTERNAL` -> `INTERNAL`. */
export function readRoleNames(args) {
  return Array.from(args.matchAll(/(?:Role\.)?([A-Z][A-Z0-9_]*)/g)).map((m) => m[1]);
}

/** Resolve a decorator's path argument the way the NestJS runtime would. */
function resolvePathFragments(arg, consts) {
  const trimmed = arg.trim();
  if (trimmed.startsWith("[")) {
    return trimmed
      .slice(1, trimmed.lastIndexOf("]"))
      .split(",")
      .flatMap((entry) => resolvePathFragments(entry, consts));
  }
  const quote = trimmed[0];
  if (quote === '"' || quote === "'" || quote === "`") {
    const end = trimmed.indexOf(quote, 1);
    if (end === -1) return [];
    return [trimmed.slice(1, end).replace(/\$\{[^}]*\}/g, "*")];
  }
  return consts.has(trimmed) ? [consts.get(trimmed)] : [];
}

/**
 * Routes in one controller file, each labelled with whether its effective
 * `@Roles(...)` is INTERNAL-only.
 *
 * @param {string} source
 * @returns {Array<{ verb: string; path: string; line: number; internalOnly: boolean }>}
 */
export function classifyControllerRoutes(source) {
  const consts = collectConstStrings(source);
  const decorators = collectDecorators(source);
  const routes = [];

  for (let c = 0; c < decorators.length; c += 1) {
    if (decorators[c].name !== "Controller") continue;
    const controller = decorators[c];
    const prefixes = resolvePathFragments(controller.args, consts).map((value) =>
      value.replace(/^\/+|\/+$/g, ""),
    );

    // Handlers belong to this class up to the next `@Controller` in the file,
    // so a file holding two controllers does not produce the cross product.
    let bodyEnd = source.length;
    for (let k = c + 1; k < decorators.length; k += 1) {
      if (decorators[k].name === "Controller") {
        bodyEnd = decorators[k].start;
        break;
      }
    }

    const classBlock = decoratorsBelow(source, decorators, c);
    const classRoles = readRolesFromBlock(classBlock);
    const classBypasses = classBlock.some((d) =>
      GUARD_BYPASS_DECORATORS.has(d.name),
    );

    for (let h = 0; h < decorators.length; h += 1) {
      const handler = decorators[h];
      if (!HTTP_VERBS.includes(handler.name)) continue;
      if (handler.start <= controller.start) continue;
      if (handler.start >= bodyEnd) continue;

      const handlerBlock = decoratorsAbove(source, decorators, h);
      const handlerRoles = readRolesFromBlock(handlerBlock);
      const bypasses =
        classBypasses ||
        handlerBlock.some((d) => GUARD_BYPASS_DECORATORS.has(d.name));

      // `getAllAndOverride`: a handler-level list replaces the class-level one.
      const effective = handlerRoles ?? classRoles;
      const internalOnly =
        !bypasses &&
        effective !== null &&
        effective.length > 0 &&
        effective.every((role) => role === "INTERNAL");

      const subs =
        resolvePathFragments(handler.args, consts).length > 0
          ? resolvePathFragments(handler.args, consts)
          : [""];
      for (const sub of subs) {
        const trimmedSub = sub.replace(/^\/+|\/+$/g, "");
        for (const prefix of prefixes.length > 0 ? prefixes : [""]) {
          routes.push({
            verb: handler.name.toUpperCase(),
            path: [prefix, trimmedSub].filter(Boolean).join("/"),
            line: source.slice(0, handler.start).split("\n").length,
            internalOnly,
          });
        }
      }
    }
  }

  return routes;
}

/**
 * Decorators stacked directly below position `index`, outermost first.
 *
 * NestJS writes class metadata *after* the `@Controller(...)` decorator and
 * above the `class` keyword:
 *
 *     @Controller('clinics')
 *     @Roles(Role.INTERNAL)
 *     export class ClinicsController {
 *
 * so the class-level roles are below `@Controller`, not above it.
 *
 * @param {string} source
 * @param {Array<{ name: string; args: string; start: number; end: number }>} decorators
 * @param {number} index
 * @returns {Array<{ name: string; args: string; start: number; end: number }>}
 */
export function decoratorsBelow(source, decorators, index) {
  const found = [decorators[index]];
  for (let i = index + 1; i < decorators.length; i += 1) {
    if (nextSignificantIndex(source, decorators[i - 1].end) !== decorators[i].start) break;
    found.push(decorators[i]);
  }
  return found;
}

/** `@Roles(...)` in a decorator block, or null when the block has none. */
function readRolesFromBlock(block) {
  const roles = block.find((d) => d.name === "Roles");
  return roles ? readRoleNames(roles.args) : null;
}

/**
 * Call sites whose only matching routes are internal-only.
 *
 * A call that also matches a clinician-accessible route is left alone: with
 * `@Controller('clinics')` declared on both an INTERNAL and a clinician
 * controller, `clinics/settings` matches `clinics/:id` too, and reporting it
 * would be a routing complaint rather than a permissions one.
 *
 * @param {Array<{ path: string; line: number; dynamic: boolean }>} calls
 * @param {Array<{ path: string; internalOnly: boolean }>} routes
 * @returns {Array<{ path: string; line: number }>}
 */
export function findInternalOnlyCalls(calls, routes) {
  const internalSegs = routes
    .filter((route) => route.internalOnly)
    .map((route) => toSegments(route.path));
  // Only the *non*-internal routes can rescue a call site. Including the
  // internal ones here makes the second guard mirror the first, so every match
  // is silently skipped and the check reports nothing — verified by mutation,
  // not by reading.
  const accessibleSegs = routes
    .filter((route) => !route.internalOnly)
    .map((route) => toSegments(route.path));

  const findings = [];
  for (const call of calls) {
    const segs = toSegments(call.path);
    if (segs.length === 0) continue;
    if (!internalSegs.some((route) => matchesRoute(segs, route))) continue;
    if (accessibleSegs.some((route) => matchesRoute(segs, route))) continue;
    findings.push({ path: call.path, line: call.line });
  }
  return findings;
}

function loadAllowlist() {
  if (!existsSync(ALLOWLIST_PATH)) return [];
  return JSON.parse(readFileSync(ALLOWLIST_PATH, "utf8"));
}

function main() {
  if (!existsSync(ALLOWLIST_PATH)) {
    process.stderr.write(`${CHECK_NAME}: allowlist missing at ${ALLOWLIST_PATH}\n`);
    process.exit(1);
  }
  const allowlist = loadAllowlist();

  const routes = [];
  for (const file of gitLsSourceFiles(SERVER_ROOTS, {
    extensions: [".ts"],
    include: [/\.controller\.ts$/],
  })) {
    routes.push(...classifyControllerRoutes(readFileSync(join(REPO_ROOT, file), "utf8")));
  }
  const internalOnlyCount = routes.filter((route) => route.internalOnly).length;

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
    for (const call of findInternalOnlyCalls(calls, routes)) {
      findings.push(`${file}:${call.line} "${call.path}"`);
    }
  }

  const summary =
    `${CHECK_NAME} matched ${callsScanned} client API call(s) against ` +
    `${routes.length} controller route(s) (${internalOnlyCount} INTERNAL-only).`;
  console.log(summary);

  reportFindingsAndExit(CHECK_NAME, findings, {
    extraMessage:
      `\n${summary}\nThe clinician app (apps/app) must never call an endpoint that only ` +
      "Role.INTERNAL can reach — it is the internal-admin portal's surface and " +
      "answers 403 for every doctor, nurse, receptionist, admin and patient. If the " +
      "call is genuinely needed by clinicians, give the route a clinician `@Roles(...)` " +
      "(a handler-level list overrides the controller-level one) and confirm with " +
      "check:controller-rbac. If it is not needed, delete the call site. Allowlist " +
      "entries go in scripts/checks/allowlists/internal-only-client-call.json.",
  });
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}