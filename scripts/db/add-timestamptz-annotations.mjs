#!/usr/bin/env node
/**
 * One-off codemod: append @db.Timestamptz(3) to every DateTime field in schema.prisma
 * that does not already declare a @db.* native type.
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMA = resolve(__dirname, "../../packages/db/prisma/schema.prisma");

const DATETIME_FIELD =
  /^(\s+\w+\s+DateTime\??)(\s+)(@db\.\S+.*|(?:@\S+(?:\([^)]*\))?\s*)*)$/;

const content = readFileSync(SCHEMA, "utf8");
const lines = content.split("\n");
let changed = 0;

const updated = lines.map((line) => {
  if (!/\s+\w+\s+DateTime/.test(line)) {
    return line;
  }
  if (/@db\./.test(line)) {
    return line;
  }

  const trimmed = line.trimEnd();
  const next = `${trimmed} @db.Timestamptz(3)`;
  changed += 1;
  return next;
});

writeFileSync(SCHEMA, updated.join("\n"), "utf8");
console.log(`Updated ${changed} DateTime fields in schema.prisma`);
