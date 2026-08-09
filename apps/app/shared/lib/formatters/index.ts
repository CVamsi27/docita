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
export { humanizeUiLabel } from "@workspace/ui/lib/label-formatters";
export { DATE_FORMATS } from "@workspace/utils";

export function formatDate(
  date: Date | string | null | undefined,
  pattern: string = DATE_FORMATS.DATE_MEDIUM,
  timezone: string = DEFAULT_TIMEZONE,
): string {
  return wsFormatDate(date, pattern, { timezone });
}

/** Calendar-style label when an invalid or missing date should show as "-". */
export function formatDateSafe(
  date: Date | string | null | undefined,
  pattern: string = DATE_FORMATS.DATE_MEDIUM,
  timezone: string = DEFAULT_TIMEZONE,
): string {
  if (date === null || date === undefined) return "-";
  const formatted = wsFormatDate(date, pattern, { timezone });
  return formatted.length > 0 ? formatted : "-";
}

export function formatLocaleDateShortMonth(
  date: Date | string,
  timezone: string = DEFAULT_TIMEZONE,
): string {
  return wsFormatDate(date, "d MMM", { timezone });
}

export function formatLocaleDateShortMonthYear(
  date: Date | string,
  timezone: string = DEFAULT_TIMEZONE,
): string {
  return wsFormatDate(date, "d MMM yyyy", { timezone });
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

/** "MMMM d, yyyy" — invoices and printable invoice details. */
export const DATE_FORMAT_OPTIONS_US_LONG = "MMMM d, yyyy";

/** "MMM d, yyyy" — inventory, lab orders. */
export const DATE_FORMAT_OPTIONS_US_SHORT = "MMM d, yyyy";

export interface FormatCurrencyOptions {
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

export function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length !== 10) return phone;
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

export function getInitials(firstName: string, lastName?: string): string {
  if (!firstName) return "";

  const first = firstName.charAt(0).toUpperCase();
  const last = lastName ? lastName.charAt(0).toUpperCase() : "";

  return `${first}${last}`;
}

export function truncate(text: string, length: number = 50): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + "…";
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function toTitleCase(text: string): string {
  return text
    .toLowerCase()
    .split(" ")
    .map((word) => capitalize(word))
    .join(" ");
}

function isKnownGender(value: string): value is Gender {
  return value in GENDER_LABELS;
}

export function formatGenderLabel(gender: string | null | undefined): string {
  if (!gender) return "";
  return isKnownGender(gender) ? GENDER_LABELS[gender] : gender;
}
