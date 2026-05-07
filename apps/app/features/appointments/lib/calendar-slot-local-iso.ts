import {
  DEFAULT_TIMEZONE,
  clinicDateAndTimeToWallDatetimeLocal,
  clinicWallHourMinuteFromUtcInstant,
  formatClinicPickerDayIsoFromSelection,
  formatClinicTodayPickerIso,
  fromLocalISOString,
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
  const dateStr = formatClinicPickerDayIsoFromSelection(selectedDate, timezone);
  const slotStart = fromLocalISOString(`${dateStr}T${slotStartHHmm}`, {
    timezone,
  });
  const slotEnd = fromLocalISOString(`${dateStr}T${slotEndHHmm}`, {
    timezone,
  });
  if (!slotStart || !slotEnd) return false;

  const blocking = appointments.filter(
    (a) => a.status !== "cancelled" && a.status !== "no-show",
  );

  return blocking.some((a) => {
    const apptStartMs = new Date(a.startTime).getTime();
    const apptEndMs = new Date(a.endTime).getTime();
    return (
      slotStart.getTime() < apptEndMs && slotEnd.getTime() > apptStartMs
    );
  });
}

/** Wall-clock instant for a calendar day + HH:mm slot segment, as clinic-wall `yyyy-MM-dd'T'HH:mm`. */
export function calendarSlotTimeToLocalIso(
  selectedDate: Date,
  slotTimeHHmm: string,
  timezone: string = DEFAULT_TIMEZONE,
): string {
  const dateStr = formatClinicPickerDayIsoFromSelection(selectedDate, timezone);
  return clinicDateAndTimeToWallDatetimeLocal(dateStr, slotTimeHHmm, timezone);
}

/**
 * Default start for the schedule dialog when a calendar day is pre-selected.
 * Uses clinic-local wall time (aligned with `/doctor-availability/slots`).
 */
export function defaultStartIsoForSelectedCalendarDay(
  selectedDate: Date | string,
  startHour: number,
  endHour: number,
  timezone: string = DEFAULT_TIMEZONE,
): string {
  const selectedStr =
    typeof selectedDate === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(selectedDate.trim())
      ? selectedDate.trim()
      : formatClinicPickerDayIsoFromSelection(selectedDate as Date, timezone);

  const todayStr = formatClinicTodayPickerIso(timezone);

  let hhmm: string;
  if (selectedStr !== todayStr) {
    hhmm = `${String(startHour).padStart(2, "0")}:00`;
  } else {
    const now = new Date();
    const { hour: nowH, minute: nowM } = clinicWallHourMinuteFromUtcInstant(
      now,
      timezone,
    );
    let totalMin = nowH * 60 + nowM;
    const openMin = startHour * 60;
    const closeMin = endHour * 60;

    if (totalMin < openMin) {
      totalMin = openMin;
    } else if (totalMin >= closeMin) {
      totalMin = openMin;
    } else {
      const remainder = 30 - (totalMin % 30);
      totalMin += remainder === 30 ? 30 : remainder;
      if (totalMin >= closeMin) {
        totalMin = Math.max(openMin, closeMin - 30);
      }
    }

    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    hhmm = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  return clinicDateAndTimeToWallDatetimeLocal(selectedStr, hhmm, timezone);
}
