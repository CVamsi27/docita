#!/usr/bin/env node
// check-no-emoji.mjs
//
// Source code under apps/, packages/, scripts/ must not contain
// pictographic Unicode emoji. The clinical SaaS surface follows the
// "Origin"-inspired design language in docs/ui/UI_UX_STANDARD_2026.md
// which bans emoji as user-facing glyphs (they read as casual / toy-grade
// and break the calm / clinical tone).
//
// The check is opt-out for:
//  - Markdown documentation (docs/*.md) — emoji are fine for
//    headings, status indicators, etc.
//  - JSON / YAML / TOML data files — config may contain emoji in
//    copy strings; out of scope.
//  - the `eng.traineddata` Tesseract language model (binary, contains
//    sample glyphs for OCR training).
//  - this check's own test fixtures. A fixture asserting the check fires
//    has to contain the forbidden glyph by construction, so scanning it
//    reports the test suite as a violation forever.
//
// Allow-list matches the (small) set of pictographic glyphs the UI
// standard tolerates: U+2318 (Mac command) and U+2325 (Mac option) for
// keyboard-shortcut affordances, plus a small set of CLI status glyphs.
// The list is intentionally narrow — anything new should be reviewed.
import fs from 'node:fs';
import path from 'node:path';
import {
  reportFindingsAndExit,
  gitLsSourceFiles,
} from '../lib/check-runner.mjs';

const ALLOWED_PICTOGRAPHS = new Set(['\u2318', '\u2325', '\u2705', '\u274c', '\u26a0', '\u2713', '\u2717']);

// Pictographic Unicode planes (skip Latin / Greek / CJK letters; catch
// only the colorful glyphs that show as emoji in browsers).
const EMOJI_RE = /[\u{1F000}-\u{1FFFF}\u{1F1E6}-\u{1F1FF}]/gu;

const files = gitLsSourceFiles(['apps', 'packages', 'scripts'], {
  extensions: ['.ts', '.tsx', '.js', '.mjs', '.cjs', '.jsx', '.astro'],
  // The `[mc]?[jt]sx?` tail matters: the only offender is a `.test.mjs`
  // fixture, and a `[tj]sx?` tail silently failed to match `.mjs`, so the
  // exclusion appeared to do nothing.
  exclude: [/\.(test|spec|stories)\.[mc]?[jt]sx?$/],
});

const findings = [];
for (const file of files) {
  if (file.includes('eng.traineddata')) continue;
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const matches = [...line.matchAll(EMOJI_RE)];
    if (matches.length === 0) continue;
    // Filter out the allow-listed pictographs.
    const offending = matches.filter((m) => !ALLOWED_PICTOGRAPHS.has(m[0]));
    if (offending.length === 0) continue;
    findings.push(
      `${file}:${i + 1}: ${offending.map((m) => JSON.stringify(m[0])).join(', ')}`,
    );
  }
}

reportFindingsAndExit('No-emoji check', findings);
