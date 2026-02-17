import { isValid, parse } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import {
  DATE_FORMATS,
  type DateTimeOptions,
  DEFAULT_TIMEZONE,
} from "./date-config.js";
import { formatDate } from "./date-formatting.js";
import { parseDate } from "./date-parsing.js";

export function toISOString(date: string | Date | null | undefined): string {
  const parsedDate = parseDate(date);
  if (!parsedDate) return "";

  return parsedDate.toISOString();
}

export function toISODateString(
  date: string | Date | null | undefined,
  options: DateTimeOptions = {},
): string {
  return formatDate(date, DATE_FORMATS.ISO_DATE, options);
}

export function toLocalISOString(
  date: string | Date | null | undefined,
  options: DateTimeOptions = {},
): string {
  const { timezone = DEFAULT_TIMEZONE } = options;

  const parsedDate = parseDate(date);
  if (!parsedDate) return "";

  try {
    return formatInTimeZone(parsedDate, timezone, "yyyy-MM-dd'T'HH:mm");
  } catch {
    return "";
  }
}

export function fromLocalISOString(
  localISOString: string,
  options: DateTimeOptions = {},
): Date | null {
  const { timezone = DEFAULT_TIMEZONE } = options;

  if (!localISOString) return null;

  try {
    const parsed = parse(localISOString, "yyyy-MM-dd'T'HH:mm", new Date());
    if (!isValid(parsed)) return null;

    return fromZonedTime(parsed, timezone);
  } catch {
    return null;
  }
}
