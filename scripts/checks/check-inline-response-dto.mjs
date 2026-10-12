#!/usr/bin/env node

/**
 * check:inline-response-dto.
 *
 * Flags `createZodDto(...)` whose schema argument is an **inline Zod shape
 * literal** rather than a shared contract schema.
 *
 * ## Why this exists
 *
 * The onboarding completion defect: `OnboardingCompletionResponseDto` wrapped
 * `z.object({ accessToken, clinicId, userId, email, name, role })` — a shape the
 * service never produced. `SafeZodSerializerInterceptor` is deliberately
 * non-throwing, so nothing failed: the response was passed through untrimmed
 * and the repo logged a `SafeZodSerializer` mismatch warning on **every
 * successful clinic registration**. That interceptor's own doc calls those
 * warnings the rollout signal, so this is a defect class the repo already
 * documents and had not yet acted on.
 *
 * An inline literal is what made it possible. Nothing else references it, so
 * no test compares it to the service, and the drift is invisible until a log
 * line appears in production. A shared schema has a client that must agree
 * with it, which is the property the inline form throws away.
 *
 * ## What counts as a finding
 *
 * The DTO argument contains an inline shape constructor — `z.object(`,
 * `z.union(`, or `z.discriminatedUnion(`. Composition is explicitly fine:
 *
 *   - `createZodDto(FooSchema)`            — shared, healthy
 *   - `createZodDto(FooSchema.array())`    — shared element, healthy
 *   - `createZodDto(FooSchema.extend({}))` — shared base, healthy
 *   - `createZodDto(z.array(FooSchema))`   — shared element, healthy (and common:
 *     15 of the 18 `z.`-rooted arguments in the tree are exactly this)
 *
 * Against the current tree this selects 351 `createZodDto` call sites and flags
 * exactly three. A measured baseline, not a guess.
 *
 * Usage:
 *   node scripts/checks/check-inline-response-dto.mjs           # report only
 *   node scripts/checks/check-inline-response-dto.mjs --enforce # fail
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import process from "node:process";

import {
  gitLsSourceFiles,
  reportFindingsAndExit,
} from "../lib/check-runner.mjs";
import { readCallArguments } from "./check-unserved-endpoint.mjs";

const REPO_ROOT = process.cwd();
const SCAN_ROOTS = ["apps/api/src"];
const ALLOWLIST_PATH = join(
  REPO_ROOT,
  "scripts/checks/allowlists/inline-response-dto.json",
);
const CHECK_NAME = "inline-response-dto check";

/**
 * Inline shape constructors. `z.array`, `z.optional`, `.extend`, `.merge`,
 * `.pick`, `.omit`, `.partial` and friends compose around a schema that is
 * already tracked, so they are not findings.
 */
const INLINE_SHAPE = /\bz\.(?:object|union|discriminatedUnion|intersection)\s*\(/;

/**
 * Whether a DTO schema argument declares its shape inline.
 *
 * Exported so each constructor can be tested in isolation. A fixture like
 * `z.union([z.object({...}), z.object({...})])` matches through `object`, so a
 * test built only from such fixtures cannot tell whether the `union` branch of
 * the rule still works.
 *
 * @param {string} argument
 * @returns {boolean}
 */
export function isInlineShapeArgument(argument) {
  return INLINE_SHAPE.test(argument);
}

/**
 * The `createZodDto(...)` argument, with any trailing argument comma removed so
 * the multi-line form (`createZodDto(\n  fooSchema,\n)`) classifies the same as
 * the single-line one.
 *
 * @param {string} args
 * @returns {string}
 */
export function normalizeDtoArgument(args) {
  return args.trim().replace(/,+$/, "").trim();
}

/**
 * The enclosing class name for a call site, so a finding names the DTO rather
 * than an offset.
 *
 * @param {string} source
 * @param {number} index
 * @returns {string}
 */
export function enclosingClassName(source, index) {
  const before = source.slice(0, index);
  const classes = [...before.matchAll(/\bclass\s+([A-Za-z_$][\w$]*)/g)];
  return classes.length > 0 ? classes[classes.length - 1][1] : "<unknown>";
}

/**
 * Response DTOs whose schema is an inline literal.
 *
 * @param {string} source
 * @returns {Array<{ className: string; line: number; argument: string }>}
 */
export function findInlineResponseDtos(source) {
  const findings = [];
  for (const match of source.matchAll(/\bcreateZodDto\s*\(/g)) {
    const call = readCallArguments(source, match.index + match[0].length - 1);
    if (!call) continue;
    const argument = normalizeDtoArgument(call.args);
    if (!isInlineShapeArgument(argument)) continue;
    findings.push({
      className: enclosingClassName(source, match.index),
      line: source.slice(0, match.index).split("\n").length,
      argument: argument.split("\n")[0].trim().slice(0, 60),
    });
  }
  return findings;
}

/** Every `createZodDto` call site, so the report can state its own coverage. */
export function countDtoCallSites(source) {
  return [...source.matchAll(/\bcreateZodDto\s*\(/g)].length;
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
  const excluded = allowlist.map((entry) => new RegExp(escapeRegExp(entry.file)));

  const findings = [];
  let scanned = 0;

  for (const file of gitLsSourceFiles(SCAN_ROOTS, {
    extensions: [".ts"],
    exclude: [/\.(spec|test)\.ts$/, ...excluded],
  })) {
    const source = readFileSync(join(REPO_ROOT, file), "utf8");
    scanned += countDtoCallSites(source);
    for (const hit of findInlineResponseDtos(source)) {
      findings.push(
        `${file}:${hit.line} ${hit.className} — schema is inline: ${hit.argument}`,
      );
    }
  }

  // Printed on every run: a check that silently scanned nothing also "passes".
  console.log(
    `${CHECK_NAME} inspected ${scanned} createZodDto call site(s).`,
  );

  reportFindingsAndExit(CHECK_NAME, findings, {
    extraMessage:
      `\nA response DTO built from an inline z.object/z.union literal is not ` +
      "referenced anywhere else, so no test compares it with what the service " +
      "returns. SafeZodSerializerInterceptor will pass a mismatched body " +
      "through and log a warning instead of failing. Move the shape to " +
      "packages/types and wrap it here, or document an exception in " +
      "scripts/checks/allowlists/inline-response-dto.json.",
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