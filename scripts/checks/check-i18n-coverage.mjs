#!/usr/bin/env node

/**
 * Phase 15 check:i18n-coverage.
 *
 * Enforces that every feature in the Vite SPA apps uses react-i18next for
 * user-facing strings (AGENTS.md §8.5 / EXECUTION_PLAN Phase 11): a feature
 * directory must contain at least one non-test source file importing
 * `useTranslation`, otherwise it is flagged.
 *
 * Intentional exceptions live in
 * `scripts/checks/allowlists/i18n-coverage.json` — currently `legal`, whose
 * documents (SLA, DPA, privacy policy) are English-only legal text with a
 * built-in en/hi language selector in `ConsentNoticeModal` and are
 * deliberately not routed through react-i18next.
 *
 * Scope: app-vite only. internal-vite is a documented English-only admin
 * portal with no en/hi message bundle (PORTING_PLAN_APP_VITE.md).
 *
 * Usage:
 *   node scripts/checks/check-i18n-coverage.mjs           # report only
 *   node scripts/checks/check-i18n-coverage.mjs --enforce # fail on findings
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";

// app-vite only: internal-vite is a documented English-only admin portal
// (PORTING_PLAN_APP_VITE.md — "internal-vite i18n: none"), so it has no
// en/hi message bundle and is intentionally excluded.
const APPS = ["apps/app-vite/src/features"];
const ALLOWLIST_PATH = path.join(
  process.cwd(),
  "scripts/checks/allowlists/i18n-coverage.json",
);
const USE_TRANSLATION_RE = /useTranslation/;
const TEST_RE = /\.(spec|test)\.(ts|tsx)$/;

let allowlist = [];
if (existsSync(ALLOWLIST_PATH)) {
  allowlist = JSON.parse(readFileSync(ALLOWLIST_PATH, "utf8"));
}

// Allowlist entries may be plain strings (legacy) or { id, reason } objects
// with a documented rationale per the repo allowlist convention.
const isAllowlisted = (name) =>
  allowlist.some((entry) =>
    typeof entry === "string" ? entry === name : entry.id === name,
  );

const findings = [];

for (const featuresRoot of APPS) {
  if (!existsSync(featuresRoot)) continue;
  for (const entry of readdirSync(featuresRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const featureDir = path.join(featuresRoot, entry.name);
    if (isAllowlisted(entry.name)) continue;
    if (!hasTranslationUsage(featureDir)) {
      findings.push(
        `${featuresRoot}/${entry.name}: no useTranslation usage in non-test source — add i18n keys or allowlist`,
      );
    }
  }
}

/** True when a non-test .ts/.tsx file under dir imports useTranslation. */
function hasTranslationUsage(dir) {
  for (const child of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, child.name);
    if (child.isDirectory()) {
      if (hasTranslationUsage(full)) return true;
      continue;
    }
    if (!/\.(ts|tsx)$/.test(child.name)) continue;
    if (TEST_RE.test(child.name)) continue;
    if (USE_TRANSLATION_RE.test(readFileSync(full, "utf8"))) return true;
  }
  return false;
}

if (findings.length > 0) {
  const enforce = process.argv.includes("--enforce");
  console.error(
    enforce ? "i18n coverage check failed.\n" : "i18n coverage check report:\n",
  );
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  console.error(
    "Add useTranslation + message keys for user-facing strings (see EXECUTION_PLAN Phase 11).",
  );
  process.exit(enforce ? 1 : 0);
}

console.log("i18n coverage check passed.");
