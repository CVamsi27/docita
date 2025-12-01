/**
 * =====================================================
 * GLOBAL DATE/TIME UTILITIES
 * =====================================================
 * Centralized date/time handling with timezone support.
 * All dates are stored in UTC and displayed in clinic timezone.
 */

import {
  format,
  parse,
  parseISO,
  isValid,
  differenceInYears,
  differenceInMinutes,
  addMinutes,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  subDays,
  subMonths,
  isSameDay,
  isAfter,
  isBefore,
  addDays,
  addMonths,
} from "date-fns";
import { formatInTimeZone, toZonedTime, fromZonedTime } from "date-fns-tz";

// =====================================================
// DEFAULT CONFIGURATION
// =====================================================

export const DEFAULT_TIMEZONE = "Asia/Kolkata";
export const DEFAULT_LOCALE = "en-IN";

// =====================================================
// SUPPORTED CURRENCIES
// =====================================================

export const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹",
  USD: "$",
  GBP: "£",
  EUR: "€",
  AUD: "A$",
  CAD: "C$",
  SGD: "S$",
  AED: "AED",
  ZAR: "R",
};

export const SUPPORTED_CURRENCIES = Object.keys(CURRENCY_SYMBOLS);

export type CurrencyCode = keyof typeof CURRENCY_SYMBOLS;

// =====================================================
// TIMEZONE OPTIONS BY REGION
// =====================================================

export const TIMEZONE_OPTIONS = [
  // India (INR)
  { value: "Asia/Kolkata", label: "India (IST)", currency: "INR" },

  // United States (USD)
  { value: "America/New_York", label: "US Eastern (EST/EDT)", currency: "USD" },
  { value: "America/Chicago", label: "US Central (CST/CDT)", currency: "USD" },
  { value: "America/Denver", label: "US Mountain (MST/MDT)", currency: "USD" },
  {
    value: "America/Los_Angeles",
    label: "US Pacific (PST/PDT)",
    currency: "USD",
  },
  {
    value: "America/Anchorage",
    label: "US Alaska (AKST/AKDT)",
    currency: "USD",
  },
  { value: "Pacific/Honolulu", label: "US Hawaii (HST)", currency: "USD" },

  // United Kingdom (GBP)
  {
    value: "Europe/London",
    label: "United Kingdom (GMT/BST)",
    currency: "GBP",
  },

  // Europe (EUR)
  { value: "Europe/Paris", label: "France (CET/CEST)", currency: "EUR" },
  { value: "Europe/Berlin", label: "Germany (CET/CEST)", currency: "EUR" },
  { value: "Europe/Rome", label: "Italy (CET/CEST)", currency: "EUR" },
  { value: "Europe/Madrid", label: "Spain (CET/CEST)", currency: "EUR" },
  {
    value: "Europe/Amsterdam",
    label: "Netherlands (CET/CEST)",
    currency: "EUR",
  },
  { value: "Europe/Brussels", label: "Belgium (CET/CEST)", currency: "EUR" },
  { value: "Europe/Vienna", label: "Austria (CET/CEST)", currency: "EUR" },
  { value: "Europe/Dublin", label: "Ireland (GMT/IST)", currency: "EUR" },
  { value: "Europe/Lisbon", label: "Portugal (WET/WEST)", currency: "EUR" },
  { value: "Europe/Athens", label: "Greece (EET/EEST)", currency: "EUR" },
  { value: "Europe/Helsinki", label: "Finland (EET/EEST)", currency: "EUR" },

  // Australia (AUD)
  {
    value: "Australia/Sydney",
    label: "Australia Eastern (AEST/AEDT)",
    currency: "AUD",
  },
  {
    value: "Australia/Melbourne",
    label: "Australia Melbourne (AEST/AEDT)",
    currency: "AUD",
  },
  {
    value: "Australia/Brisbane",
    label: "Australia Brisbane (AEST)",
    currency: "AUD",
  },
  {
    value: "Australia/Perth",
    label: "Australia Western (AWST)",
    currency: "AUD",
  },
  {
    value: "Australia/Adelaide",
    label: "Australia Central (ACST/ACDT)",
    currency: "AUD",
  },
  {
    value: "Australia/Darwin",
    label: "Australia Darwin (ACST)",
    currency: "AUD",
  },

  // Canada (CAD)
  {
    value: "America/Toronto",
    label: "Canada Eastern (EST/EDT)",
    currency: "CAD",
  },
  {
    value: "America/Vancouver",
    label: "Canada Pacific (PST/PDT)",
    currency: "CAD",
  },
  {
    value: "America/Edmonton",
    label: "Canada Mountain (MST/MDT)",
    currency: "CAD",
  },
  {
    value: "America/Winnipeg",
    label: "Canada Central (CST/CDT)",
    currency: "CAD",
  },
  {
    value: "America/Halifax",
    label: "Canada Atlantic (AST/ADT)",
    currency: "CAD",
  },
  {
    value: "America/St_Johns",
    label: "Canada Newfoundland (NST/NDT)",
    currency: "CAD",
  },

  // Singapore (SGD)
  { value: "Asia/Singapore", label: "Singapore (SGT)", currency: "SGD" },

  // UAE (AED)
  { value: "Asia/Dubai", label: "UAE (GST)", currency: "AED" },

  // South Africa (ZAR)
  {
    value: "Africa/Johannesburg",
    label: "South Africa (SAST)",
    currency: "ZAR",
  },
] as const;

