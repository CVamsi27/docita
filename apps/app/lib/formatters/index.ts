import {
  DEFAULT_CURRENCY,
  formatCurrency as formatCurrencyWithContext,
} from "@workspace/utils";
export { humanizeUiLabel } from "@workspace/ui/lib/label-formatters";

export function formatDate(
  date: Date | string,
  locale: string = "en-IN",
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  return options !== undefined
    ? d.toLocaleDateString(locale, options)
    : d.toLocaleDateString(locale);
}

/** Calendar-style label when an invalid or missing date should show as "-". */
export function formatDateSafe(
  date: Date | string | null | undefined,
  locale: string = "en-IN",
  options?: Intl.DateTimeFormatOptions,
): string {
  if (date === null || date === undefined) return "-";
  const formatted = formatDate(date, locale, options);
  return formatted.length > 0 ? formatted : "-";
}

export function formatLocaleDateShortMonth(
  date: Date | string,
  locale: string = "en-IN",
): string {
  return formatDate(date, locale, { day: "numeric", month: "short" });
}

export function formatLocaleDateShortMonthYear(
  date: Date | string,
  locale: string = "en-IN",
): string {
  return formatDate(date, locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatTime(
  date: Date | string,
  locale: string = "en-IN",
  options: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
  },
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(locale, options);
}

/** Shared 12-hour wall-clock format used by appointments + consultation rows ("2:30 PM"). */
export const CLOCK_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
};

export function formatClockTime(
  date: Date | string,
  locale: string = "en-IN",
): string {
  return formatTime(date, locale, CLOCK_TIME_OPTIONS);
}

export function formatDateTime(
  date: Date | string,
  locale: string = "en-IN",
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  return options !== undefined
    ? d.toLocaleString(locale, options)
    : d.toLocaleString(locale);
}

/** en-US long month (invoices, printable invoice details). */
export const DATE_FORMAT_OPTIONS_US_LONG: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "long",
  day: "numeric",
};

/** en-US short month (inventory, lab orders). */
export const DATE_FORMAT_OPTIONS_US_SHORT: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
};

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
