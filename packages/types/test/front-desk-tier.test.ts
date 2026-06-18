import { describe, expect, it } from "vitest";
import { isFrontDeskTier } from "../src";

describe("front-desk tier helpers", () => {
  it("isFrontDeskTier detects FRONT_DESK plan mode string", () => {
    expect(isFrontDeskTier("FRONT_DESK")).toBe(true);
    expect(isFrontDeskTier("ESSENTIAL")).toBe(false);
    expect(isFrontDeskTier(null)).toBe(false);
    expect(isFrontDeskTier(undefined)).toBe(false);
    expect(isFrontDeskTier(0)).toBe(false);
  });
});
