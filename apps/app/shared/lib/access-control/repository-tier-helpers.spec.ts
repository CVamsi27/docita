import { describe, it, expect } from "vitest";
import { Tier } from "@workspace/types";
import { parseTier } from "./repository-tier-helpers";

describe("parseTier", () => {
  it("returns STARTER for undefined", () => {
    expect(parseTier()).toBe(Tier.STARTER);
  });

  it("returns STARTER for empty string", () => {
    expect(parseTier("")).toBe(Tier.STARTER);
  });

  it("parses numeric tier value", () => {
    expect(parseTier("0")).toBe(Tier.STARTER);
    expect(parseTier("1")).toBe(Tier.ESSENTIAL);
    expect(parseTier("2")).toBe(Tier.PROFESSIONAL);
    expect(parseTier("3")).toBe(Tier.HOSPITAL);
    expect(parseTier("4")).toBe(Tier.ENTERPRISE);
  });

  it("parses string tier name", () => {
    expect(parseTier("STARTER")).toBe(Tier.STARTER);
    expect(parseTier("ESSENTIAL")).toBe(Tier.ESSENTIAL);
    expect(parseTier("PROFESSIONAL")).toBe(Tier.PROFESSIONAL);
    expect(parseTier("HOSPITAL")).toBe(Tier.HOSPITAL);
    expect(parseTier("ENTERPRISE")).toBe(Tier.ENTERPRISE);
    expect(parseTier("INTELLIGENCE")).toBe(Tier.INTELLIGENCE);
  });

  it("returns STARTER for unknown string", () => {
    expect(parseTier("UNKNOWN")).toBe(Tier.STARTER);
  });

  it("returns STARTER for non-numeric non-name string", () => {
    expect(parseTier("abc")).toBe(Tier.STARTER);
  });

  it("returns STARTER for invalid numeric value", () => {
    expect(parseTier("99")).toBe(Tier.STARTER);
  });
});
