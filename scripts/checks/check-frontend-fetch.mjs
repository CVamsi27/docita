#!/usr/bin/env node

import fs from "node:fs";
import {
  gitLsSourceFiles,
  reportFindingsAndExit,
} from "../lib/check-runner.mjs";

const allowedPatterns = [
  /^apps\/app\/middleware\.ts$/,
  /^apps\/internal\/middleware\.ts$/,
  /^packages\/utils\/src\/http\/upstream-api-proxy\.ts$/,
  /^apps\/(app|internal)\/shared\/lib\/api\//,
  /^apps\/(app|internal)\/shared\/lib\/auth\//,
  /^apps\/(app|internal)\/features\/[^/]+\/api\/[^/]+\.api\.ts$/,
];

const files = gitLsSourceFiles(["apps/app", "apps/internal"], {
  extensions: [".ts", ".tsx"],
  exclude: [/\.(test|spec)\.[tj]sx?$/, ...allowedPatterns],
});

const violations = [];
const forbiddenPatterns = [
  { name: "fetch", pattern: /\bfetch\s*(?:<[^>]+>)?\s*\(/ },
  { name: "apiFetch", pattern: /\bapiFetch\s*(?:<[^>]+>)?\s*\(/ },
  {
    name: "api client",
    pattern: /\bapi\.(?:get|post|put|patch|delete)\s*(?:<[^>]+>)?\s*\(/,
  },
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const forbidden of forbiddenPatterns) {
      if (!forbidden.pattern.test(line)) continue;
      violations.push(`${file}:${index + 1} ${forbidden.name}: ${line.trim()}`);
    }
  });
}

reportFindingsAndExit("Frontend API boundary check", violations, {
  extraMessage:
    "Feature code must use packages/data-access hooks or approved API adapters under shared/lib/api, shared/lib/auth, or features/*/api/*.api.ts.",
});
