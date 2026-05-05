import {
  DEFAULT_TIMEZONE,
  formatPickerIsoDate,
  fromLocalISOString,
  toLocalISOString,
} from "@workspace/utils";

export type SlotBlockingAppointment = {
  startTime: string | Date;
  endTime: string | Date;
  status?: string;
};

/** True when a schedule slot (wall clock in `timezone`) overlaps a blocking appointment. */
export function slotOccupiedByAppointments(
  selectedDate: Date,
  slotStartHHmm: string,
  slotEndHHmm: string,
  timezone: string,
  appointments: ReadonlyArray<SlotBlockingAppointment>,
): boolean {
  const dateStr = formatPickerIsoDate(selectedDate);
  const slotStart = fromLocalISOString(`${dateStr}T${slotStartHHmm}`, {
    timezone,
  });
  const slotEnd = fromLocalISOString(`${dateStr}T${slotEndHHmm}`, {
    timezone,
  });
  if (!slotStart || !slotEnd) return false;

  const blocking = appointments.filter(
    (a) =>
      a.status !== "cancelled" &&
      a.status !== "no-show",
  );

  return blocking.some((a) => {
    const apptStartMs = new Date(a.startTime).getTime();
    const apptEndMs = new Date(a.endTime).getTime();
    return slotStart.getTime() < apptEndMs && slotEnd.getTime() > apptStartMs;
  });
}

/** Wall-clock instant for a calendar day + HH:mm slot segment, as `yyyy-MM-dd'T'HH:mm` in the clinic zone. */
export function calendarSlotTimeToLocalIso(
  selectedDate: Date,
  slotTimeHHmm: string,
  timezone: string = DEFAULT_TIMEZONE,
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
  return toLocalISOString(wall, { timezone });
}

/**
 * Default start for the schedule dialog when a calendar day is pre-selected.
 * Uses clinic-local wall time (same as slot strings). Overwritten by the first
 * API-available slot when `/doctor-availability/slots` returns.
 */
export function defaultStartIsoForSelectedCalendarDay(
  selectedDate: Date,
  startHour: number,
  endHour: number,
  timezone: string = DEFAULT_TIMEZONE,
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
        wall = new Date(
          Math.max(open.getTime(), close.getTime() - 30 * 60 * 1000),
        );
      }
    }
  }

  return toLocalISOString(wall, { timezone });
}
