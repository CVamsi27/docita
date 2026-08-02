import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";

const LOCALE_STORAGE_KEY = "docita_locale";

export const LOCALES = ["en", "hi"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export function isLocale(value: string | null | undefined): value is Locale {
  return LOCALES.includes(value as Locale);
}

export function readStoredLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const raw = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return isLocale(raw) ? raw : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function persistLocale(locale: Locale): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Storage unavailable (private mode) — locale still applies for the session
  }
}

/**
 * Locale switcher for the auth shell / sidebar footer. A minimal two-button
 * toggle (EN / हिंदी) next to the theme toggle. Persists the choice in
 * localStorage and re-renders i18next strings immediately (SPA — no cookie
 * round-trip needed, unlike the Next.js NEXT_LOCALE implementation).
 */
export function LocaleSwitcher() {
  const { i18n } = useTranslation();
  const activeLocale = isLocale(i18n.resolvedLanguage)
    ? i18n.resolvedLanguage
    : readStoredLocale();
  const otherLocale: Locale = activeLocale === "hi" ? "en" : "hi";

  function handleSwitch(nextLocale: Locale) {
    if (nextLocale === activeLocale) return;
    void i18n.changeLanguage(nextLocale);
    persistLocale(nextLocale);
  }

  const otherLabel = otherLocale === "hi" ? "हिंदी" : "EN";
  const activeLabel = activeLocale === "hi" ? "हिंदी" : "EN";

  return (
    <div className="flex items-center gap-1">
      <Languages
        className="h-3.5 w-3.5 text-muted-foreground"
        aria-hidden="true"
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs"
        aria-pressed={activeLocale === "en"}
        onClick={() => handleSwitch("en")}
      >
        EN
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs"
        aria-pressed={activeLocale === "hi"}
        onClick={() => handleSwitch("hi")}
      >
        {otherLabel}
      </Button>
      <span className="sr-only">Active language: {activeLabel}</span>
    </div>
  );
}
