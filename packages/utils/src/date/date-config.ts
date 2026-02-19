export const DEFAULT_TIMEZONE = "Asia/Kolkata";
export const DEFAULT_LOCALE = "en-IN";

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

export const TIMEZONE_OPTIONS = [
  { value: "Asia/Kolkata", label: "India (IST)", currency: "INR" },
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
  {
    value: "Europe/London",
    label: "United Kingdom (GMT/BST)",
    currency: "GBP",
  },
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
  { value: "Asia/Singapore", label: "Singapore (SGT)", currency: "SGD" },
  { value: "Asia/Dubai", label: "UAE (GST)", currency: "AED" },
  {
    value: "Africa/Johannesburg",
    label: "South Africa (SAST)",
    currency: "ZAR",
  },
] as const;

export type TimezoneValue = (typeof TIMEZONE_OPTIONS)[number]["value"];

export function getTimezonesForCurrency(
  currency: string,
): (typeof TIMEZONE_OPTIONS)[number][] {
  return TIMEZONE_OPTIONS.filter((tz) => tz.currency === currency);
}

export function getDefaultTimezoneForCurrency(currency: string): string {
  const timezones = getTimezonesForCurrency(currency);
  return timezones[0]?.value ?? DEFAULT_TIMEZONE;
}

export const LOCALE_OPTIONS = [
  { value: "en-IN", label: "English (India)", currency: "INR" },
  { value: "hi-IN", label: "Hindi (India)", currency: "INR" },
  { value: "en-US", label: "English (US)", currency: "USD" },
  { value: "es-US", label: "Spanish (US)", currency: "USD" },
  { value: "en-GB", label: "English (UK)", currency: "GBP" },
  { value: "de-DE", label: "German (Germany)", currency: "EUR" },
  { value: "fr-FR", label: "French (France)", currency: "EUR" },
  { value: "it-IT", label: "Italian (Italy)", currency: "EUR" },
  { value: "es-ES", label: "Spanish (Spain)", currency: "EUR" },
  { value: "nl-NL", label: "Dutch (Netherlands)", currency: "EUR" },
  { value: "pt-PT", label: "Portuguese (Portugal)", currency: "EUR" },
  { value: "el-GR", label: "Greek (Greece)", currency: "EUR" },
  { value: "fi-FI", label: "Finnish (Finland)", currency: "EUR" },
  { value: "en-IE", label: "English (Ireland)", currency: "EUR" },
  { value: "en-AU", label: "English (Australia)", currency: "AUD" },
  { value: "en-CA", label: "English (Canada)", currency: "CAD" },
  { value: "fr-CA", label: "French (Canada)", currency: "CAD" },
  { value: "en-SG", label: "English (Singapore)", currency: "SGD" },
  { value: "zh-SG", label: "Chinese (Singapore)", currency: "SGD" },
  { value: "en-AE", label: "English (UAE)", currency: "AED" },
  { value: "ar-AE", label: "Arabic (UAE)", currency: "AED" },
  { value: "en-ZA", label: "English (South Africa)", currency: "ZAR" },
  { value: "af-ZA", label: "Afrikaans (South Africa)", currency: "ZAR" },
] as const;

export function getLocalesForCurrency(
  currency: string,
): (typeof LOCALE_OPTIONS)[number][] {
  return LOCALE_OPTIONS.filter((loc) => loc.currency === currency);
}

export function getDefaultLocaleForCurrency(currency: string): string {
  const locales = getLocalesForCurrency(currency);
  return locales[0]?.value ?? DEFAULT_LOCALE;
}

export type LocaleValue = (typeof LOCALE_OPTIONS)[number]["value"];

export const DATE_FORMATS = {
  DATE_SHORT: "dd/MM/yyyy",
  DATE_MEDIUM: "dd MMM yyyy",
  DATE_LONG: "dd MMMM yyyy",
  DATE_FULL: "EEEE, dd MMMM yyyy",
  TIME_SHORT: "HH:mm",
  TIME_MEDIUM: "hh:mm a",
  TIME_LONG: "HH:mm:ss",
  DATETIME_SHORT: "dd/MM/yyyy HH:mm",
  DATETIME_MEDIUM: "dd MMM yyyy, hh:mm a",
  DATETIME_LONG: "dd MMMM yyyy 'at' hh:mm a",
  ISO_DATE: "yyyy-MM-dd",
  ISO_DATETIME: "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
  SCHEDULE_TIME: "HH:mm",
} as const;

export interface DateTimeOptions {
  timezone?: string;
  locale?: string;
}
