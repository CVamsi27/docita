import { isAfter, isBefore, isSameDay, subDays } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { type DateTimeOptions, DEFAULT_TIMEZONE } from "./date-config.js";
import { parseDate } from "./date-parsing.js";

export function isToday(
  date: string | Date | null | undefined,
  options: DateTimeOptions = {},
): boolean {
  const { timezone = DEFAULT_TIMEZONE } = options;

  const parsedDate = parseDate(date);
  if (!parsedDate) return false;

  const zonedDate = toZonedTime(parsedDate, timezone);
  const today = toZonedTime(new Date(), timezone);

  return isSameDay(zonedDate, today);
}

export function isYesterday(
  date: string | Date | null | undefined,
  options: DateTimeOptions = {},
): boolean {
  const { timezone = DEFAULT_TIMEZONE } = options;

  const parsedDate = parseDate(date);
  if (!parsedDate) return false;

  const zonedDate = toZonedTime(parsedDate, timezone);
  const today = toZonedTime(new Date(), timezone);
  const yesterday = subDays(today, 1);

  return isSameDay(zonedDate, yesterday);
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
