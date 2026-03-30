"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";

function deriveAnnualPrice(monthly: number): number {
  return Math.round(monthly * 10);
}

export interface PlanPricing {
  monthly: number | "custom";
  yearly: number | "custom";
  currency: string;
}

export interface PlanLimits {
  patients: number;
  doctors: number;
  storageGB: number;
  branches: number;
}

export interface TierConfig {
  id: string;
  tier: number;
  name: string;
  description: string;
  tagline: string;
  color: string;
  pricing: PlanPricing;
  limits: PlanLimits;
  overageRates?: {
    patient: number;
    appointment: number;
    storage: number;
    user: number;
  };
  features: string[];
}

export interface TierConfigData {
  currency: {
    code: string;
    symbol: string;
    name: string;
  };
  supportedCurrencies: Array<{ code: string; symbol: string; name: string }>;
  tiers: TierConfig[];
  featureTierMap: Record<string, number>;
  featureDisplay: Record<string, { name: string; description: string }>;
  discounts: {
    annualPercent: number;
    semiAnnualPercent: number;
    referralCredits: number;
  };
  intelligenceInfo: {
    name: string;
    description: string;
    tagline: string;
    color: string;
    pricing: PlanPricing;
    features: string[];
  };
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹",
  USD: "$",
  GBP: "£",
  EUR: "€",
  AUD: "A$",
  CAD: "C$",
  SGD: "S$",
  AED: "AED",
  ZAR: "R",
};

const DEFAULT_CONFIG: TierConfigData = {
  currency: {
    code: "INR",
    symbol: CURRENCY_SYMBOLS.INR,
    name: "Indian Rupee",
  },
  supportedCurrencies: Object.entries(CURRENCY_SYMBOLS).map(([code, symbol]) => ({
    code,
    symbol,
    name:
      code === "INR"
        ? "Indian Rupee"
        : code === "USD"
          ? "US Dollar"
          : code === "GBP"
            ? "British Pound"
            : code === "EUR"
              ? "Euro"
              : code === "AUD"
                ? "Australian Dollar"
                : code === "CAD"
                  ? "Canadian Dollar"
                  : code === "SGD"
                    ? "Singapore Dollar"
                    : code === "AED"
                      ? "UAE Dirham"
                      : code === "ZAR"
                        ? "South African Rand"
                : code,
  })),
  tiers: [
    {
      id: "STARTER",
      tier: 0,
      name: "Free",
      description: "Basic clinical workflow for free",
      tagline: "Free forever",
      color: "gray",
      pricing: { monthly: 0, yearly: 0, currency: CURRENCY_SYMBOLS.INR },
      limits: { patients: 50, doctors: 1, storageGB: 1, branches: 1 },
      features: [
        "Up to 50 patients",
        "Up to 50 consultations/month",
        "Digital prescriptions with PDF",
        "Patient profiles & visit history",
        "Paper record scanning & archival",
        "Excel import & CSV export",
        "Single doctor",
      ],
    },
    {
      id: "ESSENTIAL",
      tier: 1,
      name: "Essential",
      description: "Clear limits, WhatsApp messaging, and simple billing.",
      tagline: "For solo clinics",
      color: "blue",
      pricing: { monthly: 999, yearly: 9990, currency: CURRENCY_SYMBOLS.INR },
      limits: { patients: 999999, doctors: 1, storageGB: 10, branches: 1 },
      features: [
        "Unlimited patients",
        "500 consultations/month included",
        "1 doctor included",
        "WhatsApp messaging (500 msgs/mo)",
        "Lab tests & inventory",
        "Queue management",
        "Advanced analytics",
        "Audit logs & compliance",
        "Insurance billing",
        "Digital intake forms",
        "Prescription templates",
        "AI features — Coming Soon",
      ],
    },
    {
      id: "PROFESSIONAL",
      tier: 2,
      name: "Professional",
      description: "Multi-doctor clinics with advanced workflows.",
      tagline: "Built for growing clinics",
      color: "purple",
      pricing: { monthly: 2499, yearly: 24990, currency: CURRENCY_SYMBOLS.INR },
      limits: { patients: 999999, doctors: 5, storageGB: 50, branches: 1 },
      features: [
        "Unlimited patients",
        "2,000 consultations/month included",
        "Up to 5 doctors",
        "WhatsApp messaging (2,000 msgs/mo)",
        "Broadcast campaigns",
        "Patient segmentation",
        "Full EHR (IPD, vitals, clinical notes)",
        "Custom branding on reports",
        "Multi-location analytics",
        "Bulk data import suite",
        "REST API access (10k calls/day)",
        "SSO (Google / Azure AD)",
        "Custom letterhead",
        "Priority support with SLA",
      ],
    },
    {
      id: "ENTERPRISE",
      tier: 3,
      name: "Enterprise",
      description: "Hospital-grade solution with custom contracts and unlimited scale.",
      tagline: "Hospital-Grade System",
      color: "orange",
      pricing: {
        monthly: "custom",
        yearly: "custom",
        currency: CURRENCY_SYMBOLS.INR,
      },
      limits: { patients: 999999, doctors: 999999, storageGB: 500, branches: 999999 },
      features: [
        "Unlimited patients, users & branches",
        "Everything in Professional",
        "Data warehouse export (BI tools)",
        "Custom contract & invoicing",
        "Dedicated account manager",
        "Custom SLA guarantee",
      ],
    },
  ],
  featureTierMap: {},
  featureDisplay: {},
  discounts: {
    annualPercent: 17,
    semiAnnualPercent: 8,
    referralCredits: 0,
  },
  intelligenceInfo: {
    name: "Intelligence",
    description: "AI-powered clinical assistant — Coming Soon in Essential and above",
    tagline: "Coming Soon",
    color: "blue",
    pricing: { monthly: 0, yearly: 0, currency: CURRENCY_SYMBOLS.INR },
    features: [
      "AI-assisted clinical notes",
      "Smart prescription suggestions",
      "Predictive no-show alerts",
      "Voice-to-text dictation",
      "Patient risk segmentation",
      "Anomaly detection",
      "Treatment insights",
      "Automated coding suggestions",
    ],
  },
};

