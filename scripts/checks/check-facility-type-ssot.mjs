#!/usr/bin/env node

import { readFileSync } from "node:fs";
import {
  gitLsSourceFiles,
  reportFindingsAndExit,
} from "../lib/check-runner.mjs";

const allowedFiles = new Set([
  "packages/types/src/shared/users/roles.ts",
  "scripts/checks/check-facility-type-ssot.mjs",
]);

const files = gitLsSourceFiles(["apps", "packages"], {
  extensions: [".ts", ".tsx", ".astro"],
  exclude: [/\.(test|spec)\.[tj]sx?$/],
}).filter((file) => !allowedFiles.has(file));

const rules = [
  {
    name: "duplicate facility z.enum",
    pattern:
      /z\.enum\(\s*\[\s*["']CLINIC["']\s*,\s*["']HOSPITAL["']\s*\]\s*\)/g,
  },
  {
    name: "duplicate facility tuple",
    pattern: /readonly\s+\[\s*["']CLINIC["']\s*,\s*["']HOSPITAL["']\s*\]/g,
  },
  {
    name: "duplicate facility union",
    pattern: /["']CLINIC["']\s*\|\s*["']HOSPITAL["']/g,
  },
];

const violations = [];

for (const file of files) {
  let source;
  try {
    source = readFileSync(file, "utf8");
  } catch {
    continue;
  }

  for (const rule of rules) {
    for (const match of source.matchAll(rule.pattern)) {
      const line = source.slice(0, match.index).split(/\r?\n/).length;
      violations.push(`${file}:${line} ${rule.name}`);
    }
  }
}

reportFindingsAndExit("Facility type SSOT check", violations, {
  failAlways: true,
  extraMessage:
    "Use facilityTypeSchema, facilityTypeSchema.options, or FacilityTypeType from @workspace/types.",
});
