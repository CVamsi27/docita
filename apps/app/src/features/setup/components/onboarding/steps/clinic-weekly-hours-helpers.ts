import type { DayOfWeek } from "@workspace/types";
import type { ClinicWeeklyHourRow } from "@/features/setup/components/onboarding/types";

export const DISPLAY_ORDER: DayOfWeek[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

export function buildWeeklyHourRows(
  byDay: Map<DayOfWeek, ClinicWeeklyHourRow>,
): Record<DayOfWeek, ClinicWeeklyHourRow> {
  const rowFor = (day: DayOfWeek): ClinicWeeklyHourRow => {
    const existing = byDay.get(day);
    return existing
      ? { ...existing }
      : {
          dayOfWeek: day,
          startTime: "09:00",
          endTime: "17:00",
          slotDuration: 30,
          isActive: false,
        };
  };

  return {
    MONDAY: rowFor("MONDAY"),
    TUESDAY: rowFor("TUESDAY"),
    WEDNESDAY: rowFor("WEDNESDAY"),
    THURSDAY: rowFor("THURSDAY"),
    FRIDAY: rowFor("FRIDAY"),
    SATURDAY: rowFor("SATURDAY"),
    SUNDAY: rowFor("SUNDAY"),
  };
}

export function sortRowsForApi(
  rows: ClinicWeeklyHourRow[],
): ClinicWeeklyHourRow[] {
  const order: DayOfWeek[] = [
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
  ];
  const map = new Map(rows.map((r) => [r.dayOfWeek, r]));
  return order.map((d) => {
    const row = map.get(d);
    if (!row) {
      throw new Error(`Missing weekly row for ${d}`);
    }
    return row;
  });
}
