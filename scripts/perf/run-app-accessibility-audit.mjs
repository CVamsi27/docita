#!/usr/bin/env node
/**
 * Preflight + runner for `pnpm audit:app` (Playwright axe audit).
 *
 * - AUDIT_APP_PUBLIC_ONLY=true: public routes only (no DATABASE_URL required)
 * - default: full audit (API + DB + authenticated routes)
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

const repoRoot = resolve(import.meta.dirname, "../..");
const publicOnly = process.env.AUDIT_APP_PUBLIC_ONLY === "true";
const skipServer = process.env.SKIP_SERVER === "true";
const apiHealth =
  process.env.API_HEALTH_URL || "http://127.0.0.1:3001/api/health/live";
const appUrl = process.env.APP_URL || "http://localhost:3000";

function readDatabaseUrl() {
  const fromEnv = process.env.DATABASE_URL?.trim();
  if (fromEnv) return fromEnv;

  for (const candidate of [
    resolve(repoRoot, ".env"),
    resolve(repoRoot, "apps/api/.env"),
  ]) {
    if (!existsSync(candidate)) continue;
    const match = readFileSync(candidate, "utf8").match(
      /^DATABASE_URL=(.+)$/m,
    );
    if (match?.[1]) {
      return match[1].trim().replace(/^["']|["']$/g, "");
    }
  }
  return "";
}

function ping(url) {
  try {
    const response = spawnSync(
      "curl",
      ["-fsS", "--max-time", "3", url],
      { encoding: "utf8" },
    );
    return response.status === 0;
  } catch {
    return false;
  }
}

if (publicOnly) {
  console.log("audit:app public-only mode (skipping authenticated routes).");
} else {
  const databaseUrl = readDatabaseUrl();
  if (!databaseUrl) {
    console.error(
      "audit:app requires DATABASE_URL (env or .env) for authenticated routes.",
    );
    console.error(
      "Run public routes only: AUDIT_APP_PUBLIC_ONLY=true pnpm audit:app",
    );
    process.exit(1);
  }

  if (skipServer) {
    if (!ping(apiHealth)) {
      console.error(
        `SKIP_SERVER=true but API is not reachable at ${apiHealth}.`,
      );
      console.error(
        "Start the API (pnpm --filter @docita/api run dev) or unset SKIP_SERVER.",
      );
      process.exit(1);
    }
    if (!ping(appUrl)) {
      console.error(`SKIP_SERVER=true but app is not reachable at ${appUrl}.`);
      process.exit(1);
    }
  } else {
    console.log(
      "audit:app will start API + app via Playwright webServer when ports are free.",
    );
  }
}

const result = spawnSync(
  "pnpm",
  ["--filter", "@docita/app-vite", "run", "audit:accessibility"],
  {
    cwd: repoRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      AUDIT_APP_PUBLIC_ONLY: publicOnly ? "true" : "false",
    },
  },
);

process.exit(result.status ?? 1);
