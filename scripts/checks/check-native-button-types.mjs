#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { relative } from "node:path";
import {
  gitLsSourceFiles,
  reportFindingsAndExit,
} from "../lib/check-runner.mjs";

const BUTTON_TAG_PATTERN = /<button\b[\s\S]*?>/g;
const TYPE_ATTRIBUTE_PATTERN = /\btype\s*=/;

const files = gitLsSourceFiles(["apps", "packages"], {
  extensions: [".tsx", ".jsx", ".astro"],
  exclude: [/\.(spec|test)\.[tj]sx?$/, /\/e2e\//],
});

const violations = [];

for (const file of files) {
  const contents = readFileSync(file, "utf8");
  const matches = contents.matchAll(BUTTON_TAG_PATTERN);

  for (const match of matches) {
    const tag = match[0];
    if (TYPE_ATTRIBUTE_PATTERN.test(tag)) {
      continue;
    }

    const normalizedPath = normalizePath(file);
    const line = getLineNumber(contents, match.index ?? 0);
    violations.push(`${normalizedPath}:${line}: ${tag.split("\n")[0].trim()}`);
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
    console.error(` - ${violation}`);
  }
  process.exit(1);
}

console.log("Native button type check passed.");

function getLineNumber(contents, index) {
  return contents.slice(0, index).split("\n").length;
}

function normalizePath(filePath) {
  return relative(process.cwd(), filePath).split("\\").join("/");
}
