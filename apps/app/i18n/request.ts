import { getLocale, getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

/**
 * Phase 6.1 scaffold → Phase 6.4 second locale.
 *
 * Resolves the active locale for the current request via next-intl's
 * getLocale(), which checks the NEXT_LOCALE cookie set by the
 * locale switcher, then falls back to the Accept-Language header,
 * then to the routing default. The dynamic import per locale keeps
 * each per-route bundle at the cost of only one messages file.
 */
export default getRequestConfig(async () => {
  const requested = await getLocale();
  // Defence in depth: if next-intl ever returns an unknown value,
  // fall back to the configured default rather than crashing the
  // request with a missing module.
  const locale = (routing.locales as readonly string[]).includes(requested)
    ? requested
    : routing.defaultLocale;
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
