#!/usr/bin/env node

/**
 * Phase 15 check:button-primitive.
 *
 * Enforces AGENTS.md §4.3: "Use the `Button` primitive — never a raw
 * `<button>` styled with Tailwind classes — so variants, focus rings, and
 * disabled states stay consistent."
 *
 * The rule applies to the Vite SPA apps (`apps/app`, `apps/internal`)
 * in `src/features` and `src/components`. The primitive's own definition lives
 * in `packages/ui` and is out of scope. Test files and E2E specs may use raw
 * `<button>` (native HTML is acceptable for test mocks — documented
 * intentional divergence, see the jsx-button-primitive allowlist).
 *
 * Usage:
 *   node scripts/checks/check-button-primitive.mjs           # report only
 *   node scripts/checks/check-button-primitive.mjs --enforce # fail on findings
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const APPS = ["apps/app/src", "apps/internal/src"];
const RAW_BUTTON_RE = /<button\b/g;
const TEST_OR_E2E_RE = /(\.(spec|test)\.(ts|tsx)$|\/e2e\/)/;

const findings = [];

for (const root of APPS) {
  if (!existsSync(root)) continue;
  walk(root);
}

/** Recursively collect .tsx files, skipping test/e2e and node_modules. */
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      walk(full);
      continue;
    }
    if (!entry.name.endsWith(".tsx")) continue;
    if (TEST_OR_E2E_RE.test(full)) continue;

    const contents = readFileSync(full, "utf8");
    RAW_BUTTON_RE.lastIndex = 0;
    let match;
    while ((match = RAW_BUTTON_RE.exec(contents)) !== null) {
      const line = contents.slice(0, match.index).split("\n").length;
      findings.push(`${full}:${line}: raw <button> — use the Button primitive from @workspace/ui`);
    }
  }
}

if (findings.length > 0) {
  const enforce = process.argv.includes("--enforce");
  console.error(
    enforce
      ? "Button primitive check failed.\n"
      : "Button primitive check report:\n",
  );
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  console.error(
    "Replace raw <button> with the Button primitive (see AGENTS.md §4.3).",
  );
  process.exit(enforce ? 1 : 0);
}

console.log("Button primitive check passed.");
