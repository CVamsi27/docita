import {
  DEFAULT_TIMEZONE,
  formatPickerIsoDate,
  toLocalISOString,
} from "@workspace/utils";

/** Wall-clock instant for a calendar day + HH:mm slot segment, as clinic-local `yyyy-MM-dd'T'HH:mm`. */
export function calendarSlotTimeToLocalIso(
  selectedDate: Date,
  slotTimeHHmm: string,
): string {
  const [h, m] = slotTimeHHmm.split(":").map((x) => parseInt(x, 10));
  const wall = new Date(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
    selectedDate.getDate(),
    Number.isFinite(h) ? h : 0,
    Number.isFinite(m) ? m : 0,
    0,
    0,
  );
  return toLocalISOString(wall, { timezone: DEFAULT_TIMEZONE });
}

/**
 * Default start for the schedule dialog when a calendar day is pre-selected.
 * Uses clinic-local wall time (same as slot strings) so Zod never sees an empty
 * `startTime` before `/doctor-availability/slots` returns; the hook overwrites
 * with the first API-available slot when data loads.
 */
export function defaultStartIsoForSelectedCalendarDay(
  selectedDate: Date,
  startHour: number,
  endHour: number,
): string {
  const now = new Date();
  const y = selectedDate.getFullYear();
  const mo = selectedDate.getMonth();
  const d = selectedDate.getDate();

  const selectedStr = formatPickerIsoDate(selectedDate);
  const todayStr = formatPickerIsoDate(now);

  let wall: Date;
  if (selectedStr !== todayStr) {
    wall = new Date(y, mo, d, startHour, 0, 0, 0);
  } else {
    wall = new Date(y, mo, d, now.getHours(), now.getMinutes(), 0, 0);
    const open = new Date(y, mo, d, startHour, 0, 0, 0);
    const close = new Date(y, mo, d, endHour, 0, 0, 0);
    if (wall < open) {
      wall = open;
    }
    if (wall >= close) {
      wall = new Date(open);
    } else {
      const remainder = 30 - (wall.getMinutes() % 30);
      wall.setMinutes(
        wall.getMinutes() + (remainder === 30 ? 30 : remainder),
        0,
        0,
      );
      if (wall >= close) {
        wall = new Date(Math.max(open.getTime(), close.getTime() - 30 * 60 * 1000));
      }
    }
  }

  return toLocalISOString(wall, { timezone: DEFAULT_TIMEZONE });
}
