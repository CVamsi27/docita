import { describe, expect, it } from "vitest";

import {
  omitEmptyQueryParams,
  toStringValue,
} from "./query-string-normalize";

describe("query string normalization", () => {
  it("normalizes primitive values for query strings", () => {
    expect(toStringValue(" active ")).toBe(" active ");
    expect(toStringValue("   ")).toBeNull();
    expect(toStringValue(7)).toBe("7");
    expect(toStringValue(false)).toBe("false");
    expect(toStringValue(new Date("2026-02-03T04:05:06.007Z"))).toBe("2026-02-03T04:05:06.007Z");
    expect(toStringValue(null)).toBeNull();
    expect(toStringValue(undefined)).toBeNull();
  });

  it("omits empty query parameter values without mutating valid values", () => {
    expect(
      omitEmptyQueryParams({
        empty: "",
        missing: undefined,
        none: null,
        page: 2,
        status: ["", "open", undefined, null, "closed"],
      }),
    ).toEqual({
      page: 2,
      status: ["open", "closed"],
    });
  });
});
