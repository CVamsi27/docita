#!/usr/bin/env node

/**
 * Token typography check.
 *
 * Rejects hardcoded text-[Npx] class values (e.g. text-[10px], text-[13px])
 * in apps/{app,internal}/source files. The codebase uses a --fs-2xs..--fs-4xl
 * scale declared in packages/ui/src/styles/globals.css; ad-hoc pixel sizes
 * break the typography hierarchy and the document density tokens.
 *
 * Allow-list:
 *   - the ui-eyebrow / ui-section-title / ui-page-subtitle classes already
 *     mapped to the typography scale
 *   - explicit var(--fs-*) references (the recommended form)
 *   - text-[0] / text-[inherit] / arbitrary non-pixel values
 *
 * Run with --enforce to fail the build.
 */

import { readFileSync } from "node:fs";
import { relative } from "node:path";
import {
  gitLsSourceFiles,
  reportFindingsAndExit,
} from "../lib/check-runner.mjs";

// Matches `text-[NNpx]` or `text-[NN.Npx]` where NN is a positive integer/decimal.
// The set of literal sizes the design system has previously drifted into.
const HARDCODED_TEXT_PX = /(?<![\w-])text-\[(\d+(?:\.\d+)?)px\]/g;

// Files where the text-[Npx] is acceptable (e.g. fixtures, third-party shims).
const FILE_EXCLUDES = [
  /\/node_modules\//,
  /\.(spec|test)\.[tj]sx?$/,
  /\/e2e\//,
  /\/__tests__\//,
];

const files = gitLsSourceFiles(["apps/app", "apps/internal"], {
  extensions: [".ts", ".tsx", ".astro"],
  exclude: FILE_EXCLUDES,
});

const violations = [];

for (const file of files) {
  const contents = readFileSync(file, "utf8");
  const matches = contents.matchAll(HARDCODED_TEXT_PX);

  for (const match of matches) {
    const line = getLineNumber(contents, match.index ?? 0);
    const value = match[1];
    const relPath = normalizePath(file);
    const replacement = suggestToken(parseFloat(value));
    violations.push(
      `${relPath}:${line}: ${match[0]} — replace with ${replacement} (declared in packages/ui/src/styles/globals.css).`,
    );
  }
}

reportFindingsAndExit("Token typography check", violations, {
  extraMessage:
    "Hardcoded text-[Npx] classes break the typography scale. Use the --fs-* tokens or the Tailwind fontSize tokens (text-xs, text-sm, ...).",
});

function getLineNumber(contents, index) {
  return contents.slice(0, index).split("\n").length;
}

function normalizePath(filePath) {
  return relative(process.cwd(), filePath).split("\\").join("/");
}

function suggestToken(px) {
  // Match the closest existing --fs-* variable from packages/ui/src/styles/globals.css.
  // Scale: 2xs=11, xs=12, sm=13, md=15, lg=16, xl=18, 2xl=20, 3xl=24, 4xl=30
  const scale = [
    ["11", "--fs-2xs"],
    ["12", "--fs-xs"],
    ["13", "--fs-sm"],
    ["15", "--fs-md"],
    ["16", "--fs-lg"],
    ["18", "--fs-xl"],
    ["20", "--fs-2xl"],
    ["24", "--fs-3xl"],
    ["30", "--fs-4xl"],
  ];
  let closest = scale[0];
  let minDelta = Math.abs(px - parseInt(closest[0], 10));
  for (const candidate of scale) {
    const delta = Math.abs(px - parseInt(candidate[0], 10));
    if (delta < minDelta) {
      closest = candidate;
      minDelta = delta;
    }
  }
  const tailwind = pxToTailwind(px);
  return `var(${closest[1]}) (or ${tailwind})`;
}

function pxToTailwind(px) {
  // Tailwind text-* defaults used in packages/ui/tailwind.config.ts.
  const map = {
    12: "text-xs",
    14: "text-sm",
    16: "text-base",
    18: "text-lg",
    20: "text-xl",
    24: "text-2xl",
    30: "text-3xl",
    36: "text-4xl",
  };
  return map[px] ?? `text-[var(--fs-...)]`;
}
