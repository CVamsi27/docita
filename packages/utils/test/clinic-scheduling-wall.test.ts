import { describe, expect, it } from "vitest";
import {
  addDaysToPickerIsoDate,
  addMinutesToClinicWallDatetimeLocal,
  clinicWallDatetimeLocalToUtcIso,
  formatClinicFriendlyDateTime,
  formatClinicHalfHourSlotKey,
  formatClinicPickerDayIsoFromSelection,
  formatClinicTodayPickerIso,
  formatPickerIsoAsWeekdayUpper,
  utcInstantToClinicWallDatetimeLocal,
} from "../src/date/clinic-scheduling-wall";

describe("clinic-scheduling-wall", () => {
  it("addDaysToPickerIsoDate steps calendar days", () => {
    expect(addDaysToPickerIsoDate("2026-05-07", 1)).toBe("2026-05-08");
    expect(addDaysToPickerIsoDate("2026-05-31", 1)).toBe("2026-06-01");
  });

  it("round-trips clinic wall IST through UTC ISO", () => {
    const iso = clinicWallDatetimeLocalToUtcIso(
      "2026-05-07T11:30",
      "Asia/Kolkata",
    );
    expect(iso).toBe("2026-05-07T06:00:00.000Z");
    expect(utcInstantToClinicWallDatetimeLocal(iso!, "Asia/Kolkata")).toBe(
      "2026-05-07T11:30",
    );
  });

  it("formatClinicPickerDayIsoFromSelection aligns selection with clinic day", () => {
    const selection = new Date(2026, 4, 7, 12, 0, 0, 0);
    expect(formatClinicPickerDayIsoFromSelection(selection, "Asia/Kolkata")).toBe(
      "2026-05-07",
    );
  });

  it("formatClinicTodayPickerIso returns yyyy-MM-dd", () => {
    expect(formatClinicTodayPickerIso("Asia/Kolkata")).toMatch(
      /^\d{4}-\d{2}-\d{2}$/,
    );
  });

  it("formatPickerIsoAsWeekdayUpper matches clinic-calendar weekday", () => {
    expect(formatPickerIsoAsWeekdayUpper("2026-05-07", "Asia/Kolkata")).toBe(
      "THURSDAY",
    );
  });

  it("addMinutesToClinicWallDatetimeLocal shifts wall datetime", () => {
    expect(
      addMinutesToClinicWallDatetimeLocal("2026-05-07T09:00", 30, "Asia/Kolkata"),
    ).toBe("2026-05-07T09:30");
  });

  it("formatClinicFriendlyDateTime uses clinic wall clock", () => {
    expect(
      formatClinicFriendlyDateTime(
        "2026-05-07T06:00:00.000Z",
        "Asia/Kolkata",
      ),
    ).toMatch(/May 7, 2026/);
  });

  it("formatClinicHalfHourSlotKey snaps to half-hour grid", () => {
    const iso = "2026-05-07T06:22:00.000Z";
    expect(formatClinicHalfHourSlotKey(new Date(iso), "Asia/Kolkata")).toBe(
      "11:30",
    );
  });
});
