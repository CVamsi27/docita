import {
  DEFAULT_CURRENCY,
  formatCurrency as formatCurrencyWithContext,
  formatDate as wsFormatDate,
  formatTime as wsFormatTime,
  formatDateTime as wsFormatDateTime,
  DEFAULT_TIMEZONE,
  DATE_FORMATS,
} from "@workspace/utils";
import type { Gender } from "@workspace/types";
import { GENDER_LABELS } from "@workspace/utils";

export function formatDate(
  date: Date | string | null | undefined,
  pattern: string = DATE_FORMATS.DATE_MEDIUM,
  timezone: string = DEFAULT_TIMEZONE,
): string {
  return wsFormatDate(date, pattern, { timezone });
}

export function formatDateSafe(
  date: Date | string | null | undefined,
  pattern: string = DATE_FORMATS.DATE_MEDIUM,
  timezone: string = DEFAULT_TIMEZONE,
): string {
  if (date === null || date === undefined) return "-";
  const formatted = wsFormatDate(date, pattern, { timezone });
  return formatted.length > 0 ? formatted : "-";
}

export function formatLocaleDateShortMonth(date: Date | string): string {
  return wsFormatDate(date, "d MMM", { timezone: DEFAULT_TIMEZONE });
}

export function formatLocaleDateShortMonthYear(date: Date | string): string {
  return wsFormatDate(date, "d MMM yyyy", { timezone: DEFAULT_TIMEZONE });
}

export function formatTime(
  date: Date | string | null | undefined,
  pattern: string = DATE_FORMATS.TIME_MEDIUM,
  timezone: string = DEFAULT_TIMEZONE,
): string {
  return wsFormatTime(date, pattern, { timezone });
}

export function formatClockTime(
  date: Date | string,
  timezone: string = DEFAULT_TIMEZONE,
): string {
  return wsFormatTime(date, "h:mm a", { timezone });
}

export function formatDateTime(
  date: Date | string | null | undefined,
  pattern: string = DATE_FORMATS.DATETIME_MEDIUM,
  timezone: string = DEFAULT_TIMEZONE,
): string {
  return wsFormatDateTime(date, pattern, { timezone });
}

export const DATE_FORMAT_OPTIONS_US_LONG = "MMMM d, yyyy";
export const DATE_FORMAT_OPTIONS_US_SHORT = "MMM d, yyyy";

interface FormatCurrencyOptions {
  locale?: string;
  fractionDigits?: number;
}

export function formatCurrency(
  amount: number,
  currency: string = DEFAULT_CURRENCY,
  options: string | FormatCurrencyOptions = {},
): string {
  const resolved: FormatCurrencyOptions =
    typeof options === "string" ? { locale: options } : options;
  const { locale, fractionDigits } = resolved;
  return formatCurrencyWithContext(amount, {
    currency,
    locale,
    fractionDigits,
  });
}

export function getInitials(firstName: string, lastName?: string): string {
  if (!firstName) return "";
  const first = firstName.charAt(0).toUpperCase();
  const last = lastName ? lastName.charAt(0).toUpperCase() : "";
  return `${first}${last}`;
}

function isKnownGender(value: string): value is Gender {
  return value in GENDER_LABELS;
}

export function formatGenderLabel(gender: string | null | undefined): string {
  if (!gender) return "";
  return isKnownGender(gender) ? GENDER_LABELS[gender] : gender;
}