export type TimezoneValue = (typeof TIMEZONE_OPTIONS)[number]["value"];

/**
 * Get timezones for a specific currency.
 */
export function getTimezonesForCurrency(
  currency: string,
): (typeof TIMEZONE_OPTIONS)[number][] {
  return TIMEZONE_OPTIONS.filter((tz) => tz.currency === currency);
}

/**
 * Get the default timezone for a currency.
 */
export function getDefaultTimezoneForCurrency(currency: string): string {
  const timezones = getTimezonesForCurrency(currency);
  return timezones.length > 0 ? timezones[0].value : DEFAULT_TIMEZONE;
}

// =====================================================
// LOCALE OPTIONS BY REGION
// =====================================================

export const LOCALE_OPTIONS = [
  // India (INR)
  { value: "en-IN", label: "English (India)", currency: "INR" },
  { value: "hi-IN", label: "Hindi (India)", currency: "INR" },

  // United States (USD)
  { value: "en-US", label: "English (US)", currency: "USD" },
  { value: "es-US", label: "Spanish (US)", currency: "USD" },

  // United Kingdom (GBP)
  { value: "en-GB", label: "English (UK)", currency: "GBP" },

  // Europe (EUR)
  { value: "de-DE", label: "German (Germany)", currency: "EUR" },
  { value: "fr-FR", label: "French (France)", currency: "EUR" },
  { value: "it-IT", label: "Italian (Italy)", currency: "EUR" },
  { value: "es-ES", label: "Spanish (Spain)", currency: "EUR" },
  { value: "nl-NL", label: "Dutch (Netherlands)", currency: "EUR" },
  { value: "pt-PT", label: "Portuguese (Portugal)", currency: "EUR" },
  { value: "el-GR", label: "Greek (Greece)", currency: "EUR" },
  { value: "fi-FI", label: "Finnish (Finland)", currency: "EUR" },
  { value: "en-IE", label: "English (Ireland)", currency: "EUR" },

  // Australia (AUD)
  { value: "en-AU", label: "English (Australia)", currency: "AUD" },

  // Canada (CAD)
  { value: "en-CA", label: "English (Canada)", currency: "CAD" },
  { value: "fr-CA", label: "French (Canada)", currency: "CAD" },

  // Singapore (SGD)
  { value: "en-SG", label: "English (Singapore)", currency: "SGD" },
  { value: "zh-SG", label: "Chinese (Singapore)", currency: "SGD" },

  // UAE (AED)
  { value: "en-AE", label: "English (UAE)", currency: "AED" },
  { value: "ar-AE", label: "Arabic (UAE)", currency: "AED" },

  // South Africa (ZAR)
  { value: "en-ZA", label: "English (South Africa)", currency: "ZAR" },
  { value: "af-ZA", label: "Afrikaans (South Africa)", currency: "ZAR" },
] as const;

/**
 * Get locales for a specific currency.
 */
export function getLocalesForCurrency(
  currency: string,
): (typeof LOCALE_OPTIONS)[number][] {
  return LOCALE_OPTIONS.filter((loc) => loc.currency === currency);
}

/**
 * Get the default locale for a currency.
 */
export function getDefaultLocaleForCurrency(currency: string): string {
  const locales = getLocalesForCurrency(currency);
  return locales.length > 0 ? locales[0].value : DEFAULT_LOCALE;
}

export type LocaleValue = (typeof LOCALE_OPTIONS)[number]["value"];

// =====================================================
// DATE FORMAT PATTERNS
// =====================================================

