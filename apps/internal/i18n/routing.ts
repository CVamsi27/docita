import { defineRouting } from "next-intl/routing";

/**
 * Phase 6.1 scaffold — single-locale, no URL prefix.
 *
 * Mirrors apps/app/i18n/routing.ts. See that file for the full rationale.
 */
export const routing = defineRouting({
  locales: ["en"],
  defaultLocale: "en",
  localePrefix: "never",
});
