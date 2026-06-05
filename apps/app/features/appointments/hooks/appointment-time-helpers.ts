import {
  DEFAULT_TIMEZONE,
  formatClinicPickerDayIsoFromSelection,
  formatClinicTodayPickerIso,
} from "@workspace/utils";
import { defaultStartIsoForSelectedCalendarDay } from "@/features/appointments/lib/calendar-slot-local-iso";

export function getClinicTimezoneOrDefault(
  clinic: { timezone?: string | null } | undefined | null,
): string {
  const trimmed = clinic?.timezone?.trim();
  return trimmed || DEFAULT_TIMEZONE;
}

export function computeDateKey(
  date: Date | undefined,
  timezone: string,
): string | undefined {
  return date
    ? formatClinicPickerDayIsoFromSelection(date, timezone)
    : undefined;
}

export function resolveDefaultStartTime(params: {
  selectedDate?: Date;
  startHour: number;
  endHour: number;
  clinicTimezone: string;
}): string {
  const selectedDay =
    params.selectedDate ?? formatClinicTodayPickerIso(params.clinicTimezone);
  return defaultStartIsoForSelectedCalendarDay(
    selectedDay,
    params.startHour,
    params.endHour,
    params.clinicTimezone,
  );
}