// Actual per-currency pricing (matches TIER_PRICING_BY_CURRENCY in @workspace/types)
const TIER_PRICING: Record<string, Record<string, { monthly: number | "custom"; yearly: number | "custom" }>> = {
  INR: {
    STARTER: { monthly: 0, yearly: 0 },
    ESSENTIAL: { monthly: 999, yearly: deriveAnnualPrice(999) },
    PROFESSIONAL: { monthly: 2499, yearly: deriveAnnualPrice(2499) },
    ENTERPRISE: { monthly: "custom", yearly: "custom" },
  },
  USD: {
    STARTER: { monthly: 0, yearly: 0 },
    ESSENTIAL: { monthly: 19, yearly: deriveAnnualPrice(19) },
    PROFESSIONAL: { monthly: 49, yearly: deriveAnnualPrice(49) },
    ENTERPRISE: { monthly: "custom", yearly: "custom" },
  },
  EUR: {
    STARTER: { monthly: 0, yearly: 0 },
    ESSENTIAL: { monthly: 17, yearly: deriveAnnualPrice(17) },
    PROFESSIONAL: { monthly: 45, yearly: deriveAnnualPrice(45) },
    ENTERPRISE: { monthly: "custom", yearly: "custom" },
  },
  GBP: {
    STARTER: { monthly: 0, yearly: 0 },
    ESSENTIAL: { monthly: 15, yearly: deriveAnnualPrice(15) },
    PROFESSIONAL: { monthly: 39, yearly: deriveAnnualPrice(39) },
    ENTERPRISE: { monthly: "custom", yearly: "custom" },
  },
  AUD: {
    STARTER: { monthly: 0, yearly: 0 },
    ESSENTIAL: { monthly: 29, yearly: deriveAnnualPrice(29) },
    PROFESSIONAL: { monthly: 75, yearly: deriveAnnualPrice(75) },
    ENTERPRISE: { monthly: "custom", yearly: "custom" },
  },
  CAD: {
    STARTER: { monthly: 0, yearly: 0 },
    ESSENTIAL: { monthly: 25, yearly: deriveAnnualPrice(25) },
    PROFESSIONAL: { monthly: 65, yearly: deriveAnnualPrice(65) },
    ENTERPRISE: { monthly: "custom", yearly: "custom" },
  },
  SGD: {
    STARTER: { monthly: 0, yearly: 0 },
    ESSENTIAL: { monthly: 25, yearly: deriveAnnualPrice(25) },
    PROFESSIONAL: { monthly: 65, yearly: deriveAnnualPrice(65) },
    ENTERPRISE: { monthly: "custom", yearly: "custom" },
  },
  AED: {
    STARTER: { monthly: 0, yearly: 0 },
    ESSENTIAL: { monthly: 69, yearly: deriveAnnualPrice(69) },
    PROFESSIONAL: { monthly: 179, yearly: deriveAnnualPrice(179) },
    ENTERPRISE: { monthly: "custom", yearly: "custom" },
  },
  ZAR: {
    STARTER: { monthly: 0, yearly: 0 },
    ESSENTIAL: { monthly: 349, yearly: deriveAnnualPrice(349) },
    PROFESSIONAL: { monthly: 899, yearly: deriveAnnualPrice(899) },
    ENTERPRISE: { monthly: "custom", yearly: "custom" },
  },
};

