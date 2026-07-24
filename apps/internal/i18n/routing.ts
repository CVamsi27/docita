import { defineRouting } from "next-intl/routing";

/**
 * Phase 6.1 scaffold → Phase 6.4 second locale. Mirrors
 * apps/app/i18n/routing.ts — see that file for the full rationale.
 */
export const routing = defineRouting({
  locales: ["en", "hi"],
  defaultLocale: "en",
  localePrefix: "never",
});
