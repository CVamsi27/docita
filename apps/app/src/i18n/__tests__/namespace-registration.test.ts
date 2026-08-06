import { describe, expect, it } from "vitest";
import { glob, readFile } from "node:fs/promises";
import { buildResources } from "../index";
import en from "@/messages/en.json";
import hi from "@/messages/hi.json";

/**
 * Resolve a dotted key inside a namespace subtree the same way i18next does:
 * walk the path segments and require the final value to be a string.
 */
function hasKey(tree: unknown, ns: string, key: string): boolean {
  const root =
    typeof tree === "object" && tree !== null
      ? (tree as Record<string, unknown>)[ns]
      : undefined;
  if (root === undefined) return false;
  let node: unknown = root;
  for (const part of key.split(".")) {
    if (typeof node !== "object" || node === null) return false;
    node = (node as Record<string, unknown>)[part];
    if (node === undefined) return false;
  }
  return typeof node === "string";
}

/**
 * Detect scoped-helper prefixes: components like the consultation sections
 * define `(key) => t(`cardiologyExam.${key}`)` and then call `t("title")`.
 * Those bare keys resolve against the scoped prefix, not the bare namespace.
 */
function scopedPrefixes(source: string): string[] {
  const prefixes = new Set<string>();
  for (const match of source.matchAll(/t\(`([A-Za-z0-9_.]+)\.\$\{key\}`/g)) {
    prefixes.add(match[1]);
  }
  return [...prefixes];
}

/**
 * Every `useTranslation("<namespace>")` call in the app must resolve against
 * the resources registered by `buildResources`. This test walks the real
 * source and the real message corpus together, so a new section namespace or
 * a renamed message section fails the build instead of silently rendering
 * English (the regression this suite guards against: a flat `translation`
 * namespace made every section lookup fall back to the key).
 */
describe("i18n namespace registration", () => {
  const enResources = buildResources(en);
  const hiResources = buildResources(hi);

  it("registers top-level sections and nested section subtrees as namespaces", () => {
    // Auth.signIn is a nested section used via useTranslation("Auth.signIn")
    expect(enResources["Auth"]).toBeDefined();
    expect(enResources["Auth.signIn"]).toBeDefined();
    expect(enResources["Patients.abhaField"]).toBeDefined();
    expect(enResources["ClinicSettings.general"]).toBeDefined();
    expect(enResources["Auth.signIn"].welcomeTitle).toBe(
      "Welcome to Docita",
    );
    expect(hiResources["Auth.signIn"].welcomeTitle).toBe(
      "Docita में आपका स्वागत है",
    );
  });

  it("keeps en and hi namespace parity", () => {
    expect(Object.keys(enResources).sort()).toEqual(
      Object.keys(hiResources).sort(),
    );
  });

  it("every useTranslation namespace in source resolves in both locales", async () => {
    const files = [];
    for await (const file of glob("src/**/*.{ts,tsx}")) {
      files.push(file);
    }
    const { readFile } = await import("node:fs/promises");
    const namespaces = new Set<string>();
    for (const file of files) {
      if (file.includes("test")) continue;
      const text = await readFile(file, "utf8");
      const matches = text.matchAll(/useTranslation\(\s*"([A-Za-z.]+)"/g);
      for (const match of matches) namespaces.add(match[1]);
    }
    expect(namespaces.size).toBeGreaterThan(20);
    for (const ns of namespaces) {
      expect(
        enResources[ns],
        `namespace "${ns}" missing from en resources`,
      ).toBeDefined();
      expect(
        hiResources[ns],
        `namespace "${ns}" missing from hi resources`,
      ).toBeDefined();
    }
  });

  it("every registered namespace is a message tree (no empty/primitive entries)", () => {
    for (const [ns, tree] of Object.entries(enResources)) {
      expect(
        typeof tree === "object" && tree !== null && !Array.isArray(tree),
        `namespace "${ns}" is not a message tree`,
      ).toBe(true);
    }
  });

  it("every t() key in source resolves in both locales", async () => {
    const files: string[] = [];
    for await (const file of glob("src/**/*.{ts,tsx}")) {
      // Precise exclusions only — a bare "test" substring would silently drop
      // real feature dirs like src/features/lab-tests/ from the audit.
      if (
        file.includes("test-utils") ||
        file.includes("__tests__") ||
        /\.(test|spec)\.tsx?$/.test(file)
      ) {
        continue;
      }
      files.push(file);
    }

    const missing: string[] = [];
    for (const file of files) {
      const text = await readFile(file, "utf8");
      if (!text.includes("useTranslation")) continue;
      const prefixes = scopedPrefixes(text);
      let currentNs: string | null = null;
      const lines = text.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const nsMatch = line.match(/useTranslation\(\s*"([A-Za-z.]+)"/);
        if (nsMatch) currentNs = nsMatch[1];
        if (!currentNs) continue;
        for (const match of line.matchAll(/\bt\(\s*["'`]([A-Za-z0-9_.]+)["'`]/g)) {
          const key = match[1];
          // Direct namespace resolution first (full-path keys such as
          // "signIn.redirectingTitle" inside useTranslation("Auth")), then the
          // scoped-helper prefix fallback.
          const resolvedEn =
            hasKey(enResources, currentNs, key) ||
            prefixes.some((p) => hasKey(enResources, `${currentNs}.${p}`, key));
          const resolvedHi =
            hasKey(hiResources, currentNs, key) ||
            prefixes.some((p) => hasKey(hiResources, `${currentNs}.${p}`, key));
          if (!resolvedEn || !resolvedHi) {
            const reportNs =
              prefixes.length > 0 ? `${currentNs}.${prefixes[0]}` : currentNs;
            missing.push(
              `${reportNs}.${key} @ ${file}:${i + 1} (en:${resolvedEn ? "ok" : "MISSING"}, hi:${resolvedHi ? "ok" : "MISSING"})`,
            );
          }
        }
      }
    }

    expect(missing, `missing message keys:\n${missing.join("\n")}`).toEqual([]);
  });
});
