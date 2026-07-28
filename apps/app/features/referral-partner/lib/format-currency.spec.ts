import { describe, expect, it } from "vitest";
import { formatPaise } from "./format-currency";

describe("formatPaise", () => {
  it("formats integer paise as INR with 2 decimal places", () => {
    expect(formatPaise(123_45)).toBe("₹123.45");
  });

  it("formats zero paise as ₹0.00", () => {
    expect(formatPaise(0)).toBe("₹0.00");
  });

  it("falls back to ₹0.00 for non-finite values", () => {
    expect(formatPaise(NaN)).toBe("₹0.00");
    expect(formatPaise(Infinity)).toBe("₹0.00");
  });

  it("uses the en-IN thousands grouping (lakh style)", () => {
    // 12,34,567.89 — the canonical Indian grouping.
    expect(formatPaise(12_345_67_89)).toBe("₹12,34,567.89");
  });
});