// Fallback multipliers for currencies not in TIER_PRICING
const CURRENCY_MULTIPLIERS: Record<string, number> = {
  CAD: 0.05,
  SGD: 0.05,
  AED: 0.14,
  ZAR: 0.35,
};

// Numeric overage rates per currency (matches TIER_OVERAGE_RATES_BY_CURRENCY in @workspace/types)
const OVERAGE_RATES_NUMERIC: Record<
  string,
  {
    pro: { patient: number; appt: number; user: number; wa: number };
    clinic: { patient: number; appt: number; user: number; wa: number };
  }
> = {
  INR: { pro: { patient: 1.5,   appt: 0.75,  user: 399, wa: 0.5   }, clinic: { patient: 1.2,   appt: 0.6,   user: 299, wa: 0.3   } },
  USD: { pro: { patient: 0.04,  appt: 0.05,  user: 5,   wa: 0.02  }, clinic: { patient: 0.02,  appt: 0.03,  user: 4,   wa: 0.01  } },
  EUR: { pro: { patient: 0.03,  appt: 0.05,  user: 4,   wa: 0.02  }, clinic: { patient: 0.02,  appt: 0.03,  user: 3,   wa: 0.01  } },
  GBP: { pro: { patient: 0.03,  appt: 0.04,  user: 4,   wa: 0.015 }, clinic: { patient: 0.02,  appt: 0.025, user: 3,   wa: 0.008 } },
  AUD: { pro: { patient: 0.05,  appt: 0.07,  user: 7,   wa: 0.03  }, clinic: { patient: 0.03,  appt: 0.05,  user: 5,   wa: 0.015 } },
  CAD: { pro: { patient: 0.05,  appt: 0.07,  user: 7,   wa: 0.03  }, clinic: { patient: 0.03,  appt: 0.04,  user: 5,   wa: 0.013 } },
  SGD: { pro: { patient: 0.05,  appt: 0.07,  user: 7,   wa: 0.03  }, clinic: { patient: 0.03,  appt: 0.04,  user: 5,   wa: 0.013 } },
  AED: { pro: { patient: 0.14,  appt: 0.18,  user: 18,  wa: 0.07  }, clinic: { patient: 0.08,  appt: 0.11,  user: 14,  wa: 0.04  } },
  ZAR: { pro: { patient: 0.7,   appt: 0.9,   user: 90,  wa: 0.35  }, clinic: { patient: 0.45, appt: 0.6,   user: 70,  wa: 0.2   } },
};

export interface OverageRateRow {
  patient: string;
  appt: string;
  user: string;
  wa: string;
}

export interface OverageRatesResult {
  pro: OverageRateRow;
  clinic: OverageRateRow;
}

function fmtRate(val: number, sym: string): string {
  if (val >= 10) return `${sym}${Math.round(val)}`;
  if (val >= 1)  return `${sym}${parseFloat(val.toFixed(2))}`;
  return `${sym}${parseFloat(val.toFixed(3))}`;
}

function computeOverageRates(currency: string): OverageRatesResult {
  const sym = CURRENCY_SYMBOLS[currency] ?? "$";
  const exact = OVERAGE_RATES_NUMERIC[currency];

  if (exact) {
    const fmt = (tier: typeof exact.pro) => ({
      patient: fmtRate(tier.patient, sym),
      appt:    fmtRate(tier.appt,    sym),
      user:    fmtRate(tier.user,    sym),
      wa:      fmtRate(tier.wa,      sym),
    });
    return { pro: fmt(exact.pro), clinic: fmt(exact.clinic) };
  }

  // Fallback: multiply INR base rates by the currency multiplier
  const mult = CURRENCY_MULTIPLIERS[currency] ?? 0.012;
  const base = OVERAGE_RATES_NUMERIC.INR;
  const fmtScaled = (val: number) => fmtRate(val * mult, sym);
  return {
    pro:    { patient: fmtScaled(base.pro.patient),    appt: fmtScaled(base.pro.appt),    user: fmtScaled(base.pro.user),    wa: fmtScaled(base.pro.wa)    },
    clinic: { patient: fmtScaled(base.clinic.patient), appt: fmtScaled(base.clinic.appt), user: fmtScaled(base.clinic.user), wa: fmtScaled(base.clinic.wa) },
  };
}

