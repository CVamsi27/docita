import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import {
  isLocale,
  persistLocale,
  readStoredLocale,
  type Locale,
} from "@/i18n/locale-utils";

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

  function handleSwitch(nextLocale: Locale) {
    if (nextLocale === activeLocale) return;
    void i18n.changeLanguage(nextLocale);
    persistLocale(nextLocale);
  }

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
        हिंदी
      </Button>
      <span className="sr-only">Active language: {activeLabel}</span>
    </div>
  );
}
