#!/usr/bin/env node

/**
 * check:enum-map-drift.
 *
 * Guards the casing / key-set mismatch class that produces silently wrong UI.
 *
 * ## Why this exists
 *
 * A display map keyed off a wire enum only works if the map's keys are spelled
 * exactly the way the server sends them. When they drift, nothing throws: the
 * lookup misses and the surface falls back to a neutral style or, worse, leaks
 * a raw token. Three real instances shipped:
 *
 *   1. `LabsTab.STATUS_VARIANT` keyed `COLLECTED` and `IN_PROGRESS`. The API
 *      sends `SAMPLE_COLLECTED`, and has no `IN_PROGRESS` at all (that is an
 *      *appointment* status), so `SAMPLE_COLLECTED`, `PENDING` and
 *      `RESULT_READY` all rendered as neutral `outline`.
 *   2. `LabTestsOrders` compared `test.status === "completed"` against a
 *      UPPER_SNAKE enum, so the "View Results" action never appeared on a
 *      completed order.
 *   3. `admins-page` carried `admin` *and* `ADMIN` (plus `admin_doctor` /
 *      `ADMIN_DOCTOR`) in parallel maps — a band-aid applied after a casing
 *      bug rather than a fix, which hid the drift from every later reader.
 *
 * ## What counts as a finding
 *
 * A map literal that is *explicitly annotated* `Record<...>`, whose keys are
 * **all** UPPER_SNAKE, and at least one key is not a member of any enum in
 * `packages/db/prisma/schema.prisma`.
 *
 * Each condition earns its place:
 *
 *   - the explicit `Record<...>` annotation is what makes the map a lookup
 *     table; an inferred object literal is a plain value, not an enum map.
 *   - requiring *all* keys to be UPPER_SNAKE skips the large population of
 *     camelCase/kebab maps (`searchResultRoutes`, `appQueryKeys`, REST client
 *     objects) that are not enum tables at all. Without this the check reports
 *     dozens of false positives.
 *   - the membership test is the actual bug condition.
 *
 * Against the current tree this selects 25 maps and flags exactly one
 * (`LabsTab`'s, now fixed). A measured baseline, not a guess.
 *
 * ## Known limitation
 *
 * Normalizing maps are intentionally *not* flagged. `map-portal-status.ts`
 * keys `CHECKED_IN`, which is not a Prisma enum member, but that is correct:
 * the wire sends lowercase-kebab and the map normalizes to UPPER_SNAKE before
 * lookup. Such entries are documented in
 * `scripts/checks/allowlists/enum-map-drift.json`.
 *
 * This check is a backstop for the *map* half of the class. The stronger fix
 * is to type the map key as the enum union so drift is a type error — see
 * `labs-tab-status.ts` — and to stop declaring loose `z.string()` status
 * fields, which is what let the drift compile at all.
 *
 * Usage:
 *   node scripts/checks/check-enum-map-drift.mjs           # report only
 *   node scripts/checks/check-enum-map-drift.mjs --enforce # fail on findings
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import process from "node:process";

import { gitLsSourceFiles, reportFindingsAndExit } from "../lib/check-runner.mjs";

const REPO_ROOT = process.cwd();
const SCAN_ROOTS = ["apps/app/src", "apps/internal/src"];
const SCHEMA_PATH = join(REPO_ROOT, "packages/db/prisma/schema.prisma");
const ALLOWLIST_PATH = join(
  REPO_ROOT,
  "scripts/checks/allowlists/enum-map-drift.json",
);
const CHECK_NAME = "enum-map-drift check";

/** Every member of every enum declared in the Prisma schema. */
export function collectPrismaEnumMembers(schemaSource) {
  const members = new Set();
  const blockPattern = /enum\s+[A-Za-z_$][\w$]*\s*\{([^}]*)\}/g;
  for (const match of schemaSource.matchAll(blockPattern)) {
    for (const rawLine of match[1].split("\n")) {
      const line = rawLine.trim();
      if (!line || line.startsWith("//") || line.startsWith("@@")) continue;
      // Strip a trailing attribute/value so `ORDERED @default(QUEUED)` and
      // `ORDERED` both contribute `ORDERED`.
      const token = line.split(/\s/)[0];
      if (token) members.add(token);
    }
  }
  return members;
}

/** UPPER_SNAKE_CASE token, e.g. `SAMPLE_COLLECTED` or `ADMIN_DOCTOR`. */
const UPPER_SNAKE = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/;

/**
 * Map declarations annotated with an explicit `Record<...>` and whose body is
 * an object literal with UPPER_SNAKE keys throughout.
 *
 * @param {string} source
 * @returns {Array<{ name: string; line: number; keys: string[] }>}
 */
