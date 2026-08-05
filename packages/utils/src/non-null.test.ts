import { describe, expect, it } from "vitest";
import { nonNull } from "./non-null";

describe("nonNull", () => {
  it("returns the value when it is non-null", () => {
    expect(nonNull("abc")).toBe("abc");
    expect(nonNull(0)).toBe(0);
    expect(nonNull("")).toBe("");
    expect(nonNull(false)).toBe(false);
    expect(nonNull({ id: "x" })).toEqual({ id: "x" });
  });

  it("throws on null", () => {
    expect(() => nonNull(null)).toThrow(/non-null/);
  });

  it("throws on undefined", () => {
    expect(() => nonNull(undefined)).toThrow(/non-null/);
  });

  it("narrows the return type for guarded unions at the call site", () => {
    const maybe: string | null = "ok";
    // Compile-time check: the result is assignable to string.
    const value: string = nonNull(maybe);
    expect(value).toBe("ok");
  });
});
