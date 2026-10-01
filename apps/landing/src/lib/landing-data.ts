import { formatAmountLocale, formatCountLocale } from "@workspace/utils";

export interface PlatformStats {
  clinics: number;
  doctors: number;
  patients: number;
  prescriptions: number;
}

interface TierPricing {
  monthly: number | "custom";
  yearly: number | "custom";
  currency: string;
}

interface TierConfig {
  id: string;
  name: string;
  description: string;
  tagline: string;
  pricing: TierPricing;
  features: string[];
}

interface PricingConfig {
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
    name: "Starter",
    description: "Core clinical workflows for solo practitioners moving off paper",
    tagline: "Go digital from day one",
    pricing: { monthly: 499, yearly: 4990, currency: "₹" },
    features: [
      "Up to 50 patients",
      "Digital prescriptions with PDF",
      "Patient profiles & visit history",
      "Excel import & CSV export",
      "Single doctor",
    ],
  },
  {
    id: "FRONT_DESK",
    name: "Front desk · Solo",
    description:
      "Reception-first scheduling and billing without full in-app clinical workflows",
    tagline: "Reception and operations",
    pricing: { monthly: 799, yearly: 7990, currency: "₹" },
    features: [
      "Scheduling and queue",
      "Patients and invoicing",
      "WhatsApp within plan limits",
      "Schedule-only doctor profiles",
    ],
  },
  {
    id: "FRONT_DESK_CLINIC",
    name: "Front desk · Clinic",
    description:
      "Multi-desk reception for growing clinics without clinical workspaces",
    tagline: "Multi-desk reception",
    pricing: { monthly: 1249, yearly: 12490, currency: "₹" },
    features: [
      "Up to 25 staff users",
      "3,000 appointments / month",
      "Supervisor and billing-only roles",
      "WhatsApp messaging (2,000 msgs)",
    ],
  },
  {
    id: "FRONT_DESK_HOSPITAL",
    name: "Front desk · Hospital",
    description:
      "Hospital-scale reception ops with multi-location queues and handover",
    tagline: "Hospital reception",
    pricing: { monthly: 3999, yearly: 39990, currency: "₹" },
    features: [
      "Up to 150 staff users",
      "15,000 appointments / month",
      "Multi-OPD queue routing",
      "Shift handover and dedicated CSM",
    ],
  },
  {
    id: "ESSENTIAL",
    name: "Essential",
    description: "For solo clinics running OPD, billing, and follow-ups",
    tagline: "Best for solo practices",
    pricing: { monthly: 999, yearly: 9990, currency: "₹" },
    features: [
      "Unlimited patients",
      "Billing workflows",
      "WhatsApp messaging",
      "Analytics dashboard",
    ],
  },
  {
    id: "PROFESSIONAL",
    name: "Professional",
    description: "For multi-doctor clinics with reception-led workflows",
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
    id: "HOSPITAL",
    name: "Hospital",
    description:
      "For multi-doctor multi-branch hospitals: pooled WhatsApp, analytics, and dedicated CSM",
    tagline: "Multi-branch and multi-specialty",
    pricing: { monthly: 7999, yearly: 79990, currency: "₹" },
    features: [
      "Up to 25 doctors and 5 branches",
      "8,000 consultations / month",
      "Pooled WhatsApp (6,000 msgs)",
      "Multi-location analytics",
    ],
  },
  {
    id: "ENTERPRISE",
    name: "Enterprise",
    description: "Custom SLAs and pricing for large groups and hospitals",
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

const PLATFORM_STAT_KEYS: readonly (keyof PlatformStats)[] = [
  "clinics",
  "doctors",
  "patients",
  "prescriptions",
];

/**
 * Published operating figures for the marketing site.
 *
 * These are real owner-supplied counts, provisioned at build time so the page
 * can never publish a number we cannot stand behind:
 *
 *   PUBLIC_PLATFORM_STATS='{"clinics":12,"doctors":34,"patients":5600,"prescriptions":21000}'
 *
 * When the variable is absent, malformed, or partially filled, every figure is
 * omitted (see `HeroSection` and `ProofStripSection`) rather than synthesized.
 * An earlier revision randomized these on every page load, which made a public
 * operating claim change on refresh.
 */
function parsePlatformStats(raw: unknown): PlatformStats | null {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return null;
  }
  const values = new Map(Object.entries(parsed));
  const stats: PlatformStats = { clinics: 0, doctors: 0, patients: 0, prescriptions: 0 };
  for (const key of PLATFORM_STAT_KEYS) {
    const value = values.get(key);
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
      return null;
    }
    stats[key] = Math.floor(value);
  }
  return stats;
}

export const PLATFORM_STATS: PlatformStats | null = parsePlatformStats(
  import.meta.env["PUBLIC_PLATFORM_STATS"],
);

export function formatStatValue(value: number): string {
  return formatCountLocale(value);
}

export function formatTierPrice(
  value: number | "custom",
  symbol: string,
): string {
  if (value === "custom") return "Custom";

  return `${symbol}${formatAmountLocale(value)}`;
}
