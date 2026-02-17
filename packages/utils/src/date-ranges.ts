import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { type DateTimeOptions, DEFAULT_TIMEZONE } from "./date-config.js";
import { parseDate } from "./date-parsing.js";

export interface DateRange {
  start: Date;
  end: Date;
}

export function getDayRange(
  date: string | Date = new Date(),
  options: DateTimeOptions = {},
): DateRange {
  const { timezone = DEFAULT_TIMEZONE } = options;

  const parsedDate = parseDate(date) || new Date();
  const zonedDate = toZonedTime(parsedDate, timezone);

  return {
    start: fromZonedTime(startOfDay(zonedDate), timezone),
    end: fromZonedTime(endOfDay(zonedDate), timezone),
  };
}

export function getWeekRange(
  date: string | Date = new Date(),
  options: DateTimeOptions = {},
): DateRange {
  const { timezone = DEFAULT_TIMEZONE } = options;

  const parsedDate = parseDate(date) || new Date();
  const zonedDate = toZonedTime(parsedDate, timezone);

  return {
    start: fromZonedTime(startOfWeek(zonedDate, { weekStartsOn: 1 }), timezone),
    end: fromZonedTime(endOfWeek(zonedDate, { weekStartsOn: 1 }), timezone),
  };
}

export function getMonthRange(
  date: string | Date = new Date(),
  options: DateTimeOptions = {},
): DateRange {
  const { timezone = DEFAULT_TIMEZONE } = options;

  const parsedDate = parseDate(date) || new Date();
  const zonedDate = toZonedTime(parsedDate, timezone);

  return {
    start: fromZonedTime(startOfMonth(zonedDate), timezone),
    end: fromZonedTime(endOfMonth(zonedDate), timezone),
  };
}

export function getLastNDaysRange(
  days: number,
  options: DateTimeOptions = {},
): DateRange {
  const { timezone = DEFAULT_TIMEZONE } = options;

  const now = toZonedTime(new Date(), timezone);
  const start = subDays(now, days);

  return {
    start: fromZonedTime(startOfDay(start), timezone),
    end: fromZonedTime(endOfDay(now), timezone),
  };
}

export function getLastNMonthsRange(
  months: number,
  options: DateTimeOptions = {},
): DateRange {
  const { timezone = DEFAULT_TIMEZONE } = options;

  const now = toZonedTime(new Date(), timezone);
  const start = subMonths(now, months);

  return {
    start: fromZonedTime(startOfMonth(start), timezone),
    end: fromZonedTime(endOfMonth(now), timezone),
  };
}
