import { formatCountLocale } from "../locale-numbers.js";

export function isUnlimitedPlanLimit(value: number): boolean {
  return value < 0 || value >= 999_999;
}

export function formatPlanLimitCount(value: number | undefined | null): string {
  if (value === undefined || value === null) return "—";
  if (isUnlimitedPlanLimit(value)) {
    return "Unlimited";
  }
  return formatCountLocale(value);
}

export function tierPriceIsCustom(
  tier: string,
  price: number | null | undefined,
): boolean {
  return tier === "ENTERPRISE" || price === null;
}

export function formatInternalTierCardPrice(
  tier: string,
  price: number | null | undefined,
  formatMoney: (amount: number) => string,
): string {
  if (tierPriceIsCustom(tier, price)) {
    return "Custom";
  }
  if (price === 0) return "Free";
  return formatMoney(price ?? 0);
}

export function formatBillingCycleLabel(cycle: string): string {
  switch (cycle) {
    case "custom":
      return "Custom pricing";
    case "monthly":
      return "Monthly";
    case "yearly":
      return "Yearly";
    default:
      return cycle.charAt(0).toUpperCase() + cycle.slice(1);
  }
}

export function formatInternalTierSelectLabel(
  tier: string,
  options: {
    displayName?: string;
    price: number | null | undefined;
    billingCycle: string;
    formatMoney: (amount: number) => string;
  },
): string {
  const label = options.displayName ?? tier;
  const priceLabel = formatInternalTierCardPrice(tier, options.price, options.formatMoney);
  const cycleLabel = formatBillingCycleLabel(options.billingCycle);
  return `${label} — ${priceLabel} (${cycleLabel})`;
}
