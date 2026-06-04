import { describe, expect, it } from "vitest";

import {
  omitEmptyQueryParams,
  toQueryString,
  withQueryString,
} from "./query-string";

describe("app HTTP query string helpers", () => {
  it("serializes primitives, arrays, and dates", () => {
    expect(
      toQueryString({
        active: true,
        from: new Date("2026-01-02T03:04:05.006Z"),
        page: 3,
        status: ["open", "closed"],
      }),
    ).toBe("active=true&from=2026-01-02T03%3A04%3A05.006Z&page=3&status=open&status=closed");
  });

  it("omits null, undefined, and empty values", () => {
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

  it("appends query strings only when values are present", () => {
    expect(withQueryString("/invoices")).toBe("/invoices");
    expect(withQueryString("/invoices", { q: "June" })).toBe("/invoices?q=June");
  });
});
