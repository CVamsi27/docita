import { fetchLandingJson } from "@/lib/public-api";

export interface PlatformStats {
  clinics: number;
  doctors: number;
  patients: number;
  prescriptions: number;
}

export interface TierPricing {
  monthly: number | "custom";
  yearly: number | "custom";
  currency: string;
}

export interface TierConfig {
  id: string;
  name: string;
  description: string;
  tagline: string;
  pricing: TierPricing;
  features: string[];
}

export interface PricingConfig {
  currency: {
    code: string;
    symbol: string;
    name: string;
  };
  supportedCurrencies: Array<{ code: string; symbol: string; name: string }>;
  tiers: TierConfig[];
}

export const FALLBACK_PLATFORM_STATS: PlatformStats = {
  clinics: 25,
  doctors: 50,
  patients: 10000,
  prescriptions: 25000,
};

const FALLBACK_TIERS: TierConfig[] = [
  {
    id: "STARTER",
    name: "Free",
    description: "Core clinical workflows for new clinics.",
    tagline: "Start at zero cost",
    pricing: { monthly: 0, yearly: 0, currency: "₹" },
    features: [
      "50 patients",
      "Digital prescriptions",
      "Basic appointment queue",
      "Single doctor",
    ],
  },
  {
    id: "ESSENTIAL",
    name: "Essential",
    description: "Built for solo clinics scaling day-to-day operations.",
    tagline: "Best for solo practices",
    pricing: { monthly: 999, yearly: 9990, currency: "₹" },
    features: [
      "Unlimited patients",
      "Billing workflows",
      "WhatsApp reminders",
      "Analytics dashboard",
    ],
  },
  {
    id: "PROFESSIONAL",
    name: "Professional",
    description: "For multi-doctor clinics with advanced workflows.",
    tagline: "Scale with confidence",
    pricing: { monthly: 2499, yearly: 24990, currency: "₹" },
    features: [
      "Up to 5 doctors",
      "Broadcast campaigns",
      "REST API access",
      "Priority support",
    ],
  },
  {
    id: "ENTERPRISE",
    name: "Enterprise",
    description: "Custom SLAs and pricing for large groups and hospitals.",
    tagline: "Custom contracts",
    pricing: { monthly: "custom", yearly: "custom", currency: "₹" },
    features: [
      "Unlimited branches",
      "Dedicated success manager",
      "Custom invoicing",
      "Data export support",
    ],
  },
];

export const FALLBACK_PRICING_CONFIG: PricingConfig = {
  currency: {
    code: "INR",
    symbol: "₹",
    name: "Indian Rupee",
  },
  supportedCurrencies: [
    { code: "INR", symbol: "₹", name: "Indian Rupee" },
    { code: "USD", symbol: "$", name: "US Dollar" },
    { code: "EUR", symbol: "€", name: "Euro" },
    { code: "GBP", symbol: "£", name: "British Pound" },
    { code: "AUD", symbol: "A$", name: "Australian Dollar" },
    { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
    { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
    { code: "AED", symbol: "AED", name: "UAE Dirham" },
    { code: "ZAR", symbol: "R", name: "South African Rand" },
  ],
  tiers: FALLBACK_TIERS,
};

export async function fetchPlatformStats(): Promise<PlatformStats> {
  try {
    const payload = await fetchLandingJson<Partial<PlatformStats>>(
      "/public/platform-stats",
    );

    return {
      clinics: Math.max(payload.clinics ?? 0, FALLBACK_PLATFORM_STATS.clinics),
      doctors: Math.max(payload.doctors ?? 0, FALLBACK_PLATFORM_STATS.doctors),
      patients: Math.max(payload.patients ?? 0, FALLBACK_PLATFORM_STATS.patients),
      prescriptions: Math.max(
        payload.prescriptions ?? 0,
        FALLBACK_PLATFORM_STATS.prescriptions,
      ),
    };
  } catch {
    return FALLBACK_PLATFORM_STATS;
  }
}

export async function fetchPricingConfig(
  currencyCode: string,
): Promise<PricingConfig> {
  try {
    return await fetchLandingJson<PricingConfig>(
      `/pricing/config?currency=${encodeURIComponent(currencyCode)}`,
    );
  } catch {
    const symbol =
      FALLBACK_PRICING_CONFIG.supportedCurrencies.find(
        (currency) => currency.code === currencyCode,
      )?.symbol ?? FALLBACK_PRICING_CONFIG.currency.symbol;

    return {
      ...FALLBACK_PRICING_CONFIG,
      currency: {
        code: currencyCode,
        symbol,
        name:
          FALLBACK_PRICING_CONFIG.supportedCurrencies.find(
            (currency) => currency.code === currencyCode,
          )?.name ?? "Indian Rupee",
      },
      tiers: FALLBACK_TIERS.map((tier) => ({
        ...tier,
        pricing: {
          ...tier.pricing,
          currency: symbol,
        },
      })),
    };
  }
}

export function formatStatValue(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M+`;
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K+`;
  }

  return `${value}+`;
}

export function formatTierPrice(value: number | "custom", symbol: string): string {
  if (value === "custom") {
    return "Custom";
  }

  return `${symbol}${value.toLocaleString("en-IN")}`;
}
