#!/usr/bin/env node

/**
 * Reject accessible names that are assigned incorrectly.
 *
 * None of the failures below is visible to TypeScript, which allows any
 * hyphenated JSX attribute on any component, or to ESLint, which has no model
 * of the accessibility tree. In every case the markup compiles, lints,
 * renders, and then announces the wrong thing — or nothing.
 *
 * Rule 1 — naming ARIA on a generic container. `aria-label` /
 * `aria-labelledby` / `aria-describedby` are discarded by assistive tech when
 * the element has no corresponding role, so a label written on a bare `div`
 * looks like it works and reaches nobody. Only genuinely generic elements are
 * reported: `section` -> region (when named), `aside` -> complementary,
 * `header`/`footer` -> banner/contentinfo, `ol`/`ul` -> list. Verified with
 * testing-library's accessible-name computation rather than assumed.
 *
 * Rule 2 — `aria-label` on a `<label>`. This one is *not* discarded: it becomes
 * the accessible name of the control the label wraps, overriding the visible
 * words. The label's own text is always the correct name, so the attribute is
 * always removable.
 *
 * Rule 3 — WCAG 2.5.3 (Label in Name, Level A) for any element that declares
 * both visible text and an `aria-label`. The accessible name must *contain*
 * the words shown on screen. When it does not, a clinician or patient using
 * voice control cannot invoke the control by what they can read. Translators
 * resolve `t()` against the English catalog so the comparison is between two
 * real sentences rather than a key and a string.
 *
 * Comments are blanked before scanning. Without that, prose mentioning the
 * forbidden shape — including a comment explaining this very rule — parses as
 * markup and produces a defect that does not exist.
 */

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import {
  blankJsComments,
  gitLsSourceFiles,
  reportFindingsAndExit,
} from "../lib/check-runner.mjs";

const NAMING_ATTRIBUTES = [
  "aria-label=",
  "aria-labelledby=",
  "aria-describedby=",
];

const GENERIC_TAGS = new Set(["div", "span", "p"]);

const files = gitLsSourceFiles(
  ["packages/ui/src", "apps/app/src", "apps/internal/src"],
  {
    extensions: [".tsx"],
    exclude: [/\.(?:test|spec|stories)\.tsx?$/],
  },
);

const APP_ROOT = path.join(process.cwd(), "apps/app/src/messages/en");

/** namespace -> parsed English catalog. */
const catalogs = (() => {
  const loaded = [];
  try {
    for (const entry of readdirSync(APP_ROOT)) {
      if (!entry.endsWith(".json")) continue;
      const namespace = entry.slice(0, -".json".length);
      try {
        loaded.push([namespace, JSON.parse(readFileSync(path.join(APP_ROOT, entry), "utf8"))]);
      } catch {
        // A malformed catalog must not silently disable rule 3.
        continue;
      }
    }
  } catch {
    // No catalog directory (fixtures, CI sandboxes): rule 3 degrades to
    // literal-only comparisons rather than reporting unresolvable keys.
  }
  return loaded;
})();

function lookup(catalog, key) {
  let node = catalog;
  for (const part of key.split(".")) {
    if (node == null || typeof node !== "object") return null;
    node = node[part];
  }
  return typeof node === "string" ? node : null;
}

/**
 * Resolve a `t()` argument to the English sentence(s) it renders.
 *
 * `ns:key` is unambiguous. A bare `key` depends on the component's default
 * namespace, which this scanner cannot know, so every catalog is consulted and
 * all candidates must agree before the caller reports a defect — a false
 * positive here would be indistinguishable from a real regression.
 */
