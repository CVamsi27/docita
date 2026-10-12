#!/usr/bin/env node

/**
 * T1 (ratchet): JSX text-literal density in the two Vite apps (app, internal).
 *
 * Porting wraps user-facing text in t() calls via i18next. To keep the
 * migration a one-way ratchet (we never add new un-translated literals),
 * this check counts the current number of JSX text literals and
 * fails CI when the count grows.
 *
 * ## Why this is a scanner and not a parser
 *
 * It runs as a pre-commit hook on every push, so it must stay dependency-free
 * and fast. It therefore locates JSX text nodes structurally (a run of
 * characters between the end of an opening tag and the next tag or expression
 * opener) rather than line by line.
 *
 * The previous implementation scanned line by line, which meant it only ever
 * saw `>Text<` on a single line. Formatted JSX almost never looks like that:
 *
 *     <Button aria-label="Select any available doctor">
 *       Any doctor
 *     </Button>
 *
 * scored **zero**. That is not a rare shape, it is the shape prettier produces
 * for any button with an icon, and it meant the ratchet was blind to a large
 * part of the debt it claimed to be measuring. Counts are only meaningful if
 * the detector is verified against the shape it claims to cover, so
 * `standard-checks.test.mjs` exercises multi-line text, comments, strings and
 * generics directly.
 *
 * ## What counts as a "JSX text literal"
 *
 *   - A run of characters that is a direct child of a JSX element: it sits
 *     between the `>` that closes the opening tag and the next `<` or `{`.
 *   - At least two non-whitespace characters and at least one letter, so
 *     stray symbols (`·`, `+`, `→`) are not counted.
 *
 * ## What does NOT count
 *
 *   - Comments, string literals, template literals and regular expressions.
 *     Their contents are masked before scanning, which is both more accurate
 *     than the old quote heuristics and what makes `>` characters inside them
 *     harmless.
 *   - JSX comments `{/* ... *\/}` and expression containers `{...}`.
 *   - Already-translated text, which lives inside `t(...)` and is masked.
 *   - Text owned by a nested element: the scanner counts the parent's own
 *     text, and the child is visited in its own right.
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

/**
 * Characters after which a quote can only be starting a string literal.
 *
 * `>` is deliberately absent: after a closing tag bracket comes JSX *text*, so
 * `> Don't wait` must read as prose, not as the start of an unterminated
 * string. Arrow functions are handled separately by their two-character form.
 */
const STRING_PRECEDERS = new Set([
  "(", ",", "=", ":", "[", "{", ";", "+", "-", "*", "%", "!", "?", "&", "|", "^", "~",
]);

const REGEX_PRECEDERS = new Set([
  ...STRING_PRECEDERS,
  ">", "}",
]);

const KEYWORDS = new Set([
  "return", "case", "typeof", "new", "in", "of", "do", "else", "yield", "await",
  "void", "delete", "instanceof", "throw", "default",
]);

/** Index of the previous non-whitespace character, or -1. */
function previousSignificant(source, index) {
  let cursor = index - 1;
  while (cursor >= 0 && /\s/.test(source[cursor])) cursor -= 1;
  return cursor;
}

function followsKeyword(source, index) {
  const cursor = previousSignificant(source, index);
  if (cursor < 0) return true;
  const word = /[A-Za-z_$][\w$]*$/.exec(source.slice(0, cursor + 1))?.[0];
  return word ? KEYWORDS.has(word) : false;
}

/**
 * Does the quote at `index` open a string literal rather than sit inside JSX
 * text?
 *
 * Both conditions are needed. A code position alone misreads the apostrophe in
 * `Don't`, and an unclosed quote alone misreads `Doctor's` when another
 * apostrophe happens to share the line.
 */
function opensString(source, index) {
  const cursor = previousSignificant(source, index);
  if (cursor < 0) return true;
  if (cursor >= 1 && source.slice(cursor - 1, cursor + 1) === "=>") return true;
  if (STRING_PRECEDERS.has(source[cursor])) return true;
  if (source[cursor] === ">") return false;
  return followsKeyword(source, index);
}

