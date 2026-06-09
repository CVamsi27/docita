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
  /^apps\/app\/shared\/lib\/api\/api-client\.ts$/,
  /^apps\/app\/shared\/lib\/api\/api-availability\.ts$/,
  /^apps\/app\/shared\/lib\/auth\/fetch-with-session\.ts$/,
  /^apps\/app\/shared\/lib\/auth\/browser-session\.ts$/,
  /^apps\/app\/shared\/lib\/auth\/browser-request\.ts$/,
];

const files = gitLsSourceFiles(["apps/app"], {
  extensions: [".ts", ".tsx"],
  exclude: [/\.(test|spec)\.[tj]sx?$/, ...allowedPatterns],
});

const violations = [];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    if (!/\bfetch\s*\(/.test(line)) return;
    violations.push(`${file}:${index + 1} ${line.trim()}`);
  });
}

reportFindingsAndExit("Frontend fetch boundary check", violations, {
  extraMessage:
    "Client features must use packages/data-access hooks or the approved app API wrappers.",
});
