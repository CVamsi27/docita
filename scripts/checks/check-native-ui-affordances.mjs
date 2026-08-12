#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { relative } from "node:path";
import ts from "typescript";
import { gitLsSourceFiles } from "../lib/check-runner.mjs";

const NATIVE_DISCLOSURE_TAGS = new Set(["details", "summary"]);

// Browser dialog globals that must be replaced with @workspace/ui Dialog /
// AlertDialog / toast primitives (AGENTS.md §4.3). Flagged both as
// `window.confirm(...)` property accesses and as bare global calls.
const NATIVE_DIALOG_CALLS = new Set(["confirm", "alert", "prompt"]);

const files = gitLsSourceFiles(["apps/app", "apps/internal"], {
  extensions: [".tsx", ".jsx", ".ts", ".js"],
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

  const shadowedNames = collectShadowedNames(source, source, new Set());
  visit(source, source, file, shadowedNames);
}

if (violations.length > 0) {
  console.error("Native UI affordance check failed.\n");
  console.error(
    "Use @workspace/ui tooltip, collapsible, select, date-picker, dialog, and form primitives so keyboard behavior and styling remain consistent.\n",
  );

  for (const violation of violations) {
    console.error(
      ` - ${violation.file}:${violation.line}: ${violation.message}`,
    );
  }

  process.exit(1);
}

console.log("Native UI affordance check passed.");

function visit(node, source, filePath, shadowedNames) {
  if (ts.isCallExpression(node)) {
    const callee = node.expression;
    const isWindowDialog =
      ts.isPropertyAccessExpression(callee) &&
      NATIVE_DIALOG_CALLS.has(callee.name.getText(source)) &&
      ts.isIdentifier(callee.expression) &&
      callee.expression.getText(source) === "window";
    const isBareDialog =
      ts.isIdentifier(callee) &&
      NATIVE_DIALOG_CALLS.has(callee.getText(source)) &&
      !shadowedNames.has(callee.getText(source));

    if (isWindowDialog || isBareDialog) {
      addViolation(
        node,
        source,
        filePath,
        `replace ${callee.getText(source)}() with the shared Dialog/AlertDialog and toast primitives`,
      );
    }
  }

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

  ts.forEachChild(node, (child) => visit(child, source, filePath, shadowedNames));
}

/**
 * Collect identifiers that locally shadow the browser globals
 * confirm/alert/prompt (const/let/var declarations, destructuring bindings,
 * function/method names). Calls to a shadowed name are the app's own
 * implementation (e.g. the useConfirm hook), not the browser dialog.
 *
 * Note: this is a file-scope approximation, not lexical-scope analysis — a
 * binding anywhere in the file suppresses the rule for bare calls everywhere
 * in that file. That is a deliberate conservative choice (false negatives
 * only, never false positives) that matches this repo's consistent use of
 * the useConfirm hook; do not treat it as scope-accurate.
 */
function collectShadowedNames(node, source, acc) {
  if (ts.isVariableDeclaration(node) && node.name) {
    const name = node.name;
    if (ts.isIdentifier(name)) {
      if (NATIVE_DIALOG_CALLS.has(name.getText(source))) acc.add(name.getText(source));
    } else if (ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name)) {
      for (const element of name.elements) {
        if (ts.isBindingElement(element) && ts.isIdentifier(element.name)) {
          const bound = element.name.getText(source);
          if (NATIVE_DIALOG_CALLS.has(bound)) acc.add(bound);
        }
      }
    }
  }
  if (
    (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) &&
    node.name &&
    ts.isIdentifier(node.name) &&
    NATIVE_DIALOG_CALLS.has(node.name.getText(source))
  ) {
    acc.add(node.name.getText(source));
  }
  ts.forEachChild(node, (child) => {
    collectShadowedNames(child, source, acc);
  });
  return acc;
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
