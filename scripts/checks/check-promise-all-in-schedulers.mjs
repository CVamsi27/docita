#!/usr/bin/env node

import { readFileSync } from "node:fs";
import {
  gitLsSourceFiles,
  reportFindingsAndExit,
} from "../lib/check-runner.mjs";

const SCHEDULER_PATH_RE =
  /(?:\/(?:scheduler|schedulers)\/|scheduler\.service\.ts$|-scheduler\.service\.ts$|\.scheduler\.ts$)/;

const files = gitLsSourceFiles(["apps/api/src"], {
  extensions: [".ts"],
}).filter((file) => SCHEDULER_PATH_RE.test(file));

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

reportFindingsAndExit("Scheduler Promise.all check", findings);
