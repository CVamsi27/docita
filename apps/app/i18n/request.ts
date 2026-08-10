// check-as-cast-density: allow-file — routing.locales is a Locales tuple; cast to readonly string[] for the includes() guard. The same shape exists in apps/internal/i18n/request.ts; the cast is canonicalised here.
import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

/**
 * Phase 6.1 scaffold → Phase 6.4 second locale.
 *
 * Resolves the active locale for the current request from the NEXT_LOCALE
 * cookie set by the locale switcher, falling back to the Accept-Language
 * header, then to the routing default. The dynamic import per locale keeps
 * each per-route bundle at the cost of only one messages file.
 *
 * Note: this must NOT call next-intl's getLocale() — that helper reads
 * config.locale via getConfig(), and calling it from inside the request
 * config would recurse forever (getConfig -> config fn -> getLocale ->
 * getConfig). There is no middleware / [locale] segment in this app, so the
 * locale is resolved from the request headers directly instead.
 */
export default getRequestConfig(async () => {
  let cookieLocale: string | undefined;
  try {
    const store = await cookies();
    cookieLocale = store.get("NEXT_LOCALE")?.value;
  } catch {
    // cookies() throws outside a request context (e.g. static prerender);
    // fall through to the header/default resolution.
  }

  let headerLocale: string | undefined;
  try {
    const requestHeaders = await headers();
    const accepted = (requestHeaders.get("accept-language") || "")
      .split(",")
      .map((part) => part.split(";")[0].trim());
    headerLocale = accepted.find((candidate) =>
      (routing.locales as readonly string[]).includes(candidate),
    );
  } catch {
    // headers() throws outside a request context; fall through to default.
  }

  const requested = cookieLocale ?? headerLocale;
  // Defence in depth: if the cookie/header ever carries an unknown value,
  // fall back to the configured default rather than crashing the request
  // with a missing module.
  const locale =
    requested && (routing.locales as readonly string[]).includes(requested)
      ? requested
      : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
