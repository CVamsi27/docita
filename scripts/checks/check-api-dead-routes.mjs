#!/usr/bin/env node
// Advisory check: identify API controller routes that no client (frontend
// hook, internal admin, or E2E spec) references.
//
// SYSTEM_DESIGN_AND_PATTERNS.md §28.2 item 21.
// Heuristic — false positives are possible. Output is informational.

import { execSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");

const CONTROLLER_GLOBS = [
  "apps/api/src/**/*.controller.ts",
];

const CALLER_ROOTS = [
  "packages/data-access/src",
  "apps/api/test",
  "apps/app/e2e",
  "apps/internal/e2e",
  "apps/landing/e2e",
];

function lsControllers() {
  return execSync(
    `git ls-files ${CONTROLLER_GLOBS.map((g) => `'${g}'`).join(" ")}`,
    { cwd: REPO_ROOT, encoding: "utf8" },
  )
    .split("\n")
    .filter(Boolean)
    .filter((f) => !/\.spec\.ts$/.test(f));
}

const ROUTE_RE =
  /@(?:Get|Post|Put|Patch|Delete|Options|Head)\s*\(\s*['"`]([^'"`]*)['"`]?/g;
const CONTROLLER_RE = /@Controller\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/;

async function collectRoutes() {
  const files = lsControllers();
  const routes = [];
  for (const file of files) {
    const source = await readFile(join(REPO_ROOT, file), "utf8");
    const ctrlMatch = source.match(CONTROLLER_RE);
    const base = ctrlMatch ? ctrlMatch[1].replace(/^\/|\/$/g, "") : "";
    for (const m of source.matchAll(ROUTE_RE)) {
      const sub = (m[1] ?? "").replace(/^\/|\/$/g, "");
      const path = [base, sub].filter(Boolean).join("/");
      routes.push({ file, path });
    }
  }
  return routes;
}

function clientHaystack() {
  let combined = "";
  for (const root of CALLER_ROOTS) {
    try {
      const out = execSync(
        `git ls-files '${root}' | xargs cat 2>/dev/null || true`,
        { cwd: REPO_ROOT, encoding: "utf8" },
      );
      combined += out + "\n";
    } catch {
      // ignore
    }
  }
  return combined;
}

function looksReferenced(path, haystack) {
  if (!path) return true;
  const segments = path
    .split("/")
    .filter((seg) => !seg.startsWith(":") && !seg.includes("{"))
    .filter(Boolean);
  if (segments.length === 0) return true;
  // Require at least the most distinctive segment to appear somewhere.
  const distinctive = segments[segments.length - 1];
  if (!distinctive) return true;
  return haystack.includes(distinctive);
}

async function main() {
  const routes = await collectRoutes();
  const haystack = clientHaystack();
  const orphans = routes.filter(({ path }) => !looksReferenced(path, haystack));

  if (orphans.length === 0) {
    console.log(
      `[api-dead-routes] OK — ${routes.length} routes, no orphan candidates.`,
    );
    return;
  }
  console.warn(
    `[api-dead-routes] ADVISORY: ${orphans.length} routes have no obvious client reference`,
  );
  for (const { file, path } of orphans.slice(0, 100)) {
    console.warn(`  /${path}  (${file})`);
  }
  if (orphans.length > 100) {
    console.warn(`  ... and ${orphans.length - 100} more`);
  }
  console.warn(
    "Review and either (a) remove the route, (b) wire it into packages/data-access, or (c) add a justification comment in the controller.",
  );
}

main().catch((err) => {
  console.error("[api-dead-routes] failed:", err);
  process.exit(2);
});
