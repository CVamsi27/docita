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
 * Find function/component definitions with their source offsets, used to
 * attribute a `t:` prop marker to its owning component. Supports generic
 * signatures (`function Name<T>(...`).
 */
function functionDefs(source: string): Array<{ name: string; index: number }> {
  const defs: Array<{ name: string; index: number }> = [];
  for (const match of source.matchAll(
    /(?:export\s+)?function\s+([A-Za-z0-9_]+)\s*(?:<[^>]*>)?\s*\(|(?:export\s+)?const\s+([A-Za-z0-9_]+)\s*=\s*(?:\(|FC<)/g,
  )) {
    const name = match[1] || match[2];
    if (name) defs.push({ name, index: match.index });
  }
  return defs;
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

  it("every key used through a t-prop consumer resolves in both locales", async () => {
    // t-prop consumers receive `t` as a prop/parameter and call `t("key")`
    // without a useTranslation of their own (e.g. SelectField, DocumentActions,
    // TeamMemberNameRoleFields, buildDocumentsTableColumns). The keys they
    // resolve are scoped to the CALLER's namespace, so they must be traced
    // across the call site instead of the consumer file.
    const files: string[] = [];
    for await (const file of glob("src/**/*.{ts,tsx}")) {
      if (
        file.includes("test-utils") ||
        file.includes("__tests__") ||
        /\.(test|spec)\.tsx?$/.test(file)
      ) {
        continue;
      }
      files.push(file);
    }
    const sources = new Map<string, string>();
    for (const file of files) {
      sources.set(file, await readFile(file, "utf8"));
    }

    // 1. Find t-prop consumers: files with a `t: (key: string) => string`
    // marker, attributed to the owning function (nearest following def for
    // props-interface markers, nearest preceding def for inline param types).
    const consumers: Array<{
      file: string;
      name: string;
      keys: Set<string>;
    }> = [];
    for (const [file, text] of sources) {
      const defs = functionDefs(text);
      for (const mark of text.matchAll(/t:\s*\(key[^)]*\)\s*=>\s*string/g)) {
        const idx = mark.index;
        let owner: string | null = null;
        let ownerIndex = -1;
        for (const d of defs) {
          if (d.index > idx && (ownerIndex === -1 || d.index < ownerIndex)) {
            owner = d.name;
            ownerIndex = d.index;
          }
        }
        let prev: string | null = null;
        let prevIndex = -1;
        for (const d of defs) {
          if (d.index < idx && d.index > prevIndex) {
            prev = d.name;
            prevIndex = d.index;
          }
        }
        if (prev && (owner === null || idx - prevIndex < ownerIndex - idx)) {
          owner = prev;
          ownerIndex = prevIndex;
        }
        if (!owner) continue;
        if (consumers.some((c) => c.file === file && c.name === owner)) continue;

        // Body-scoped literal keys (between this def and the next def) plus
        // file-level labelKey/placeholderKey const tables.
        const nextDef = defs.find((d) => d.index > ownerIndex);
        const body = text.slice(ownerIndex, nextDef?.index ?? text.length);
        const keys = new Set<string>();
        for (const k of body.matchAll(/\bt\(\s*["'`]([A-Za-z0-9_.]+)["'`]/g)) {
          keys.add(k[1]);
        }
        for (const k of text.matchAll(
          /(?:labelKey|placeholderKey)\s*[:=]\s*["'`]([A-Za-z0-9_.]+)["'`]/g,
        )) {
          keys.add(k[1]);
        }
        consumers.push({ file, name: owner, keys });
      }
    }
    expect(consumers.length).toBeGreaterThan(5);

    // 2. For every call site passing t into a consumer, verify all consumer
    // keys resolve against the caller's namespace (+ scoped prefixes) in both
    // locales.
    const missing: string[] = [];
    for (const consumer of consumers) {
      for (const [callerFile, callerText] of sources) {
        if (callerFile === consumer.file) continue;
        const nsMatch = callerText.match(/useTranslation\(\s*"([A-Za-z.]+)"/);
        if (!nsMatch) continue;
        const ns = nsMatch[1];
        const prefixes = scopedPrefixes(callerText);
        const sites: number[] = [];
        const jsxRe = new RegExp(
          `<${consumer.name}[\\s\\S]{0,500}?\\bt=\\{([A-Za-z0-9_]+)\\}`, "g",
        );
        let mm: RegExpExecArray | null;
        while ((mm = jsxRe.exec(callerText)) !== null) sites.push(mm.index);
        const callRe = new RegExp(
          `${consumer.name}\\s*\\([\\s\\S]{0,500}?,\\s*t\\)`, "g",
        );
        while ((mm = callRe.exec(callerText)) !== null) sites.push(mm.index);
        if (sites.length === 0) continue;

        const siteKeys = new Set(consumer.keys);
        for (const idx of sites) {
          const site = callerText.slice(idx, idx + 700);
          for (const k of site.matchAll(
            /([A-Za-z]*[Kk]ey)\s*=\s*["'`]([A-Za-z0-9_.]+)["'`]/g,
          )) {
            siteKeys.add(k[2]);
          }
          for (const k of callerText.matchAll(
            /labelKey\s*:\s*["'`]([A-Za-z0-9_.]+)["'`]/g,
          )) {
            siteKeys.add(k[1]);
          }
        }

        for (const key of siteKeys) {
          const resolvedEn =
            hasKey(enResources, ns, key) ||
            prefixes.some((p) => hasKey(enResources, `${ns}.${p}`, key));
          const resolvedHi =
            hasKey(hiResources, ns, key) ||
            prefixes.some((p) => hasKey(hiResources, `${ns}.${p}`, key));
          if (!resolvedEn || !resolvedHi) {
            const reportNs = prefixes.length > 0 ? `${ns}.${prefixes[0]}` : ns;
            missing.push(
              `${reportNs}.${key} @ ${callerFile} > ${consumer.name} (en:${resolvedEn ? "ok" : "MISSING"}, hi:${resolvedHi ? "ok" : "MISSING"})`,
            );
          }
        }
      }
    }

    expect(missing, `missing t-prop keys:\n${missing.join("\n")}`).toEqual([]);
  });
});
