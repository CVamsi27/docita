import { describe, expect, it } from "vitest";

import {
  DEFAULT_TAG_COLOR_VAR,
  TAG_COLOR_PALETTE,
  getTagColorName,
  resolveTagColor,
} from "./tag-colors";

describe("resolveTagColor", () => {
  it("returns the default token when value is empty", () => {
    expect(resolveTagColor("")).toBe(DEFAULT_TAG_COLOR_VAR);
    expect(resolveTagColor(undefined)).toBe(DEFAULT_TAG_COLOR_VAR);
    expect(resolveTagColor(null)).toBe(DEFAULT_TAG_COLOR_VAR);
  });

  it("preserves a known design-system var()", () => {
    expect(resolveTagColor("var(--tag-emerald)")).toBe("var(--tag-emerald)");
  });

  it("falls back to default for an unknown var()", () => {
    expect(resolveTagColor("var(--tag-unknown)")).toBe(DEFAULT_TAG_COLOR_VAR);
  });

  it("maps a token name to its CSS variable", () => {
    expect(resolveTagColor("rose")).toBe("var(--tag-rose)");
    expect(resolveTagColor("Pink")).toBe("var(--tag-pink)");
  });

  it("returns the default token for legacy hex values not in the system", () => {
    expect(resolveTagColor("#ef4444")).toBe(DEFAULT_TAG_COLOR_VAR);
    expect(resolveTagColor("#3b82f6")).toBe(DEFAULT_TAG_COLOR_VAR);
  });
});

describe("getTagColorName", () => {
  it("returns the human-readable name for a known token", () => {
    expect(getTagColorName("var(--tag-emerald)")).toBe("Emerald");
  });

  it("falls back to the default name for unknown values", () => {
    expect(getTagColorName("#nonsense")).toBe("Sky");
    expect(getTagColorName("")).toBe("Sky");
  });
});

describe("TAG_COLOR_PALETTE", () => {
  it("exposes nine perceptually distinct tokens", () => {
    expect(TAG_COLOR_PALETTE).toHaveLength(9);
    const tokens = new Set(TAG_COLOR_PALETTE.map((entry) => entry.token));
    expect(tokens.size).toBe(9);
  });
});