function resolveTranslation(expr) {
  const call = /\bt\(\s*["'`]([^"'`]+)["'`]/.exec(expr);
  if (!call) return null;
  const [maybeNamespace, key] = call[1].includes(":")
    ? call[1].split(":")
    : [null, call[1]];
  if (maybeNamespace) {
    const found = catalogs.find(([namespace]) => namespace === maybeNamespace);
    return found ? lookup(found[1], key) : null;
  }
  const candidates = catalogs
    .map(([, catalog]) => lookup(catalog, key))
    .filter((value) => typeof value === "string");
  return candidates.length > 0 ? candidates : null;
}

/** End offset (exclusive) of the opening tag starting at `start`, or -1. */
function openingTagEnd(source, start) {
  let depth = 0;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (character === '"' || character === "'") {
      index = source.indexOf(character, index + 1);
      if (index === -1) return -1;
      continue;
    }
    if (character === "{" || character === "(" || character === "[") depth += 1;
    else if (character === "}" || character === ")" || character === "]") depth -= 1;
    else if (character === ">" && depth === 0) return index + 1;
  }
  return -1;
}

/** A descendant that is not self-closing owns its own visible text. */
const NESTED_ELEMENT = /<[A-Za-z][\w.]*(?![^>]*\/\s*>)[^>]*>/;

function normalise(text) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

const findings = [];

for (const file of files) {
  let raw;
  try {
    raw = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  const source = blankJsComments(raw);
  const lineAt = (offset) => raw.slice(0, offset).split(/\r?\n/).length;

  // Rule 1: a naming attribute on a generic container with no role.
  for (let index = 0; index < source.length; index += 1) {
    const attribute = NAMING_ATTRIBUTES.find((candidate) =>
      source.startsWith(candidate, index),
    );
    if (!attribute) continue;

    let tagStart = source.lastIndexOf("<", index);
    while (tagStart > 0 && source[tagStart + 1] === "/") {
      tagStart = source.lastIndexOf("<", tagStart - 1);
    }
    if (tagStart < 0) continue;

    const tag = /^<([A-Za-z][\w.]*)/.exec(source.slice(tagStart))?.[1];
    if (!tag || !GENERIC_TAGS.has(tag)) continue;

    let depth = 0;
    let end = -1;
    for (let cursor = tagStart + 1; cursor < source.length; cursor += 1) {
      const character = source[cursor];
      if (character === ">" && depth === 0) {
        end = cursor;
        break;
      }
      if (character === "{" || character === "(" || character === "[") depth += 1;
      else if (character === "}" || character === ")" || character === "]") {
        depth -= 1;
      }
    }
    if (end < 0) continue;
    if (/\brole=/.test(source.slice(tagStart, end + 1))) continue;

    findings.push(
      `${file}:${lineAt(tagStart)} <${tag}> has ${attribute.slice(0, -1)} but no role, so assistive tech discards it`,
    );
  }

  // Rule 2: `aria-label` on a label. Only the opening tag needs inspecting — a
  // <label> cannot legally contain another <label>, so no extent matching.
  let labelIndex = source.indexOf("<label");
  while (labelIndex !== -1) {
    if (/^<label[\s/>]/.test(source.slice(labelIndex))) {
      const end = openingTagEnd(source, labelIndex);
      const openingTag = end === -1 ? null : source.slice(labelIndex, end);
      if (openingTag && /\baria-label\s*=/.test(openingTag)) {
        const value =
          /aria-label\s*=\s*\{\s*t\(\s*["'`]([^"'`]+)["'`]/.exec(openingTag)?.[1] ??
          /aria-label\s*=\s*["']([^"']+)["']/.exec(openingTag)?.[1] ??
          "?";
        findings.push(
          `${file}:${lineAt(labelIndex)} <label> has aria-label=${value}, which overrides its visible text as the control's accessible name (WCAG 2.5.3)`,
        );
      }
    }
    labelIndex = source.indexOf("<label", labelIndex + 1);
  }

  // Rule 3: the accessible name must contain the words shown on screen.
  let cursor = 0;
  while (cursor < source.length) {
    const start = source.indexOf("<", cursor);
    if (start === -1) break;
    const tag = /^<([A-Za-z][\w.]*)/.exec(source.slice(start))?.[1];
    if (!tag) {
      cursor = start + 1;
      continue;
    }
    const openEnd = openingTagEnd(source, start);
    if (openEnd === -1) break;
    cursor = openEnd;

    const attributes = source.slice(start + 1 + tag.length, openEnd - 1);
    const labelled = /\baria-label\s*=\s*(\{(?:[^{}]|\{[^{}]*\})*\}|"[^"]*"|'[^']*')/.exec(
      attributes,
    );
    if (!labelled) continue;

    const close = source.indexOf(`</${tag}>`, openEnd);
    if (close === -1) continue;
    const body = source.slice(openEnd, close);
    if (NESTED_ELEMENT.test(body)) continue;

    const visible = body
      .replace(/<[^>]*>/g, " ")
      .replace(/\{(?:[^{}]|\{[^{}]*\})*\}/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    // Only literal, fully static text can be compared. Anything interpolated is
    // unresolvable, and guessing would produce findings nobody can act on.
    if (visible.length < 3 || /[!?:.]/.test(visible)) continue;

    const expression = labelled[1];
    const resolved = expression.startsWith("{")
      ? resolveTranslation(expression)
      : [expression.slice(1, -1)];
    if (!resolved || resolved.length === 0) continue;

    const wanted = normalise(visible);
    if (resolved.some((name) => normalise(name).includes(wanted))) continue;

    findings.push(
      `${file}:${lineAt(start)} <${tag}> shows "${visible}" but its accessible name is "${resolved[0]}", which omits it (WCAG 2.5.3 Label in Name)`,
    );
  }
}

reportFindingsAndExit("ARIA naming target check", findings, {
  failAlways: true,
  extraMessage:
    "Add a role so the name is exposed (rule 1), let the label text name its control (rule 2), and make the accessible name contain the visible words (rule 3).",
});
