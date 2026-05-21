import { describe, expect, it } from "vitest";
import {
  Tier,
  isFrontDeskClinicMode,
  isFrontDeskTier,
  resolveWorkspaceProfileForPlan,
} from "../src";

describe("workspace-profile helpers", () => {
  it("isFrontDeskTier accepts enum and string", () => {
    expect(isFrontDeskTier(Tier.FRONT_DESK)).toBe(true);
    expect(isFrontDeskTier("FRONT_DESK")).toBe(true);
    expect(isFrontDeskTier("ESSENTIAL")).toBe(false);
  });

  it("isFrontDeskClinicMode prefers tier over workspace", () => {
    expect(isFrontDeskClinicMode("FRONT_DESK", "FULL_CLINICAL")).toBe(true);
    expect(isFrontDeskClinicMode("ESSENTIAL", "FRONT_DESK")).toBe(true);
    expect(isFrontDeskClinicMode("ESSENTIAL", "FULL_CLINICAL")).toBe(false);
  });

  it("resolveWorkspaceProfileForPlan forces FRONT_DESK for SKU", () => {
    expect(resolveWorkspaceProfileForPlan("FRONT_DESK", "FULL_CLINICAL")).toBe(
      "FRONT_DESK",
    );
    expect(resolveWorkspaceProfileForPlan("ESSENTIAL", "FRONT_DESK")).toBe(
      "FRONT_DESK",
    );
    expect(resolveWorkspaceProfileForPlan("ESSENTIAL")).toBe("FULL_CLINICAL");
  });
});
