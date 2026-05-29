#!/usr/bin/env node
/**
 * Mobile route smoke (alias): runs responsive sweep at all viewport projects.
 * @see scripts/perf/responsive-route-smoke.mjs
 */

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import process from "node:process";

const script = resolve(import.meta.dirname, "responsive-route-smoke.mjs");

const result = spawnSync(process.execPath, [script], {
  cwd: resolve(import.meta.dirname, "../.."),
  stdio: "inherit",
  env: process.env,
});

process.exit(result.status ?? 1);
