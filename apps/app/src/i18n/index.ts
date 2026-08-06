import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "../messages/en.json";
import hi from "../messages/hi.json";
import {
  DEFAULT_LOCALE,
  isLocale,
  isMessageTree,
  type MessageTree,
} from "@/i18n/locale-utils";

/**
 * Register each top-level message section (and its object-valued children) as
 * an i18next namespace so `useTranslation("Auth")` / `useTranslation("Auth.signIn")`
 * resolve against the matching subtree. The messages corpus is sectioned
 * (`Auth.signIn.welcomeTitle`, `Patients.abhaField.label`, ...), and every
 * consumer addresses sections via the namespace argument — a single flat
 * `translation` namespace would make every lookup fall back to the key.
 */
export function buildResources<T extends MessageTree>(
  tree: T,
): Record<string, MessageTree> {
  const resources: Record<string, MessageTree> = {};
  const visit = (node: MessageTree, path: string) => {
    for (const [key, value] of Object.entries(node)) {
      if (!isMessageTree(value)) continue;
      const next = path ? `${path}.${key}` : key;
      resources[next] = value;
      visit(value, next);
    }
  };
  visit(tree, "");
  return resources;
}

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
    en: buildResources(en),
    hi: buildResources(hi),
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
