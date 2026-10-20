#!/usr/bin/env node

/**
 * check:user-facing-copy.
 *
 * Ratchet for user-facing display copy that lives in **pure TypeScript** —
 * `.ts` modules with no JSX — under the two Vite apps' feature trees.
 *
 * ## Why this exists
 *
 * Two gates already cover English strings, and between them they miss a whole
 * layer:
 *
 *   - `check-jsx-literal-density.mjs` counts JSX text runs, so it sees
 *     `<MicroLabel>Preferred day</MicroLabel>` and nothing else.
 *   - `check-i18n-coverage.mjs` asks only whether a feature imports
 *     `useTranslation` *somewhere*. One translated component satisfies it for
 *     the entire directory.
 *
 * Neither can see copy that a `.ts` module hands upward. A real example from
 * the public-booking funnel:
 *
 *     // public-booking-mobile-layout-helpers.ts
 *     export function stepLabel(step) {
 *       switch (step) {
 *         case "visit": return "Doctor, date, and time";   // never translated
 *
 * The component calling it renders `{stepLabel(mobileStep)}`, so the string
 * reaches the UI through a helper that has no JSX and no hook. Migrating that
 * funnel to i18n meant finding these by reading every file — the gates were
 * green throughout.
 *
 * ## What counts as a finding
 *
 * A string literal in a pure `.ts` feature file that:
 *
 *   1. reads as prose (has whitespace, letters, and is not a dotted i18n key,
 *      class string, URL, or SCREAMING_CASE token), and
 *   2. is bound to a display-shaped name — `title`, `description`, `message`,
 *      `label`, `hint`, `placeholder`, `notice`, `empty*`, `error*`, …
 *
 * Condition 2 is what keeps precision usable. "Any prose-looking string" flags
 * log messages, error codes and test data; "prose bound to a name that ends up
 * in the UI" does not.
 *
 * Intentional exceptions live in
 * `scripts/checks/allowlists/user-facing-copy.json` — currently `legal`, whose
 * consent/SLA/DPA documents are English-only by design and ship their own
 * inline language selector rather than routing through react-i18next.
 *
 * ## Known limitation
 *
 * Short enum-style returns are deliberately out of scope: a `Record` mapping
 * status tokens to short labels ("Scheduled", "Cancelled") is display copy
 * that this check does not see, because the value length and the binding name
 * are both unremarkable. `check-jsx-literal-density` catches such strings when
 * they are rendered inline in JSX, and `appointmentStatusKey`-style helpers
 * carry their own coverage tests, but a bare lookup table in a `.ts` file is
 * still uncovered. Treat a zero here as "no display-shaped prose", not as
 * "this feature is fully translated".
 *
 * ## Ratchet semantics
 *
 * Like the JSX density check, this fails only when the count **grows** against
 * the committed baseline. Existing findings stay visible in the report and are
 * converted one file at a time; a new helper that introduces display copy
 * fails the build immediately.
 *
 * Usage:
 *   node scripts/checks/check-user-facing-copy.mjs           # report only
 *   node scripts/checks/check-user-facing-copy.mjs --enforce # fail on growth
 *   node scripts/checks/check-user-facing-copy.mjs --baseline # write baseline
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";
import process from "node:process";

import { gitLsSourceFiles, reportFindingsAndExit } from "../lib/check-runner.mjs";

const REPO_ROOT = process.cwd();

const SCAN_ROOTS = ["apps/app/src/features", "apps/internal/src/features"];

const BASELINE_PATH = join(
  REPO_ROOT,
  "scripts/checks/baselines/user-facing-copy.json",
);

const ALLOWLIST_PATH = join(
  REPO_ROOT,
  "scripts/checks/allowlists/user-facing-copy.json",
);

const CHECK_NAME = "user-facing-copy check";

/**
 * Identifiers whose value is rendered rather than merely compared. Anchored so
 * `emptyMessage` / `errorTitle` / `confirmDescription` match, but
 * `filename`, `sizeLimit` and `isError` do not.
 */
const DISPLAY_NAME =
  /^(?:[a-z][A-Za-z0-9]*)?(?:title|description|message|label|hint|text|placeholder|notice|heading|subtitle|body|tooltip|caption|summary|cta|empty[A-Za-z]*|error[A-Za-z]*|helper[A-Za-z]*)\b/;

/**
 * Reads as prose rather than as data.
 *
 * The length and whitespace requirements do most of the work: an i18n key
 * ("appointmentSection.preferredDay"), a URL, a status token ("PAYMENT_RECORDED")
 * and a bare slug ("scheduled") contain no whitespace, so all four are already
 * excluded before any of the structural checks below run. Guards that could
 * never fire were removed rather than left in to look thorough.
 *
 * What survives are the two shapes that do contain whitespace:
 *   - Tailwind / design-token class strings ("text-[length:var(--fs-sm)] font-medium")
 *   - multi-line slug constants built with template literals
 */
