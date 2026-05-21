#!/usr/bin/env node

/**
 * Χ1: production API deploy contract uses in-memory cache until Redis is operational.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const FLY_TOML = path.join(process.cwd(), "fly.toml");
const MEMORY_BACKEND_RE = /CACHE_BACKEND\s*=\s*['"]memory['"]/;
const REDIS_BACKEND_RE = /CACHE_BACKEND\s*=\s*['"]redis['"]/;

if (!existsSync(FLY_TOML)) {
  process.stderr.write("fly.toml not found; cannot verify production cache backend.\n");
  process.exit(1);
}

const source = readFileSync(FLY_TOML, "utf8");

if (REDIS_BACKEND_RE.test(source)) {
  process.stderr.write(
    `Production cache contract failed: ${FLY_TOML} must not set CACHE_BACKEND to redis until Redis is provisioned. Use memory.\n`,
  );
  process.exit(1);
}

if (!MEMORY_BACKEND_RE.test(source)) {
  process.stderr.write(
    `Production cache contract failed: ${FLY_TOML} must set CACHE_BACKEND to memory under [env].\n`,
  );
  process.exit(1);
}

process.stdout.write("Cache in-memory production contract check passed.\n");
