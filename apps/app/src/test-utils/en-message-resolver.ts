import en from "@/messages/en.json";
import { isMessageTree } from "@/i18n/locale-utils";

/**
 * Resolve a `section.key` (relative to the given root namespace) against the
 * real en.json for pure helper unit tests that receive `t` as a parameter.
 * Mirrors how the audit resolves `t("section.key")` against the caller's
 * bound namespace (e.g. `useTranslation("MedicalDocuments")` + `t(...)`).
 * Returns the raw key on miss.
 */
export function createEnMessageResolver(ns: string) {
  return (key: string): string => {
    let node: unknown = en;
    for (const part of [ns, ...key.split(".")]) {
      if (!isMessageTree(node)) return key;
      node = node[part];
      if (node === undefined) return key;
    }
    return typeof node === "string" ? node : key;
  };
}
