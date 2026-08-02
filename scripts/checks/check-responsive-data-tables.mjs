#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { relative } from "node:path";
import ts from "typescript";
import { gitLsSourceFiles } from "../lib/check-runner.mjs";

const files = gitLsSourceFiles(["apps/app-vite", "apps/internal-vite"], {
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

function normalizePath(filePath) {
  return relative(process.cwd(), filePath).split("\\").join("/");
}
