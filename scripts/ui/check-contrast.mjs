#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const globalsPath = path.join(
  process.cwd(),
  "packages/ui/src/styles/globals.css",
);
const source = fs.readFileSync(globalsPath, "utf8");
const requiredPairs = [
  "--background",
  "--foreground",
  "--primary",
  "--primary-foreground",
  "--card",
  "--card-foreground",
  "--destructive",
  "--destructive-foreground",
];

const missing = requiredPairs.filter((token) => !source.includes(token));

if (missing.length > 0) {
  console.error("Contrast token check failed.");
  for (const token of missing) {
    console.error(`- Missing token ${token}`);
  }
  process.exit(1);
}

console.log("Contrast token check passed.");