export function findUpperSnakeRecordMaps(source) {
  const maps = [];
  const declPattern =
    /(?:const|let)\s+([A-Za-z_$][\w$]*)\s*(?::\s*Record<[^;]*?>)?\s*=\s*\{/g;

  for (const decl of source.matchAll(declPattern)) {
    const annotation = decl[0].slice(0, decl[0].indexOf("="));
    // An explicit `Record<...>` annotation is what marks this as a lookup
    // table. An inferred literal is a plain value and is out of scope.
    if (!/:\s*Record</.test(annotation)) continue;

    const bodyStart = decl.index + decl[0].length - 1;
    let depth = 0;
    let bodyEnd = -1;
    for (let i = bodyStart; i < source.length; i += 1) {
      const char = source[i];
      if (char === "{") depth += 1;
      else if (char === "}") {
        depth -= 1;
        if (depth === 0) {
          bodyEnd = i;
          break;
        }
      }
    }
    if (bodyEnd === -1) continue;

    const body = source.slice(bodyStart + 1, bodyEnd);
    const keys = [...body.matchAll(/^\s{2}([A-Za-z_$][\w$]*)\s*:/gm)].map(
      (m) => m[1],
    );
    // Require *every* key to be UPPER_SNAKE; a single camelCase key means
    // this is not an enum table.
    if (keys.length === 0 || !keys.every((key) => UPPER_SNAKE.test(key))) {
      continue;
    }
    maps.push({
      name: decl[1],
      line: source.slice(0, decl.index).split("\n").length,
      keys,
    });
  }
  return maps;
}

/**
 * @param {string} source
 * @param {Set<string>} enumMembers
 * @returns {Array<{ map: string; line: number; key: string }>}
 */
export function findDriftedKeys(source, enumMembers) {
  const drifted = [];
  for (const map of findUpperSnakeRecordMaps(source)) {
    for (const key of map.keys) {
      if (!enumMembers.has(key)) {
        drifted.push({ map: map.name, line: map.line, key });
      }
    }
  }
  return drifted;
}

function loadAllowlist() {
  if (!existsSync(ALLOWLIST_PATH)) return [];
  return JSON.parse(readFileSync(ALLOWLIST_PATH, "utf8"));
}

/** How many maps the rule actually selects, for the report's context line. */
function countMaps(files) {
  let count = 0;
  for (const file of files) {
    count += findUpperSnakeRecordMaps(
      readFileSync(join(REPO_ROOT, file), "utf8"),
    ).length;
  }
  return count;
}

function listScannedFiles(allowlist) {
  return gitLsSourceFiles(SCAN_ROOTS, {
    extensions: [".ts", ".tsx"],
    exclude: [
      /\.(test|spec|stories)\.[tj]sx?$/,
      ...allowlist.map((entry) => new RegExp(entry.file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))),
    ],
  });
}

function main() {
  if (!existsSync(SCHEMA_PATH)) {
    process.stderr.write(
      `${CHECK_NAME}: schema not found at ${SCHEMA_PATH}\n`,
    );
    process.exit(1);
  }

  const allowlist = loadAllowlist();
  const enumMembers = collectPrismaEnumMembers(readFileSync(SCHEMA_PATH, "utf8"));
  const findings = [];
  let mapsScanned = 0;

  for (const file of listScannedFiles(allowlist)) {
    const drifted = findDriftedKeys(
      readFileSync(join(REPO_ROOT, file), "utf8"),
      enumMembers,
    );
    if (drifted.length === 0) continue;
    for (const d of drifted) {
      findings.push(`${file}:${d.line} ${d.map} — "${d.key}" is not a Prisma enum member`);
    }
  }
  mapsScanned = countMaps(listScannedFiles(allowlist));

  reportFindingsAndExit(CHECK_NAME, findings, {
    extraMessage:
      `\n${CHECK_NAME} inspected ${mapsScanned} UPPER_SNAKE Record<> map(s). ` +
      "Every key must be a member of a Prisma enum. Prefer typing the map key as " +
      "the enum union from packages/types so drift is a compile error (see " +
      "labs-tab-status.ts). Normalizing maps are documented in " +
      "scripts/checks/allowlists/enum-map-drift.json.",
  });
}

// Only run the scan when executed directly. Without this guard the unit test
// importing the exported helpers would trigger the scan on import, and
// `reportFindingsAndExit` would call `process.exit()` mid-suite — silently
// reducing 15 tests to one and making every assertion vacuous.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
