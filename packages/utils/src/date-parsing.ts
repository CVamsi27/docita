import { isValid, parse, parseISO } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { type DateTimeOptions, DEFAULT_TIMEZONE } from "./date-config.js";

export function parseDate(date: string | Date | null | undefined): Date | null {
  if (!date) return null;

  if (date instanceof Date) {
    return isValid(date) ? date : null;
  }

  const parsed = parseISO(date);
  if (isValid(parsed)) {
    return parsed;
  }

  const formats = [
    "yyyy-MM-dd",
    "dd/MM/yyyy",
    "dd-MM-yyyy",
    "MM/dd/yyyy",
    "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
    "yyyy-MM-dd'T'HH:mm:ss'Z'",
    "yyyy-MM-dd'T'HH:mm:ss",
    "yyyy-MM-dd HH:mm:ss",
  ];

  for (const fmt of formats) {
    try {
      const result = parse(date, fmt, new Date());
      if (isValid(result)) {
        return result;
      }
    } catch {
      // Continue to next format
    }
  }

  return null;
}

export function parseScheduleTime(
  timeString: string,
): { hours: number; minutes: number } | null {
  const match = timeString.match(/^(\d{1,2}):(\d{2})$/);
  if (!match || !match[1] || !match[2]) return null;

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return { hours, minutes };
}

export function createDateTimeFromSchedule(
  date: Date | string,
  timeString: string,
  options: DateTimeOptions = {},
): Date | null {
  const { timezone = DEFAULT_TIMEZONE } = options;

  const parsedDate = parseDate(date);
  if (!parsedDate) return null;

  const parsedTime = parseScheduleTime(timeString);
  if (!parsedTime) return null;

  const zonedDate = toZonedTime(parsedDate, timezone);
  zonedDate.setHours(parsedTime.hours, parsedTime.minutes, 0, 0);

  return fromZonedTime(zonedDate, timezone);
}
