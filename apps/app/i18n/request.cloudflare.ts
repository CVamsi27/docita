import { getRequestConfig } from "next-intl/server";
// eslint-disable-next-line no-restricted-imports -- Cloudflare-only file; statically imports English messages to avoid bundling Hindi (153 KB)
import enMessages from "../messages/en.json";

/**
 * Cloudflare-specific i18n request config.
 *
 * Statically imports only English messages to avoid bundling the Hindi
 * messages file (153 KB) into the Cloudflare worker. The Hindi locale
 * is still available client-side via the NextIntlClientProvider, but
 * server-side rendering always uses English.
 *
 * This file is swapped in via webpack NormalModuleReplacementPlugin
 * when DOCITA_CLOUDFLARE=1.
 */
export default getRequestConfig(async () => {
  return {
    locale: "en",
    messages: enMessages,
  };
});
