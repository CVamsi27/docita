import { describe, expect, it } from "vitest";
import { inferStaleTime, QUERY_GC_TIMES } from "./stale-time";

describe("inferStaleTime", () => {
  it.each([
    [["queue"], 15_000],
    [["ipd", "admissions"], 15_000],
    [["billing-status"], 10_000],
    [["patients", "list"], 60_000],
    [["clinic", "settings"], 300_000],
    [["public-booking", "clinic"], 300_000],
  ])("maps %j to %dms", (key, expected) => {
    expect(inferStaleTime(key)).toBe(expected);
  });

  it("leaves unknown keys on the provider default", () => {
    expect(inferStaleTime(["unknown"])).toBeUndefined();
  });

  it("exports the canonical default gc time", () => {
    expect(QUERY_GC_TIMES.DEFAULT).toBe(300_000);
  });
});
