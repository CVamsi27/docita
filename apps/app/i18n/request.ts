import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

/**
 * Phase 6.1 scaffold — server-side message loader.
 *
 * The default locale is pinned to "en" (see ./routing) so this always
 * loads messages/en.json. When a second locale is added, this is the
 * single place that decides which message bundle to return per request.
 */
export default getRequestConfig(async () => {
  const locale = routing.defaultLocale;
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
