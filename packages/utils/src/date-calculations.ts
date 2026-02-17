import {
  addMinutes,
  differenceInMinutes,
  differenceInMonths,
  differenceInYears,
} from "date-fns";
import { parseDate } from "./date-parsing.js";

export function calculateAge(
  dateOfBirth: string | Date | null | undefined,
): number | null {
  const dob = parseDate(dateOfBirth);
  if (!dob) return null;

  return differenceInYears(new Date(), dob);
}

export function calculateMedicalAge(
  dateOfBirth: string | Date | null | undefined,
): string {
  const dob = parseDate(dateOfBirth);
  if (!dob) return "N/A";

  const today = new Date();
  const years = differenceInYears(today, dob);

  if (years < 2) {
    const totalMonths = differenceInMonths(today, dob);
    return `${totalMonths}m`;
  }

  if (years < 5) {
    const months = differenceInMonths(today, dob) % 12;
    return `${years}y ${months}m`;
  }

  return `${years}y`;
}

export function calculateAgeInMonths(
  dateOfBirth: string | Date | null | undefined,
  atDate: string | Date = new Date(),
): number {
  const dob = parseDate(dateOfBirth);
  const target = parseDate(atDate);

  if (!dob || !target) return 0;

  return differenceInMonths(target, dob);
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

export function addMinutesToDate(
  date: string | Date,
  minutes: number,
): Date | null {
  const parsedDate = parseDate(date);
  if (!parsedDate) return null;

  return addMinutes(parsedDate, minutes);
}
