#!/usr/bin/env node
/**
 * Responsive route smoke: overflow + chrome checks at mobile, tablet, laptop.
 *
 * Usage:
 *   node scripts/perf/responsive-route-smoke.mjs
 *   SKIP_SERVER=true node scripts/perf/responsive-route-smoke.mjs
 */

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import process from "node:process";

const repoRoot = resolve(import.meta.dirname, "../..");

const specs = [
  "e2e/mobile-forms.spec.ts",
  "e2e/mobile-protected-routes.spec.ts",
  "e2e/mobile-portal-routes.spec.ts",
  "e2e/mobile-auth-setup.spec.ts",
];

const projects = ["mobile-chrome", "tablet-chrome", "laptop-chrome"];

const args = [
  "--filter",
  "@docita/app",
  "exec",
  "playwright",
  "test",
  ...specs,
  ...projects.flatMap((project) => ["--project", project]),
];

const result = spawnSync("pnpm", args, {
  cwd: repoRoot,
  stdio: "inherit",
  env: process.env,
});

process.exit(result.status ?? 1);
