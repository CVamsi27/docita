import {
  PRICING_CURRENCY_CONFIG,
  PRICING_CURRENCY_SYMBOLS,
  type SupportedCurrency,
} from "@workspace/types";
import { isRecord } from "./is-record.js";
import { parseStringEnumMember } from "./string-enum.js";

const SUPPORTED_PRICING_CURRENCIES = Object.keys(
  PRICING_CURRENCY_SYMBOLS,
).filter((key): key is SupportedCurrency => key in PRICING_CURRENCY_SYMBOLS);

export function parseSupportedCurrency(
  value: string,
  fallback: SupportedCurrency = "INR",
): SupportedCurrency {
  return parseStringEnumMember(SUPPORTED_PRICING_CURRENCIES, value) ?? fallback;
}
import {
  CURRENCY_OPTIONS,
  DEFAULT_CURRENCY,
} from "./config/config-options.js";
import {
  CURRENCY_SYMBOLS,
  DEFAULT_LOCALE,
  LOCALE_OPTIONS,
} from "./date/date-config.js";
import { resolveCountryCode } from "./country.js";

const COUNTRY_TO_CURRENCY: Record<string, string> = {
  IN: "INR",
  US: "USD",
  GB: "GBP",
  AU: "AUD",
  NZ: "AUD",
  CA: "CAD",
  SG: "SGD",
  AE: "AED",
  ZA: "ZAR",
  AT: "EUR",
  BE: "EUR",
  CY: "EUR",
  EE: "EUR",
  FI: "EUR",
  FR: "EUR",
  DE: "EUR",
  GR: "EUR",
  HR: "EUR",
  IE: "EUR",
  IT: "EUR",
  LV: "EUR",
  LT: "EUR",
  LU: "EUR",
  MT: "EUR",
  NL: "EUR",
  PT: "EUR",
  SK: "EUR",
  SI: "EUR",
  ES: "EUR",
};

const SUPPORTED_CURRENCY_CODES: ReadonlySet<string> = new Set(
  CURRENCY_OPTIONS.map((option) => option.value),
);

export interface CurrencyContext {
  currency: string;
  locale: string;
  symbol: string;
}

export interface FormatCurrencyOptions {
  currency?: string | null;
  locale?: string | null;
  fractionDigits?: number;
}

function normalizeCurrency(value: string | null | undefined): string | undefined {
  const next = value?.trim().toUpperCase();
  if (!next || !SUPPORTED_CURRENCY_CODES.has(next)) {
    return undefined;
  }
  return next;
}

export function countryCodeToCurrency(countryCode: string | null | undefined): string {
  const code = countryCode?.trim().toUpperCase();
  return (code && COUNTRY_TO_CURRENCY[code]) || DEFAULT_CURRENCY;
}

export function getCurrencySymbol(currency: string | null | undefined): string {
  const code = normalizeCurrency(currency) ?? DEFAULT_CURRENCY;
  return CURRENCY_SYMBOLS[code] ?? code;
}

export function getCurrencyLocale(currency: string | null | undefined): string {
  const code = normalizeCurrency(currency) ?? DEFAULT_CURRENCY;
  return (
    LOCALE_OPTIONS.find((option) => option.currency === code)?.value ??
    DEFAULT_LOCALE
  );
}

export function resolveCurrencyContext(source: unknown): CurrencyContext {
  let currency: string | undefined;

  if (isRecord(source)) {
    currency =
      typeof source["currency"] === "string"
        ? normalizeCurrency(source["currency"])
        : undefined;
  }

  if (!currency) {
    currency = countryCodeToCurrency(resolveCountryCode(source));
  }

  return {
    currency,
    locale: getCurrencyLocale(currency),
    symbol: getCurrencySymbol(currency),
  };
}

export function formatCurrency(
  amount: number,
  options: FormatCurrencyOptions = {},
): string {
  const currency = normalizeCurrency(options.currency) ?? DEFAULT_CURRENCY;
  const locale = options.locale ?? getCurrencyLocale(currency);

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    ...(options.fractionDigits !== undefined && {
      minimumFractionDigits: options.fractionDigits,
      maximumFractionDigits: options.fractionDigits,
    }),
  }).format(amount);
}

/** Tier / pricing UI: uses `PRICING_CURRENCY_CONFIG` locale and decimal rules. */
export function formatPriceWithCurrency(
  amount: number | "custom",
  currency: SupportedCurrency = "INR",
): string {
  if (amount === "custom") return "Custom";
  const config = PRICING_CURRENCY_CONFIG[currency];
  return formatCurrency(amount, {
    currency,
    locale: config.locale,
    fractionDigits: config.decimalPlaces,
  });
}
