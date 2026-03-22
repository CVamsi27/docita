"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";

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
  features: string[];
}

export interface IntelligenceAddon {
  feature: string;
  name: string;
  description: string;
  monthlyPrice: number;
  icon: string;
}

export interface TierConfigData {
  tiers: TierConfig[];
  featureTierMap: Record<string, number>;
  featureDisplay: Record<string, { name: string; description: string }>;
  intelligenceAddons: IntelligenceAddon[];
  intelligenceBundleDiscount: number;
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
  tiers: [
    {
      id: "STARTER",
      tier: 0,
      name: "Docita Starter",
      description: "Basic clinical workflow for free",
      tagline: "Free forever",
      color: "gray",
      pricing: { monthly: 0, yearly: 0, currency: CURRENCY_SYMBOLS.INR },
      limits: { patients: 50, doctors: 1, storageGB: 1, branches: 1 },
      features: [
        "Up to 50 patients",
        "Calendar & appointment scheduling",
        "Digital prescriptions with PDF",
        "Patient profiles & visit history",
        "Paper record scanning & archival",
        "Excel import & CSV export",
      ],
    },
    {
      id: "ESSENTIAL",
      tier: 1,
      name: "Docita Essential",
      description: "Professional practice management for solo clinics",
      tagline: "Solo Clinic Pro",
      color: "blue",
      pricing: { monthly: 999, yearly: 10789, currency: CURRENCY_SYMBOLS.INR },
      limits: { patients: 500, doctors: 1, storageGB: 10, branches: 1 },
      features: [
        "500 active patients",
        "1,000 appointments/month",
        "Invoicing & billing",
        "Basic analytics dashboard",
        "ICD-10/CPT medical coding",
        "Prescription templates",
        "3 users included",
      ],
    },
    {
      id: "PROFESSIONAL",
      tier: 2,
      name: "Docita Professional",
      description: "Full-featured for multi-doctor clinics",
      tagline: "Multi-Doctor Clinics",
      color: "purple",
      pricing: { monthly: 3999, yearly: 43189, currency: CURRENCY_SYMBOLS.INR },
      limits: { patients: 10000, doctors: 999, storageGB: 100, branches: 5 },
      features: [
        "10,000 active patients",
        "20,000 appointments/month",
        "Everything in Essential",
        "Unlimited doctors",
        "Multi-clinic branching (up to 5)",
        "Lab tests, inventory & queue",
        "15 users included",
      ],
    },
    {
      id: "ENTERPRISE",
      tier: 3,
      name: "Docita Enterprise",
      description: "Hospital-grade solution with full customization",
      tagline: "Hospital-Grade System",
      color: "orange",
      pricing: {
        monthly: "custom",
        yearly: "custom",
        currency: CURRENCY_SYMBOLS.INR,
      },
      limits: { patients: 999999, doctors: 999, storageGB: 500, branches: 999 },
      features: [
        "Unlimited patients & doctors",
        "Everything in Professional",
        "Full EHR capabilities",
        "API access & SSO",
        "Custom branding & white-label",
        "Data warehouse export",
        "Dedicated account manager",
      ],
    },
  ],
  featureTierMap: {},
  featureDisplay: {},
  intelligenceAddons: [
    {
      feature: "AI_DIAGNOSIS_HINTS",
      name: "AI Diagnosis Assist",
      description: "Get AI-powered diagnosis suggestions based on symptoms",
      monthlyPrice: 1999,
      icon: "Brain",
    },
    {
      feature: "AI_PRESCRIPTION_ASSISTANT",
      name: "AI Prescription Assistant",
      description: "Smart prescription suggestions and drug interactions",
      monthlyPrice: 999,
      icon: "Pill",
    },
    {
      feature: "SMART_TASK_ENGINE",
      name: "Smart Task Engine",
      description: "AI-powered workflow automation and reminders",
      monthlyPrice: 1499,
      icon: "Bot",
    },
  ],
  intelligenceBundleDiscount: 0.4,
  intelligenceInfo: {
    name: "Docita Intelligence",
    description: "AI-powered features to enhance your clinic",
    tagline: "AI-Powered Add-on",
    color: "pink",
    pricing: { monthly: 2999, yearly: 32389, currency: CURRENCY_SYMBOLS.INR },
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
    ESSENTIAL: { monthly: 999, yearly: 10789 },
    PROFESSIONAL: { monthly: 3999, yearly: 43189 },
    ENTERPRISE: { monthly: "custom", yearly: "custom" },
    INTELLIGENCE: { monthly: 1999, yearly: 21589 },
  },
  USD: {
    STARTER: { monthly: 0, yearly: 0 },
    ESSENTIAL: { monthly: 19, yearly: 205 },
    PROFESSIONAL: { monthly: 79, yearly: 853 },
    ENTERPRISE: { monthly: "custom", yearly: "custom" },
    INTELLIGENCE: { monthly: 29, yearly: 313 },
  },
  EUR: {
    STARTER: { monthly: 0, yearly: 0 },
    ESSENTIAL: { monthly: 17, yearly: 184 },
    PROFESSIONAL: { monthly: 69, yearly: 745 },
    ENTERPRISE: { monthly: "custom", yearly: "custom" },
    INTELLIGENCE: { monthly: 25, yearly: 270 },
  },
  GBP: {
    STARTER: { monthly: 0, yearly: 0 },
    ESSENTIAL: { monthly: 15, yearly: 162 },
    PROFESSIONAL: { monthly: 59, yearly: 637 },
    ENTERPRISE: { monthly: "custom", yearly: "custom" },
    INTELLIGENCE: { monthly: 22, yearly: 238 },
  },
  AUD: {
    STARTER: { monthly: 0, yearly: 0 },
    ESSENTIAL: { monthly: 29, yearly: 313 },
    PROFESSIONAL: { monthly: 119, yearly: 1285 },
    ENTERPRISE: { monthly: "custom", yearly: "custom" },
    INTELLIGENCE: { monthly: 45, yearly: 486 },
  },
};

