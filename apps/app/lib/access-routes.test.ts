import { describe, expect, it } from "vitest";
import { APP_ACCESS_TARGETS } from "@workspace/types";
import { getAccessTargetForPath } from "./access-routes";

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
});
