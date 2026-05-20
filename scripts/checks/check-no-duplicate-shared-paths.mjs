#!/usr/bin/env node

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { DUPLICATE_PATH_PAIRS } from "../lib/duplicate-path-pairs.mjs";

const repoRoot = process.cwd();
const SOURCE_EXT = /\.(ts|tsx|js|mjs|cjs)$/;

function listFilesUnder(root) {
  const absoluteRoot = path.join(repoRoot, root);
  if (!fs.existsSync(absoluteRoot)) {
    return [];
  }
  const output = execSync(`find "${absoluteRoot}" -type f`, {
    encoding: "utf8",
  });
  return output
    .split("\n")
    .filter(Boolean)
    .filter((file) => SOURCE_EXT.test(file));
}

function relativeFromRoot(file, root) {
  const prefix = `${root}/`;
  return file.startsWith(prefix) ? file.slice(prefix.length) : null;
}

function findDuplicatesForPair(pair) {
  const filesByRelativePath = new Map();

  for (const root of pair.roots) {
    for (const file of listFilesUnder(root)) {
      const relativePath = relativeFromRoot(file, root);
      if (!relativePath) continue;
      const basename = path.basename(relativePath);
      if (pair.fileNamePattern && !pair.fileNamePattern.test(basename)) {
        continue;
      }
      const matches = filesByRelativePath.get(relativePath) ?? [];
      matches.push(file);
      filesByRelativePath.set(relativePath, matches);
    }
  }

  const tolerated = new Set(pair.toleratedRelativePaths ?? []);
  const duplicates = [...filesByRelativePath.entries()].filter(
    ([relativePath, matches]) =>
      matches.length > 1 && !tolerated.has(relativePath),
  );

  const toleratedHits = [...filesByRelativePath.entries()].filter(
    ([relativePath, matches]) =>
      matches.length > 1 && tolerated.has(relativePath),
  );

  return { duplicates, toleratedHits };
}

const allDuplicates = [];
const toleratedReports = [];

for (const pair of DUPLICATE_PATH_PAIRS) {
  const { duplicates, toleratedHits } = findDuplicatesForPair(pair);
  if (duplicates.length > 0) {
    allDuplicates.push({ pair, duplicates });
  }
  if (toleratedHits.length > 0) {
    toleratedReports.push({ pair, toleratedHits });
  }
}

if (allDuplicates.length > 0) {
  process.stderr.write(
    "Duplicate parallel hierarchy paths detected. Consolidate or add a tolerated entry in scripts/lib/duplicate-path-pairs.mjs only for tracked debt.\n\n",
  );
  for (const { pair, duplicates } of allDuplicates) {
    process.stderr.write(`${pair.label} (${pair.id}):\n`);
    for (const [relativePath, matches] of duplicates) {
      process.stderr.write(`- ${relativePath}\n`);
      for (const match of matches) {
        process.stderr.write(`  ${match}\n`);
      }
    }
    process.stderr.write("\n");
  }
  process.exit(1);
}

if (toleratedReports.length > 0) {
  process.stdout.write(
    `Duplicate path check passed (${toleratedReports.reduce((n, r) => n + r.toleratedHits.length, 0)} tolerated collision(s) on record).\n`,
  );
} else {
  process.stdout.write("Duplicate path check passed.\n");
}