// Fallback multipliers for currencies not in TIER_PRICING
const CURRENCY_MULTIPLIERS: Record<string, number> = {
  CAD: 0.048,
  SGD: 0.045,
  AED: 0.13,
  ZAR: 0.6,
};

async function fetchTierConfig(): Promise<TierConfigData> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
  const response = await fetch(`${apiUrl}/subscription/config`);

  if (!response.ok) {
    throw new Error("Failed to fetch tier configuration");
  }

  return response.json();
}

export function useTierConfig() {
  const {
    data: config = DEFAULT_CONFIG,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["tier-config"],
    queryFn: fetchTierConfig,
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

  const getIntelligenceBundlePrice = useCallback((): number => {
    const totalPrice = config.intelligenceAddons.reduce(
      (sum: number, addon: IntelligenceAddon) => sum + addon.monthlyPrice,
      0,
    );
    return Math.round(totalPrice * (1 - config.intelligenceBundleDiscount));
  }, [config]);

  const getCurrencySymbol = useCallback((currency: string): string => {
    return CURRENCY_SYMBOLS[currency] || CURRENCY_SYMBOLS.INR;
  }, []);

  const getPricing = useCallback(
    (
      tierId: string,
      currency: string,
    ): { monthly: number; yearly: number; isCustom: boolean } | null => {
      // Use actual per-currency pricing when available
      const currencyTable = TIER_PRICING[currency];
      if (currencyTable) {
        const entry = currencyTable[tierId];
        if (entry) {
          if (entry.monthly === "custom" || entry.yearly === "custom") {
            return { monthly: 0, yearly: 0, isCustom: true };
          }
          return { monthly: entry.monthly as number, yearly: entry.yearly as number, isCustom: false };
        }
      }

      // Fallback: use INR base price × currency multiplier
      const basePricing = tierId === "INTELLIGENCE"
        ? config.intelligenceInfo?.pricing
        : getTier(tierId)?.pricing;

      if (!basePricing) return null;
      if (basePricing.monthly === "custom" || basePricing.yearly === "custom") {
        return { monthly: 0, yearly: 0, isCustom: true };
      }

      const multiplier = CURRENCY_MULTIPLIERS[currency] ?? 1;
      return {
        monthly: Math.round((basePricing.monthly as number) * multiplier),
        yearly: Math.round((basePricing.yearly as number) * multiplier),
        isCustom: false,
      };
    },
    [config, getTier],
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
  };
}
