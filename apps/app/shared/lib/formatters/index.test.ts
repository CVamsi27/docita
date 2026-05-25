import { describe, expect, it } from "vitest";
import { formatClockTime, formatCurrency } from "./index";

describe("formatCurrency", () => {
  it("formats with default INR currency and en-IN locale", () => {
    const formatted = formatCurrency(1000);
    expect(formatted).toMatch(/1,000/);
    expect(formatted).toContain("\u20B9");
  });

  it("supports a string locale as the third argument (back-compat)", () => {
    const formatted = formatCurrency(1000, "USD", "en-US");
    expect(formatted).toContain("$");
    expect(formatted).toMatch(/1,000/);
  });

  it("supports an options object with explicit fractionDigits", () => {
    const formatted = formatCurrency(1234, "USD", {
      locale: "en-US",
      fractionDigits: 0,
    });
    expect(formatted).toBe("$1,234");
  });

  it("respects fractionDigits when zero is requested", () => {
    const formatted = formatCurrency(1234.5, "USD", {
      locale: "en-US",
      fractionDigits: 0,
    });
    expect(formatted).not.toContain(".");
  });

  it("uses Intl defaults when fractionDigits is omitted", () => {
    const formatted = formatCurrency(1234, "USD", { locale: "en-US" });
    expect(formatted).toBe("$1,234.00");
  });
});

describe("formatClockTime", () => {
  it("renders a 12-hour clock with uppercase meridiem in en-US", () => {
    const formatted = formatClockTime(new Date(2026, 4, 6, 14, 30), "en-US");
    expect(formatted).toMatch(/^2:30\s?PM$/);
  });

  it("strips the leading zero on single-digit hours", () => {
    const formatted = formatClockTime(new Date(2026, 4, 6, 2, 5), "en-US");
    expect(formatted).toMatch(/^2:05\s?AM$/);
  });

  it("returns an empty string for invalid input", () => {
    expect(formatClockTime("not-a-date")).toBe("");
  });
});
