#!/usr/bin/env node

/**
 * check:placeholder-clinic-scope.
 *
 * Flags client code that sends a placeholder word where a clinic id belongs.
 *
 * ## Why this exists
 *
 * One instance shipped, and it took the whole compliance surface down silently:
 *
 *   const clinicId = "current";
 *   getSummary: <T>() => api.get<T>(`/clinics/current/compliance`),
 *
 * `ClinicsComplianceController` is `@Get(':id/compliance')`, and it resolves
 * that id with `assertOwnClinic`, which compares it against `req.user.clinicId`.
 * The literal "current" matches no clinic, so every request answered 403 — for
 * every user, always. The panel rendered as permanently empty and reported no
 * error to the clinician. There is no `"current"` alias on the server and no
 * rewrite on the client; the id has to be a real one.
 *
 * `check:unserved-endpoint` cannot see this class: it treats a dynamic segment
 * as matching any route segment, so `:id` happily matched `current` and the
 * path looked served. The route was served. The request was still refused.
 *
 * ## What it flags
 *
 * Two rules, because either one alone misses real cases:
 *
 *   1. `placeholder-clinic-path` — a `/`-prefixed literal inside a recognized
 *      API helper whose path contains a `/clinics/<placeholder>` segment.
 *   2. `placeholder-clinic-binding` — an identifier containing "clinic" bound
 *      to a placeholder literal. This catches the case the path rule cannot
 *      see: the id interpolated into a path (`/clinics/${clinicId}/compliance`)
 *      or passed to a helper that builds the path itself.
 *
 * Placeholders are the words people reach for when the real value is not at
 * hand: current, me, self, my, mine, default.
 *
 * ## Known limitations (measured, not assumed)
 *
 * - Only string literals inside recognized API helpers are read. A path passed
 *   through a variable built elsewhere is rule 1's blind spot; rule 2 covers it
 *   only when the identifier says "clinic".
 * - Rule 2 keys on the identifier containing "clinic". A placeholder bound to
 *   `id` and interpolated into a clinics path is not detected.
 * - A legitimately-scoped placeholder cannot be proven at this layer, which is
 *   what the allowlist is for.
 *
 * Genuine exceptions live in
 * 'scripts/checks/allowlists/placeholder-clinic-scope.json' with a reason.
 *
 * Usage:
 *   node scripts/checks/check-placeholder-clinic-scope.mjs           # report only
 *   node scripts/checks/check-placeholder-clinic-scope.mjs --enforce # fail on findings
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
import { collectApiCalls } from "./check-unserved-endpoint.mjs";

const REPO_ROOT = process.cwd();
const CLIENT_ROOTS = [
  "apps/app/src",
  "apps/app/e2e",
  "apps/internal/src",
  "packages/data-access/src",
];
const ALLOWLIST_PATH = join(
  REPO_ROOT,
  "scripts/checks/allowlists/placeholder-clinic-scope.json",
);
const CHECK_NAME = "placeholder-clinic-scope check";

/**
 * Words that stand in for a clinic id. Kept short on purpose: a wider list buys
 * no real coverage and starts reporting ordinary English.
 */
export const PLACEHOLDER_CLINIC_VALUES = [
  "current",
  "me",
  "self",
  "my",
  "mine",
  "default",
];

const PLACEHOLDER_SET = new Set(PLACEHOLDER_CLINIC_VALUES);

/**
 * `/clinics/<placeholder>` as a whole path segment.
 *
 * Anchored on segment boundaries so `currentPatient` and `clinicId` are not
 * reported; only the bare word between slashes counts.
 */
const PLACEHOLDER_PATH = new RegExp(
  `(?:^|/)clinics/(${PLACEHOLDER_CLINIC_VALUES.join("|")})(?=/|$|\\?)`,
);

/**
 * `const clinicId = "current"` and friends.
 *
 * The `clinic` requirement on the identifier is what keeps this from flagging
 * `const active = "current"` in unrelated code.
 */
const PLACEHOLDER_BINDING =
  /\b(?:const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*(?::[^=]+?)?=\s*["']([A-Za-z]+)["']/g;

/**
 * Placeholder clinic segments in API call paths.
 *
 * @param {string} source - file source, comments already blanked
 * @returns {Array<{ rule: string; detail: string; line: number }>}
 */
export function findPlaceholderClinicPaths(source) {
  const findings = [];
  for (const call of collectApiCalls(source)) {
    const match = PLACEHOLDER_PATH.exec(call.path);
    if (!match) continue;
    findings.push({
      rule: "placeholder-clinic-path",
      detail: `${call.path} sends the literal "${match[1]}" as a clinic id; the server resolves :id against req.user.clinicId and will answer 403`,
      line: call.line,
    });
  }
  return findings;
}

/**
 * Placeholder literals bound to a clinic-scoped identifier.
 *
 * @param {string} source - file source, comments already blanked
 * @returns {Array<{ rule: string; detail: string; line: number }>}
 */
export function findPlaceholderClinicBindings(source) {
  const findings = [];
  const pattern = new RegExp(PLACEHOLDER_BINDING.source, "g");
  let match;
  while ((match = pattern.exec(source)) !== null) {
    const [, name, value] = match;
    if (!/clinic/i.test(name) || !PLACEHOLDER_SET.has(value)) continue;
    findings.push({
      rule: "placeholder-clinic-binding",
      detail: `${name} = "${value}" — a placeholder clinic id; take the real id from the session instead`,
      line: source.slice(0, match.index).split("\n").length,
    });
  }
  return findings;
}

function readAllowlist() {
  if (!existsSync(ALLOWLIST_PATH)) return [];
  const entries = JSON.parse(readFileSync(ALLOWLIST_PATH, "utf8"));
  return Array.isArray(entries) ? entries : [];
}

export function main() {
  const files = gitLsSourceFiles(CLIENT_ROOTS, {
    extensions: ["ts", "tsx"],
    exclude: [/\.test\.[tj]sx?$/, /\.spec\.[tj]sx?$/, /\.d\.ts$/],
  });
  const allowlist = readAllowlist();

  const findings = [];
  let callsScanned = 0;
  let bindingsScanned = 0;

  for (const file of files) {
    const raw = readFileSync(file, "utf8");
    const source = blankJsComments(raw);
    if (!source.trim()) continue;

    callsScanned += collectApiCalls(source).length;
    bindingsScanned += (source.match(PLACEHOLDER_BINDING) || []).length;

    for (const finding of [
      ...findPlaceholderClinicPaths(source),
      ...findPlaceholderClinicBindings(source),
    ]) {
      if (allowlist.some((entry) => entry.file === file)) continue;
      findings.push(
        `${file}:${finding.line}  [${finding.rule}] ${finding.detail}`,
      );
    }
  }

  // Printed on every run so a green result carries its own evidence: a check
  // that silently scanned nothing would also "pass".
  console.log(
    `${CHECK_NAME} scanned ${files.length} client file(s), ` +
      `${callsScanned} API call(s) and ${bindingsScanned} declaration(s); ` +
      `${findings.length} finding(s).`,
  );

  reportFindingsAndExit(CHECK_NAME, findings, {
    extraMessage:
      `\n${CHECK_NAME} scanned ${files.length} client file(s) for a placeholder ` +
      "standing in for a clinic id. Such a request matches the route — the " +
      "route is real — and is still refused with 403 by assertOwnClinic, so " +
      "the page renders empty with no error. Read the id from the session " +
      "(useAuth().user.clinicId). If a placeholder is genuinely correct, " +
      "record it in scripts/checks/allowlists/placeholder-clinic-scope.json.",
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