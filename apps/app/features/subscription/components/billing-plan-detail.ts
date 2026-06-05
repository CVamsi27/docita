import {
  currencySymbolFor,
  formatMajorUnitsForCurrency,
  starterCatalogListMajorUnits,
} from "./billing-plan-catalog";
import {
  isComplimentaryActivePaidPlan,
  isStarterActiveZeroBase,
} from "./billing-plan-status";
import type { SubscriptionBillingSummary } from "./billing-plan-types";

type BillingDetailFormatter = (
  subscription: SubscriptionBillingSummary | null | undefined,
) => string;

interface BillingDetailRule {
  when: boolean;
  format: BillingDetailFormatter;
}

export function billingCadenceLabel(
  cycle?: "MONTHLY" | "YEARLY" | string,
): string {
  return cycle === "YEARLY" ? "Annual" : "Monthly";
}

export function formatPlanBillingDetail(
  subscription: SubscriptionBillingSummary | null | undefined,
  subscriptionStatus: string | undefined,
): string {
  const rule = billingDetailRules(subscription, subscriptionStatus).find(
    (candidate) => candidate.when,
  );
  return (rule?.format ?? formatSubscriptionPrice)(subscription);
}

function billingDetailRules(
  subscription: SubscriptionBillingSummary | null | undefined,
  subscriptionStatus: string | undefined,
): BillingDetailRule[] {
  return [
    {
      when: isStarterActiveZeroBase(subscription, subscriptionStatus),
      format: formatStarterActiveZeroBase,
    },
    {
      when: isComplimentaryActivePaidPlan(subscription, subscriptionStatus),
      format: complimentaryBillingDetail,
    },
  ];
}

function complimentaryBillingDetail(): string {
  return "Complimentary";
}

function formatStarterActiveZeroBase(
  subscription: SubscriptionBillingSummary | null | undefined,
): string {
  const listMajor = starterCatalogListMajorUnits(
    subscription?.currency,
    subscription?.billingCycle,
  );
  return listMajor == null
    ? `${billingPrefix(subscription)}0`
    : `${billingPrefix(subscription)}${formatMajorUnitsForCurrency(
        listMajor,
        subscription?.currency,
      )}${billingSuffix(subscription)}`;
}

function formatSubscriptionPrice(
  subscription: SubscriptionBillingSummary | null | undefined,
): string {
  const cents = subscription?.basePriceCents ?? 0;
  const formattedAmount =
    cents <= 0
      ? "0"
      : `${formatMajorUnitsForCurrency(cents / 100, subscription?.currency)}${billingSuffix(subscription)}`;
  return `${billingPrefix(subscription)}${formattedAmount}`;
}

function billingPrefix(
  subscription: SubscriptionBillingSummary | null | undefined,
): string {
  return `${billingCadenceLabel(subscription?.billingCycle)} — ${currencySymbolFor(subscription?.currency)}`;
}

function billingSuffix(
  subscription: SubscriptionBillingSummary | null | undefined,
): string {
  return subscription?.billingCycle === "YEARLY" ? "/yr" : "/mo";
}