/** Offset of the unescaped closing quote on this line, or -1. */
function closingQuoteOnLine(source, index, quote) {
  for (let cursor = index + 1; cursor < source.length; cursor += 1) {
    const character = source[cursor];
    if (character === "\n") return -1;
    if (character === "\\") {
      cursor += 1;
      continue;
    }
    if (character === quote) return cursor;
  }
  return -1;
}

/**
 * Replace the contents of comments, strings, template literals and regular
 * expressions with spaces, preserving length and line numbering.
 *
 * Masking rather than deleting keeps every offset in the source aligned with
 * the mask, so brace-depth tracking stays correct, and it removes the need for
 * the old import-block and quote heuristics entirely.
 */
function maskNonCode(source) {
  const out = source.split("");
  const blank = (from, to) => {
    for (let index = from; index < to && index < out.length; index += 1) {
      if (out[index] !== "\n") out[index] = " ";
    }
  };

  let index = 0;
  while (index < source.length) {
    const pair = source.slice(index, index + 2);
    const character = source[index];

    if (pair === "//") {
      const end = source.indexOf("\n", index);
      const stop = end === -1 ? source.length : end;
      blank(index, stop);
      index = stop;
      continue;
    }

    if (pair === "/*") {
      const end = source.indexOf("*/", index + 2);
      const stop = end === -1 ? source.length : end + 2;
      blank(index, stop);
      index = stop;
      continue;
    }

    if (character === '"' || character === "'") {
      const close = opensString(source, index)
        ? closingQuoteOnLine(source, index, character)
        : -1;
      if (close !== -1) {
        blank(index, close + 1);
        index = close + 1;
        continue;
      }
    }

    if (character === "`") {
      // Blank the whole template. Its `${` and `}` are blanked too, so brace
      // depth stays balanced for the JSX scan that follows.
      let cursor = index + 1;
      while (cursor < source.length && source[cursor] !== "`") {
        if (source[cursor] === "\\") cursor += 1;
        cursor += 1;
      }
      blank(index, cursor + 1);
      index = cursor + 1;
      continue;
    }

    if (character === "/") {
      const previous = previousSignificant(source, index);
      const canBeRegex =
        previous === -1 || REGEX_PRECEDERS.has(source[previous]) || followsKeyword(source, index);
      if (canBeRegex) {
        let cursor = index + 1;
        let inClass = false;
        let closed = false;
        while (cursor < source.length) {
          const current = source[cursor];
          if (current === "\\") {
            cursor += 2;
            continue;
          }
          // A regex literal never contains a `<`, so bailing out here means a
          // `</Tag>` can never be mistaken for the start of one and swallow
          // the rest of the element.
          if (current === "\n" || current === "<") break;
          if (current === "[") inClass = true;
          else if (current === "]") inClass = false;
          else if (current === "/" && !inClass) {
            closed = true;
            break;
          }
          cursor += 1;
        }
        if (closed) {
          while (cursor < source.length && /[a-z]/.test(source[cursor])) cursor += 1;
          blank(index, cursor);
          index = cursor;
          continue;
        }
      }
    }

    index += 1;
  }

  return out.join("");
}

/** Offset of the `>` that closes the opening tag beginning at `start`. */
function tagCloseIndex(masked, start) {
  let depth = 0;
  for (let index = start; index < masked.length; index += 1) {
    const character = masked[index];
    if (character === "{" || character === "(" || character === "[") depth += 1;
    else if (character === "}" || character === ")" || character === "]") depth -= 1;
    else if (character === ">" && depth === 0) return index;
  }
  return -1;
}

/** Offset of the next `<` or `{` that ends a JSX text run. */
function textRunEnd(masked, start) {
  let depth = 0;
  for (let index = start; index < masked.length; index += 1) {
    const character = masked[index];
    if (depth === 0 && (character === "<" || character === "{")) return index;
    // Only braces matter here: in JSX text a parenthesis is an ordinary
    // character, and treating it as a group swallows everything after an
    // unbalanced one such as "Cost (approx. Rs 500".
    if (character === "{") depth += 1;
    else if (character === "}") depth -= 1;
  }
  return -1;
}

