import { getTierName, Tier } from "@/lib/subscription/tier-access";
import {
  PRICING_CURRENCY_CONFIG,
  PRICING_CURRENCY_SYMBOLS,
  TIER_PRICING_BY_CURRENCY,
} from "@workspace/types";
import { formatAmountLocale, parseSupportedCurrency } from "@workspace/utils";
import { formatLocaleDateShortMonthYear } from "@/lib/formatters";

/**
 * Five-tier clinical ladder shown in the pricing UI. Front Desk / Core are now
 * represented as `PlanMode` toggles on top of these tiers — not as separate
 * ladder entries.
 */
export const PLAN_ORDER = [
  Tier.STARTER,
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
    subscription?.tier === getTierName(Tier.STARTER) &&
    subscriptionStatus === "ACTIVE" &&
    (subscription.basePriceCents ?? 0) === 0
  );
}

/**
 * A paid tier (anything above Starter) that is currently ACTIVE yet carries no
 * base charge is complimentary / comped access — not a ₹0 list price. The normal
 * checkout + activation path always captures the catalog price, so a zero base
 * here means the row was comped or seeded. Surface it as "Complimentary" rather
 * than "Annual — ₹0", which misreads as a paid plan being given away for free.
 */
export function isComplimentaryActivePaidPlan(
  subscription: { tier?: string; basePriceCents?: number } | null | undefined,
  subscriptionStatus: string | undefined,
): boolean {
  return (
    subscription?.tier != null &&
    subscription.tier !== getTierName(Tier.STARTER) &&
    subscriptionStatus === "ACTIVE" &&
    (subscription.basePriceCents ?? 0) <= 0
  );
}

export function starterCatalogListMajorUnits(
  currency: string | undefined,
  billingCycle?: "MONTHLY" | "YEARLY" | string,
): number | null {
  const code = parseSupportedCurrency(currency ?? "INR");
  const row = TIER_PRICING_BY_CURRENCY[code].STARTER;
  const amount =
    billingCycle === "YEARLY" ? row.yearly : row.monthly;
  return typeof amount === "number" && Number.isFinite(amount) ? amount : null;
}

export function billingCadenceLabel(cycle?: "MONTHLY" | "YEARLY" | string) {
  if (!cycle) return "Monthly";
  return cycle === "YEARLY" ? "Annual" : "Monthly";
}

export function currencySymbolFor(code: string | undefined) {
  const currency = parseSupportedCurrency(code ?? "INR");
  return PRICING_CURRENCY_SYMBOLS[currency] ?? currency;
}

function formatMajorUnitsForCurrency(
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
      return `${cadence} — ${symbol}${formatMajorUnitsForCurrency(listMajor, subscription?.currency)}${suffix}`;
    }
    return `${cadence} — ${symbol}0`;
  }

  const cents = subscription?.basePriceCents ?? 0;
  if (cents <= 0) {
    if (isComplimentaryActivePaidPlan(subscription, subscriptionStatus)) {
      return "Complimentary";
    }
    return `${cadence} — ${symbol}0`;
  }

  const majorUnits = cents / 100;
  const suffix = subscription?.billingCycle === "YEARLY" ? "/yr" : "/mo";
  return `${cadence} — ${symbol}${formatMajorUnitsForCurrency(majorUnits, subscription?.currency)}${suffix}`;
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
    subscription?.tier === getTierName(Tier.STARTER) &&
    subscription?.billingCycle === "MONTHLY" &&
    daysLeftInPeriod !== null &&
    daysLeftInPeriod > 45
  );
}
