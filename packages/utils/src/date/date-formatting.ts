import {
  format,
  formatDistanceToNow as formatDistanceToNowFns,
  isSameDay,
  subDays,
} from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import {
  DATE_FORMATS,
  type DateTimeOptions,
  DEFAULT_TIMEZONE,
} from "./date-config.js";
import { parseDate } from "./date-parsing.js";

type FormatDistanceToNowDisplayOptions = NonNullable<
  Parameters<typeof formatDistanceToNowFns>[1]
>;

export function formatDate(
  date: string | Date | null | undefined,
  formatPattern: string = DATE_FORMATS.DATE_MEDIUM,
  options: DateTimeOptions = {},
): string {
  const { timezone = DEFAULT_TIMEZONE } = options;
  const formatOptions = options.locale ? { locale: options.locale } : undefined;

  const parsedDate = parseDate(date);
  if (!parsedDate) return "";

  try {
    return formatInTimeZone(parsedDate, timezone, formatPattern, formatOptions);
  } catch {
    return format(parsedDate, formatPattern, formatOptions);
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

/**
 * Human-readable distance from the given instant to now (e.g. "about 2 hours ago").
 * Defaults to `addSuffix: true` ("ago" / "in …") to match product copy patterns.
 */
export function formatDistanceToNow(
  date: string | Date | number | null | undefined,
  options: FormatDistanceToNowDisplayOptions = {},
): string {
  if (date === null || date === undefined) return "";

  if (typeof date === "number") {
    if (!Number.isFinite(date)) return "";
    const fromEpoch = new Date(date);
    if (Number.isNaN(fromEpoch.getTime())) return "";
    return formatDistanceToNowFns(fromEpoch, {
      addSuffix: true,
      ...options,
    });
  }

  const parsedDate = parseDate(date);
  if (!parsedDate) return "";

  return formatDistanceToNowFns(parsedDate, {
    addSuffix: true,
    ...options,
  });
}

/**
 * Compact human-readable distance from the given instant to now, matching
 * the internal ops-portal copy ("just now", "15m ago", "6h ago", "6d ago",
 * "2mo ago"). Deliberately not locale-aware; future/unknown dates render
 * as "just now" and null/undefined/invalid input as "".
 */
export function formatCompactDistanceToNow(
  date: string | Date | number | null | undefined,
): string {
  if (date === null || date === undefined) return "";

  const parsedDate =
    typeof date === "number" || typeof date === "string"
      ? new Date(date)
      : date;
  if (Number.isNaN(parsedDate.getTime())) return "";

  const diffMs = Date.now() - parsedDate.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 30) return `${Math.floor(days / 30)}mo ago`;
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
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

/**
 * yyyy-MM-dd from the Date's local calendar fields.
 * Use for date-picker DOM attributes and picker-aligned labels — not for IST-normalized portal copy.
 */
export function formatPickerIsoDate(date: Date): string {
  return format(date, DATE_FORMATS.ISO_DATE);
}

/** Abbreviated month label using local calendar fields (picker month dropdowns). */
export function formatPickerMonthShort(date: Date): string {
  return format(date, "MMM");
}
