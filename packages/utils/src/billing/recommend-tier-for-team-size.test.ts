import { describe, expect, it } from "vitest";
import { recommendTierForTeamSize } from "./recommend-tier-for-team-size.js";

describe("recommendTierForTeamSize", () => {
  it("returns null for invalid team sizes", () => {
    expect(recommendTierForTeamSize(0)).toBeNull();
    expect(recommendTierForTeamSize(-1)).toBeNull();
    expect(recommendTierForTeamSize(Number.NaN)).toBeNull();
  });

  it("recommends STARTER for a solo owner", () => {
    expect(recommendTierForTeamSize(1)?.tier).toBe("STARTER");
  });

  it("recommends ESSENTIAL for small teams", () => {
    expect(recommendTierForTeamSize(2)?.tier).toBe("ESSENTIAL");
    expect(recommendTierForTeamSize(5)?.tier).toBe("ESSENTIAL");
  });

  it("recommends PROFESSIONAL when user count exceeds ESSENTIAL seats", () => {
    expect(recommendTierForTeamSize(6)?.tier).toBe("PROFESSIONAL");
    expect(recommendTierForTeamSize(20)?.tier).toBe("PROFESSIONAL");
  });

  it("recommends HOSPITAL for larger teams", () => {
    expect(recommendTierForTeamSize(21)?.tier).toBe("HOSPITAL");
    expect(recommendTierForTeamSize(75)?.tier).toBe("HOSPITAL");
  });

  it("recommends ENTERPRISE when user count exceeds HOSPITAL seats", () => {
    expect(recommendTierForTeamSize(76)?.tier).toBe("ENTERPRISE");
  });
});