export const DATE_FORMATS = {
  // Display formats
  DATE_SHORT: "dd/MM/yyyy", // 01/12/2025
  DATE_MEDIUM: "dd MMM yyyy", // 01 Dec 2025
  DATE_LONG: "dd MMMM yyyy", // 01 December 2025
  DATE_FULL: "EEEE, dd MMMM yyyy", // Monday, 01 December 2025

  // Time formats
  TIME_SHORT: "HH:mm", // 14:30
  TIME_MEDIUM: "hh:mm a", // 02:30 PM
  TIME_LONG: "HH:mm:ss", // 14:30:45

  // Combined formats
  DATETIME_SHORT: "dd/MM/yyyy HH:mm",
  DATETIME_MEDIUM: "dd MMM yyyy, hh:mm a",
  DATETIME_LONG: "dd MMMM yyyy 'at' hh:mm a",

  // ISO format for API
  ISO_DATE: "yyyy-MM-dd",
  ISO_DATETIME: "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",

  // Schedule time format
  SCHEDULE_TIME: "HH:mm",
} as const;

// =====================================================
// DATE/TIME OPTIONS TYPE
// =====================================================

export interface DateTimeOptions {
  timezone?: string;
  locale?: string;
}

// =====================================================
// PARSING FUNCTIONS
// =====================================================

/**
 * Parse a date string or Date object into a Date object.
 * Handles ISO strings, date strings, and Date objects.
 */
export function parseDate(date: string | Date | null | undefined): Date | null {
  if (!date) return null;

  if (date instanceof Date) {
    return isValid(date) ? date : null;
  }

  // Try parsing as ISO string first
  const parsed = parseISO(date);
  if (isValid(parsed)) {
    return parsed;
  }

  // Try parsing common date formats
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

/**
 * Parse a schedule time string (HH:mm) into hours and minutes.
 */
export function parseScheduleTime(
  timeString: string,
): { hours: number; minutes: number } | null {
  const match = timeString.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return { hours, minutes };
}

/**
 * Create a Date object from a date and schedule time string in a specific timezone.
 */
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

  // Get the date in the target timezone
  const zonedDate = toZonedTime(parsedDate, timezone);

  // Set the time
  zonedDate.setHours(parsedTime.hours, parsedTime.minutes, 0, 0);

  // Convert back to UTC
  return fromZonedTime(zonedDate, timezone);
}

// =====================================================
// FORMATTING FUNCTIONS
// =====================================================

/**
 * Format a date for display in the specified timezone.
 * @param date - The date to format (in UTC or local time)
 * @param formatPattern - The format pattern to use
 * @param options - Timezone and locale options
 */
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
    // Fallback to standard format if timezone conversion fails
    return format(parsedDate, formatPattern);
  }
}

/**
 * Format a time for display in the specified timezone.
 */
export function formatTime(
  date: string | Date | null | undefined,
  formatPattern: string = DATE_FORMATS.TIME_MEDIUM,
  options: DateTimeOptions = {},
): string {
  return formatDate(date, formatPattern, options);
}

/**
 * Format a date and time for display in the specified timezone.
 */
export function formatDateTime(
  date: string | Date | null | undefined,
  formatPattern: string = DATE_FORMATS.DATETIME_MEDIUM,
  options: DateTimeOptions = {},
): string {
  return formatDate(date, formatPattern, options);
}

/**
 * Format a date as a relative date (Today, Yesterday, or date).
 */
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

/**
 * Format a date range for display.
 */
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

// =====================================================
// TIMEZONE CONVERSION FUNCTIONS
// =====================================================

/**
 * Convert a date to UTC from a specific timezone.
 * Use this when the input date represents a local time in the specified timezone.
 */
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

/**
 * Convert a UTC date to a specific timezone.
 * Use this when the input date is in UTC and you want to display it in local time.
 */
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

/**
 * Get the current date/time in a specific timezone.
 */
export function nowInTimezone(options: DateTimeOptions = {}): Date {
  const { timezone = DEFAULT_TIMEZONE } = options;
  return toZonedTime(new Date(), timezone);
}

/**
 * Get today's date at midnight in a specific timezone (as UTC).
 */
export function todayInTimezone(options: DateTimeOptions = {}): Date {
  const { timezone = DEFAULT_TIMEZONE } = options;
  const now = toZonedTime(new Date(), timezone);
  const startOfDayZoned = startOfDay(now);
  return fromZonedTime(startOfDayZoned, timezone);
}

// =====================================================
// DATE CALCULATION UTILITIES
// =====================================================

/**
 * Calculate age from date of birth.
 */
export function calculateAge(
  dateOfBirth: string | Date | null | undefined,
): number | null {
  const dob = parseDate(dateOfBirth);
  if (!dob) return null;

  return differenceInYears(new Date(), dob);
}

/**
 * Get the difference between two dates in minutes.
 */
