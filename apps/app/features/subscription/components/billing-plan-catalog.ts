import {
  PRICING_CURRENCY_CONFIG,
  PRICING_CURRENCY_SYMBOLS,
  TIER_PRICING_BY_CURRENCY,
} from "@workspace/types";
import { formatAmountLocale, parseSupportedCurrency } from "@workspace/utils";

export function starterCatalogListMajorUnits(
  currency: string | undefined,
  billingCycle?: "MONTHLY" | "YEARLY" | string,
): number | null {
  const code = parseSupportedCurrency(currency ?? "INR");
  const row = TIER_PRICING_BY_CURRENCY[code].STARTER;
  const amount = billingCycle === "YEARLY" ? row.yearly : row.monthly;
  return typeof amount === "number" && Number.isFinite(amount) ? amount : null;
}

export function currencySymbolFor(code: string | undefined): string {
  const currency = parseSupportedCurrency(code ?? "INR");
  return PRICING_CURRENCY_SYMBOLS[currency] ?? currency;
}

export function formatMajorUnitsForCurrency(
  amount: number,
  currency?: string,
): string {
  const code = parseSupportedCurrency(currency ?? "INR");
  const { locale, decimalPlaces } = PRICING_CURRENCY_CONFIG[code];
  return formatAmountLocale(amount, locale, {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  });
}
