import { describe, expect, it } from "vitest";
import { getCountries } from "react-phone-number-input";
import { resolveLibPhoneCountryFromCode } from "./libphone-country.boundary";

function findUnsupportedCountryCode(): string {
  const supported = new Set(getCountries());
  for (const a of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
    for (const b of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
      const candidate = a + b;
      if (!supported.has(candidate)) return candidate;
    }
  }
  throw new Error("Every alpha-2 code is a supported country");
}

describe("resolveLibPhoneCountryFromCode", () => {
  it("returns the country for a supported code", () => {
    expect(resolveLibPhoneCountryFromCode("US")).toBe("US");
  });

  it("normalizes casing before matching", () => {
    expect(resolveLibPhoneCountryFromCode("in")).toBe("IN");
  });

  it("falls back to the default country when the code is missing", () => {
    expect(resolveLibPhoneCountryFromCode(undefined)).toBe("IN");
    expect(resolveLibPhoneCountryFromCode(null)).toBe("IN");
    expect(resolveLibPhoneCountryFromCode("  ")).toBe("IN");
  });

  it("falls back to the default country for a malformed code", () => {
    expect(resolveLibPhoneCountryFromCode("XYZ")).toBe("IN");
  });

  it("falls back to the default country for an unsupported code", () => {
    expect(resolveLibPhoneCountryFromCode(findUnsupportedCountryCode())).toBe(
      "IN",
    );
  });
});
