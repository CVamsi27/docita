#!/usr/bin/env node

/**
 * check:test-schema-duplication.
 *
 * Flags hand-written Zod response schemas in test / e2e helper code that
 * redeclare the field set of a shared contract in `packages/types`.
 *
 * ## Why this exists
 *
 * Test helpers exist to set up state, so hand-rolling a response shape there
 * looks harmless: nothing in the product reads it, nothing breaks when it
 * drifts, and the suite stays green. That is exactly the problem — a helper
 * that mirrors a wire contract is a second source of truth for it, and it
 * drifts silently in the one direction tests cannot notice.
 *
 * Three live instances were found by this check's first run:
 *
 *   1. `onboardingCheckoutResultSchema` in the app's e2e patient helpers
 *      redeclared `onboardingCheckoutResponseSchema` field for field. It had
 *      already drifted: the shared schema requires a non-empty
 *      `razorpayKeyId` (a blank one ships a checkout that can never complete),
 *      while the copy accepted `''`. The helper computed a Razorpay HMAC
 *      signature from a response the product would have rejected.
 *   2. `portalVerifyOtpResponseSchema` redeclared the login response with
 *      **every** field optional. `safeParse({})` therefore succeeds, so if the
 *      OTP endpoint stopped returning a token the helper took the "parsed
 *      fine" branch and seeded no session — and the suite passed on a page that
 *      was silently rendering its logged-out state.
 *   3. `patientResponseSchema` / `idResponseSchema` redeclared entity
 *      identifiers.
 *
 * A helper that deliberately wants a loose read (a fallback across response
 * shapes) is allowed and is not flagged — see the allowlist, which records the
 * reason per entry.
 *
 * ## Matching
 *
 * A finding requires a `z.object({...})` whose **top-level key set equals** a
 * shared contract's top-level key set, where the shared side ignores optional
 * keys. Exact set equality (rather than "overlaps") is what keeps `{id}` style
 * projections out of the report: no shared contract is just an identifier, and
 * a narrow projection of a wide response does not match anything.
 *
 * Only helper modules are scanned — files under `e2e/`, `test/`, `testing/`,
 * `__tests__/`, or `*.helper.ts` / `*-helpers.ts` — and `*.spec.*` /
 * `*.test.*` files are excluded, because a spec asserting a response shape
 * inline is the point of the assertion.
 *
 * ## Known limitations (measured, not assumed)
 *
 * - Only top-level keys are compared. A helper that flattens a nested
 *   response (`{user: {id}}` for `{user, clinic}`) is not detected.
 * - A schema assembled from `z.array(...)`, `.extend(...)`, `.pick(...)` or a
 *   spread is not read as an inline object literal.
 * - Nested `z.object({...})` inside an outer object is only compared as part of
 *   the outer key set, not on its own.
 *
 * Usage:
 *   node scripts/checks/check-test-schema-duplication.mjs
 *   node scripts/checks/check-test-schema-duplication.mjs --enforce
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import process from "node:process";

import {
  blankJsComments,
  gitLsSourceFiles,
  reportFindingsAndExit,
} from "../lib/check-runner.mjs";

const REPO_ROOT = process.cwd();
const TYPES_ROOT = "packages/types/src";
const HELPER_ROOTS = ["apps", "packages"];
const ALLOWLIST_PATH = join(
  REPO_ROOT,
  "scripts/checks/allowlists/test-schema-duplication.json",
);
const CHECK_NAME = "test schema duplication check";

/** Directories that hold test helpers rather than product code. */
const HELPER_DIR_SEGMENTS = ["/e2e/", "/test/", "/testing/", "/__tests__/", "/tests/"];

/** Filenames that are helpers even outside a test directory. */
const HELPER_FILE_PATTERN = /(\.helper|-helpers?|-helper)\.[cm]?[jt]sx?$/;

/** Spec/test files assert shapes inline on purpose. */
const SPEC_PATTERN = /\.(test|spec|stories)\.[cm]?[jt]sx?$/;

/**
 * Source with comments blanked, so a schema quoted inside a doc block is not
 * read as code. Offsets and line numbers survive, so findings still point at
 * the right line.
 */
function prepare(source) {
  return blankJsComments(source);
}

/** True when a path is test-helper code rather than product code. */
export function isHelperPath(file) {
  if (SPEC_PATTERN.test(file)) return false;
  return (
    HELPER_DIR_SEGMENTS.some((segment) => file.includes(segment)) ||
    HELPER_FILE_PATTERN.test(file)
  );
}

