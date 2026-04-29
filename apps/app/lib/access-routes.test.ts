import { describe, expect, it } from "vitest";
import { readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { APP_ACCESS_TARGETS } from "@workspace/types";
import { getAccessTargetForPath } from "./access-routes";

const protectedAppDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../app/(protected)",
);

function collectProtectedPages(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      return collectProtectedPages(fullPath);
    }
    if (entry !== "page.tsx") {
      return [];
    }

    const routePath = `/${relative(protectedAppDir, dirname(fullPath))
      .split("/")
      .filter(Boolean)
      .join("/")}`;
    return [routePath === "/" ? "/dashboard" : routePath];
  });
}

describe("getAccessTargetForPath", () => {
  it("maps nested resource routes to parent access target", () => {
    expect(getAccessTargetForPath("/dashboard")).toBe(
      APP_ACCESS_TARGETS.PAGE_DASHBOARD,
    );
    expect(getAccessTargetForPath("/settings/compliance")).toBe(
      APP_ACCESS_TARGETS.PAGE_SETTINGS,
    );
    expect(getAccessTargetForPath("/profile")).toBe(
      APP_ACCESS_TARGETS.PAGE_PROFILE,
    );
    expect(getAccessTargetForPath("/patients/123")).toBe(
      APP_ACCESS_TARGETS.PAGE_PATIENTS,
    );
    expect(getAccessTargetForPath("/consultation/apt-1")).toBe(
      APP_ACCESS_TARGETS.PAGE_CONSULTATION,
    );
    expect(getAccessTargetForPath("/import/excel")).toBe(
      APP_ACCESS_TARGETS.PAGE_IMPORT,
    );
    expect(getAccessTargetForPath("/specialty/dental-charts")).toBe(
      APP_ACCESS_TARGETS.PAGE_SPECIALTY,
    );
    expect(getAccessTargetForPath("/hospital/beds")).toBe(
      APP_ACCESS_TARGETS.PAGE_HOSPITAL,
    );
    expect(getAccessTargetForPath("/ai-assistant")).toBe(
      APP_ACCESS_TARGETS.PAGE_AI_ASSISTANT,
    );
  });

  it("maps upgrade route correctly", () => {
    expect(getAccessTargetForPath("/upgrade")).toBe(
      APP_ACCESS_TARGETS.PAGE_UPGRADE,
    );
  });

  it("returns null for routes without access mapping", () => {
    expect(getAccessTargetForPath("/unknown")).toBeNull();
    expect(getAccessTargetForPath("")).toBeNull();
  });

  it("maps every protected customer page to an access target", () => {
    const pages = collectProtectedPages(protectedAppDir);

    expect(pages.length).toBeGreaterThan(0);
    for (const page of pages) {
      expect(getAccessTargetForPath(page), `missing access target for ${page}`)
        .not.toBeNull();
    }
  });
});
