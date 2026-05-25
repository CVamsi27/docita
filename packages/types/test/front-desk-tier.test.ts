import { describe, expect, it } from "vitest";
import { Tier, isFrontDeskTier } from "../src";

describe("front-desk tier helpers", () => {
  it("isFrontDeskTier accepts enum and string", () => {
    expect(isFrontDeskTier(Tier.FRONT_DESK)).toBe(true);
    expect(isFrontDeskTier("FRONT_DESK")).toBe(true);
    expect(isFrontDeskTier("ESSENTIAL")).toBe(false);
    expect(isFrontDeskTier(null)).toBe(false);
  });
});