export function getMinutesDifference(
  startDate: string | Date,
  endDate: string | Date,
): number {
  const start = parseDate(startDate);
  const end = parseDate(endDate);

  if (!start || !end) return 0;

  return differenceInMinutes(end, start);
}

/**
 * Add minutes to a date.
 */
export function addMinutesToDate(
  date: string | Date,
  minutes: number,
): Date | null {
  const parsedDate = parseDate(date);
  if (!parsedDate) return null;

  return addMinutes(parsedDate, minutes);
}

// =====================================================
// DATE RANGE UTILITIES
// =====================================================

export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Get the start and end of a day in a specific timezone (as UTC).
 */
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

/**
 * Get the start and end of a week in a specific timezone (as UTC).
 */
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

/**
 * Get the start and end of a month in a specific timezone (as UTC).
 */
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

/**
 * Get a date range for the last N days.
 */
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

/**
 * Get a date range for the last N months.
 */
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

// =====================================================
// DATE COMPARISON UTILITIES
// =====================================================

/**
 * Check if a date is today in a specific timezone.
 */
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

/**
 * Check if a date is in the past.
 */
export function isPast(date: string | Date | null | undefined): boolean {
  const parsedDate = parseDate(date);
  if (!parsedDate) return false;

  return isBefore(parsedDate, new Date());
}

/**
 * Check if a date is in the future.
 */
export function isFuture(date: string | Date | null | undefined): boolean {
  const parsedDate = parseDate(date);
  if (!parsedDate) return false;

  return isAfter(parsedDate, new Date());
}

// =====================================================
// SCHEDULE TIME UTILITIES
// =====================================================

/**
 * Generate time slots between start and end times.
 */
export function generateTimeSlots(
  startTime: string,
  endTime: string,
  slotDurationMinutes: number,
): string[] {
  const start = parseScheduleTime(startTime);
  const end = parseScheduleTime(endTime);

  if (!start || !end) return [];

  const slots: string[] = [];
  let currentMinutes = start.hours * 60 + start.minutes;
  const endMinutes = end.hours * 60 + end.minutes;

  while (currentMinutes < endMinutes) {
    const hours = Math.floor(currentMinutes / 60);
    const minutes = currentMinutes % 60;
    slots.push(
      `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`,
    );
    currentMinutes += slotDurationMinutes;
  }

  return slots;
}

/**
 * Format a schedule time for display.
 */
export function formatScheduleTime(
  timeString: string,
  use24Hour: boolean = false,
): string {
  const parsed = parseScheduleTime(timeString);
  if (!parsed) return timeString;

  if (use24Hour) {
    return `${parsed.hours.toString().padStart(2, "0")}:${parsed.minutes.toString().padStart(2, "0")}`;
  }

  const hour12 = parsed.hours % 12 || 12;
  const period = parsed.hours < 12 ? "AM" : "PM";
  return `${hour12}:${parsed.minutes.toString().padStart(2, "0")} ${period}`;
}

// =====================================================
// ISO STRING UTILITIES
// =====================================================

/**
 * Convert a date to ISO string.
 */
export function toISOString(date: string | Date | null | undefined): string {
  const parsedDate = parseDate(date);
  if (!parsedDate) return "";

  return parsedDate.toISOString();
}

/**
 * Convert a date to ISO date string (YYYY-MM-DD).
 */
export function toISODateString(
  date: string | Date | null | undefined,
  options: DateTimeOptions = {},
): string {
  return formatDate(date, DATE_FORMATS.ISO_DATE, options);
}

/**
 * Get local ISO string for datetime-local input in a specific timezone.
 * This is useful for HTML datetime-local inputs.
 */
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

/**
 * Parse a datetime-local input value in a specific timezone to UTC.
 */
export function fromLocalISOString(
  localISOString: string,
  options: DateTimeOptions = {},
): Date | null {
  const { timezone = DEFAULT_TIMEZONE } = options;

  if (!localISOString) return null;

  try {
    // Parse the local datetime string
    const parsed = parse(localISOString, "yyyy-MM-dd'T'HH:mm", new Date());
    if (!isValid(parsed)) return null;

    // Convert from the local timezone to UTC
    return fromZonedTime(parsed, timezone);
  } catch {
    return null;
  }
}

// =====================================================
// RE-EXPORTS FROM date-fns FOR CONVENIENCE
// =====================================================

export {
  format,
  parseISO,
  isValid,
  differenceInYears,
  differenceInMinutes,
  addMinutes,
  addDays,
  addMonths,
  subDays,
  subMonths,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameDay,
  isAfter,
  isBefore,
} from "date-fns";

export { formatInTimeZone, toZonedTime, fromZonedTime } from "date-fns-tz";
