import { defineRouting } from "next-intl/routing";

/**
 * Phase 6.1 scaffold → Phase 6.4 second locale.
 *
 * The Docita apps ship in English (en) and Hindi (hi). The default
 * locale stays "en" so existing users see no change. The
 * `localePrefix: "never"` config keeps the URL shape (e.g. /today,
 * /patients) unchanged — locale is selected via the NEXT_LOCALE
 * cookie that next-intl manages, falling back to the browser's
 * Accept-Language header. A locale switcher in the auth/sidebar
 * footer sets the cookie via router.replace.
 *
 * Adding a third locale later is a config-only change here plus a
 * new messages/<locale>.json. The provider, request config, and
 * component call sites are already in place.
 */
export const routing = defineRouting({
  locales: ["en", "hi"],
  defaultLocale: "en",
  localePrefix: "never",
});
