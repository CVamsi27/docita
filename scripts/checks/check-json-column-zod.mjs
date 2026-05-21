#!/usr/bin/env node

/**
 * Ψ1 (ratchet): Prisma Json columns must declare /// @json:<exportName> and the
 * schema must exist in packages/types. Unannotated legacy columns stay on allowlist.
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { JSON_COLUMN_ALLOWLIST } from "../lib/json-column-allowlist.mjs";

const SCHEMA_PATH = path.join(
  process.cwd(),
  "packages/db/prisma/schema.prisma",
);
const TYPES_ROOT = path.join(process.cwd(), "packages/types/src");

function listTypeScriptExports() {
  const files = execSync(`git ls-files '${TYPES_ROOT.replace(process.cwd() + "/", "")}'`, {
    encoding: "utf8",
  })
    .split("\n")
    .filter((file) => /\.ts$/.test(file));

  const exports = new Set();
  const exportRe = /export const (\w+)\s*=/g;
  for (const file of files) {
    const absolutePath = path.join(process.cwd(), file);
    if (!existsSync(absolutePath)) continue;
    const source = readFileSync(absolutePath, "utf8");
    for (const match of source.matchAll(exportRe)) {
      exports.add(match[1]);
    }
  }
  return exports;
}

function parseJsonColumns(schema) {
  const lines = schema.split(/\r?\n/);
  let model = null;
  const columns = [];

  for (let i = 0; i < lines.length; i += 1) {
    const modelMatch = lines[i].match(/^model (\w+)/);
    if (modelMatch) {
      model = modelMatch[1];
      continue;
    }
    const fieldMatch = lines[i].match(/^\s+(\w+)\s+Json\b/);
    if (!fieldMatch || !model) {
      continue;
    }

    const lookback = lines.slice(Math.max(0, i - 4), i).join("\n");
    const annotation = lookback.match(/\/\/\/\s*@json:(\w+)/)?.[1] ?? null;
    columns.push({
      key: `${model}.${fieldMatch[1]}`,
      annotation,
      line: i + 1,
    });
  }

  return columns;
}

if (!existsSync(SCHEMA_PATH)) {
  process.stderr.write(`Schema not found: ${SCHEMA_PATH}\n`);
  process.exit(1);
}

const schema = readFileSync(SCHEMA_PATH, "utf8");
const typeExports = listTypeScriptExports();
const columns = parseJsonColumns(schema);
const findings = [];

for (const column of columns) {
  if (!column.annotation) {
    if (!JSON_COLUMN_ALLOWLIST.has(column.key)) {
      findings.push(
        `${SCHEMA_PATH}:${column.line} ${column.key} — missing /// @json:<schemaExport> (not on allowlist)`,
      );
    }
    continue;
  }

  if (!typeExports.has(column.annotation)) {
    findings.push(
      `${SCHEMA_PATH}:${column.line} ${column.key} — @json:${column.annotation} not exported from packages/types`,
    );
  }
}

if (findings.length > 0) {
  process.stderr.write(
    "Json column Zod mapping check failed. Add /// @json:<export> above each Json field and export the schema from packages/types, or add to scripts/lib/json-column-allowlist.mjs only for tracked debt.\n\n",
  );
  for (const finding of findings) {
    process.stderr.write(`- ${finding}\n`);
  }
  process.exit(1);
}

process.stdout.write(
  `Json column Zod mapping check passed (${columns.length} Json columns, ${columns.filter((c) => c.annotation).length} annotated).\n`,
);