/**
 * Split the top-level keys out of a `z.object({ ... })` argument.
 *
 * Balanced-brace scanning rather than a regex: nested objects, comments inside
 * the literal, and template-literal keys all appear in this codebase.
 *
 * @param {string} args - text between `z.object(` and its matching `)`
 * @returns {string[]} top-level key names
 */
export function readObjectKeys(args) {
  let depth = 0;
  let quote = null;
  const keys = [];
  let segmentStart = null;

  for (let i = 0; i < args.length; i += 1) {
    const char = args[i];

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
    if (char === "{" || char === "[" || char === "(") {
      if (depth === 0 && char === "{") segmentStart = i + 1;
      depth += 1;
      continue;
    }
    if (char === "}" || char === "]" || char === ")") {
      depth -= 1;
      if (depth === 0) {
        pushKey(keys, args.slice(segmentStart ?? 0, i));
        segmentStart = null;
      }
      continue;
    }
    // A `,` or `;` at depth 1 ends one top-level property.
    if (depth === 1 && (char === "," || char === ";")) {
      pushKey(keys, args.slice(segmentStart ?? 0, i));
      segmentStart = i + 1;
    }
  }
  return keys;
}

/** Extract the key name from one property segment, or nothing if it has none. */
function pushKey(keys, segment) {
  const match = segment.match(/^\s*(?:(['"`])([^'"`]+)\1|([A-Za-z_$][\w$]*))\s*:/);
  if (!match) return;
  const key = match[2] ?? match[3];
  if (key && !keys.includes(key)) keys.push(key);
}

/**
 * Every TOP-LEVEL `z.object({ ... })` literal in a file, with its key set.
 *
 * Nested literals are skipped. `followUpSchema`'s inline
 * `patient: z.object({id, firstName, lastName})` was reported as a duplicate of
 * a shared contract on the first run, but a nested object inside a bespoke
 * outer shape is ordinary composition, not a re-declared wire contract — and any
 * two- or three-field object will collide with something somewhere. Only a
 * whole response redeclared field for field is the defect this check targets.
 *
 * @param {string} source
 * @returns {Array<{ name: string; keys: string[]; line: number }>}
 */
export function collectObjectLiterals(source) {
  const code = prepare(source);
  const found = [];
  const spans = [];
  const pattern = /\bz\.object\s*\(/g;

  for (const match of code.matchAll(pattern)) {
    const call = readBalanced(code, match.index + match[0].length - 1);
    if (!call) continue;
    // `nameStart` is the offset of `z.object` itself, not the `(` after it:
    // the binding-name regex anchors on `=\s*$`, so reading up to the paren
    // left `const x = z.object` and every literal reported as "(inline)".
    spans.push({
      nameStart: match.index,
      start: match.index + match[0].length - 1,
      end: call.argsEnd,
      argStart: call.argsStart,
      argEnd: call.argsEnd,
    });
  }

  for (const span of spans) {
    // Nested inside another literal's argument list -> not a top-level schema.
    const isNested = spans.some(
      (other) =>
        other !== span && other.start < span.start && other.argEnd >= span.start,
    );
    if (isNested) continue;

    const keys = readObjectKeys(code.slice(span.argStart, span.argEnd));
    if (keys.length === 0) continue;
    // Name the literal from the nearest `const X =` / `= ` on the same line so
    // a finding names something a reader can find.
    const lineStart = code.lastIndexOf("\n", span.nameStart) + 1;
    const head = code.slice(lineStart, span.nameStart);
    const named = head.match(/const\s+([A-Za-z_$][\w$]*)\s*(?::[^=]*)?=\s*$/);
    found.push({
      name: named ? named[1] : "(inline)",
      keys,
      line: code.slice(0, span.start).split("\n").length,
    });
  }
  return found;
}

/**
 * Read the balanced argument list beginning at an opening paren.
 *
 * @param {string} source
 * @param {number} openIndex
 * @returns {{ argsStart: number; argsEnd: number } | null}
 */
function readBalanced(source, openIndex) {
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
      if (depth === 0) return { argsStart: openIndex + 1, argsEnd: i };
    }
  }
  return null;
}

/**
 * Top-level keys of every shared contract object schema in `packages/types`.
 *
 * Optional keys are dropped when building the comparison set, so a helper that
 * mirrors the required fields of a wider response still matches.
 *
 * @returns {Map<string, string[]>} normalized key set -> declaring file
 */
export function collectContractKeySets() {
  const sets = new Map();
  for (const file of gitLsSourceFiles([TYPES_ROOT], {
    extensions: [".ts"],
  })) {
    const source = prepare(readFileSync(join(REPO_ROOT, file), "utf8"));
    for (const literal of collectObjectLiterals(source)) {
      if (sets.has(literal.keys.join("|"))) continue;
      sets.set(literal.keys.join("|"), literal.keys);
    }
    // Second pass: required-keys-only variants, so a helper mirroring a subset
    // of a response whose optional keys it does not care about still matches.
    for (const literal of collectObjectLiterals(source)) {
      const required = requiredKeysOf(source, literal);
      if (required.length === 0) continue;
      const key = required.join("|");
      if (!sets.has(key)) sets.set(key, required);
    }
  }
  return sets;
}

/**
 * The keys of one contract literal that are not declared `.optional()`.
 *
 * A key is required when its own property text — up to the next top-level
 * comma — contains no `.optional()` and no `| undefined`.
 *
 * @param {string} source
 * @param {{ keys: string[]; line: number }} literal
 * @returns {string[]}
 */
function requiredKeysOf(source, literal) {
  const lines = source.split("\n");
  const start = literal.line - 1;
  // Search forward from the declaration for the property lines.
  const window = lines.slice(start, start + 40).join("\n");
  return literal.keys.filter((key) => {
    const pattern = new RegExp(
      `(?:['"\`]${key}['"\`]|^\\s*${key})\\s*:([^,\\n]*)`,
      "m",
    );
    const match = window.match(pattern);
    if (!match) return false;
    return !/\.optional\(\)|\|\s*undefined/.test(match[1]);
  });
}

/** Minimum fields on either side for a match to mean anything. */
const MIN_KEYS = 2;

/**
 * Helper schemas whose key set matches a shared contract's.
 *
 * Both sides must declare at least {@link MIN_KEYS} keys. The required-keys
 * subset pass legitimately produces one-key sets — `contracts/appointments.ts`
 * and `patient/metrics.ts` both have `{id}` as their only required field — and
 * without this floor a bare `z.object({ id: z.string() })` projection matched
 * them. A one-field object carries no contract worth sharing, and those
 * projections are ubiquitous and correct.
 *
 * @param {Array<{ file: string; literals: Array<{ name: string; keys: string[]; line: number }> }>} helpers
 * @param {Map<string, string[]>} contractSets
 * @returns {string[]} findings
 */
export function findDuplicatedSchemas(helpers, contractSets) {
  const findings = [];
  for (const helper of helpers) {
    for (const literal of helper.literals) {
      if (literal.keys.length < MIN_KEYS) continue;
      const key = literal.keys.join("|");
      const contract = contractSets.get(key);
      if (!contract || contract.length < MIN_KEYS) continue;
      findings.push(
        `${helper.file}:${literal.line} ${literal.name} redeclares a shared contract (${literal.keys.join(", ")})`,
      );
    }
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
  const allowFiles = new Set(allowlist.map((entry) => entry.file));

  const helpers = [];
  for (const file of gitLsSourceFiles(HELPER_ROOTS, {
    extensions: [".ts", ".tsx"],
    exclude: [...allowFiles].map((entry) => new RegExp(escapeRegExp(entry))),
  })) {
    if (!isHelperPath(file)) continue;
    const literals = collectObjectLiterals(
      readFileSync(join(REPO_ROOT, file), "utf8"),
    );
    if (literals.length > 0) helpers.push({ file, literals });
  }

  const contractSets = collectContractKeySets();
  const literalCount = helpers.reduce((n, h) => n + h.literals.length, 0);
  const findings = findDuplicatedSchemas(helpers, contractSets);

  const summary =
    `${CHECK_NAME} compared ${literalCount} helper schema literal(s) across ` +
    `${helpers.length} helper file(s) against ${contractSets.size} contract key set(s).`;
  console.log(summary);

  reportFindingsAndExit(CHECK_NAME, findings, {
    extraMessage:
      `\n${summary}\nA helper that redeclares a wire contract is a second source of ` +
      "truth for it, and it drifts in the one direction tests cannot notice. Import " +
      "the schema from @workspace/types instead. If a loose read is genuinely " +
      "intended (for example a fallback across several response shapes), record " +
      "the reason in scripts/checks/allowlists/test-schema-duplication.json.",
  });
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}