/** Characters after which a `<` opens a JSX element rather than a type argument. */
const JSX_PRECEDERS = new Set([
  "(", "{", ">", "=", ",", ":", "[", "?", "&", "|", ";", "!", "+", "-", "*", "%",
]);

/**
 * Return the JSX text literals in a single .tsx source.
 *
 * Distinguishing JSX from TypeScript generics by looking only at the character
 * before `<` is not enough: a nested tag is preceded by the last letter of the
 * text above it ("Doctor\n  <span>"), which is indistinguishable from
 * `useRef<HTMLDivElement>(null)`. So the scan tracks JSX nesting depth, and a
 * tag is only considered generic syntax when it appears outside any element.
 */
export function findJsxTextLiterals(source) {
  const masked = maskNonCode(source);
  const literals = [];
  let depth = 0;

  let cursor = 0;
  while (cursor < masked.length) {
    const start = masked.indexOf("<", cursor);
    if (start === -1) break;

    // A closing tag, named or a fragment, ends the element the scan is inside.
    // Missing this is not cosmetic: without it the depth never returns to zero
    // and every TypeScript declaration after the first JSX element is read as
    // JSX text.
    if (masked[start + 1] === "/") {
      if (depth > 0) depth -= 1;
      cursor = start + 2;
      continue;
    }

    if (masked[start + 1] === ">") {
      depth += 1;
      cursor = start + 2;
      continue;
    }

    const tag = /^<([A-Za-z][\w.]*)(?=[\s/>])/.exec(masked.slice(start));
    if (!tag) {
      cursor = start + 1;
      continue;
    }

    const previous = start === 0 ? -1 : previousSignificant(masked, start);
    const opensJsx =
      depth > 0 ||
      previous === -1 ||
      JSX_PRECEDERS.has(masked[previous]) ||
      (masked[previous] === ">" &&
        masked.slice(Math.max(0, previous - 1), previous + 1) === "=>") ||
      followsKeyword(masked, start);
    if (!opensJsx) {
      cursor = start + 1;
      continue;
    }

    const close = tagCloseIndex(masked, start);
    if (close === -1) break;
    const selfClosing = masked[close - 1] === "/";
    if (!selfClosing) depth += 1;
    cursor = close + 1;
    if (selfClosing) continue;

    const end = textRunEnd(masked, cursor);
    if (end === -1) break;
    const text = masked.slice(cursor, end).trim();
    if (text.length >= 2 && /[A-Za-z]/.test(text)) literals.push(text);
    // Resume at the opener; its tag or expression is scanned on the next pass.
    cursor = end;
  }

  return literals;
}

/** Count the JSX text literals in a single .tsx file. */
export function countJsxLiteralsInSource(source) {
  return findJsxTextLiterals(source).length;
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
  const previous = loadBaseline();
  const schemaChanged = (previous?.schemaVersion ?? 0) !== 2;
  const note = schemaChanged
    ? "Auto-generated by scripts/checks/check-jsx-literal-density.mjs --baseline. " +
      "Do not edit by hand; re-run the check to refresh after intentional conversions. " +
      `Schema 2 counts multi-line JSX text; the previous schema only counted single-line ` +
      `\`>Text<\` runs and reported ${previous?.totalLiterals ?? "an unknown number of"} literals, ` +
      "so this baseline is a detector change, not new debt."
    : "Auto-generated by scripts/checks/check-jsx-literal-density.mjs --baseline. " +
      "Do not edit by hand; re-run the check to refresh after intentional conversions. " +
      `Refreshed at ${previous?.totalLiterals ?? "n/a"} literals from the previous baseline ` +
      "after converting existing strings through t().";
  writeFileSync(
    BASELINE_PATH,
    JSON.stringify(
      {
        schemaVersion: 2,
        generatedAt: new Date().toISOString(),
        totalLiterals: count,
        perFile,
        note,
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
    // No baseline -> advisory (do not enforce on the first run).
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
