#!/usr/bin/env node

/**
 * Phase 15 check:zod-interface-parity.
 *
 * Enforces AGENTS.md §3.1: feature-local interfaces must not duplicate
 * `packages/types` Zod schemas — derive types with `z.infer` instead of
 * hand-writing parallel interfaces.
 *
 * Heuristic: for every `export interface X` declared in a Vite app feature
 * file, check whether a Zod schema in `packages/types` shares its stem
 * (schema name minus the `Schema` suffix). `Medication` and
 * `medicationDraftItemSchema` collide because the schema stem
 * (`medicationDraftItem`) starts with the interface name. This is a
 * name-collision heuristic, not a full shape comparison — good enough to
 * catch new parallel definitions.
 *
 * Documented intentional divergences (form-local shapes for complex
 * multi-field inputs, EXECUTION_PLAN Phase 9 — deferred) live in
 * `scripts/checks/allowlists/zod-interface-parity.json` as
 * `"relative/path:InterfaceName"` entries. Pre-existing collisions are
 * allowlisted there (ratchet); new parallel definitions must be fixed via
 * `z.infer` or added to the allowlist with a documented rationale.
 *
 * Usage:
 *   node scripts/checks/check-zod-interface-parity.mjs           # report only
 *   node scripts/checks/check-zod-interface-parity.mjs --enforce # fail
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const REPO_ROOT = process.cwd();
const APPS = ["apps/app-vite/src", "apps/internal-vite/src"];
const TYPES_DIR = path.join(REPO_ROOT, "packages/types/src");
const ALLOWLIST_PATH = path.join(
  REPO_ROOT,
  "scripts/checks/allowlists/zod-interface-parity.json",
);
const INTERFACE_RE = /export interface (\w+)/g;

let allowlist = [];
if (existsSync(ALLOWLIST_PATH)) {
  allowlist = JSON.parse(readFileSync(ALLOWLIST_PATH, "utf8"));
}
// Allowlist entries may be plain strings (legacy) or { id, reason } objects
// with a documented rationale per the repo allowlist convention.
const allowlistSet = new Set(
  allowlist.map((entry) =>
    typeof entry === "string" ? entry : entry.id,
  ),
);

// Collect Zod schema stems: "admissionSchema" -> "admission".
const schemaStems = new Set();
if (existsSync(TYPES_DIR)) {
  walkTypes(TYPES_DIR);
}

function walkTypes(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkTypes(full);
      continue;
    }
    if (!entry.name.endsWith(".ts")) continue;
    const contents = readFileSync(full, "utf8");
    for (const match of contents.matchAll(/export const (\w+Schema)\b/g)) {
      const stem = match[1].replace(/Schema$/, "").toLowerCase();
      schemaStems.add(stem);
    }
  }
}

const findings = [];

for (const appRoot of APPS) {
  if (!existsSync(appRoot)) continue;
  walkFeatures(appRoot, appRoot);
}

function walkFeatures(baseDir, dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFeatures(baseDir, full);
      continue;
    }
    if (!entry.name.endsWith(".ts") && !entry.name.endsWith(".tsx")) continue;
    if (/\.(spec|test)\./.test(entry.name)) continue;

    const contents = readFileSync(full, "utf8");
    if (!contents.includes("interface ")) continue;

    INTERFACE_RE.lastIndex = 0;
    let match;
    while ((match = INTERFACE_RE.exec(contents)) !== null) {
      const iface = match[1];
      if (!schemaStems.has(iface.toLowerCase())) continue;

      const rel = path.relative(REPO_ROOT, full);
      const key = `${rel}:${iface}`;
      if (allowlistSet.has(key)) continue;

      findings.push(
        `${rel}: interface ${iface} collides with a packages/types Zod schema — derive via z.infer instead (or add to the parity allowlist with a documented rationale)`,
      );
    }
  }
}

if (findings.length > 0) {
  const enforce = process.argv.includes("--enforce");
  console.error(
    enforce
      ? "Zod interface parity check failed.\n"
      : "Zod interface parity check report:\n",
  );
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  console.error(
    "Use z.infer from packages/types for data shapes (AGENTS.md §3.1).",
  );
  process.exit(enforce ? 1 : 0);
}

console.log("Zod interface parity check passed.");
