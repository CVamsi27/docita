import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "../messages/en.json";
import hi from "../messages/hi.json";
import { DEFAULT_LOCALE, isLocale } from "@/components/i18n/locale-switcher";

function resolveInitialLocale(): string {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const raw = window.localStorage.getItem("docita_locale");
    return isLocale(raw) ? raw : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
  },
  lng: resolveInitialLocale(),
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
    // Messages are ICU-style (ported from the Next.js next-intl corpus),
    // e.g. "{age}y". Match that syntax so t() params interpolate.
    prefix: "{",
    suffix: "}",
  },
});

export default i18n;
