import type { ReactNode } from "react";
import { enMessages } from "@/messages";
import { isMessageTree, type MessageTree } from "@/i18n/locale-utils";

const resources: MessageTree = isMessageTree(enMessages) ? enMessages : {};

/**
 * Resolve an i18next key (relative to `namespace` when given, otherwise a
 * fully-qualified path) against the real en.json resources. Namespaces may
 * be dotted (e.g. `useTranslation("Patients.addPatientDialog")`).
 * Returns `undefined` when the key is absent so callers can decide how to
 * fall back (`lookup` renders the raw key; plural resolution tries a suffix).
 */
function lookupOptional(namespace: string | undefined, key: string): string | undefined {
  const path = namespace ? [...namespace.split("."), ...key.split(".")] : key.split(".");
  let node: unknown = resources;
  for (const part of path) {
    if (!isMessageTree(node)) return undefined;
    node = node[part];
    if (node === undefined) return undefined;
  }
  return typeof node === "string" ? node : undefined;
}

/**
 * Resolve a message like i18next does: the exact key first, then the English
 * cardinal plural suffix (`key_one` / `key_other`) when `count` is supplied.
 * Returns `undefined` when neither form resolves.
 */
function resolveMessage(
  namespace: string | undefined,
  key: string,
  params?: Record<string, unknown>,
): string | undefined {
  const direct = lookupOptional(namespace, key);
  if (direct !== undefined) return direct;

  if (params && "count" in params) {
    const suffix = Number(params.count) === 1 ? "one" : "other";
    return lookupOptional(namespace, `${key}_${suffix}`);
  }

  return undefined;
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
 * i18next cardinal plural suffixes (`key_one` / `key_other` with `count`),
 * ICU-style single-brace params (`{name}`), and legacy
 * `{count, plural, one {…} other {…}}` English cardinals. Anything else
 * (other locales, `zero`/`=0`/`few`/`many` plural forms, `returnObjects`) is
 * intentionally not implemented — override the mock in-file for specs that
 * need real i18next behavior. Missing keys resolve to the raw key so they
 * stay visible in assertions instead of failing silently.
 */
export function createI18nMock() {
  return {
    useTranslation: (namespace?: string) => {
      // i18next accepts either a params object or a default value string as
      // the second argument; the default is only used when the key is absent.
      const t = (
        key: string,
        options?: Record<string, unknown> | string,
      ): string => {
        const defaultValue = typeof options === "string" ? options : undefined;
        const params =
          typeof options === "object" && options !== null
            ? options
            : undefined;
        const message =
          resolveMessage(namespace, key, params) ?? defaultValue ?? key;
        return params ? applySyntax(message, params) : message;
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
