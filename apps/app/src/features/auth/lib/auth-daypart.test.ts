import { describe, expect, it } from "vitest";
import { getDaypartFromHour } from "./auth-daypart";

describe("getDaypartFromHour", () => {
  it("returns morning for hours before noon", () => {
    expect(getDaypartFromHour(0)).toBe("morning");
    expect(getDaypartFromHour(6)).toBe("morning");
    expect(getDaypartFromHour(11)).toBe("morning");
  });

  it("returns afternoon from noon through 16:59", () => {
    expect(getDaypartFromHour(12)).toBe("afternoon");
    expect(getDaypartFromHour(15)).toBe("afternoon");
    expect(getDaypartFromHour(16)).toBe("afternoon");
  });

  it("returns evening from 17:00 through 23:59", () => {
    expect(getDaypartFromHour(17)).toBe("evening");
    expect(getDaypartFromHour(20)).toBe("evening");
    expect(getDaypartFromHour(23)).toBe("evening");
  });
});
