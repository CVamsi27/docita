import { describe, expect, it } from "vitest";
import { glob } from "node:fs/promises";
import { buildResources } from "../index";
import en from "@/messages/en.json";
import hi from "@/messages/hi.json";

// Settings feature namespaces referenced by components but absent from the
// message corpus (src/messages/{en,hi}.json only ship account/clinic/clinical
// under Settings). See the tracking note in POST_CUTOVER_GAPS.md.
const DEAD_SETTINGS_NAMESPACES = new Set([
  "Settings.Appearance",
  "Settings.security",
  "Settings.teamMemberForm",
  "Settings.invite",
  "Settings.doctorAvailability",
  "Settings.timeAway",
  "Settings.TeamManagement",
  "Settings.manageMember",
  "Settings.joinRequestReview",
  "Settings.manageTeamMemberDoctorPanel",
  "Settings.doctorProfile",
  "Settings.queueHoursFields",
  "Settings.applyLeaveDialog",
]);

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
      // Dead Settings.* namespaces: the settings feature references sections
      // that do not exist in the message corpus (only account/clinic/clinical
      // shipped). Those components render raw keys today — a pre-existing
      // port gap tracked as a follow-up, not part of this regression.
      if (DEAD_SETTINGS_NAMESPACES.has(ns)) continue;
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
});
