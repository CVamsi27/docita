import { describe, expect, it } from "vitest";

import {
  countryCodeToCurrency,
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
});
