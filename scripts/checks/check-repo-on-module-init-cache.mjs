#!/usr/bin/env node

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import process from "node:process";

const enforce = process.argv.includes("--enforce");

/** Repositories allowed to prewarm LRU caches on module init (documented in audit AO4). */
const ALLOWLIST = new Set([
  "apps/api/src/domains/clinical/infrastructure/persistence/prisma-medical-coding.repository.ts",
]);

const files = execSync(
  'git ls-files "apps/api/src/domains/*/infrastructure/**/*.ts"',
  { encoding: "utf8" },
)
  .split("\n")
  .filter(Boolean)
  .filter((file) => !/\.(spec|test)\.[tj]sx?$/.test(file));

const findings = [];

for (const file of files) {
  if (!existsSync(file)) {
    continue;
  }
  const source = readFileSync(file, "utf8");
  if (!/OnModuleInit/.test(source)) {
    continue;
  }
  if (ALLOWLIST.has(file)) {
    continue;
  }
  if (/onModuleInit\s*\(/.test(source) || /implements[^;]*OnModuleInit/.test(source)) {
    findings.push(
      `${file}: infrastructure repository implements OnModuleInit; use lazy cache or move warm-up to a scheduler`,
    );
  }
}

if (findings.length > 0) {
  console.error(
    enforce
      ? "Repository OnModuleInit cache check failed.\n"
      : "Repository OnModuleInit cache report:\n",
  );
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(enforce ? 1 : 0);
}

console.log("Repository OnModuleInit cache check passed.");
