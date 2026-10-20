#!/usr/bin/env node

/**
 * check:public-token-leak.
 *
 * Flags `@Public()` auth routes that can put a refresh token in a JSON body.
 *
 * ## Why this exists
 *
 * The refresh token is the long-lived credential: a 30-day bearer that
 * `AuthSessionService` stores hashed and rotates on every use. Every auth
 * route in this repo delivers it as an **httpOnly cookie**, specifically so
 * that JavaScript on the page cannot read it. An httpOnly cookie is trivially
 * defeated by any XSS; keeping the token out of the body is the second half
 * of that defence.
 *
 * Three routes shipped returning it in the body anyway, and the pattern is
 * easy to reintroduce because nothing about the code looks wrong — a handler
 * returns the service result and sets the cookie, and both lines read fine:
 *
 *   - `POST /auth/login` and `POST /auth/refresh` returned the raw
 *     `issueTokens` bundle.
 *   - `POST /patient-portal/auth/verify-otp` did the same.
 *   - `POST /lab-portal/auth/login` was the subtler one: it called
 *     `setAuthCookies(...)` with `refresh_token` and then `return result;`,
 *     where `result` is an `AuthLoginResult` — the same token, in the body,
 *     on a route whose cookie was therefore decorative.
 *
 * Two rules catch that class:
 *
 *   R1 — a public route's declared response contract must not declare a
 *        refresh-token field. `z.object` strips unknown keys, so a contract
 *        that simply omits the key is the enforcement; a contract that
 *        declares it is a reintroduction.
 *   R2 — a public handler must not `return` a variable it assigned straight
 *        from a token-issuing call unless the handler runs its result through
 *        `stripRefreshTokenFromBody`. Returning the bare identifier is the
 *        exact shape of the lab-portal bug.
 *
 * R2 keys off the handler calling `stripRefreshTokenFromBody` *somewhere*,
 * which is why the MFA branch in `POST /auth/login`
 * (`if ('mfa_required' in result) return result;`) is not reported: that
 * handler does trim its token-bearing return, and the challenge branch holds
 * no token.
 *
 * ## Known limitations (measured, not assumed)
 *
 * - Decorators are matched textually, so a `@Public()` applied through a
 *   composed decorator is invisible — same limitation as
 *   `check:public-response-contract`, which this check shares code with.
 * - R1 resolves a contract only when `@ZodSerializerDto(...)` names something
 *   resolvable. A route with no declared contract is R1-silent by design and
 *   is the concern of `check:public-response-contract` instead.
 * - R2 keys off method names. A token-issuing service method that is not in
 *   `TOKEN_ISSUING_METHODS` is not tracked.
 *
 * Usage:
 *   node scripts/checks/check-public-token-leak.mjs           # report only
 *   node scripts/checks/check-public-token-leak.mjs --enforce # fail on findings
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import process from "node:process";

import {
  blankJsComments,
  gitLsSourceFiles,
  reportFindingsAndExit,
} from "../lib/check-runner.mjs";
import { collectDecorators } from "./check-internal-only-client-call.mjs";
import { contiguousDecoratorBlock } from "./check-public-response-contract.mjs";

const REPO_ROOT = process.cwd();
const API_ROOTS = ["apps/api/src"];
const ALLOWLIST_PATH = join(
  REPO_ROOT,
  "scripts/checks/allowlists/public-token-leak.json",
);
const CHECK_NAME = "public-token-leak check";

const HTTP_VERBS = new Set([
  "Get",
  "Post",
  "Put",
  "Patch",
  "Delete",
  "Options",
  "Head",
  "All",
]);

/** Response fields that carry the refresh credential. */
export const REFRESH_TOKEN_FIELDS = ["refresh_token", "refreshToken"];

/**
 * Service methods that mint a token pair and hand back the refresh token.
 *
 * Deliberately excludes the OTP-request methods: those return an
 * acknowledgement, never a credential.
 */
export const TOKEN_ISSUING_METHODS = new Set([
  "login",
  "loginWithMfaCheck",
  "loginAfterMfa",
  "refreshTokens",
  "issueTokens",
]);

