import { BRAND_PRIMARY_HEX, BRAND_FOREGROUND_HEX, readCssVar } from "./branding";

describe("brand color constants", () => {
  it("BRAND_PRIMARY_HEX is a valid hex color", () => {
    expect(BRAND_PRIMARY_HEX).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it("BRAND_FOREGROUND_HEX is a valid hex color", () => {
    expect(BRAND_FOREGROUND_HEX).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it("BRAND_PRIMARY_HEX is clinical blue", () => {
    expect(BRAND_PRIMARY_HEX).toBe("#2563EB");
  });

  it("BRAND_FOREGROUND_HEX is deep slate", () => {
    expect(BRAND_FOREGROUND_HEX).toBe("#0F172A");
  });
});

describe("readCssVar", () => {
  it("returns fallback when window is undefined (SSR)", () => {
    expect(readCssVar("--primary", "#000")).toBe("#000");
  });

  it("returns fallback when CSS variable is not set", () => {
    expect(readCssVar("--nonexistent-var-xyz", "fallback")).toBe("fallback");
  });
});
