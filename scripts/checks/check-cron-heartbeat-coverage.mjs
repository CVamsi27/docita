#!/usr/bin/env node
// Enforcing: every @Cron(...) method must carry @TrackHeartbeat("<name>")
// so we can observe whether the scheduler is actually running, and the
// name must be unique across the codebase (one heartbeat row per cron).
// SYSTEM_DESIGN_AND_PATTERNS.md §28.5 item 36, ADR 0011 follow-up.

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import process from "node:process";

const ROOT = "apps/api/src";
// The decorator definition itself documents the @TrackHeartbeat usage in
// JSDoc; skip it so its example names don't double-count or false-flag.
const DECORATOR_DEFINITION =
  "apps/api/src/shared/modules/schedule/cron-heartbeat.ts";
const files = execSync(`git ls-files '${ROOT}'`, { encoding: "utf8" })
  .split("\n")
  .filter(Boolean)
  .filter((f) => /\.ts$/.test(f))
  .filter((f) => !/\.(spec|test)\.ts$/.test(f))
  .filter((f) => f !== DECORATOR_DEFINITION);

const coverageGaps = [];
const heartbeatNames = new Map(); // name -> [file, ...]

for (const file of files) {
  let source;
  try {
    source = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  const cronCount = (source.match(/@Cron\s*\(/g) ?? []).length;
  const trackMatches = [
    ...source.matchAll(/@TrackHeartbeat\s*\(\s*['"]([^'"]+)['"]/g),
  ];

  if (cronCount === 0) continue;

  if (trackMatches.length < cronCount) {
    coverageGaps.push(
      `${file}: ${cronCount} @Cron handler(s), only ${trackMatches.length} @TrackHeartbeat`,
    );
  }

  for (const m of trackMatches) {
    const name = m[1];
    const list = heartbeatNames.get(name) ?? [];
    list.push(file);
    heartbeatNames.set(name, list);
  }
}

const duplicates = [...heartbeatNames.entries()]
  .filter(([, files]) => files.length > 1)
  .map(([name, files]) => `'${name}' in ${[...new Set(files)].join(", ")}`);

let failed = false;

if (coverageGaps.length > 0) {
  failed = true;
  process.stderr.write(
    `[cron-heartbeat-coverage] ${coverageGaps.length} file(s) missing heartbeat tracking:\n`,
  );
  for (const finding of coverageGaps) {
    process.stderr.write(`  - ${finding}\n`);
  }
  process.stderr.write(
    "Import { TrackHeartbeat } from '@/shared/modules/schedule/cron-heartbeat' and annotate each @Cron handler with @TrackHeartbeat('<unique.name>').\n",
  );
}

if (duplicates.length > 0) {
  failed = true;
  process.stderr.write(
    `[cron-heartbeat-coverage] ${duplicates.length} duplicate heartbeat name(s):\n`,
  );
  for (const finding of duplicates) {
    process.stderr.write(`  - ${finding}\n`);
  }
  process.stderr.write(
    "Each @TrackHeartbeat name must be globally unique (one CronHeartbeat row per scheduler method).\n",
  );
}

if (failed) {
  process.exit(1);
}

process.stdout.write(
  `[cron-heartbeat-coverage] OK (${heartbeatNames.size} heartbeats tracked)\n`,
);
process.exit(0);
