import {
  formatClinicPickerDayIsoFromSelection,
  formatClinicTodayPickerIso,
} from "@workspace/utils";
import { defaultStartIsoForSelectedCalendarDay } from "@/features/appointments/lib/calendar-slot-local-iso";

export { getClinicTimezoneOrDefault } from "@/lib/utils/clinic-timezone";

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
