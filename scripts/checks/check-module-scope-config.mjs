#!/usr/bin/env node

import { readFileSync } from "node:fs";
import process from "node:process";

const enforce = process.argv.includes("--enforce");

const forbiddenPatterns = [
  {
    file: "apps/api/src/shared/modules/config/app-config.ts",
    pattern: /let\s+validatedEnv\b/,
    message:
      "Use EnvConfigStore in env-config.store.ts instead of module-scope validatedEnv",
  },
];

const findings = [];

for (const { file, pattern, message } of forbiddenPatterns) {
  try {
    const source = readFileSync(file, "utf8");
    if (pattern.test(source)) {
      findings.push(`${file}: ${message}`);
    }
  } catch {
    findings.push(`${file}: could not read file for module-scope config check`);
  }
}

if (findings.length > 0) {
  console.error(
    enforce ? "Module-scope config check failed.\n" : "Module-scope config report:\n",
  );
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(enforce ? 1 : 0);
}

console.log("Module-scope config check passed.");
