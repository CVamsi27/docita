#!/usr/bin/env node

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import process from "node:process";

const enforce = process.argv.includes("--enforce");

const FORBIDDEN = [
  /from\s+['"]axios['"]/,
  /from\s+['"]node-fetch['"]/,
  /from\s+['"]@nestjs\/axios['"]/,
  /(?<![.\w])fetch\s*\(/,
];

const ALLOWLIST = new Set([
  // Typed HTTP helpers must live in infrastructure adapters.
]);

const files = execSync('git ls-files "apps/api/src/domains/*/application/**/*.ts"', {
  encoding: "utf8",
})
  .split("\n")
  .filter(Boolean)
  .filter((file) => !/\.(spec|test)\.[tj]sx?$/.test(file))
  .filter((file) => !ALLOWLIST.has(file));

const findings = [];

for (const file of files) {
  if (!existsSync(file)) {
    continue;
  }
  const source = readFileSync(file, "utf8");
  for (const pattern of FORBIDDEN) {
    if (pattern.test(source)) {
      findings.push(
        `${file}: direct HTTP/SDK usage in application layer; move to infrastructure adapter`,
      );
      break;
    }
  }
}

if (findings.length > 0) {
  console.error(
    enforce
      ? "External SDK in application check failed.\n"
      : "External SDK in application report:\n",
  );
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(enforce ? 1 : 0);
}

console.log("External SDK in application check passed.");
