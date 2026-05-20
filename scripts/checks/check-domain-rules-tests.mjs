#!/usr/bin/env node

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import process from "node:process";

const enforce = process.argv.includes("--enforce");

const ruleFiles = execSync(
  'git ls-files "apps/api/src/domains/*/core/domain-services/*.rules.ts"',
  { encoding: "utf8" },
)
  .split("\n")
  .filter(Boolean);

const findings = [];

for (const file of ruleFiles) {
  const specFile = file.replace(/\.rules\.ts$/, ".rules.spec.ts");
  if (!existsSync(specFile)) {
    findings.push(
      `${file}: missing colocated unit test ${specFile}`,
    );
  }
}

if (findings.length > 0) {
  console.error(
    enforce ? "Domain rules test check failed.\n" : "Domain rules test report:\n",
  );
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(enforce ? 1 : 0);
}

console.log("Domain rules test check passed.");
