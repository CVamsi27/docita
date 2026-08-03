#!/usr/bin/env node

import { readFileSync } from "node:fs";
import {
  gitLsSourceFiles,
  reportFindingsAndExit,
} from "../lib/check-runner.mjs";

/**
 * Flags `<Link>` / `<a>` opening tags that carry no `aria-label` /
 * `aria-labelledby` AND whose inner block provides no accessible-name source
 * (no visible text, no i18n call, no string-literal or text-rendering
 * expression). Elements with visible text derive their accessible name from
 * content and must NOT get a blanket `aria-label` (that would change the
 * announced name) — so this check is intentionally conservative and only
 * fires on clearly nameless elements (e.g. icon-only links).
 *
 * The static scan complements the axe-based `pnpm audit:app` runtime audit:
 * it catches nameless links on routes the audit cannot reach without
 * authenticated fixtures.
 *
 * Known limitation (by design): it cannot detect the ambiguous-name class
 * where an element's name lives in a SIBLING node (e.g. a link whose text is
 * just "View" while the document name sits in a neighbouring span) — that
 * requires semantic understanding. Those cases are fixed in the component
 * with an explicit aria-label (see ClaimDocumentsCard in
 * InsuranceClaimDetailsUISections.tsx) and are only catchable at runtime.
 */

const files = gitLsSourceFiles(["apps/app-vite/src", "apps/internal-vite/src"], {
  extensions: [".tsx", ".jsx"],
  exclude: [/\/(e2e|test-utils)\//, /\.(test|spec)\.[tj]sx?$/],
});

const TAGS = ["Link", "a"];

/** Slice from the open-tag end to the first matching close tag at depth 0. */
function innerBlock(contents, openEnd, tag) {
  let depth = 0;
  let i = openEnd;
  while (i < contents.length) {
    const openIdx = contents.indexOf(`<${tag}`, i);
    const closeIdx = contents.indexOf(`</${tag}>`, i);
    if (closeIdx === -1) {
      return contents.slice(openEnd, Math.min(contents.length, openEnd + 600));
    }
    if (openIdx !== -1 && openIdx < closeIdx) {
      depth += 1;
      i = contents.indexOf(">", openIdx) + 1;
      continue;
    }
    if (depth === 0) return contents.slice(openEnd, closeIdx);
    depth -= 1;
    i = closeIdx + tag.length + 3;
  }
  return contents.slice(openEnd, Math.min(contents.length, openEnd + 600));
}

/** True when the block can produce an accessible name for its element. */
function hasAccessibleNameSource(block) {
  if (!block) return false;
  // 1. Bare text outside tags/expressions (2+ alphanumerics).
  const stripped = block
    .replace(/<[^>]*>/g, " ")
    .replace(/\{[^}]*\}/g, " ");
  if (/[A-Za-z0-9]{2,}/.test(stripped)) return true;
  // 2. i18n call inside an expression: {t("...")}
  if (/t\(\s*["']/.test(block)) return true;
  // 3. String-literal expression: {"text"} / {`text`}
  if (/\{\s*["'`]/.test(block)) return true;
  // 4. Identifier expression (variable, function call, ternary) that renders
  //    text — icons render as tags (<Icon .../>), so a bare identifier is text.
  if (/\{\s*[A-Za-z][A-Za-z0-9_.?]*[\s(]?/.test(block)) return true;
  return false;
}

const violations = [];

for (const file of files) {
  if (!/\.[tj]sx$/.test(file)) continue;
  const contents = readFileSync(file, "utf8");
  for (const tag of TAGS) {
    const re = new RegExp(`<${tag}\\b[\\s\\S]*?>`, "g");
    let match;
    while ((match = re.exec(contents)) !== null) {
      const openTag = match[0];
      if (/aria-label\s*=/.test(openTag)) continue;
      if (/aria-labelledby\s*=/.test(openTag)) continue;
      const openEnd = match.index + openTag.length;
      if (hasAccessibleNameSource(innerBlock(contents, openEnd, tag))) continue;
      const line = contents.slice(0, match.index).split("\n").length;
      violations.push(
        `${file}:${line}: <${tag}> without accessible name: ${openTag
          .split("\n")[0]
          .trim()
          .slice(0, 80)}`,
      );
    }
  }
}

reportFindingsAndExit("Accessible-name check", violations, {
  extraMessage:
    "Add an aria-label to icon-only <Link>/<a> elements. Elements with visible text must keep their content-derived name (no blanket aria-label).",
});
