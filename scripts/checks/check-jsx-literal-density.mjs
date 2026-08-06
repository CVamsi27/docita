#!/usr/bin/env node

/**
 * T1 (ratchet): JSX text-literal density in the two Vite apps (app, internal).
 *
 * Porting wraps user-facing text in t() calls via i18next. To keep the
 * migration a one-way ratchet (we never add new un-translated literals),
 * this check counts the current number of JSX text literals and
 * fails CI when the count grows.
 *
 * What counts as a "JSX text literal":
 *   - A non-whitespace, non-punctuation run of characters that sits between
 *     a closing tag edge `>` and the next `<` or `{` in a .tsx file.
 *   - Already-translated content (i.e. text wrapped in t(...)) is detected
 *     by a simple lexical scan and excluded.
 *
 * What does NOT count:
 *   - Whitespace-only runs.
 *   - Single-character runs (likely stray symbols that escaped detection).
 *   - JSX comments `{/* ... *\/}`.
 *   - JSX expressions `{...}`.
 *   - Lines inside string literals (we don't try to be a full parser; we
 *     strip lines dominated by `'` / `"` / `` ` `` strings).
 *
 * Baseline: committed at scripts/checks/baselines/jsx-literal-density.json.
 *   Regenerate via `--baseline` (writes the current count and exits 0).
 *
 * Usage:
 *   node scripts/checks/check-jsx-literal-density.mjs           # report only
 *   node scripts/checks/check-jsx-literal-density.mjs --enforce # fail on growth
 *   node scripts/checks/check-jsx-literal-density.mjs --baseline # write baseline
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { execFileSync } from "node:child_process";
import process from "node:process";

const REPO_ROOT = process.cwd();

const SCAN_ROOTS = [
  "apps/app/src/features",
  "apps/internal/src/features",
];

const EXCLUDE_PATTERNS = [
  /\.(test|spec)\.tsx?$/,
  /\.stories\.tsx?$/,
  /__tests__\//,
];

const BASELINE_PATH = join(
  REPO_ROOT,
  "scripts/checks/baselines/jsx-literal-density.json",
);

const T_FUNCTION_RE = /\bt\s*\(/;

/**
 * Count JSX text literals in a single .tsx file.
 *
 * The heuristic:
 *   1. Strip line and block comments so we don't count prose.
 *   2. For each line, scan for `>...<` or `>...{` runs. The text between
 *      `>` and the next opener (`<` or `{`) is a candidate literal.
 *   3. A run counts only if it has at least 2 non-whitespace chars and at
 *      least one letter (catches labels, sentences, button text).
 *   4. Lines that look like JSX prop strings (preceded by `=`, dominated by
 *      quotes, or inside import/export statements) are ignored.
 *   5. If the line is inside a t(...) call (already translated), skip it.
 */
