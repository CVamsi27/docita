import { describe, expect, it } from "vitest";

import {
  countryCodeToCurrency,
  formatCompactCurrency,
  formatCurrency,
  getCurrencyLocale,
  getCurrencySymbol,
  resolveCurrencyContext,
} from "./currency.js";

describe("currency utilities", () => {
  it("maps supported countries to currencies", () => {
    expect(countryCodeToCurrency("IN")).toBe("INR");
    expect(countryCodeToCurrency("US")).toBe("USD");
    expect(countryCodeToCurrency("GB")).toBe("GBP");
    expect(countryCodeToCurrency("AE")).toBe("AED");
    expect(countryCodeToCurrency("ZZ")).toBe("INR");
  });

  it("returns symbols and locales for supported currencies", () => {
    expect(getCurrencySymbol("INR")).toBe("₹");
    expect(getCurrencySymbol("USD")).toBe("$");
    expect(getCurrencySymbol("GBP")).toBe("£");
    expect(getCurrencySymbol("AED")).toBe("AED");
    expect(getCurrencyLocale("INR")).toBe("en-IN");
    expect(getCurrencyLocale("USD")).toBe("en-US");
    expect(getCurrencyLocale("GBP")).toBe("en-GB");
    expect(getCurrencyLocale("AED")).toBe("en-AE");
  });

  it("prefers explicit currency over country", () => {
    expect(
      resolveCurrencyContext({
        currency: "USD",
        countryCode: "IN",
      }),
    ).toEqual({
      currency: "USD",
      locale: "en-US",
      symbol: "$",
    });
  });

  it("uses tax country when direct country is absent", () => {
    expect(
      resolveCurrencyContext({
        taxSettings: { countryCode: "AE" },
      }),
    ).toEqual({
      currency: "AED",
      locale: "en-AE",
      symbol: "AED",
    });
  });

  it("formats currencies with locale defaults and fraction overrides", () => {
    expect(formatCurrency(1000, { currency: "INR" })).toContain("₹");
    expect(formatCurrency(1000, { currency: "USD" })).toBe("$1,000.00");
    expect(formatCurrency(1234.5, { currency: "AED" })).toContain("AED");
    expect(
      formatCurrency(1234.5, { currency: "USD", fractionDigits: 0 }),
    ).toBe("$1,235");
  });

  it("supports independent min/max fraction digits (whole-rupee display)", () => {
    // The internal ops portal shows whole rupees (min 0 / max 2) — the
    // legacy Intl default would force "₹1,500.00".
    expect(
      formatCurrency(1500, {
        currency: "INR",
        minFractionDigits: 0,
        maxFractionDigits: 2,
      }),
    ).toBe("₹1,500");
    expect(
      formatCurrency(1500.5, {
        currency: "INR",
        minFractionDigits: 0,
        maxFractionDigits: 2,
      }),
    ).toBe("₹1,500.5");
    expect(
      formatCurrency(100000, {
        currency: "INR",
        minFractionDigits: 0,
        maxFractionDigits: 2,
      }),
    ).toBe("₹1,00,000");
  });

  it("lets fractionDigits win over the independent min/max pair", () => {
    expect(
      formatCurrency(1500, {
        currency: "INR",
        fractionDigits: 0,
        minFractionDigits: 2,
        maxFractionDigits: 2,
      }),
    ).toBe("₹1,500");
  });

  describe("formatCompactCurrency", () => {
    it("uses the regular currency formatter for sub-1K values", () => {
      // The analytics card shows "₹0.00" for clinics with no revenue, not
      // "₹0" or a blank cell — falling through to the regular formatter
      // preserves that contract.
      expect(formatCompactCurrency(0, { currency: "INR" })).toBe(
        formatCurrency(0, { currency: "INR" }),
      );
      expect(formatCompactCurrency(500, { currency: "INR" })).toBe(
        formatCurrency(500, { currency: "INR" }),
      );
    });

    it("uses compact notation for K/M-scale values", () => {
      const inr = formatCompactCurrency(120_000, { currency: "INR" });
      const usd = formatCompactCurrency(2_500_000, { currency: "USD" });

      // Locale-correct suffixes. The exact glyphs vary by Node ICU build,
      // so we assert on the compact-notation markers instead of the
      // suffix character.
      expect(inr).toMatch(/1\.2\s*L|120\s*K|1,20,000/);
      expect(usd).toMatch(/2\.5\s*M|25\s*L/);
      // Currency symbol still appears in the output.
      expect(inr).toContain("₹");
      expect(usd).toContain("$");
    });

    it("returns 0 for non-finite input (defensive default for empty data)", () => {
      expect(formatCompactCurrency(Number.NaN, { currency: "INR" })).toBe(
        formatCurrency(0, { currency: "INR" }),
      );
    });
  });
});
