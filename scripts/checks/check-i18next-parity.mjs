#!/usr/bin/env node

/**
 * check:i18next-parity.
 *
 * Enforces exact en/hi leaf-key parity for the app-vite i18next message
 * bundle (AGENTS.md §3.1 / EXECUTION_PLAN Phase 11):
 *   - every en.json leaf must exist in hi.json — no untranslated UI strings;
 *   - hi.json must not contain leaves that en.json lacks — no dead
 *     translations left behind when English keys are dropped.
 *
 * Background: the 2026-08-02 i18n completion pass trimmed 494 hi-only dead
 * leaves and translated 318 keys that were missing from hi, reaching exact
 * parity (en 1,885 = hi 1,885). This check locks that state in so the next
 * en.json edit cannot silently regress Hindi coverage.
 *
 * Scope: apps/app-vite only. internal-vite is a documented English-only
 * admin portal with no en/hi bundle (PORTING_PLAN_APP_VITE.md).
 *
 * Usage:
 *   node scripts/checks/check-i18next-parity.mjs           # report only
 *   node scripts/checks/check-i18next-parity.mjs --enforce # fail on findings
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const MESSAGES_DIR = join(process.cwd(), "apps/app-vite/src/messages");
const EN_PATH = join(MESSAGES_DIR, "en.json");
const HI_PATH = join(MESSAGES_DIR, "hi.json");

/** Collect dotted leaf paths (e.g. "Dashboard.today.pageTitle"). */
function collectLeaves(obj, prefix = "", acc = []) {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      collectLeaves(value, path, acc);
    } else {
      acc.push(path);
    }
  }
  return acc;
}

const en = JSON.parse(readFileSync(EN_PATH, "utf8"));
const hi = JSON.parse(readFileSync(HI_PATH, "utf8"));

const enLeaves = collectLeaves(en);
const hiLeaves = collectLeaves(hi);
const enSet = new Set(enLeaves);
const hiSet = new Set(hiLeaves);

const missingFromHi = enLeaves.filter((key) => !hiSet.has(key));
const hiOnly = hiLeaves.filter((key) => !enSet.has(key));

if (missingFromHi.length > 0 || hiOnly.length > 0) {
  const enforce = process.argv.includes("--enforce");
  console.error(
    enforce
      ? "i18next parity check failed."
      : "i18next parity check report:",
  );
  for (const key of missingFromHi.slice(0, 25)) {
    console.error(`- missing from hi.json: ${key}`);
  }
  if (missingFromHi.length > 25) {
    console.error(`  … and ${missingFromHi.length - 25} more missing keys`);
  }
  for (const key of hiOnly.slice(0, 25)) {
    console.error(`- dead key in hi.json (absent from en.json): ${key}`);
  }
  if (hiOnly.length > 25) {
    console.error(`  … and ${hiOnly.length - 25} more dead keys`);
  }
  console.error(
    "Keep apps/app-vite/src/messages/en.json and hi.json leaf sets identical — add translations for new keys, remove dead keys when English keys are dropped.",
  );
  process.exit(enforce ? 1 : 0);
}

console.log(
  `i18next parity check passed (en ${enLeaves.length} = hi ${hiLeaves.length} leaves).`,
);
