#!/usr/bin/env node

/**
 * Phase 15 check:error-boundary-coverage.
 *
 * Enforces that every functional layout in `apps/app` wraps its content
 * in an error boundary (`ErrorBoundaryWrapper` or the `@workspace/ui`
 * `ErrorBoundary`). Only `*-layout.tsx` files are checked — helpers in the
 * layout directory (page-meta, providers, top-bar-actions, skeletons, ...)
 * are not route boundaries. RootLayout and ToolsLayout only render
 * `<Helmet>` + `<Outlet />` (no content of their own) and are allowlisted
 * with rationale (they render no content of their own).
 *
 * Usage:
 *   node scripts/checks/check-error-boundary-coverage.mjs           # report only
 *   node scripts/checks/check-error-boundary-coverage.mjs --enforce # fail
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const LAYOUT_DIR = path.join(process.cwd(), "apps/app/src/components/layout");
const ERROR_BOUNDARY_RE = /ErrorBoundary/;
// Layouts that render only <Helmet> + <Outlet /> — nothing to boundary-wrap.
const INTENTIONAL_WITHOUT_BOUNDARY = new Set([
  "root-layout.tsx",
  "tools-layout.tsx",
]);

const findings = [];

if (!existsSync(LAYOUT_DIR)) {
  console.log(
    "Error boundary coverage check passed (layout dir not present).",
  );
  process.exit(0);
}

for (const entry of readdirSync(LAYOUT_DIR, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith("-layout.tsx")) continue;
  if (INTENTIONAL_WITHOUT_BOUNDARY.has(entry.name)) continue;

  const full = path.join(LAYOUT_DIR, entry.name);
  const contents = readFileSync(full, "utf8");

  if (!ERROR_BOUNDARY_RE.test(contents)) {
    findings.push(
      `${entry.name}: layout has no error boundary — wrap content in ErrorBoundaryWrapper`,
    );
  }
}

if (findings.length > 0) {
  const enforce = process.argv.includes("--enforce");
  console.error(
    enforce
      ? "Error boundary coverage check failed.\n"
      : "Error boundary coverage check report:\n",
  );
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  console.error(
    "Wrap layout content in ErrorBoundaryWrapper from @/components/errors/error-boundary (AGENTS.md §4.3).",
  );
  process.exit(enforce ? 1 : 0);
}

console.log("Error boundary coverage check passed.");
