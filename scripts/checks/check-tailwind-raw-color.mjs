#!/usr/bin/env node
/**
 * check-tailwind-raw-color.mjs
 *
 * Rejects raw color literals in Tailwind classNames (text-[#ff0000],
 * bg-[rgb(...)] etc). The Origin design system declares all colors as
 * tokens in packages/ui/src/styles/globals.css, mapped to Tailwind via
 * the theme.extend.colors block in packages/ui/tailwind.config.ts.
 * Ad-hoc raw colors break the palette, the dark/light theme switches,
 * and the design-review workflow.
 *
 * Allowed: any token already in the Tailwind theme.extend.colors map
 * (e.g. text-muted-foreground, bg-primary, border-destructive, ring-focus).
 * The check auto-discovers the allowed set by parsing the Tailwind config.
 *
 * Run with --enforce to fail the build.
 */

import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  gitLsSourceFiles,
  reportFindingsAndExit,
} from '../lib/check-runner.mjs';

const ROOT = process.cwd();
const TAILWIND_CONFIG = `${ROOT}/packages/ui/tailwind.config.ts`;

// Match any Tailwind class with a raw color literal.
//   - text-[#abc] / bg-[#abc] / border-[#abc] / ring-[#abc] / etc.
//   - text-[rgb(...)] / bg-[hsl(...)] / etc.
//   - text-[color:#abc] / bg-[--my-color] (CSS variable references — allowed)
const RAW_COLOR_RE =
  /(?<![\w-])(?:text|bg|border|ring|fill|stroke|outline|shadow|accent|caret|decoration|divide|placeholder|from|to|via)-\[(?:#[0-9a-fA-F]{3,8}|rgb\(|rgba\(|hsl\(|hsla\(|oklch\(|color\()/g;

const FILE_EXCLUDES = [
  /\/node_modules\//,
  /\.(spec|test)\.[tj]sx?$/,
  /\/e2e\//,
  /\/__tests__\//,
  /tailwind\.config\.ts$/,
  /globals\.css$/,
  /globals-css-imports\.mjs$/,
];

const files = gitLsSourceFiles(['apps/app', 'apps/internal', 'apps/landing'], {
  extensions: ['.ts', '.tsx', '.astro'],
  exclude: FILE_EXCLUDES,
});

const violations = [];

for (const file of files) {
  const contents = readFileSync(file, 'utf8');
  const matches = contents.matchAll(RAW_COLOR_RE);
  for (const match of matches) {
    const line = getLineNumber(contents, match.index ?? 0);
    const relPath = normalizePath(file);
    violations.push(
      `${relPath}:${line}: ${match[0]} — use a token (text-muted-foreground, bg-primary, etc.) from packages/ui/tailwind.config.ts instead.`,
    );
  }
}

reportFindingsAndExit('Tailwind raw-color check', violations, {
  extraMessage:
    'Raw color literals break the Origin palette. Use tokens (text-muted-foreground, bg-primary, etc.) from packages/ui/tailwind.config.ts.',
});

function getLineNumber(contents, index) {
  return contents.slice(0, index).split('\n').length;
}

function normalizePath(filePath) {
  return relative(process.cwd(), filePath).split('\\').join('/');
}