export function countJsxLiteralsInSource(source) {
  // 1. Strip comments.
  const noBlock = source.replace(/\/\*[\s\S]*?\*\//g, "");
  const noLine = noBlock
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");

  let count = 0;
  let inTemplateString = false;
  let inImportBlock = false;

  for (const rawLine of noLine.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    // Track import / export from "..." blocks to skip prop strings.
    if (/^\s*import\b/.test(rawLine) || /^\s*export\s+.*from\b/.test(rawLine)) {
      inImportBlock = true;
    }
    if (inImportBlock) {
      if (/['"`]/.test(line)) {
        inImportBlock = false;
      }
      continue;
    }

    // Skip lines that are clearly attribute strings (after `=`, in quotes).
    if (/[='"`]/.test(line) && !/>/.test(line)) {
      continue;
    }

    // Skip lines that are pure JS expressions (start with `}` `{` or `return`).
    if (/^\s*[})]/.test(line) || /^\s*return\b/.test(line)) {
      continue;
    }

    // Skip lines that are inside a template string.
    const backticks = (line.match(/`/g) || []).length;
    if (backticks % 2 === 1) inTemplateString = !inTemplateString;
    if (inTemplateString) continue;

    // Skip already-translated lines.
    if (T_FUNCTION_RE.test(line)) continue;

    // Find all `>...<` and `>...{` candidates.
    const matches = line.matchAll(/>([^<{]+?)(?=<|\{)/g);
    for (const match of matches) {
      const text = match[1].trim();
      if (text.length < 2) continue;
      if (!/[A-Za-z]/.test(text)) continue;
      // Skip CSS / class fragments that happen to have a letter (e.g. `>h-full<`)
      // by requiring at least one space OR punctuation that looks like prose.
      // A short symbol run like "abc" alone is a real risk; we err on counting it.
      count += 1;
    }
  }

  return count;
}

function listTrackedFiles() {
  const all = SCAN_ROOTS.flatMap((root) =>
    execFileSync("git", ["ls-files", root], {
      cwd: REPO_ROOT,
      encoding: "utf8",
    })
      .split("\n")
      .filter(Boolean),
  );
  return all.filter(
    (file) =>
      file.endsWith(".tsx") &&
      !EXCLUDE_PATTERNS.some((pattern) => pattern.test(file)),
  );
}

function loadBaseline() {
  try {
    return JSON.parse(readFileSync(BASELINE_PATH, "utf8"));
  } catch {
    return null;
  }
}

function writeBaseline(count, perFile) {
  mkdirSync(dirname(BASELINE_PATH), { recursive: true });
  writeFileSync(
    BASELINE_PATH,
    JSON.stringify(
      {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        totalLiterals: count,
        perFile,
        note:
          "Auto-generated by scripts/checks/check-jsx-literal-density.mjs --baseline. " +
          "Do not edit by hand; re-run the check to refresh after intentional conversions.",
      },
      null,
      2,
    ) + "\n",
  );
}

function main() {
  const args = new Set(process.argv.slice(2));
  const enforce = args.has("--enforce");
  const regenBaseline = args.has("--baseline");

  const files = listTrackedFiles();
  const perFile = {};
  let total = 0;

  for (const file of files) {
    const source = readFileSync(join(REPO_ROOT, file), "utf8");
    const literals = countJsxLiteralsInSource(source);
    if (literals > 0) {
      perFile[file] = literals;
      total += literals;
    }
  }

  if (regenBaseline) {
    writeBaseline(total, perFile);
    console.log(
      `JSX literal density baseline written: total=${total} files=${Object.keys(perFile).length}`,
    );
    process.exit(0);
  }

  const baseline = loadBaseline();
  if (!baseline) {
    console.log(
      `JSX literal density check: no baseline at ${BASELINE_PATH} (relative to ${REPO_ROOT}).`,
    );
    console.log(
      `Current count: ${total} across ${Object.keys(perFile).length} files.`,
    );
    console.log(
      `Run \`node scripts/checks/check-jsx-literal-density.mjs --baseline\` to create one.`,
    );
    // No baseline → advisory (do not enforce on the first run).
    process.exit(0);
  }

  const baselineTotal = baseline.totalLiterals ?? 0;
  const drift = total - baselineTotal;
  const top = Object.entries(perFile)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([f, n]) => `  ${n.toString().padStart(4)} ${f}`)
    .join("\n");

  console.log(
    `JSX literal density: current=${total} baseline=${baselineTotal} drift=${drift} files=${Object.keys(perFile).length}`,
  );
  if (top) console.log(`Top 5 files:\n${top}`);

  if (drift > 0 && enforce) {
    console.error(
      `\nJSX literal density grew by ${drift} since the baseline.\n` +
        `Convert new user-facing strings through t() and re-run\n` +
        `\`node scripts/checks/check-jsx-literal-density.mjs --baseline\`\n` +
        `if the growth is intentional.`,
    );
    process.exit(1);
  }
  if (drift > 0) {
    console.warn(
      `\n[warning] JSX literal density grew by ${drift} since the baseline (use --enforce to fail).`,
    );
  }
}

main();
