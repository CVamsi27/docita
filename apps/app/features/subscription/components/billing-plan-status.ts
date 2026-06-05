import { getTierName, Tier } from "@/lib/subscription/tier-access";
import type { SubscriptionBillingSummary } from "./billing-plan-types";

const starterTierName = getTierName(Tier.STARTER);

export function isStarterActiveZeroBase(
  subscription: SubscriptionBillingSummary | null | undefined,
  subscriptionStatus: string | undefined,
): boolean {
  return [
    isStarterTier(subscription),
    isActive(subscriptionStatus),
    basePriceCents(subscription) === 0,
  ].every(Boolean);
}

export function isComplimentaryActivePaidPlan(
  subscription: SubscriptionBillingSummary | null | undefined,
  subscriptionStatus: string | undefined,
): boolean {
  return [
    isPaidTier(subscription),
    isActive(subscriptionStatus),
    basePriceCents(subscription) <= 0,
  ].every(Boolean);
}

export function starterMonthlyAccessTermMismatch(
  subscription: { tier?: string; billingCycle?: string } | null | undefined,
  daysLeftInPeriod: number | null,
): boolean {
  return [
    isStarterTier(subscription),
    subscription?.billingCycle === "MONTHLY",
    (daysLeftInPeriod ?? 0) > 45,
  ].every(Boolean);
}

function isStarterTier(
  subscription: SubscriptionBillingSummary | null | undefined,
): boolean {
  return subscription?.tier === starterTierName;
}

function isPaidTier(
  subscription: SubscriptionBillingSummary | null | undefined,
): boolean {
  return (subscription?.tier ?? starterTierName) !== starterTierName;
}

function isActive(subscriptionStatus: string | undefined): boolean {
  return subscriptionStatus === "ACTIVE";
}

function basePriceCents(
  subscription: SubscriptionBillingSummary | null | undefined,
): number {
  return subscription?.basePriceCents ?? 0;
}