const STRIP_HELPER = "stripRefreshTokenFromBody";

/** Index `{ schemaName: objectLiteralSource }` for every `z.object({...})`. */
export function indexSchemaDefinitions(sources) {
  const index = new Map();
  const re = /(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=\s*z\.object\(\{/g;
  for (const source of sources) {
    let match;
    re.lastIndex = 0;
    while ((match = re.exec(source)) !== null) {
      const open = re.lastIndex - 1;
      const close = matchBrace(source, open);
      if (close === -1) continue;
      index.set(match[1], source.slice(open, close + 1));
      re.lastIndex = close;
    }
  }
  return index;
}

/** Index of the closing brace for the `{` at `open`, ignoring braces in strings. */
function matchBrace(source, open) {
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    const char = source[i];
    if (char === '"' || char === "'" || char === "`") {
      const quote = char;
      i += 1;
      while (i < source.length && source[i] !== quote) {
        if (source[i] === "\\") i += 1;
        i += 1;
      }
      continue;
    }
    if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** Does this object literal declare the field as a key? */
export function declaresField(literal, field) {
  return new RegExp(`(^|[\\s{,])${field}\\s*[:,}]`).test(literal);
}

/**
 * Public handlers whose declared `@ZodSerializerDto` schema names a
 * refresh-token field.
 *
 * Resolves the schema by name against the indexed `z.object({...})`
 * definitions. Testing the whole controller source instead would flag every
 * route in a file that merely mentions `refresh_token` elsewhere — which is
 * how the first version of this rule reported `tokenIssueResponseSchema` as
 * leaking, a schema whose whole point is that it omits the key.
 *
 * @param {string} source - file source, comments already blanked
 * @param {Map<string, string>} schemaIndex
 * @returns {Array<{ line: number; verb: string; path: string; schema: string; field: string }>}
 */
export function findContractTokenLeaks(source, schemaIndex) {
  const decorators = collectDecorators(source);
  const findings = [];

  decorators.forEach((decorator, index) => {
    if (!HTTP_VERBS.has(decorator.name)) return;
    const block = contiguousDecoratorBlock(source, decorators, index);
    if (!block.some((entry) => entry.name === "Public")) return;

    const serializer = block.find(
      (entry) => entry.name === "ZodSerializerDto",
    );
    if (!serializer) return;

    const schema = serializer.args.trim().replace(/^['"`]|['"`]$/g, "");
    if (!schema) return;

    // Unresolvable (a DTO class, a union, a composed constant) is R1-silent;
    // R2 still covers the handler body, and guessing here would be noise.
    const literal = schemaIndex.get(schema);
    if (!literal) return;

    for (const field of REFRESH_TOKEN_FIELDS) {
      if (!declaresField(literal, field)) continue;
      findings.push({
        line: source.slice(0, decorator.start).split("\n").length,
        verb: decorator.name,
        path: serializer.args.trim().replace(/^['"`]|['"`]$/g, ""),
        schema,
        field,
      });
    }
  });

  return findings;
}

/**
 * Public handlers that return a raw token-issuing result without running it
 * through `stripRefreshTokenFromBody`.
 *
 * @param {string} source - file source, comments already blanked
 * @returns {Array<{ line: number; verb: string; path: string; variable: string; method: string }>}
 */
export function findRawTokenReturns(source) {
  const decorators = collectDecorators(source);
  const findings = [];

  decorators.forEach((decorator, index) => {
    if (!HTTP_VERBS.has(decorator.name)) return;
    const block = contiguousDecoratorBlock(source, decorators, index);
    if (!block.some((entry) => entry.name === "Public")) return;

    // The handler body runs from the verb to the start of the next decorator
    // run, so a `return` in a sibling handler is never attributed here.
    const bodyStart = decorator.end;
    const nextVerb = decorators.find(
      (candidate) => candidate.start > decorator.start && HTTP_VERBS.has(candidate.name),
    );
    const bodyEnd = nextVerb ? nextVerb.start : source.length;
    const body = source.slice(bodyStart, bodyEnd);

    if (body.includes(STRIP_HELPER)) return;

    // `const result = await this.svc.login(...)`
    const assignRe = new RegExp(
      String.raw`(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*[^;]*?\.\s*(${[
        ...TOKEN_ISSUING_METHODS,
      ].join("|")})\s*\(`,
      "g",
    );
    const minted = new Set();
    let match;
    while ((match = assignRe.exec(body)) !== null) {
      minted.add(match[1]);
      // `return result;` with nothing wrapped around it.
      const returnRe = new RegExp(String.raw`return\s+${match[1]}\s*;`);
      const hit = returnRe.exec(body);
      if (!hit) continue;
      findings.push({
        line: source.slice(0, bodyStart + hit.index).split("\n").length,
        verb: decorator.name,
        path: decorator.args.trim().replace(/^['"`]|['"`]$/g, ""),
        variable: match[1],
        method: match[2],
      });
    }
  });

  return findings;
}

function readAllowlist() {
  if (!existsSync(ALLOWLIST_PATH)) return [];
  const entries = JSON.parse(readFileSync(ALLOWLIST_PATH, "utf8"));
  return Array.isArray(entries) ? entries : [];
}

export function main() {
  const files = gitLsSourceFiles(API_ROOTS, {
    extensions: ["ts"],
    exclude: [/\.spec\.ts$/, /\.d\.ts$/],
  });
  const schemaIndex = indexSchemaDefinitions(
    gitLsSourceFiles(["packages/types/src"], {
      extensions: ["ts"],
      exclude: [/\.spec\.ts$/, /\.d\.ts$/],
    }).map((file) => blankJsComments(readFileSync(file, "utf8"))),
  );
  const allowlistByFile = new Map();
  for (const entry of readAllowlist()) {
    if (!entry?.file || !entry?.reason) continue;
    allowlistByFile.set(entry.file, entry.reason);
  }

  const findings = [];
  let publicHandlers = 0;
  let checked = 0;

  for (const file of files) {
    const source = blankJsComments(readFileSync(file, "utf8"));
    if (!source.includes("@Public")) continue;

    const decorators = collectDecorators(source);
    const hasPublicRoute = decorators.some(
      (decorator, index) =>
        HTTP_VERBS.has(decorator.name) &&
        contiguousDecoratorBlock(source, decorators, index).some(
          (entry) => entry.name === "Public",
        ),
    );
    if (!hasPublicRoute) continue;

    publicHandlers += 1;
    const leaks = [
      ...findContractTokenLeaks(source, schemaIndex),
      ...findRawTokenReturns(source),
    ];
    if (leaks.length === 0) continue;
    checked += 1;

    if (allowlistByFile.has(file)) continue;

    for (const leak of leaks) {
      const detail =
        "schema" in leak
          ? `declares "${leak.field}", so the refresh token is sent in the body`
          : `returns "${leak.variable}" from .${leak.method}() unwrapped, so the refresh token is sent in the body`;
      findings.push(
        `${file}:${leak.line}  @${leak.verb} ${leak.path} is @Public() and ${detail}`,
      );
    }
  }

  const grandfathered = [...allowlistByFile.keys()].filter((file) =>
    gitLsSourceFiles(API_ROOTS, { extensions: ["ts"] }).includes(file),
  ).length;

  console.log(
    `${CHECK_NAME} scanned ${files.length} API file(s); ` +
      `${publicHandlers} controller(s) with public routes; ` +
      `${checked} with a possible token leak; ` +
      `${findings.length} finding(s); ${grandfathered} file(s) grandfathered.`,
  );

  reportFindingsAndExit(CHECK_NAME, findings, {
    extraMessage:
      `\n${CHECK_NAME} found @Public() routes that can send the refresh token ` +
      "in a JSON body. The refresh token is a 30-day bearer credential that " +
      "every route here delivers as an httpOnly cookie; a body copy is " +
      "readable by any XSS and makes that cookie decorative. Either wrap the " +
      "returned value in `stripRefreshTokenFromBody(...)`, or give the route " +
      "a contract in @workspace/types that omits the token field.",
  });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main();
}
