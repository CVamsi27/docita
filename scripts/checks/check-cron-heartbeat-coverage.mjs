#!/usr/bin/env node
// Advisory: every @Cron(...) method should carry @TrackHeartbeat("<name>")
// so we can observe whether the scheduler is actually running.
// SYSTEM_DESIGN_AND_PATTERNS.md §28.5 item 36.

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import process from "node:process";

const ROOT = "apps/api/src";
const files = execSync(`git ls-files '${ROOT}'`, { encoding: "utf8" })
  .split("\n")
  .filter(Boolean)
  .filter((f) => /\.ts$/.test(f))
  .filter((f) => !/\.(spec|test)\.ts$/.test(f));

const advisories = [];

for (const file of files) {
  let source;
  try {
    source = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  const cronMatches = [...source.matchAll(/@Cron\s*\(/g)];
  if (cronMatches.length === 0) continue;
  const hasTracking = /@TrackHeartbeat\s*\(/.test(source);
  if (!hasTracking) {
    advisories.push(
      `${file}: ${cronMatches.length} @Cron handler(s) without @TrackHeartbeat`,
    );
  }
}

if (advisories.length === 0) {
  process.stdout.write("[cron-heartbeat-coverage] OK\n");
  process.exit(0);
}

process.stderr.write(
  `[cron-heartbeat-coverage] ${advisories.length} file(s) missing heartbeat tracking:\n`,
);
for (const finding of advisories) {
  process.stderr.write(`  - ${finding}\n`);
}
process.stderr.write(
  "Import { TrackHeartbeat } from '@/shared/modules/schedule/cron-heartbeat' and annotate each @Cron handler with @TrackHeartbeat('<unique.name>').\n",
);
// Advisory until the Prisma `CronHeartbeat` model is provisioned.
process.exit(0);
