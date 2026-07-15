import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

/**
 * Phase 6.1 scaffold — server-side message loader. See apps/app/i18n/request.ts.
 */
export default getRequestConfig(async () => {
  const locale = routing.defaultLocale;
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
