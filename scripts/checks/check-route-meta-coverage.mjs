#!/usr/bin/env node
// Blocking check: every page under apps/app/app/(protected)/**/page.tsx
// should have a matching entry in apps/app/app/(protected)/route-meta.ts.
//
// Background: SYSTEM_DESIGN_AND_PATTERNS.md §56 item 44 — route-meta.ts
// is hand-maintained alongside the file tree. This script catches drift.

import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const PROTECTED_DIR = join(REPO_ROOT, "apps/app/app/(protected)");
const META_FILE = join(PROTECTED_DIR, "route-meta.ts");

async function walk(dir, acc = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.startsWith("_")) continue;
      await walk(full, acc);
    } else if (entry.name === "page.tsx" || entry.name === "page.ts") {
      acc.push(full);
    }
  }
  return acc;
}

function pageFileToRoute(pageFile) {
  const rel = relative(PROTECTED_DIR, pageFile)
    .replace(/\\/g, "/")
    .replace(/\/page\.tsx?$/, "");
  if (rel === "") return "/";
  return (
    "/" +
    rel
      .split("/")
      .filter((segment) => !segment.startsWith("(") || !segment.endsWith(")"))
      .join("/")
  );
}

async function readRoutesFromMeta() {
  const text = await readFile(META_FILE, "utf8");
  const matches = text.matchAll(/"((?:\/|\$)[^"]+)"\s*:\s*\{/g);
  const routes = new Set();
  for (const m of matches) {
    routes.add(m[1]);
  }
  return routes;
}

async function main() {
  const pages = await walk(PROTECTED_DIR);
  const declared = await readRoutesFromMeta();
  const undocumented = [];
  for (const page of pages) {
    const route = pageFileToRoute(page);
    if (route === "/") continue;
    if (!declared.has(route)) {
      undocumented.push({ route, file: relative(REPO_ROOT, page) });
    }
  }
  if (undocumented.length === 0) {
    console.log(
      `[route-meta-coverage] OK — ${pages.length} pages, ${declared.size} declared.`,
    );
    return;
  }
  console.error(
    `[route-meta-coverage] ${undocumented.length} pages are missing route-meta entries`,
  );
  for (const { route, file } of undocumented) {
    console.error(`  ${route}  (${file})`);
  }
  console.error("Add entries to apps/app/app/(protected)/route-meta.ts.");
  process.exitCode = 1;
}

main().catch((err) => {
  console.error("[route-meta-coverage] failed:", err);
  process.exitCode = 2;
});