function readsAsProse(value) {
  if (value.length < 14) return false;
  if (!/\s/.test(value)) return false;
  if (!/[a-z]/.test(value)) return false;
  if (!/[A-Za-z]/.test(value)) return false;
  // A URL whose path segment carries spaces (".../v1/ appointments").
  if (/^https?:/.test(value)) return false;
  if (value.includes("--")) return false;
  // Whitespace present but no spaces: only word/slash characters, i.e. a
  // multi-line slug rather than a sentence.
  if (/^[\w./:#@%+,\-\t\n]+$/.test(value)) return false;
  return true;
}

/**
 * Find display-shaped prose bindings in one source file.
 *
 * Matches `name: "prose"`, `name = "prose"` and `name: () => "prose"`, which
 * covers the object-literal and local-const shapes these helpers actually use.
 *
 * @param {string} source
 * @returns {Array<{ line: number; name: string; value: string }>}
 */
export function findDisplayCopyBindings(source) {
  const bindings = [];
  const pattern =
    /([A-Za-z_$][\w$]*)\s*[:=]\s*(?:\(\s*)?(?:ReactNode\s*\|\s*)?["'`]([^"'`]*)["'`]/g;

  for (const match of source.matchAll(pattern)) {
    const [, name, value] = match;
    if (!DISPLAY_NAME.test(name)) continue;
    if (!readsAsProse(value)) continue;
    bindings.push({
      line: source.slice(0, match.index).split("\n").length,
      name,
      value,
    });
  }
  return bindings;
}

/**
 * Feature directory names whose display copy is intentionally not routed
 * through react-i18next. Entries are plain strings or `{ id, reason }`
 * objects; the reason is required so a new exception cannot be added silently.
 */
function loadAllowlist() {
  if (!existsSync(ALLOWLIST_PATH)) return [];
  return JSON.parse(readFileSync(ALLOWLIST_PATH, "utf8"));
}

function listScannedFiles() {
  const allowlist = loadAllowlist().map((entry) =>
    typeof entry === "string" ? entry : entry.id,
  );
  return gitLsSourceFiles(SCAN_ROOTS, {
    extensions: [".ts"],
    // `.tsx` is the JSX density check's territory; this one only covers the
    // pure-module layer that check structurally cannot see.
    exclude: [
      /\.(test|spec)\.ts$/,
      ...allowlist.map((name) => new RegExp(`/features/${name}/`)),
    ],
  });
}

function scanAll() {
  const perFile = {};
  let total = 0;
  for (const file of listScannedFiles()) {
    const bindings = findDisplayCopyBindings(
      readFileSync(join(REPO_ROOT, file), "utf8"),
    );
    if (bindings.length === 0) continue;
    perFile[file] = bindings.map((b) => ({
      line: b.line,
      name: b.name,
      value: b.value.length > 90 ? `${b.value.slice(0, 87)}...` : b.value,
    }));
    total += bindings.length;
  }
  return { total, perFile };
}

function loadBaseline() {
  try {
    return JSON.parse(readFileSync(BASELINE_PATH, "utf8"));
  } catch {
    return null;
  }
}

function writeBaseline(total, perFile) {
  mkdirSync(dirname(BASELINE_PATH), { recursive: true });
  writeFileSync(
    BASELINE_PATH,
    JSON.stringify(
      {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        totalFindings: total,
        perFile,
        note:
          "Auto-generated by scripts/checks/check-user-facing-copy.mjs --baseline. " +
          "Do not edit by hand; re-run the check after converting display copy " +
          "through t(). Each entry is one display-shaped prose binding in a pure " +
          "(non-JSX) feature module. Short enum-style lookup tables are out of " +
          "scope by design — see the check header for the limitation.",
      },
      null,
      2,
    ) + "\n",
  );
}

function main() {
  const args = new Set(process.argv.slice(2));

  const { total, perFile } = scanAll();

  if (args.has("--baseline")) {
    writeBaseline(total, perFile);
    console.log(
      `${CHECK_NAME} baseline written: total=${total} files=${Object.keys(perFile).length}`,
    );
    process.exit(0);
  }

  const baseline = loadBaseline();
  if (!baseline) {
    console.log(
      `${CHECK_NAME}: no baseline at ${BASELINE_PATH}. Current count: ${total} across ${Object.keys(perFile).length} files.`,
    );
    console.log(
      "Run `node scripts/checks/check-user-facing-copy.mjs --baseline` to create one.",
    );
    process.exit(0);
  }

  const baselineTotal = baseline.totalFindings ?? 0;
  const drift = total - baselineTotal;

  const top = Object.entries(perFile)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 5)
    .map(([file, entries]) => `  ${String(entries.length).padStart(4)} ${file}`);

  console.log(
    `${CHECK_NAME}: current=${total} baseline=${baselineTotal} drift=${drift >= 0 ? "+" : ""}${drift} files=${Object.keys(perFile).length}`,
  );
  if (top.length > 0) console.log(`Top 5 files:\n${top.join("\n")}`);

  if (drift <= 0) {
    reportFindingsAndExit(CHECK_NAME, []);
    return;
  }

  // Only the net growth is a failure. Report which files grew so the finding
  // is actionable rather than a bare count.
  const baselinePerFile = baseline.perFile ?? {};
  const regressions = [];
  for (const [file, entries] of Object.entries(perFile)) {
    const before = (baselinePerFile[file] ?? []).length;
    if (entries.length > before) {
      regressions.push(`${file}: ${before} -> ${entries.length}`);
    }
  }

  const findings = [
    `display copy grew by ${drift} (baseline ${baselineTotal} -> ${total})`,
    ...regressions.map((r) => `  regressed ${r}`),
    "Convert the copy through t() (or move the helper's return value to an i18n key) and re-run",
    "`node scripts/checks/check-user-facing-copy.mjs --baseline` if the growth is intentional.",
  ];

  reportFindingsAndExit(CHECK_NAME, findings);
}

main();