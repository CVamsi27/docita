import { describe, expect, it } from "vitest";
import { TimeOfDaySchema } from "../src/shared/common-types";

describe("TimeOfDaySchema", () => {
  it("accepts a canonical HH:mm string at midnight", () => {
    expect(TimeOfDaySchema.parse("00:00")).toBe("00:00");
  });

  it("accepts a canonical HH:mm string at the end of the day", () => {
    expect(TimeOfDaySchema.parse("23:59")).toBe("23:59");
  });

  it("accepts a mid-day value with single-digit minutes", () => {
    expect(TimeOfDaySchema.parse("14:05")).toBe("14:05");
  });

  it("rejects a 12-hour value that lacks the leading zero", () => {
    expect(() => TimeOfDaySchema.parse("9:00")).toThrow();
  });

  it("rejects an hour past 23", () => {
    expect(() => TimeOfDaySchema.parse("24:00")).toThrow();
  });

  it("rejects a minute past 59", () => {
    expect(() => TimeOfDaySchema.parse("12:60")).toThrow();
  });

  it("rejects a string that starts valid but has trailing characters", () => {
    // The regex is anchored with `$` so a 5-char prefix is not accepted.
    expect(() => TimeOfDaySchema.parse("09:00 extra")).toThrow();
  });

  it("rejects an empty string", () => {
    expect(() => TimeOfDaySchema.parse("")).toThrow();
  });

  it("rejects a non-string value", () => {
    expect(() => TimeOfDaySchema.parse(900)).toThrow();
    expect(() => TimeOfDaySchema.parse(null)).toThrow();
  });
});
