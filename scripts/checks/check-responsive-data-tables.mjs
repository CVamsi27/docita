#!/usr/bin/env node

import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative } from "node:path";
import ts from "typescript";

const SOURCE_ROOTS = ["apps/app", "apps/internal"];
const INCLUDED_EXTENSIONS = new Set([".tsx", ".jsx"]);
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
  "/coverage/",
  "/playwright-report/",
  "/test-results/",
  "/e2e/",
];

const violations = [];

for (const root of SOURCE_ROOTS) {
  for (const filePath of listSourceFiles(root)) {
    const contents = readFileSync(filePath, "utf8");
    const source = ts.createSourceFile(
      filePath,
      contents,
      ts.ScriptTarget.Latest,
      true,
      filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.JSX,
    );

    visit(source, source, filePath);
  }
}

if (violations.length > 0) {
  console.error("Responsive DataTable check failed.\n");
  console.error(
    "Every DataTable with `stackOnMobile` must provide `mobileRenderer`; otherwise the table silently stays desktop-only at narrow widths.\n",
  );

  for (const violation of violations) {
    console.error(` - ${violation.file}:${violation.line}`);
  }

  process.exit(1);
}

console.log("Responsive DataTable check passed.");

function visit(node, source, filePath) {
  if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
    const tagName = node.tagName.getText(source);
    if (tagName === "DataTable") {
      const attributes = node.attributes.properties
        .filter(ts.isJsxAttribute)
        .map((attribute) => attribute.name.getText(source));

      if (
        attributes.includes("stackOnMobile") &&
        !attributes.includes("mobileRenderer")
      ) {
        const { line } = source.getLineAndCharacterOfPosition(
          node.getStart(source),
        );
        violations.push({
          file: normalizePath(filePath),
          line: line + 1,
        });
      }
    }
  }

  ts.forEachChild(node, (child) => visit(child, source, filePath));
}

function listSourceFiles(directory) {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(directory, entry.name);
    const normalizedPath = normalizePath(fullPath);
    if (
      EXCLUDED_PATH_SEGMENTS.some((segment) => normalizedPath.includes(segment))
    ) {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...listSourceFiles(fullPath));
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }

    if (
      EXCLUDED_FILE_SUFFIXES.some((suffix) => normalizedPath.endsWith(suffix))
    ) {
      continue;
    }
    if (!INCLUDED_EXTENSIONS.has(extname(normalizedPath))) {
      continue;
    }

    files.push(fullPath);
  }

  return files;
}

function normalizePath(filePath) {
  return relative(process.cwd(), filePath).split("\\").join("/");
}
