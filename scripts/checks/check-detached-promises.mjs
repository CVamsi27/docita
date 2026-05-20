#!/usr/bin/env node

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import process from "node:process";

const files = execSync("git ls-files apps/api/src packages", {
  encoding: "utf8",
})
  .split("\n")
  .filter(Boolean)
  .filter((file) => /\.(ts|tsx)$/.test(file))
  .filter((file) => !/\.(spec|test)\.[tj]sx?$/.test(file))
  .filter((file) => existsSync(file));

const findings = [];
const detachedThisCallPattern = /void\s+this\.[A-Za-z0-9_]+\s*\(/g;

for (const file of files) {
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(detachedThisCallPattern)) {
    const statementEnd = source.indexOf(";", match.index);
    const statement =
      statementEnd === -1
        ? source.slice(match.index)
        : source.slice(match.index, statementEnd + 1);
    if (statement.includes(".catch(")) {
      continue;
    }
    const line = source.slice(0, match.index).split(/\r?\n/).length;
    findings.push(`${file}:${line}:${statement.split(/\r?\n/)[0].trim()}`);
  }
}

if (findings.length > 0) {
  process.stderr.write(
    "Detached instance promises must attach .catch(...) with logging.\n\n",
  );
  for (const finding of findings) {
    process.stderr.write(`- ${finding}\n`);
  }
  process.exit(1);
}

process.stdout.write("Detached promise check passed.\n");
