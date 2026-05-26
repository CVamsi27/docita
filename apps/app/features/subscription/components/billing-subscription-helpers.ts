import { Tier } from "@/lib/tier-config";
import {
  PRICING_CURRENCY_SYMBOLS,
  TIER_PRICING_BY_CURRENCY,
  type SupportedCurrency,
} from "@workspace/types";
import { formatLocaleDateShortMonthYear } from "@/lib/formatters";

export const PLAN_ORDER = [
  Tier.STARTER,
  Tier.FRONT_DESK,
  Tier.ESSENTIAL,
  Tier.PROFESSIONAL,
  Tier.HOSPITAL,
  Tier.ENTERPRISE,
] as const;

export function formatPlanDate(value?: string | null) {
  if (!value) return "Not scheduled";
  const formatted = formatLocaleDateShortMonthYear(value);
  return formatted.length > 0 ? formatted : "Not scheduled";
}

export function formatStatusLabel(status?: string) {
  if (!status) return "Not set";
  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function isStarterActiveZeroBase(
  subscription: { tier?: string; basePriceCents?: number } | null | undefined,
  subscriptionStatus: string | undefined,
): boolean {
  return (
    subscription?.tier === "STARTER" &&
    subscriptionStatus === "ACTIVE" &&
    (subscription.basePriceCents ?? 0) === 0
  );
}

export function starterCatalogListMajorUnits(
  currency: string | undefined,
  billingCycle?: "MONTHLY" | "YEARLY" | string,
): number | null {
  const code = (currency ?? "INR").toUpperCase();
  if (
    !Object.prototype.hasOwnProperty.call(TIER_PRICING_BY_CURRENCY, code)
  ) {
    return null;
  }
  const row =
    TIER_PRICING_BY_CURRENCY[code as SupportedCurrency].STARTER;
  const amount =
    billingCycle === "YEARLY" ? row.yearly : row.monthly;
  return typeof amount === "number" && Number.isFinite(amount) ? amount : null;
}

export function billingCadenceLabel(cycle?: "MONTHLY" | "YEARLY" | string) {
  if (!cycle) return "Monthly";
  return cycle === "YEARLY" ? "Annual" : "Monthly";
}

export function currencySymbolFor(code: string | undefined) {
  const upper = (code ?? "INR").toUpperCase();
  return (
    PRICING_CURRENCY_SYMBOLS[
      upper as keyof typeof PRICING_CURRENCY_SYMBOLS
    ] ?? upper
  );
}

/**
 * Platform subscription row: always states cadence (monthly vs annual) and list
 * price when the subscription carries a non-zero base.
 */
export function formatPlanBillingDetail(
  subscription:
    | {
        tier?: string;
        billingCycle?: "MONTHLY" | "YEARLY";
        basePriceCents?: number;
        currency?: string;
      }
    | null
    | undefined,
  subscriptionStatus: string | undefined,
): string {
  const cadence = billingCadenceLabel(subscription?.billingCycle);
  const symbol = currencySymbolFor(subscription?.currency);

  if (isStarterActiveZeroBase(subscription, subscriptionStatus)) {
    const listMajor = starterCatalogListMajorUnits(
      subscription?.currency,
      subscription?.billingCycle,
    );
    if (listMajor != null) {
      const suffix = subscription?.billingCycle === "YEARLY" ? "/yr" : "/mo";
      return `${cadence} — ${symbol}${listMajor}${suffix}`;
    }
    return `${cadence} — ${symbol}0`;
  }

  const cents = subscription?.basePriceCents ?? 0;
  if (cents <= 0) {
    return `${cadence} — ${symbol}0`;
  }

  const majorUnits = cents / 100;
  const amountLabel = Number.isInteger(majorUnits)
    ? String(majorUnits)
    : majorUnits.toFixed(2);
  const suffix = subscription?.billingCycle === "YEARLY" ? "/yr" : "/mo";
  return `${cadence} — ${symbol}${amountLabel}${suffix}`;
}

/**
 * Legacy rows set Starter to MONTHLY with a ~365d access window; avoid implying
 * a monthly renewal cadence from that combination.
 */
export function starterMonthlyAccessTermMismatch(
  subscription: { tier?: string; billingCycle?: string } | null | undefined,
  daysLeftInPeriod: number | null,
): boolean {
  return (
    subscription?.tier === "STARTER" &&
    subscription?.billingCycle === "MONTHLY" &&
    daysLeftInPeriod !== null &&
    daysLeftInPeriod > 45
  );
}
