import { describe, expect, it } from "vitest";
import {
  Tier,
  getFrontDeskScale,
  isFrontDeskClinic,
  isFrontDeskHospital,
  isFrontDeskSolo,
  isFrontDeskTier,
} from "../src";

describe("front-desk tier helpers", () => {
  it("isFrontDeskTier accepts enum and string", () => {
    expect(isFrontDeskTier(Tier.FRONT_DESK)).toBe(true);
    expect(isFrontDeskTier(Tier.FRONT_DESK_CLINIC)).toBe(true);
    expect(isFrontDeskTier(Tier.FRONT_DESK_HOSPITAL)).toBe(true);
    expect(isFrontDeskTier("FRONT_DESK")).toBe(true);
    expect(isFrontDeskTier("FRONT_DESK_CLINIC")).toBe(true);
    expect(isFrontDeskTier("FRONT_DESK_HOSPITAL")).toBe(true);
    expect(isFrontDeskTier("ESSENTIAL")).toBe(false);
    expect(isFrontDeskTier(null)).toBe(false);
  });

  it("resolves front desk scale helpers", () => {
    expect(isFrontDeskSolo("FRONT_DESK")).toBe(true);
    expect(isFrontDeskClinic("FRONT_DESK_CLINIC")).toBe(true);
    expect(isFrontDeskHospital("FRONT_DESK_HOSPITAL")).toBe(true);
    expect(getFrontDeskScale("FRONT_DESK")).toBe("SOLO");
    expect(getFrontDeskScale("FRONT_DESK_CLINIC")).toBe("CLINIC");
    expect(getFrontDeskScale("FRONT_DESK_HOSPITAL")).toBe("HOSPITAL");
    expect(getFrontDeskScale("ESSENTIAL")).toBeNull();
  });
});
