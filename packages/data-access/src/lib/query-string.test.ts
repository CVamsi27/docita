import { describe, expect, it } from "vitest";

import { omitEmptyQueryParams, toQueryString, withQueryString } from "./query-string";

describe("query string helpers", () => {
  it("omits null, undefined, and empty string values", () => {
    expect(
      omitEmptyQueryParams({
        empty: "",
        missing: undefined,
        none: null,
        page: 2,
        q: "clinic",
      }),
    ).toEqual({
      page: 2,
      q: "clinic",
    });
  });

  it("keeps non-empty array values", () => {
    expect(
      omitEmptyQueryParams({
        status: ["", "open", undefined, null, "closed"],
      }),
    ).toEqual({
      status: ["open", "closed"],
    });
  });

  it("serializes primitives and dates", () => {
    expect(
      toQueryString({
        active: true,
        from: new Date("2026-01-02T03:04:05.006Z"),
        page: 3,
      }),
    ).toBe("active=true&from=2026-01-02T03%3A04%3A05.006Z&page=3");
  });

  it("appends query strings only when needed", () => {
    expect(withQueryString("/patients")).toBe("/patients");
    expect(withQueryString("/patients", { q: "Rao" })).toBe("/patients?q=Rao");
  });
});
