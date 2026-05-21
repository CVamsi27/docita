#!/usr/bin/env node

import { execSync } from "node:child_process";
import process from "node:process";

const enforce = process.argv.includes("--enforce");
const LEGACY_HOOK_DIR = "apps/app/shared/hooks/api";

const files = execSync(`git ls-files "${LEGACY_HOOK_DIR}"`, {
  encoding: "utf8",
})
  .split("\n")
  .filter(Boolean)
  .filter((file) => /\.tsx?$/.test(file));

if (files.length > 0) {
  console.error(
    enforce
      ? "Legacy app API hooks check failed.\n"
      : "Legacy app API hooks report:\n",
  );
  console.error(
    `Remove ${LEGACY_HOOK_DIR}/ — use @workspace/data-access or feature hooks instead.`,
  );
  for (const file of files) {
    console.error(`- ${file}`);
  }
  process.exit(enforce ? 1 : 0);
}

console.log("Legacy app API hooks check passed.");
