#!/usr/bin/env node

import { readFileSync } from "node:fs";
import process from "node:process";
import { listSourceFiles } from "../lib/list-source-files.mjs";

const SCHEDULER_PATH_RE =
  /(?:\/(?:scheduler|schedulers)\/|scheduler\.service\.ts$|-scheduler\.service\.ts$|\.scheduler\.ts$)/;

const enforce = process.argv.includes("--enforce");

const files = listSourceFiles(["apps/api/src"])
  .filter((file) => /\.ts$/.test(file))
  .filter((file) => SCHEDULER_PATH_RE.test(file));

const findings = [];

for (const file of files) {
  const source = readFileSync(file, "utf8");
  if (source.includes("check-promise-all-in-schedulers: allow-file")) {
    continue;
  }
  if (/\bPromise\.all\s*\(/.test(source)) {
    findings.push(
      `${file}: scheduler path uses Promise.all; prefer Promise.allSettled for independent batch work (V3)`,
    );
  }
}

if (findings.length > 0) {
  console.error(
    enforce
      ? "Scheduler Promise.all check failed.\n"
      : "Scheduler Promise.all report:\n",
  );
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  if (enforce) {
    process.exit(1);
  }
  console.log(
    `Scheduler Promise.all reported ${findings.length} finding(s). Use --enforce to fail.`,
  );
  process.exit(0);
}

console.log("Scheduler Promise.all check passed.");
