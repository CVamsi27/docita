import {
  DEFAULT_CURRENCY,
  CURRENCY_OPTIONS,
} from "./config/config-options.js";
import {
  DEFAULT_LOCALE,
  CURRENCY_SYMBOLS,
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

  if (source && typeof source === "object" && !Array.isArray(source)) {
    const record = source as Record<string, unknown>;
    currency =
      typeof record["currency"] === "string"
        ? normalizeCurrency(record["currency"])
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