async function fetchTierConfig(currency?: string): Promise<TierConfigData> {
  let apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
  if (apiUrl.endsWith('/api')) {
    apiUrl = `${apiUrl}/v1`;
  }
  const query = currency ? `?currency=${currency}` : "";
  const response = await fetch(`${apiUrl}/pricing/config${query}`);

  if (!response.ok) {
    throw new Error("Failed to fetch tier configuration");
  }

  return response.json();
}

export function useTierConfig(currency?: string) {
  const resolvedCurrency = currency ?? "INR";
  const {
    data: config = DEFAULT_CONFIG,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["tier-config", resolvedCurrency],
    queryFn: () => fetchTierConfig(resolvedCurrency),
    staleTime: 5 * 60 * 1000, 
    gcTime: 30 * 60 * 1000, 
    retry: 2,
    placeholderData: DEFAULT_CONFIG,
  });

  const getTier = useCallback(
    (tierId: string): TierConfig | undefined => {
      return config.tiers.find((t: TierConfig) => t.id === tierId);
    },
    [config],
  );

  const getIntelligenceBundlePrice = useCallback((): number => 0, []);

  const getCurrencySymbol = useCallback((currency: string): string => {
    return CURRENCY_SYMBOLS[currency] || CURRENCY_SYMBOLS.INR;
  }, []);

  const getPricing = useCallback(
    (
      tierId: string,
      currency: string,
    ): { monthly: number; yearly: number; isCustom: boolean } | null => {
      const basePricing =
        tierId === "INTELLIGENCE"
          ? config.intelligenceInfo?.pricing
          : getTier(tierId)?.pricing;

      if (!basePricing) return null;
      if (basePricing.monthly === "custom" || basePricing.yearly === "custom") {
        return { monthly: 0, yearly: 0, isCustom: true };
      }

      const activeCurrency = currency.toUpperCase();
      const isApiCurrency =
        config.currency?.code?.toUpperCase() === activeCurrency;

      if (isApiCurrency) {
        return {
          monthly: basePricing.monthly as number,
          yearly: basePricing.yearly as number,
          isCustom: false,
        };
      }

      const multiplier = CURRENCY_MULTIPLIERS[activeCurrency] ?? 1;
      return {
        monthly: Math.round((basePricing.monthly as number) * multiplier),
        yearly: Math.round((basePricing.yearly as number) * multiplier),
        isCustom: false,
      };
    },
    [config, getTier],
  );

  const getOverageRates = useCallback(
    (currency: string): OverageRatesResult => {
      const tierCurrency = currency.toUpperCase();
      const proTier = config.tiers.find((tier) => tier.id === "PROFESSIONAL");
      const clinicTier = config.tiers.find((tier) => tier.id === "ENTERPRISE");
      const fallbackRates = computeOverageRates(tierCurrency);

      if (
        config.currency?.code?.toUpperCase() === tierCurrency &&
        proTier?.overageRates &&
        clinicTier?.overageRates
      ) {
        const toRow = (rate: {
          patient: number;
          appointment: number;
          user: number;
        }) => ({
          patient: fmtRate(rate.patient, getCurrencySymbol(tierCurrency)),
          appt: fmtRate(rate.appointment, getCurrencySymbol(tierCurrency)),
          user: fmtRate(rate.user, getCurrencySymbol(tierCurrency)),
          wa: fallbackRates.pro.wa,
        });

        return {
          pro: toRow(proTier.overageRates),
          clinic: {
            ...toRow(clinicTier.overageRates),
            wa: fallbackRates.clinic.wa,
          },
        };
      }

      return fallbackRates;
    },
    [config, getCurrencySymbol],
  );

  return {
    tierConfig: config,
    isLoading,
    error:
      error instanceof Error ? error.message : error ? String(error) : null,
    refreshConfig: refetch,
    getTier,
    getIntelligenceBundlePrice,
    getCurrencySymbol,
    getPricing,
    getOverageRates,
  };
}
