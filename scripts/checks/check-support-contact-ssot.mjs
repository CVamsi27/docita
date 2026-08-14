#!/usr/bin/env node

import { readFileSync } from "node:fs";
import {
  gitLsSourceFiles,
  reportFindingsAndExit,
} from "../lib/check-runner.mjs";

const SUPPORT_EMAIL = "support@docita.work";
const allowedFiles = new Set([
  "packages/types/src/shared/support-contact.ts",
  "apps/app/src/lib/constants/support-contact.ts",
  "apps/api/src/shared/common/constants/support-contact.constants.ts",
  "scripts/checks/check-support-contact-ssot.mjs",
]);

const files = gitLsSourceFiles(["apps", "packages", "scripts"], {
  extensions: [".ts", ".tsx", ".astro", ".mjs", ".js"],
  exclude: [/\.(test|spec)\.(?:[cm]?js|[tj]sx?)$/],
}).filter((file) => !allowedFiles.has(file));

const violations = [];

for (const file of files) {
  let source;
  try {
    source = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  const index = source.indexOf(SUPPORT_EMAIL);
  if (index === -1) continue;
  const line = source.slice(0, index).split(/\r?\n/).length;
  violations.push(`${file}:${line} hardcoded ${SUPPORT_EMAIL}`);
}

reportFindingsAndExit("Support contact SSOT check", violations, {
  failAlways: true,
  extraMessage:
    "Import SUPPORT_EMAIL from @workspace/types or the app/API compatibility re-export.",
});
