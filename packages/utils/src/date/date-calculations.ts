import {
  addDays as addDaysFns,
  addMinutes as addMinutesFns,
  addMonths as addMonthsFns,
  addWeeks as addWeeksFns,
  differenceInDays as differenceInDaysFns,
  differenceInMinutes,
  differenceInYears,
  endOfMonth as endOfMonthFns,
  startOfMinute as startOfMinuteFns,
  startOfMonth as startOfMonthFns,
  subDays as subDaysFns,
  subMinutes as subMinutesFns,
} from "date-fns";
import { parseDate } from "./date-parsing.js";

export function calculateAge(
  dateOfBirth: string | Date | null | undefined,
): number | null {
  const dob = parseDate(dateOfBirth);
  if (!dob) return null;

  return differenceInYears(new Date(), dob);
}

export function getMinutesDifference(
  startDate: string | Date,
  endDate: string | Date,
): number {
  const start = parseDate(startDate);
  const end = parseDate(endDate);

  if (!start || !end) return 0;

  return differenceInMinutes(end, start);
}

/** Calendar day difference (matches date-fns differenceInDays). */
export function differenceInDays(
  dateLeft: string | Date,
  dateRight: string | Date,
): number {
  const left = parseDate(dateLeft);
  const right = parseDate(dateRight);

  if (!left || !right) return 0;

  return differenceInDaysFns(left, right);
}

/** Add minutes to an existing Date (matches date-fns addMinutes). */
export function addMinutes(date: Date, amount: number): Date {
  return addMinutesFns(date, amount);
}

/** Subtract minutes from a Date (matches date-fns subMinutes). */
export function subMinutes(date: Date, amount: number): Date {
  return subMinutesFns(date, amount);
}

/** Truncate to the start of the minute (matches date-fns startOfMinute). */
export function startOfMinute(date: Date): Date {
  return startOfMinuteFns(date);
}

export function addDays(date: Date, amount: number): Date {
  return addDaysFns(date, amount);
}

export function subDays(date: Date, amount: number): Date {
  return subDaysFns(date, amount);
}

export function addWeeks(date: Date, amount: number): Date {
  return addWeeksFns(date, amount);
}

export function addMonths(date: Date, amount: number): Date {
  return addMonthsFns(date, amount);
}

export function startOfMonth(date: Date): Date {
  return startOfMonthFns(date);
}

export function endOfMonth(date: Date): Date {
  return endOfMonthFns(date);
}
