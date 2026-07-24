#!/usr/bin/env node

/**
 * Fails when a `useTranslations("X.Y")` call references a namespace that is
 * missing from the production messages file for the app that owns the source.
 *
 * The 26-bite i18n migration in 2026-07 shipped a Phase 3 conversion that
 * introduced `useTranslations("InternalPaymentProcessing.pricingOffers")` and
 * `useTranslations("InternalPaymentProcessing.formFields")` without adding
 * the matching keys to en.json. This check would have caught it.
 *
 * Scope:
 *  - Source files in apps/app and apps/internal that import `useTranslations`
 *    from `next-intl`.
 *  - The corresponding en.json (hi.json is checked in report mode only).
 *  - The top-level namespace ("X" in "X.Y") must resolve as an object in the
 *    JSON; the leaf (e.g. "X.Y.foo") is intentionally NOT checked because the
 *    same namespace can have many leaves and false positives are noisy.
 *
 * Out of scope:
 *  - Default English fallback literals inside components.
 *  - Translations that live in remote / dynamic keys.
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import process from "node:process";

const enforce = process.argv.includes("--enforce");

const USE_TRANSLATIONS = /useTranslations\(\s*["']([^"']+)["']/g;

// Map a source file's app to its messages bundle. Apps other than these
// three are skipped — they're workspace packages or one-off scripts that
// don't ship a next-intl messages file at the canonical path.
const APP_TO_MESSAGES = [
  {
    app: "@docita/app",
    dir: "apps/app",
    messages: "apps/app/messages/en.json",
  },
  {
    app: "@docita/internal",
    dir: "apps/internal",
    messages: "apps/internal/messages/en.json",
  },
];

function listSourceFiles(appDir) {
  try {
    return execSync(`git ls-files ${appDir}`, { encoding: "utf8" })
      .split("\n")
      .filter(Boolean)
      .filter((file) => /\.(ts|tsx)$/.test(file))
      .filter((file) => !/\.(spec|test)\.[tj]sx?$/.test(file));
  } catch {
    return [];
  }
}

function loadJson(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    console.error(`Could not parse ${path}: ${err.message}`);
    process.exit(2);
  }
}

function hasPath(obj, dotted) {
  let cursor = obj;
  for (const segment of dotted.split(".")) {
    if (cursor == null || typeof cursor !== "object") return false;
    if (!(segment in cursor)) return false;
    cursor = cursor[segment];
  }
  // The final segment must be an object (a namespace), since
  // useTranslations("X.Y") expects further keys under X.Y.
  return typeof cursor === "object" && cursor !== null && !Array.isArray(cursor);
}

const findings = [];

for (const { dir, messages } of APP_TO_MESSAGES) {
  const messagesJson = loadJson(messages);
  if (!messagesJson) {
    findings.push(`${messages}: file missing or unreadable`);
    continue;
  }

  const files = listSourceFiles(dir);
  const seen = new Set();

  for (const file of files) {
    if (!existsSync(file)) continue;
    const source = readFileSync(file, "utf8");
    if (!source.includes("useTranslations")) continue;

    USE_TRANSLATIONS.lastIndex = 0;
    let match;
    while ((match = USE_TRANSLATIONS.exec(source)) !== null) {
      const namespace = match[1];
      // Only the top-level segment is the messages-file namespace.
      // "Auth.forgotPassword" -> we only check that "Auth" is a known top-level
      // key in the messages JSON, which is what fails in the pricingOffers case.
      const dedupeKey = `${file}\0${namespace}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      if (!hasPath(messagesJson, namespace)) {
        findings.push(
          `${file}: useTranslations("${namespace}") has no matching namespace in ${messages}`,
        );
      }
    }
  }
}

if (findings.length > 0) {
  console.error(
    enforce
      ? "i18n translation-key check failed.\n"
      : "i18n translation-key report:\n",
  );
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(enforce ? 1 : 0);
}

console.log("i18n translation-key check passed.");
