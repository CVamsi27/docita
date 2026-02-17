import { format, isSameDay, subDays } from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import {
  DATE_FORMATS,
  type DateTimeOptions,
  DEFAULT_TIMEZONE,
} from "./date-config.js";
import { parseDate } from "./date-parsing.js";

export function formatDate(
  date: string | Date | null | undefined,
  formatPattern: string = DATE_FORMATS.DATE_MEDIUM,
  options: DateTimeOptions = {},
): string {
  const { timezone = DEFAULT_TIMEZONE } = options;

  const parsedDate = parseDate(date);
  if (!parsedDate) return "";

  try {
    return formatInTimeZone(parsedDate, timezone, formatPattern);
  } catch {
    return format(parsedDate, formatPattern);
  }
}

export function formatTime(
  date: string | Date | null | undefined,
  formatPattern: string = DATE_FORMATS.TIME_MEDIUM,
  options: DateTimeOptions = {},
): string {
  return formatDate(date, formatPattern, options);
}

export function formatDateTime(
  date: string | Date | null | undefined,
  formatPattern: string = DATE_FORMATS.DATETIME_MEDIUM,
  options: DateTimeOptions = {},
): string {
  return formatDate(date, formatPattern, options);
}

export function formatRelativeDate(
  date: string | Date | null | undefined,
  options: DateTimeOptions = {},
): string {
  const { timezone = DEFAULT_TIMEZONE } = options;

  const parsedDate = parseDate(date);
  if (!parsedDate) return "";

  const zonedDate = toZonedTime(parsedDate, timezone);
  const today = toZonedTime(new Date(), timezone);
  const yesterday = subDays(today, 1);

  if (isSameDay(zonedDate, today)) {
    return "Today";
  }

  if (isSameDay(zonedDate, yesterday)) {
    return "Yesterday";
  }

  return formatDate(date, DATE_FORMATS.DATE_MEDIUM, options);
}

export function formatDateRange(
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined,
  options: DateTimeOptions = {},
): string {
  const start = formatDate(startDate, DATE_FORMATS.DATE_SHORT, options);
  const end = formatDate(endDate, DATE_FORMATS.DATE_SHORT, options);

  if (!start && !end) return "";
  if (!start) return `Until ${end}`;
  if (!end) return `From ${start}`;

  return `${start} - ${end}`;
}
