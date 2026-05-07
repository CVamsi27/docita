import { formatUtcInstantAsClinicPickerIso, DEFAULT_TIMEZONE } from "@workspace/utils";

/**
 * Calendar yyyy-MM-dd in the clinic timezone.
 * Used for `/appointments?date=` and today's calendar strip.
 */
export function getLocalCalendarDateString(
  date: Date = new Date(),
  timezone: string = DEFAULT_TIMEZONE,
): string {
  return formatUtcInstantAsClinicPickerIso(date, timezone);
}
