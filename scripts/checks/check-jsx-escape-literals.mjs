#!/usr/bin/env node

/**
 * Regression guard: \uXXXX escapes in JSX attribute/children positions.
 *
 * JSX attribute string literals (`title="..."`) and raw JSX children text do
 * NOT process backslash escape sequences. `"\u2026"` in a JSX attribute
 * renders as the literal characters `\u2026` — not "…". This bug shipped
 * across 51 internal files before commit 7337e1cb9 replaced them with real
 * characters; this check makes the class fail CI instead of shipping raw
 * escape text to users.
 *
 * Flagged (escape is NOT processed — always a bug):
 *   - JSX attribute string value:  <Tag message="Loading\u2026" />
 *   - raw JSX children text:        <div>Loading\u2026</div>
 *   - any escape outside a JS string/template/regex/comment at all
 *
 * Allowed (the JS engine processes these):
 *   - JS strings:            const s = "\u2026";
 *   - JSX expression strings <Tag title={"\u2026"} />
 *   - template literals:     `\u00b7 ${x}`
 *   - regex literals:        /[\u00a0]/
 *   - comments
 *
 * Detection is a small character lexer, not a regex sweep: a JSX attribute
 * string is byte-identical to a JS string, so strings and JSX tag/children
 * phases must be tracked together to know whether an escape is processed.
 *
 * The lexer is deliberately permissive: worst case it reports an escape in a
 * valid position (cheap, visible failure) or misses a bug inside malformed
 * JSX that would not compile anyway.
 */

import { readFileSync } from "node:fs";
import {
  gitLsSourceFiles,
  reportFindingsAndExit,
} from "../lib/check-runner.mjs";

const REPO_ROOT = process.cwd();

// Word tokens that place the following `<`/`/` at an expression start.
const EXPRESSION_KEYWORDS = new Set([
  "return",
  "throw",
  "yield",
  "case",
  "typeof",
  "void",
  "new",
  "delete",
  "in",
  "of",
  "else",
  "do",
  "await",
  "instanceof",
  "default", // `export default <X .../>` places the tag at expression start
]);

/** Length of a `\uXXXX` or `\u{...}` escape at index i, or 0 if none. */
function escapeLength(source, i) {
  if (source[i] !== "\\" || source[i + 1] !== "u") return 0;
  if (/^[0-9a-fA-F]{4}/.test(source.slice(i + 2, i + 6))) return 6;
  const m = source.slice(i + 2, i + 10).match(/^\{[0-9a-fA-F]{1,6}\}/);
  return m ? m[0].length + 2 : 0;
}

/**
 * Walk a .tsx/.jsx source and return `\uXXXX` findings in positions where the
 * escape is not processed by JS.
 *
 * @param {string} source
 * @returns {{ line: number, context: string, escape: string }[]}
 */
