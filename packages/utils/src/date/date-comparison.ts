import { isAfter, isBefore, isSameDay, subDays } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { type DateTimeOptions, DEFAULT_TIMEZONE } from "./date-config.js";
import { parseDate } from "./date-parsing.js";

function isSameZonedDay(
  date: string | Date | null | undefined,
  referenceDate: Date,
  options: DateTimeOptions = {},
): boolean {
  const { timezone = DEFAULT_TIMEZONE } = options;
  const parsedDate = parseDate(date);
  if (!parsedDate) return false;
  return isSameDay(
    toZonedTime(parsedDate, timezone),
    toZonedTime(referenceDate, timezone),
  );
}

export function isToday(
  date: string | Date | null | undefined,
  options: DateTimeOptions = {},
): boolean {
  return isSameZonedDay(date, new Date(), options);
}

export function isYesterday(
  date: string | Date | null | undefined,
  options: DateTimeOptions = {},
): boolean {
  return isSameZonedDay(date, subDays(new Date(), 1), options);
}

/**
 * Same calendar day in the runtime local timezone (date pickers, local slot grids).
 * For product-timezone "today", use {@link isToday}.
 */
export function isSameLocalCalendarDay(left: Date, right: Date): boolean {
  return isSameDay(left, right);
}

export function isPast(date: string | Date | null | undefined): boolean {
  const parsedDate = parseDate(date);
  if (!parsedDate) return false;

  return isBefore(parsedDate, new Date());
}

export function isFuture(date: string | Date | null | undefined): boolean {
  const parsedDate = parseDate(date);
  if (!parsedDate) return false;

  return isAfter(parsedDate, new Date());
}
