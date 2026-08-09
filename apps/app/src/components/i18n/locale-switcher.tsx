import { useTranslation } from "react-i18next";
import { LocaleToggle } from "@workspace/ui/components/form/locale-toggle";
import {
  isLocale,
  persistLocale,
  readStoredLocale,
  type Locale,
} from "@/i18n/locale-utils";

/**
 * Locale switcher for the auth shell / sidebar footer. Composes the shared
 * {@link LocaleToggle} primitive with react-i18next wiring. Persists the
 * choice in localStorage and re-renders i18next strings immediately (SPA —
 * no cookie round-trip needed, unlike the Next.js NEXT_LOCALE implementation).
 */
export function LocaleSwitcher() {
  const { i18n } = useTranslation();
  const activeLocale = isLocale(i18n.resolvedLanguage)
    ? i18n.resolvedLanguage
    : readStoredLocale();

  function handleSwitch(nextLocale: Locale) {
    if (nextLocale === activeLocale) return;
    void i18n.changeLanguage(nextLocale);
    persistLocale(nextLocale);
  }

  return (
    <LocaleToggle locale={activeLocale} onLocaleChange={handleSwitch} />
  );
}
