import { startOfDay } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { type DateTimeOptions, DEFAULT_TIMEZONE } from "./date-config.js";
import { parseDate } from "./date-parsing.js";

export function toUTC(
  date: string | Date | null | undefined,
  options: DateTimeOptions = {},
): Date | null {
  const { timezone = DEFAULT_TIMEZONE } = options;

  const parsedDate = parseDate(date);
  if (!parsedDate) return null;

  try {
    return fromZonedTime(parsedDate, timezone);
  } catch {
    return parsedDate;
  }
}

export function fromUTC(
  date: string | Date | null | undefined,
  options: DateTimeOptions = {},
): Date | null {
  const { timezone = DEFAULT_TIMEZONE } = options;

  const parsedDate = parseDate(date);
  if (!parsedDate) return null;

  try {
    return toZonedTime(parsedDate, timezone);
  } catch {
    return parsedDate;
  }
}

export function nowInTimezone(options: DateTimeOptions = {}): Date {
  const { timezone = DEFAULT_TIMEZONE } = options;
  return toZonedTime(new Date(), timezone);
}

export function todayInTimezone(options: DateTimeOptions = {}): Date {
  const { timezone = DEFAULT_TIMEZONE } = options;
  const now = toZonedTime(new Date(), timezone);
  const startOfDayZoned = startOfDay(now);
  return fromZonedTime(startOfDayZoned, timezone);
}
