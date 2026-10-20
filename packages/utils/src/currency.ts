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
  /** Pins both minimum and maximum fraction digits (legacy behavior). */
  fractionDigits?: number;
  /** Independent minimum fraction digits when `fractionDigits` is not set. */
  minFractionDigits?: number;
  /** Independent maximum fraction digits when `fractionDigits` is not set. */
  maxFractionDigits?: number;
}

/**
 * Whole-amount display ("₹1,500", never "₹1,500.00") while keeping up to
 * two decimals when the amount has a fractional part. The ops portal's
 * analytics/billing cards show whole rupees; the legacy Intl currency
 * default would force two decimals on every amount.
 */
export const WHOLE_AMOUNT_CURRENCY_OPTIONS: FormatCurrencyOptions = {
  minFractionDigits: 0,
  maxFractionDigits: 2,
};

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
  const { fractionDigits, minFractionDigits, maxFractionDigits } = options;

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    // `fractionDigits` pins both digits (legacy behavior); the independent
    // min/max pair applies only when it is not set (e.g. whole-rupee
    // display with min 0 / max 2).
    ...(fractionDigits !== undefined && {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }),
    ...(fractionDigits === undefined && minFractionDigits !== undefined && {
      minimumFractionDigits: minFractionDigits,
    }),
    ...(fractionDigits === undefined && maxFractionDigits !== undefined && {
      maximumFractionDigits: maxFractionDigits,
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

/**
 * Locale-aware price formatter for **rates** (overage per-unit, ₹0.75/msg).
 * Keeps up to 2 fractional digits when the amount isn't a whole number so
 * fractional sub-rupee rates aren't rounded away by `PRICING_CURRENCY_CONFIG`'s
 * decimalPlaces (INR is configured at 0).
 */
export function formatRateWithCurrency(
  amount: number,
  currency: SupportedCurrency = "INR",
): string {
  const config = PRICING_CURRENCY_CONFIG[currency];
  // Currencies that already display 2 decimals (USD, EUR, …) use their default;
  // INR / ZAR-like 0-decimal configs get up to 2 decimals only when needed.
  const baseDigits = config.decimalPlaces;
  const isWhole = Number.isInteger(amount);
  return new Intl.NumberFormat(config.locale, {
    style: "currency",
    currency,
    minimumFractionDigits: isWhole ? baseDigits : Math.max(baseDigits, 2),
    maximumFractionDigits: Math.max(baseDigits, 2),
  }).format(amount);
}

/**
 * Compact currency formatter for analytics cards ("₹1.2L", "$2.5M"). The
 * `Intl.NumberFormat` `notation: "compact"` mode is the canonical solution
 * and gives locale-correct suffixes (L = lakh in en-IN, M in en-US, etc.)
 * without the hand-rolled `value / 1000` math that loses precision and
 * breaks for sub-1K values.
 *
 * Caller passes the raw amount (e.g. monthly revenue in rupees, not
 * thousands). Falls back to the regular `formatCurrency` for sub-1K
 * values so the output stays readable on the analytics card.
 */
export function formatCompactCurrency(
  amount: number,
  options: FormatCurrencyOptions = {},
): string {
  if (!Number.isFinite(amount)) return formatCurrency(0, options);
  const currency = normalizeCurrency(options.currency) ?? DEFAULT_CURRENCY;
  const locale = options.locale ?? getCurrencyLocale(currency);

  if (Math.abs(amount) < 1_000) {
    return formatCurrency(amount, { ...options, currency, locale });
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}
