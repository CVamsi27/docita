import { defineRouting } from "next-intl/routing";

/**
 * Phase 6.1 scaffold — single-locale, no URL prefix.
 *
 * The Docita apps currently ship in English only. This routing config
 * pins the default locale to "en" and uses `localePrefix: "never"` so
 * the URL shape (e.g. /today, /patients) is unchanged. Adding a second
 * locale later will be a config-only change here plus a new
 * messages/<locale>.json; the provider, request config, and component
 * call sites will already be in place.
 */
export const routing = defineRouting({
  locales: ["en"],
  defaultLocale: "en",
  localePrefix: "never",
});
