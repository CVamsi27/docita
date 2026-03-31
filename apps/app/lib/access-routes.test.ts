import { describe, expect, it } from "vitest";
import { APP_ACCESS_TARGETS } from "@workspace/types";
import { getAccessTargetForPath } from "./access-routes";

describe("getAccessTargetForPath", () => {
  it("maps nested resource routes to parent access target", () => {
    expect(getAccessTargetForPath("/dashboard")).toBe(
      APP_ACCESS_TARGETS.PAGE_DASHBOARD,
    );
    expect(getAccessTargetForPath("/patients/123")).toBe(
      APP_ACCESS_TARGETS.PAGE_PATIENTS,
    );
    expect(getAccessTargetForPath("/import/excel")).toBe(
      APP_ACCESS_TARGETS.PAGE_IMPORT,
    );
  });

  it("maps upgrade route correctly", () => {
    expect(getAccessTargetForPath("/upgrade")).toBe(
      APP_ACCESS_TARGETS.PAGE_UPGRADE,
    );
  });

  it("returns null for routes without access mapping", () => {
    expect(getAccessTargetForPath("/consultation")).toBeNull();
    expect(getAccessTargetForPath("")).toBeNull();
  });
});
