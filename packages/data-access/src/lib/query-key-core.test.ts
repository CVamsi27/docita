import { describe, expect, it } from "vitest";
import { withParams } from "./query-key-core";

describe("withParams", () => {
  it("returns the params object as-is when provided", () => {
    const params = { page: 1, search: "ram" };

    expect(withParams(params)).toBe(params);
  });

  it("returns an empty object when params are undefined", () => {
    expect(withParams(undefined)).toEqual({});
  });
});
