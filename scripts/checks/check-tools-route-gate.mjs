#!/usr/bin/env node
// Ensures (tools)/ stays a dev-only surface.
// SYSTEM_DESIGN_AND_PATTERNS.md §56 item 54.
//
// 1. The (tools)/ layout must call notFound() unless tools are enabled.
// 2. No production-facing feature should live under (tools)/.
//    Known dev-only feature prefixes are allowlisted below.

import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const TOOLS_DIR = join(REPO_ROOT, "apps/app/app/(tools)");
const TOOLS_LAYOUT = join(TOOLS_DIR, "layout.tsx");

const ALLOWED_TOOL_DIRS = new Set([
  "visual-test",
]);

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!(await exists(TOOLS_DIR))) {
    console.log("[tools-route-gate] (tools)/ directory not present — OK.");
    return;
  }

  const layoutSource = await readFile(TOOLS_LAYOUT, "utf8").catch(() => "");
  if (!layoutSource.includes("notFound()")) {
    console.error(
      "[tools-route-gate] apps/app/app/(tools)/layout.tsx must call notFound() when tools are disabled.",
    );
    process.exitCode = 1;
  }

  const entries = await readdir(TOOLS_DIR, { withFileTypes: true });
  const unexpected = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith("_")) continue;
    if (ALLOWED_TOOL_DIRS.has(entry.name)) continue;
    unexpected.push(entry.name);
  }
  if (unexpected.length) {
    console.error(
      `[tools-route-gate] Production-looking feature(s) found under apps/app/app/(tools)/:`,
    );
    for (const dir of unexpected) {
      console.error(
        `  - ${relative(REPO_ROOT, join(TOOLS_DIR, dir))}  (move to a production route group)`,
      );
    }
    console.error(
      "If this is intentional dev tooling, add the directory to ALLOWED_TOOL_DIRS in this script.",
    );
    process.exitCode = 1;
  } else if (!process.exitCode) {
    console.log("[tools-route-gate] OK");
  }
}

main().catch((err) => {
  console.error("[tools-route-gate] failed:", err);
  process.exit(2);
});
