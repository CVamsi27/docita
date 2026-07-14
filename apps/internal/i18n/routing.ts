import { defineRouting } from "next-intl/routing";

/**
 * Phase 6.1 scaffold — single-locale, no URL prefix. See apps/app/i18n/routing.ts.
 */
export const routing = defineRouting({
  locales: ["en"],
  defaultLocale: "en",
  localePrefix: "never",
});
