import type { AvailableSlot } from "@workspace/types";
import {
  addDaysToPickerIsoDate,
  clinicDateAndTimeToWallDatetimeLocal,
  formatClinicPickerDayIsoFromSelection,
} from "@workspace/utils";
import { api } from "@/lib/api/api-client";

/** First available opening on the preferred calendar day only (legacy helper). */
export async function fetchFirstAvailableDatetimeLocal(
  calendarDate: string | Date,
  doctorId: string,
  timezone: string,
): Promise<string | null> {
  const window = await fetchNextAvailableSlotWindow(
    calendarDate,
    doctorId,
    timezone,
    1,
  );
  return window?.startLocal ?? null;
}

/**
 * Walks forward from the preferred date (same day first) and returns the first
 * bookable slot window for the doctor from `/doctor-availability/slots`.
 * Slot times are interpreted as clinic wall time (`timezone`).
 */
export async function fetchNextAvailableSlotWindow(
  preferredDate: string | Date,
  doctorId: string,
  timezone: string,
  maxDays = 14,
): Promise<{ startLocal: string; endLocal: string } | null> {
  let dateStr: string;
  if (
    typeof preferredDate === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(preferredDate.trim())
  ) {
    dateStr = preferredDate.trim();
  } else {
    const parsed =
      typeof preferredDate === "string"
        ? new Date(preferredDate)
        : preferredDate;
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    dateStr = formatClinicPickerDayIsoFromSelection(parsed, timezone);
  }

  for (let i = 0; i < maxDays; i++) {
    const dayStr = addDaysToPickerIsoDate(dateStr, i);
    const slots = await api.get<AvailableSlot[]>(
      `/doctor-availability/slots?${new URLSearchParams({
        date: dayStr,
        doctorId,
      }).toString()}`,
    );
    const first = slots.find(
      (s) =>
        s.isAvailable === true &&
        s.doctorId === doctorId &&
        typeof s.time === "string" &&
        typeof s.endTime === "string",
    );
    if (!first?.time || !first.endTime) {
      continue;
    }

    const startLocal = clinicDateAndTimeToWallDatetimeLocal(
      dayStr,
      first.time,
      timezone,
    );
    const endLocal = clinicDateAndTimeToWallDatetimeLocal(
      dayStr,
      first.endTime,
      timezone,
    );
    if (!startLocal || !endLocal) {
      continue;
    }

    return { startLocal, endLocal };
  }

  return null;
}
