#!/usr/bin/env node

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

const trackedFiles = execSync("git ls-files", { encoding: "utf8" })
  .split("\n")
  .filter(Boolean);

const blockedPatterns = [
  {
    pattern: /^apps\/[^/]+\/playwright-report\//,
    reason: "Playwright HTML reports must be CI/runtime artifacts only.",
  },
  {
    pattern: /^apps\/[^/]+\/test-results\//,
    reason: "Playwright test-results folders must not be committed.",
  },
  {
    pattern: /^apps\/[^/]+\/accessibility-reports\/.*\.json$/,
    reason: "Accessibility baselines are generated outputs.",
  },
  {
    pattern: /^logs\/performance\/.*\.json$/,
    reason: "Performance snapshots are generated outputs.",
  },
  {
    pattern: /^\.gitleaks-report\.json$/,
    reason: "Gitleaks reports are generated outputs.",
  },
  {
    pattern: /(^|\/)[^/]+\.(bak|old|tmp)$/,
    reason: "Backup and temporary files must not be committed.",
  },
  {
    pattern: /(^|\/)[^/]+\.log$/,
    reason: "Log files must not be committed.",
  },
  {
    pattern: /(^|\/)(scratch|tmp|temp|notes)\.txt$/,
    reason: "Scratch text files must not be committed.",
  },
];

const violations = [];

for (const file of trackedFiles) {
  if (!existsSync(file)) {
    continue;
  }

  for (const rule of blockedPatterns) {
    if (rule.pattern.test(file)) {
      violations.push({ file, reason: rule.reason });
      break;
    }
  }
}

if (violations.length > 0) {
  console.error("Repository hygiene check failed.\n");
  console.error(
    "The following generated/runtime artifacts are tracked and must be removed:",
  );

  for (const violation of violations) {
    console.error(` - ${violation.file} (${violation.reason})`);
  }

  console.error("\nRemove files from git and rerun: pnpm check:hygiene");
  process.exit(1);
}

console.log("Repository hygiene check passed.");
