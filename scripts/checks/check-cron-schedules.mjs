#!/usr/bin/env node

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import process from "node:process";

const enforce = process.argv.includes("--enforce");

const apiFiles = execSync("git ls-files apps/api/src", { encoding: "utf8" })
  .split("\n")
  .filter(Boolean)
  .filter((file) => /\.ts$/.test(file))
  .filter((file) => !/\.(spec|test)\.[tj]sx?$/.test(file))
  .filter((file) => existsSync(file));

const workerFiles = execSync("git ls-files apps/worker", { encoding: "utf8" })
  .split("\n")
  .filter(Boolean)
  .filter((file) => /\.ts$/.test(file))
  .filter((file) => existsSync(file));

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

if (findings.length > 0) {
  console.error(
    enforce ? "Cron schedules check failed.\n" : "Cron schedules report:\n",
  );
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  if (enforce) {
    process.exit(1);
  }
  console.log(
    `Cron schedules reported ${findings.length} finding(s). Use --enforce to fail.`,
  );
  process.exit(0);
}

console.log("Cron schedules check passed.");
