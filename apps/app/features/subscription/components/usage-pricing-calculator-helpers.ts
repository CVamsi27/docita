import {
  TIER_PRICING_BY_CURRENCY,
  TIER_OVERAGE_RATES_BY_CURRENCY,
  TIER_LIMITS,
  type SupportedCurrency,
} from "@workspace/types";
import { getWhatsAppAddonPricingByCurrency } from "@workspace/utils";

export interface UsageInput {
  consultations: number;
  users: number;
  whatsappMessages: number;
}

export interface BillResult {
  base: number;
  overageBreakdown: {
    label: string;
    units: number;
    rate: number;
    cost: number;
  }[];
  overageTotal: number;
  total: number;
  whatsappIncluded: number;
  whatsappOverageRate: number;
}

export const DEFAULT_USAGE: UsageInput = {
  consultations: 800,
  users: 2,
  whatsappMessages: 200,
};

export const SLIDERS = [
  {
    key: "consultations" as const,
    label: "Consultations / month",
    min: 0,
    max: 20000,
    step: 100,
    unit: "consults",
  },
  {
    key: "users" as const,
    label: "Team Members",
    min: 1,
    max: 50,
    step: 1,
    unit: "users",
  },
  {
    key: "whatsappMessages" as const,
    label: "WhatsApp Messages / month",
    min: 0,
    max: 10000,
    step: 100,
    unit: "msgs",
  },
];

export function calculateBill(
  usage: UsageInput,
  tierKey: "ESSENTIAL" | "PROFESSIONAL",
  currency: SupportedCurrency,
): BillResult {
  const monthly = TIER_PRICING_BY_CURRENCY[currency]?.[tierKey]?.monthly;
  const base = typeof monthly === "number" ? monthly : 0;
  const rates =
    TIER_OVERAGE_RATES_BY_CURRENCY[currency]?.[tierKey] ??
    TIER_OVERAGE_RATES_BY_CURRENCY.INR[tierKey];
  const limits = TIER_LIMITS[tierKey];
  const whatsappPricing = getWhatsAppAddonPricingByCurrency(tierKey, currency);
  const whatsappIncluded = whatsappPricing.includedQuota;
  const whatsappOverageRate = whatsappPricing.overageRate;

  const overageBreakdown: BillResult["overageBreakdown"] = [];

  const addOverage = (
    label: string,
    current: number,
    included: number,
    rate: number,
  ) => {
    const units = Math.max(0, current - included);
    if (units > 0)
      overageBreakdown.push({ label, units, rate, cost: units * rate });
  };

  addOverage(
    "Consultations",
    usage.consultations,
    limits.appointments ?? 2000,
    rates.appointmentRate,
  );
  addOverage("Users", usage.users, limits.users ?? 5, rates.userRate);
  addOverage(
    "WhatsApp",
    usage.whatsappMessages,
    whatsappIncluded,
    whatsappOverageRate,
  );

  const overageTotal = overageBreakdown.reduce((sum, o) => sum + o.cost, 0);
  return {
    base,
    overageBreakdown,
    overageTotal,
    total: base + overageTotal,
    whatsappIncluded,
    whatsappOverageRate,
  };
}

export function exceedsProLimits(
  usage: UsageInput,
  currency: SupportedCurrency,
): boolean {
  const limits = TIER_LIMITS.ESSENTIAL;
  const whatsappIncluded = getWhatsAppAddonPricingByCurrency(
    "ESSENTIAL",
    currency,
  ).includedQuota;
  return (
    usage.consultations > (limits.appointments ?? 2000) ||
    usage.users > (limits.users ?? 5) ||
    usage.whatsappMessages > whatsappIncluded
  );
}
