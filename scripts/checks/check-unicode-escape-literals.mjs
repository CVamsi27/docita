#!/usr/bin/env node
// check-unicode-escape-literals.mjs
//
// Source files under apps/{app,internal,landing}/src must not contain
// `\uXXXX` escape sequences for the typographic characters the
// codebase uses in JSX, template literals, and string literals. The
// literal character is easier to grep, easier to read, and avoids
// accidental collisions with the JSX escape-literal pipeline
// (scripts/checks/check-jsx-escape-literals.mjs).
//
// Scanned: apps/{app,internal,landing}/src/**/*.{ts,tsx}. Other code
// (server, tests, scripts, packages) is intentionally excluded:
// - apps/api uses Prisma + Zod schemas; escapes in regex/character
//   classes are sometimes required and always reviewed.
// - packages/types/src/api/sanitization.ts uses escapes intentionally
//   to map lookalike characters to ASCII; the escape is the spec.
// - packages/types/src/pdf/pdf-types.ts declares a currency-symbol
//   dictionary; escapes are the source of truth for the codepoints.
// - scripts/checks/* documents its own escape usage.
//
// Allow-list: the small set of pictographic glyphs the UI standard
// tolerates (U+2318 PLACE OF INTEREST, U+2325 OPTION KEY, U+2705
// WHITE HEAVY CHECK MARK, U+274C CROSS MARK, U+26A0 WARNING SIGN,
// U+2713 CHECK MARK, U+2717 BALLOT X). New entries should be added
// here AND replaced with the literal character at the call sites
// in a single PR.
//
// Opt-out: a `// unicode-escape-allow-file` comment at the top of a
// file exempts that file (escape the line with a one-line rationale
// for the future auditor).
import fs from 'node:fs';
import path from 'node:path';
import {
  reportFindingsAndExit,
  gitLsSourceFiles,
} from '../lib/check-runner.mjs';

const ALLOWED_GLYPHS = new Set([
  '\u2318', // U+2318 PLACE OF INTEREST SIGN
  '\u2325', // U+2325 OPTION KEY
  '\u2705', // U+2705 WHITE HEAVY CHECK MARK
  '\u274c', // U+274C CROSS MARK
  '\u26a0', // U+26A0 WARNING SIGN
  '\u2713', // U+2713 CHECK MARK
  '\u2717', // U+2717 BALLOT X
]);

// Match `\u` followed by exactly 4 hex digits, with non-hex-digit
// boundaries on both sides. Avoids false positives like `\u00b7` in a
// longer escape (`\u00b70`).
const ESCAPE_RE = /(?<![\dA-Fa-f])(\\u([0-9A-Fa-f]{4}))(?![\dA-Fa-f])/g;

const OPT_OUT_MARKER = 'unicode-escape-allow-file';

const files = gitLsSourceFiles(
  ['apps/app/src', 'apps/internal/src', 'apps/landing/src'],
  { extensions: ['.ts', '.tsx'] },
);

const findings = [];
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  // File-level opt-out: marker in the first 10 lines exempts everything.
  const head = text.split('\n').slice(0, 10).join('\n');
  if (head.includes(OPT_OUT_MARKER)) continue;

  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    // Line-level opt-out: trailing `// unicode-escape-allow-line`
    if (line.includes(`${OPT_OUT_MARKER}-line`)) continue;
    const matches = [...line.matchAll(ESCAPE_RE)];
    if (matches.length === 0) continue;
    const offending = matches.filter((m) => {
      const codePoint = parseInt(m[2], 16);
      return !ALLOWED_GLYPHS.has(String.fromCodePoint(codePoint));
    });
    if (offending.length === 0) continue;
    findings.push(
      `${path.relative(process.cwd(), file)}:${i + 1}: ${offending
        .map((m) => `\\u${m[2].toLowerCase()}`)
        .join(', ')}`,
    );
  }
}

reportFindingsAndExit('Unicode escape literal check (UI)', findings);
