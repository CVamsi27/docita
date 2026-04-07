import { fetchLandingJson } from "@/lib/public-api";

export interface PlatformStats {
  clinics: number;
  doctors: number;
  patients: number;
  prescriptions: number;
}

export const FALLBACK_PLATFORM_STATS: PlatformStats = {
  clinics: 250,
  doctors: 1200,
  patients: 85000,
  prescriptions: 300000,
};

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

function isLiveLandingDataEnabled(): boolean {
  return import.meta.env["PUBLIC_ENABLE_LIVE_LANDING_DATA"] !== "false";
}

function parseStatValue(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }
  return Math.floor(value);
}

export async function fetchPlatformStats(): Promise<PlatformStats | null> {
  if (!isLiveLandingDataEnabled()) {
    return FALLBACK_PLATFORM_STATS;
  }

  try {
    const payload = await fetchLandingJson<Partial<PlatformStats>>(
      "/public/platform-stats",
    );

    const clinics = parseStatValue(payload.clinics);
    const doctors = parseStatValue(payload.doctors);
    const patients = parseStatValue(payload.patients);
    const prescriptions = parseStatValue(payload.prescriptions);

    if (
      clinics === null ||
      doctors === null ||
      patients === null ||
      prescriptions === null
    ) {
      return null;
    }

    return {
      clinics,
      doctors,
      patients,
      prescriptions,
    };
  } catch {
    return null;
  }
}

function buildFallbackPricingConfig(currencyCode: string): PricingConfig {
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

export async function fetchPricingConfig(
  currencyCode: string,
): Promise<PricingConfig> {
  if (!isLiveLandingDataEnabled()) {
    return buildFallbackPricingConfig(currencyCode);
  }

  try {
    return await fetchLandingJson<PricingConfig>(
      `/pricing/config?currency=${encodeURIComponent(currencyCode)}`,
    );
  } catch {
    return buildFallbackPricingConfig(currencyCode);
  }
}

export function formatStatValue(value: number): string {
  return value.toLocaleString("en-IN");
}

export function formatTierPrice(value: number | "custom", symbol: string): string {
  if (value === "custom") {
    return "Custom";
  }

  return `${symbol}${value.toLocaleString("en-IN")}`;
}
