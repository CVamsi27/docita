import { describe, expect, it } from "vitest";
import { fromCents, resolveMoneyCents, toCents } from "./money-cents.js";

describe("toCents", () => {
  it("converts major units to integer cents, rounding half up", () => {
    expect(toCents(10)).toBe(1000);
    expect(toCents(19.99)).toBe(1999);
    expect(toCents(0.005)).toBe(1);
  });

  it("returns null for null/undefined/non-finite input", () => {
    expect(toCents(null)).toBeNull();
    expect(toCents(undefined)).toBeNull();
    expect(toCents(NaN)).toBeNull();
  });
});

describe("fromCents", () => {
  it("converts integer cents back to major units", () => {
    expect(fromCents(1999)).toBe(19.99);
    expect(fromCents(0)).toBe(0);
  });

  it("returns null for null/undefined", () => {
    expect(fromCents(null)).toBeNull();
    expect(fromCents(undefined)).toBeNull();
  });
});

describe("resolveMoneyCents", () => {
  it("prefers the canonical cents column when present", () => {
    expect(resolveMoneyCents(2500, 99)).toBe(2500);
  });

  it("accepts a zero cents value (does not fall through to Float)", () => {
    expect(resolveMoneyCents(0, 99)).toBe(0);
  });

  it("falls back to the legacy Float column when cents is absent", () => {
    expect(resolveMoneyCents(null, 25)).toBe(2500);
    expect(resolveMoneyCents(undefined, 25)).toBe(2500);
  });

  it("returns null when neither column is present", () => {
    expect(resolveMoneyCents(null, null)).toBeNull();
  });
});
