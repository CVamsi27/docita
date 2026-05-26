#!/usr/bin/env node

import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const SOURCE_ROOTS = ["apps", "packages"];
const INCLUDED_EXTENSIONS = new Set([".tsx", ".jsx", ".astro"]);
const EXCLUDED_FILE_SUFFIXES = [
  ".spec.tsx",
  ".test.tsx",
  ".spec.jsx",
  ".test.jsx",
];
const EXCLUDED_PATH_SEGMENTS = [
  "/node_modules/",
  "/.next/",
  "/.open-next/",
  "/.wrangler/",
  "/dist/",
  "/build/",
  "/coverage/",
  "/playwright-report/",
  "/test-results/",
  "/e2e/",
];
const BUTTON_TAG_PATTERN = /<button\b[\s\S]*?>/g;
const TYPE_ATTRIBUTE_PATTERN = /\btype\s*=/;

const violations = [];

for (const root of SOURCE_ROOTS) {
  for (const filePath of listSourceFiles(root)) {
    const contents = readFileSync(filePath, "utf8");
    const matches = contents.matchAll(BUTTON_TAG_PATTERN);

    for (const match of matches) {
      const tag = match[0];
      if (TYPE_ATTRIBUTE_PATTERN.test(tag)) {
        continue;
      }

      violations.push({
        file: normalizePath(filePath),
        line: getLineNumber(contents, match.index ?? 0),
        snippet: tag.split("\n")[0].trim(),
      });
    }
  }
}

if (violations.length > 0) {
  console.error("Native button type check failed.\n");
  console.error(
    'Add an explicit `type="button"` or `type="submit"` to every native <button>.',
  );
  console.error(
    "This prevents accidental form submits that can feel like random page refreshes.\n",
  );

  for (const violation of violations) {
    console.error(` - ${violation.file}:${violation.line}: ${violation.snippet}`);
  }

  process.exit(1);
}

console.log("Native button type check passed.");

function listSourceFiles(directory) {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(directory, entry.name);
    const normalizedPath = normalizePath(fullPath);
    if (EXCLUDED_PATH_SEGMENTS.some((segment) => normalizedPath.includes(segment))) {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...listSourceFiles(fullPath));
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }

    if (EXCLUDED_FILE_SUFFIXES.some((suffix) => normalizedPath.endsWith(suffix))) {
      continue;
    }
    if (!hasAllowedExtension(normalizedPath)) {
      continue;
    }

    files.push(fullPath);
  }

  return files;
}

function hasAllowedExtension(filePath) {
  const lastDot = filePath.lastIndexOf(".");
  if (lastDot === -1) {
    return false;
  }
  return INCLUDED_EXTENSIONS.has(filePath.slice(lastDot));
}

function getLineNumber(contents, index) {
  return contents.slice(0, index).split("\n").length;
}

function normalizePath(filePath) {
  return relative(process.cwd(), filePath).split("\\").join("/");
}
