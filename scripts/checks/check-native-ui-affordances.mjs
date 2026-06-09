#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { relative } from "node:path";
import ts from "typescript";
import { gitLsSourceFiles } from "../lib/check-runner.mjs";

const NATIVE_DISCLOSURE_TAGS = new Set(["details", "summary"]);

const files = gitLsSourceFiles(["apps/app", "apps/internal"], {
  extensions: [".tsx", ".jsx"],
  exclude: [/\.(spec|test)\.[tj]sx?$/, /\/e2e\//],
});

const violations = [];

for (const file of files) {
  const contents = readFileSync(file, "utf8");
  const source = ts.createSourceFile(
    file,
    contents,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.JSX,
  );

  visit(source, source, file);
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