export function findJsxEscapeFindings(source) {
  const findings = [];
  const n = source.length;
  // Stack of JSX/expression/template contexts.
  //   { kind: "element", name, phase: "tag" | "text" }
  //   { kind: "expr", depth }   // { ... } inside JSX, or ${ ... } in a template
  //   { kind: "tmpl" }          // template literal body
  const stack = [];
  // code | str | tmpl | jsxAttr | lineComment | blockComment | regex
  let mode = "code";
  let quote = "";
  let line = 1;

  const top = () => stack[stack.length - 1];
  const inText = () => top()?.kind === "element" && top().phase === "text";
  const inTag = () => top()?.kind === "element" && top().phase === "tag";

  const report = (i) => {
    const escape = source.slice(i, i + Math.max(escapeLength(source, i), 6));
    const snippet = source
      .slice(Math.max(0, i - 16), i + 10)
      .replace(/\s+/g, " ")
      .trim();
    findings.push({
      line,
      context: inTag()
        ? "JSX attribute string"
        : inText()
          ? "JSX children text"
          : "outside any JS string (JSX position)",
      escape,
      snippet,
    });
  };

  /** Index of the previous non-whitespace character. */
  const prevSignificant = (i) => {
    let j = i - 1;
    while (j >= 0 && /\s/.test(source[j])) j -= 1;
    return j;
  };

  /** True when position i can start an expression (JSX tag or regex). */
  const isExpressionStart = (i) => {
    const j = prevSignificant(i);
    if (j < 0) return true;
    const c = source[j];
    if ("([{,;:!?&|+-*/%^~<>=".includes(c)) return true;
    if (/[A-Za-z0-9_$]/.test(c)) {
      let k = j;
      while (k >= 0 && /[A-Za-z0-9_$]/.test(source[k])) k -= 1;
      return EXPRESSION_KEYWORDS.has(source.slice(k + 1, j + 1));
    }
    return false;
  };

  /** Recompute mode from the stack top after a pop. */
  const resumeMode = () => {
    mode = top()?.kind === "tmpl" ? "tmpl" : "code";
  };

  /** Consume an opening tag name starting right after `<` and push it. */
  const pushOpeningTag = (i) => {
    let j = i;
    while (j < n && /[A-Za-z0-9_$.:-]/.test(source[j])) j += 1;
    stack.push({ kind: "element", name: source.slice(i, j), phase: "tag" });
    return j - 1;
  };

  /** Consume `</...>` in JSX text and pop the matching open element. */
  const consumeClosingTag = (i) => {
    let j = i + 2;
    while (j < n && source[j] !== ">" && source[j] !== "\n") j += 1;
    if (top()?.kind === "element") stack.pop();
    if (source[j] === ">") {
      return j;
    }
    return j - 1;
  };

  for (let i = 0; i < n; i += 1) {
    const c = source[i];
    if (c === "\n") line += 1;

    switch (mode) {
      case "lineComment":
        if (c === "\n") mode = "code";
        continue;

      case "blockComment":
        if (c === "*" && source[i + 1] === "/") {
          i += 1;
          mode = "code";
        }
        continue;

      case "str":
        if (c === "\\") {
          i += 1; // escaped char (incl. \uXXXX — processed, valid here)
          continue;
        }
        if (c === quote) mode = "code";
        continue;

      case "tmpl": {
        if (c === "\\") {
          i += 1;
          continue;
        }
        if (c === "`") {
          stack.pop();
          resumeMode();
          continue;
        }
        if (c === "$" && source[i + 1] === "{") {
          i += 1;
          stack.push({ kind: "expr", depth: 1 });
          mode = "code";
          continue;
        }
        continue;
      }

      case "regex": {
        if (c === "\\") {
          i += 1;
          continue;
        }
        if (c === "[") {
          let j = i + 1;
          while (j < n && source[j] !== "]" && source[j] !== "\n") {
            if (source[j] === "\\") j += 1;
            j += 1;
          }
          i = j;
          continue;
        }
        if (c === "/" || c === "\n") mode = "code";
        continue;
      }

      case "jsxAttr":
        if (c === quote) {
          mode = "code";
          continue;
        }
        if (escapeLength(source, i) > 0) {
          report(i);
          i += escapeLength(source, i) - 1;
        }
        continue;

      case "code":
      default:
        break;
    }

    // --- code / JSX-expression scanning ---
    if (c === "/" && source[i + 1] === "/") {
      mode = "lineComment";
      i += 1;
      continue;
    }
    if (c === "/" && source[i + 1] === "*") {
      mode = "blockComment";
      i += 1;
      continue;
    }
    if (c === "/" && isExpressionStart(i)) {
      mode = "regex";
      continue;
    }
    if (c === '"' || c === "'") {
      if (inTag()) {
        quote = c;
        mode = "jsxAttr";
      } else if (!inText()) {
        quote = c;
        mode = "str";
      }
      // Quotes in JSX children text are literal characters.
      continue;
    }
    if (c === "`" && !inText() && !inTag()) {
      stack.push({ kind: "tmpl" });
      mode = "tmpl";
      continue;
    }
    if (c === "<") {
      const next = source[i + 1];
      const tagLike = next === ">" || next === "/" || /[A-Za-z_$]/.test(next);
      if (inText()) {
        // In JSX children, `<` always opens or closes a tag.
        if (next === "/") {
          i = consumeClosingTag(i);
          continue;
        }
        if (next === ">") {
          stack.push({ kind: "element", name: null, phase: "text" });
          i += 1;
          continue;
        }
        if (/[A-Za-z_$]/.test(next)) {
          i = pushOpeningTag(i + 1);
          continue;
        }
        continue;
      }
      if (tagLike && isExpressionStart(i)) {
        if (next === "/") continue; // closing tag outside JSX text: not valid, ignore
        if (next === ">") {
          stack.push({ kind: "element", name: null, phase: "text" });
          i += 1;
          continue;
        }
        i = pushOpeningTag(i + 1);
        continue;
      }
      continue;
    }
    if (c === "{") {
      const t = top();
      if (t?.kind === "element" && (t.phase === "tag" || t.phase === "text")) {
        stack.push({ kind: "expr", depth: 1 });
      } else if (t?.kind === "expr") {
        t.depth += 1;
      }
      continue;
    }
    if (c === "}") {
      const t = top();
      if (t?.kind === "expr") {
        t.depth -= 1;
        if (t.depth === 0) {
          stack.pop();
          resumeMode();
        }
      }
      continue;
    }
    if (c === ">" && inTag()) {
      const t = top();
      if (source[i - 1] === "/") {
        stack.pop(); // self-closing
        continue;
      }
      t.phase = "text";
      // Revert a misparsed generic arrow (`<T,>(x) => ...` / `<Input,>(...)`):
      // a JSX opening tag whose first child is `(` is almost certainly a type
      // parameter list, not an element.
      let j = i + 1;
      while (j < n && /[ \t\r]/.test(source[j])) j += 1;
      if (source[j] === "(") {
        stack.pop();
        continue;
      }
      continue;
    }
    if (c === "\\" && escapeLength(source, i) > 0) {
      // Outside any JS string/template/regex/comment: the only remaining
      // valid positions are JSX children text (or a lexer blind spot, which
      // is still worth surfacing).
      report(i);
      i += escapeLength(source, i) - 1;
      continue;
    }
  }

  return findings;
}

function listJsxFiles() {
  return gitLsSourceFiles(["apps", "packages"], {
    extensions: ["tsx", "jsx"],
    exclude: [/\.(test|spec)\.tsx?$/, /\.stories\.tsx?$/, /__tests__\//],
  });
}

function main() {
  const findings = [];
  for (const file of listJsxFiles()) {
    const source = readFileSync(file, "utf8");
    for (const f of findJsxEscapeFindings(source)) {
      findings.push(
        `${file}:${f.line} — ${f.escape} in ${f.context} is not processed by JS ` +
          `(renders as literal backslash text). Use the literal character ` +
          `(e.g. ${f.escape.replace("\\u", "u")} → the unicode character). ` +
          `Snippet: ${f.snippet}`,
      );
    }
  }
  reportFindingsAndExit("JSX escape literal check", findings, {
    failAlways: true,
    extraMessage:
      "\\uXXXX escapes are not processed in JSX attribute strings or children text — they render as literal backslash sequences to users. Replace with the real unicode character (e.g. \\u2026 → …, \\u20b9 → ₹) or move the text into a JS expression: title={\"...\"}.",
  });
}

main();
