#!/usr/bin/env node

/**
 * check:public-response-contract.
 *
 * Flags `@Public()` route handlers that declare no response contract.
 *
 * ## Why this exists
 *
 * A `@Public()` route is reachable with no session: a link in an onboarding
 * email, a QR code, a webhook. Anything the handler returns therefore goes out
 * untrimmed unless it declares a contract, and the fields it returns are
 * whatever the service happened to select.
 *
 * Two real instances shipped this way:
 *
 *   1. `POST /onboarding/:id/sla-signature-session` returned
 *      `UploadsService.createSession`'s result, which spreads the whole
 *      `UploadSession` row — including `uploadSecretHash`. The authenticated
 *      `/uploads/session` route trimmed it through `@ZodSerializerDto`; the
 *      public one did not.
 *   2. `GET /doctors/signature/validate-token/:token` and its clinic twin
 *      returned `signatureUploadService.validateToken(token)` untrimmed.
 *
 * Note that `SafeZodSerializerInterceptor` deliberately forwards the ORIGINAL
 * response when a payload does not match its schema (it logs and passes through
 * rather than 500ing), so the contract only trims while it keeps matching. A
 * declared contract plus a parity test is what keeps that true.
 *
 * ## How a handler is matched
 *
 * NestJS decorators form a contiguous run above the method signature, in either
 * order (`@Public()` then `@Get()`, or `@Get()` then `@Public()`). The check
 * walks that run in both directions: a scan that only walks upward sees
 * `@Public` and misses the `@ZodSerializerDto` that sits below the verb, and
 * reported every public route as uncovered when it first ran that way.
 *
 * A class-level `@ZodSerializerDto` counts for every handler in the class.
 *
 * ## Known limitations (measured, not assumed)
 *
 * - Decorators are matched textually. A `@Public()` applied through a custom
 *   decorator or a composed constant is invisible.
 * - Only `@ZodSerializerDto` counts as a contract. A handler that returns a
 *   hand-built literal is still reported, which is deliberate: the point is that
 *   the response is declared, not that it happens to be small today.
 * - Webhooks are included. Most return a small ack, so they are grandfathered in
 *   the allowlist with a reason rather than fixed.
 *
 * Genuine exceptions live in
 * 'scripts/checks/allowlists/public-response-contract.json' with a reason.
 *
 * Usage:
 *   node scripts/checks/check-public-response-contract.mjs           # report only
 *   node scripts/checks/check-public-response-contract.mjs --enforce # fail on findings
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

const REPO_ROOT = process.cwd();
const API_ROOTS = ["apps/api/src"];
const ALLOWLIST_PATH = join(
  REPO_ROOT,
  "scripts/checks/allowlists/public-response-contract.json",
);
const CHECK_NAME = "public-response-contract check";

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

/**
 * The contiguous decorator run around one decorator, in both directions.
 *
 * @param {string} source
 * @param {Array<{name: string, start: number, end: number}>} decorators
 * @param {number} index
 * @returns {Array<{name: string, start: number, end: number}>}
 */
export function contiguousDecoratorBlock(source, decorators, index) {
  const isAdjacent = (left, right) => {
    let i = left.end;
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
      return i === right.start;
    }
  };

  const block = [decorators[index]];
  for (let i = index - 1; i >= 0; i -= 1) {
    if (!isAdjacent(decorators[i], decorators[i + 1])) break;
    block.unshift(decorators[i]);
  }
  for (let i = index + 1; i < decorators.length; i += 1) {
    if (!isAdjacent(decorators[i - 1], decorators[i])) break;
    block.push(decorators[i]);
  }
  return block;
}

/**
 * Public handlers in one controller source that declare no response contract.
 *
 * @param {string} source - file source, comments already blanked
 * @returns {Array<{ line: number; verb: string; path: string }>}
 */
export function findUncoveredPublicHandlers(source) {
  const decorators = collectDecorators(source);
  const firstVerb = decorators.find((decorator) =>
    HTTP_VERBS.has(decorator.name),
  );
  // A class-level `@ZodSerializerDto` is declared above the first route, so it
  // is outside every handler's contiguous run. Anything below that belongs to
  // one handler and must not be credited to its siblings — treating "the file
  // mentions a serializer" as coverage marked every route in a controller as
  // covered whenever a single one had a contract.
  const classHasContract = decorators.some(
    (decorator) =>
      decorator.name === "ZodSerializerDto" &&
      (!firstVerb || decorator.start < firstVerb.start),
  );
  const findings = [];

  decorators.forEach((decorator, index) => {
    if (!HTTP_VERBS.has(decorator.name)) return;
    const block = contiguousDecoratorBlock(source, decorators, index);
    const isPublic = block.some((entry) => entry.name === "Public");
    if (!isPublic) return;
    const hasContract =
      classHasContract ||
      block.some((entry) => entry.name === "ZodSerializerDto");
    if (hasContract) return;
    findings.push({
      line: source.slice(0, decorator.start).split("\n").length,
      verb: decorator.name,
      path: decorator.args.trim().replace(/^['"`]|['"`]$/g, ""),
    });
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
  const allowlist = readAllowlist();
  const allowlistByFile = new Map();
  for (const entry of allowlist) {
    if (!entry?.file || !entry?.reason) continue;
    allowlistByFile.set(entry.file, entry.reason);
  }

  const findings = [];
  let publicHandlers = 0;

  for (const file of files) {
    const source = blankJsComments(readFileSync(file, "utf8"));
    if (!source.includes("@Public")) continue;

    const uncovered = findUncoveredPublicHandlers(source);
    if (uncovered.length === 0) continue;
    publicHandlers += uncovered.length;

    if (allowlistByFile.has(file)) {
      // Grandfathered: counted, not reported, and the reason is printed so the
      // debt stays visible rather than disappearing into a silent pass.
      continue;
    }

    for (const finding of uncovered) {
      findings.push(
        `${file}:${finding.line}  @${finding.verb} ${finding.path} is @Public() ` +
          "and declares no response contract, so its response is sent untrimmed",
      );
    }
  }

  const grandfathered = [...allowlistByFile.keys()].filter((file) =>
    gitLsSourceFiles(API_ROOTS, { extensions: ["ts"] }).includes(file),
  ).length;

  // Printed on every run so a green result carries its own evidence: a check
  // that matched no public route would also "pass".
  console.log(
    `${CHECK_NAME} scanned ${files.length} API file(s); ` +
      `${publicHandlers} public handler(s) without a contract; ` +
      `${findings.length} finding(s); ${grandfathered} file(s) grandfathered.`,
  );

  reportFindingsAndExit(CHECK_NAME, findings, {
    extraMessage:
      `\n${CHECK_NAME} found @Public() handlers that declare no response ` +
      "contract. A public route is reachable with no session, so its response " +
      "is whatever the service selected — an untrimmed row reached a patient " +
      "that way. Add `@ZodSerializerDto(...)` with a schema from " +
      "@workspace/types, or record a reason in " +
      "scripts/checks/allowlists/public-response-contract.json.",
  });
}

// Only run the scan when executed directly. Without this guard the unit test
// importing the exported helpers would trigger the scan on import, and
// `reportFindingsAndExit` would call `process.exit()` mid-suite.
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main();
}