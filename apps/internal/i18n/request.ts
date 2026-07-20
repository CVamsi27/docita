// check-as-cast-density: allow-file — routing.locales is a Locales tuple; cast to readonly string[] for the includes() guard. Mirrors apps/app/i18n/request.ts; the cast is canonicalised there.
import { getLocale, getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

/**
 * Phase 6.1 scaffold → Phase 6.4 second locale. See
 * apps/app/i18n/request.ts for the full rationale.
 */
export default getRequestConfig(async () => {
  const requested = await getLocale();
  const locale = (routing.locales as readonly string[]).includes(requested)
    ? requested
    : routing.defaultLocale;
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
