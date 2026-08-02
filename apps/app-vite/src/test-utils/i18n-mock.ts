import type { ReactNode } from "react";
import en from "@/messages/en.json";

type MessageTree = { [key: string]: string | MessageTree };

const resources = en as MessageTree;

/**
 * Resolve an i18next key (relative to `namespace` when given, otherwise a
 * fully-qualified path) against the real en.json resources. Falls back to the
 * raw key so missing translations render visibly instead of throwing.
 */
function lookup(namespace: string | undefined, key: string): string {
  let node: unknown = namespace ? resources[namespace] : resources;
  if (node === undefined) node = resources;
  for (const part of key.split(".")) {
    if (typeof node !== "object" || node === null) return key;
    node = (node as MessageTree)[part];
    if (node === undefined) return key;
  }
  return typeof node === "string" ? node : key;
}

/**
 * Apply the app's ICU-style message syntax to a resolved string. The i18n
 * init (src/i18n/index.ts) configures `interpolation: { prefix: "{", suffix:
 * "}" }`, so messages use single-brace params ("{name}") and ICU plural
 * forms ("{count, plural, one {…} other {…}}"). Classic double-brace
 * ("{{name}}") is also handled for robustness.
 */
function applySyntax(
  value: string,
  options: Record<string, unknown>,
): string {
  let out = value;
  // Classic i18next double-brace first (never appears inside ICU branches).
  out = out.replace(/\{\{([a-zA-Z_]+)\}\}/g, (match, name) =>
    name in options ? String(options[name]) : match,
  );
  // ICU plural: {count, plural, one {…} other {…}} — English cardinals only.
  out = out.replace(
    /\{([a-zA-Z_]+),\s*plural,\s*one\s*\{((?:[^{}]|\{[^{}]*\})*)\}\s*other\s*\{((?:[^{}]|\{[^{}]*\})*)\}\}/g,
    (_, name, one, other) => {
      const count = Number(options[name]);
      return count === 1 ? one : other;
    },
  );
  // ICU-style single-brace interpolation.
  out = out.replace(/\{([a-zA-Z_]+)\}/g, (match, name) =>
    name in options ? String(options[name]) : match,
  );
  return out;
}

/**
 * Shared react-i18next mock for unit tests, backed by the real en.json
 * resources so assertions can match the actual English UI copy (e.g.
 * `getByText("Unknown")` for `t("orders.unknown")`). Registered globally in
 * `vitest.setup.ts`; test files that need different behavior can still
 * `vi.mock("react-i18next", ...)` locally to override it.
 *
 * Supported syntax (mirrors the app's i18n init in `src/i18n/index.ts`):
 * namespaced keys (`useTranslation("LabTests")` + `t("orders.x")`),
 * ICU-style single-brace params (`{name}`), and `{count, plural, one {…}
 * other {…}}` English cardinals only. Anything else (other locales, `zero`/
 * `=0`/`few`/`many` plural forms, `returnObjects`) is intentionally not
 * implemented — override the mock in-file for specs that need real i18next
 * behavior. Missing keys resolve to the raw key so they stay visible in
 * assertions instead of failing silently.
 */
export function createI18nMock() {
  return {
    useTranslation: (namespace?: string) => {
      const t = (key: string, options?: Record<string, unknown>): string => {
        const value = lookup(namespace, key);
        return options ? applySyntax(value, options) : value;
      };
      return {
        t,
        i18n: { language: "en", changeLanguage: async () => undefined },
      };
    },
    initReactI18next: { type: "3rdParty", init: () => undefined },
    I18nextProvider: ({ children }: { children: ReactNode }) => children,
    Trans: ({ children }: { children?: ReactNode }) => children ?? null,
  };
}
