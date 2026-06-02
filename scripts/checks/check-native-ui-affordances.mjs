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
const NATIVE_DISCLOSURE_TAGS = new Set(["details", "summary"]);

const violations = [];

for (const sourceRoot of SOURCE_ROOTS) {
  for (const filePath of listSourceFiles(sourceRoot)) {
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
  console.error("Native UI affordance check failed.\n");
  console.error(
    "Use @workspace/ui tooltip, collapsible, and form primitives so keyboard behavior and styling remain consistent.\n",
  );

  for (const violation of violations) {
    console.error(
      ` - ${violation.file}:${violation.line}: ${violation.message}`,
    );
  }

  process.exit(1);
}

console.log("Native UI affordance check passed.");

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

function visit(node, source, filePath) {
  if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
    const tagName = node.tagName.getText(source);
    if (/^[a-z]/.test(tagName)) {
      const attributes = new Map(
        node.attributes.properties
          .filter(ts.isJsxAttribute)
          .map((attribute) => [
            attribute.name.getText(source),
            getAttributeValue(attribute),
          ]),
      );

      if (attributes.has("title")) {
        addViolation(
          node,
          source,
          filePath,
          `replace native \`title\` on <${tagName}> with the shared Tooltip primitive`,
        );
      }

      if (NATIVE_DISCLOSURE_TAGS.has(tagName)) {
        addViolation(
          node,
          source,
          filePath,
          `replace native <${tagName}> with the shared Collapsible primitive`,
        );
      }

      if (tagName === "select") {
        addViolation(
          node,
          source,
          filePath,
          "replace native <select> with the shared Select primitive",
        );
      }

      if (tagName === "input" && attributes.get("type") === "date") {
        addViolation(
          node,
          source,
          filePath,
          'replace native <input type="date"> with the shared IsoDatePickerField primitive',
        );
      }
    }
  }

  ts.forEachChild(node, (child) => visit(child, source, filePath));
}

function addViolation(node, source, filePath, message) {
  const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
  violations.push({
    file: normalizePath(filePath),
    line: line + 1,
    message,
  });
}

function getAttributeValue(attribute) {
  if (!attribute.initializer) {
    return true;
  }
  if (ts.isStringLiteral(attribute.initializer)) {
    return attribute.initializer.text;
  }
  return undefined;
}

function normalizePath(filePath) {
  return relative(process.cwd(), filePath).split("\\").join("/");
}
