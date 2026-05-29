import { describe, expect, it } from "vitest";
import {
  getClinicLocalDayUtcBounds,
  isCalendarPickerIsoDate,
} from "../src/date/clinic-calendar-bounds";

describe("clinic-calendar-bounds", () => {
  it("isCalendarPickerIsoDate accepts yyyy-MM-dd only", () => {
    expect(isCalendarPickerIsoDate("2026-05-28")).toBe(true);
    expect(isCalendarPickerIsoDate("2026-05-28T00:00:00.000Z")).toBe(false);
  });

  it("getClinicLocalDayUtcBounds returns null for invalid timezone", () => {
    expect(getClinicLocalDayUtcBounds("2026-05-28", "Invalid/Zone")).toBeNull();
  });
});
