#!/usr/bin/env node

import { readFileSync } from "node:fs";
import {
  gitLsSourceFiles,
  reportFindingsAndExit,
} from "../lib/check-runner.mjs";

const apiFiles = gitLsSourceFiles(["apps/api/src"], {
  extensions: [".ts"],
  exclude: [/\.(spec|test)\.[tj]sx?$/],
});

const workerFiles = gitLsSourceFiles(["apps/worker"], {
  extensions: [".ts"],
});

const findings = [];

const inlineCronPattern = /@Cron\s*\(\s*['"`]/;

for (const file of apiFiles) {
  const source = readFileSync(file, "utf8");
  if (!/@Cron\s*\(/.test(source)) {
    continue;
  }
  if (inlineCronPattern.test(source)) {
    findings.push(
      `${file}: @Cron uses inline schedule string; import CRON_SCHEDULES from shared/schedule/cron-schedules.ts`,
    );
    continue;
  }
  if (!source.includes("CRON_SCHEDULES")) {
    findings.push(
      `${file}: @Cron present but CRON_SCHEDULES not referenced (centralize schedules)`,
    );
  }
}

for (const file of workerFiles) {
  const source = readFileSync(file, "utf8");
  if (/@Cron\s*\(/.test(source)) {
    findings.push(
      `${file}: apps/worker must not define @Cron; register schedulers in apps/api WorkerModule using CRON_SCHEDULES`,
    );
  }
}

reportFindingsAndExit("Cron schedules check", findings);
