#!/usr/bin/env node
/**
 * Mobile route smoke: runs Playwright overflow + chrome checks at 390px.
 *
 * Usage:
 *   node scripts/perf/mobile-route-smoke.mjs
 *   SKIP_SERVER=true node scripts/perf/mobile-route-smoke.mjs
 */

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import process from "node:process";

const repoRoot = resolve(import.meta.dirname, "../..");

const result = spawnSync(
  "pnpm",
  [
    "--filter",
    "@docita/app",
    "exec",
    "playwright",
    "test",
    "e2e/mobile-forms.spec.ts",
    "e2e/mobile-protected-routes.spec.ts",
    "e2e/mobile-portal-routes.spec.ts",
    "e2e/mobile-auth-setup.spec.ts",
    "--project=mobile-chrome",
  ],
  {
    cwd: repoRoot,
    stdio: "inherit",
    env: process.env,
  },
);

process.exit(result.status ?? 1);
