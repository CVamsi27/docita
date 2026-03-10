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
      id: "CAPTURE",
      tier: 0,
      name: "Docita Capture",
      description: "Perfect for getting started with digitization",
      tagline: "Free forever",
      color: "gray",
      pricing: { monthly: 0, yearly: 0, currency: CURRENCY_SYMBOLS.INR },
      limits: { patients: 100, doctors: 1, storageGB: 1, branches: 1 },
      features: [
        "Up to 100 patients",
        "Basic patient records",
        "Excel/PDF import",
        "Manual WhatsApp share",
      ],
    },
    {
      id: "CORE",
      tier: 1,
      name: "Docita Core",
      description: "Essential features for small clinics",
      tagline: "Solo Clinic Essentials",
      color: "blue",
      pricing: { monthly: 999, yearly: 10790, currency: CURRENCY_SYMBOLS.INR }, 
      limits: { patients: 500, doctors: 1, storageGB: 2, branches: 1 },
      features: [
        "500 patients",
        "Calendar & scheduling",
        "Digital prescriptions",
        "WhatsApp integration",
        "ICD-10 medical coding",
        "Basic analytics",
      ],
    },
    {
      id: "PLUS",
      tier: 2,
      name: "Docita Plus",
      description: "Advanced features for growing clinics",
      tagline: "WhatsApp Automation",
      color: "green",
      pricing: { monthly: 2499, yearly: 26990, currency: CURRENCY_SYMBOLS.INR }, 
      limits: { patients: 2000, doctors: 3, storageGB: 5, branches: 1 },
      features: [
        "2,000 patients",
        "Everything in Core",
        "Prescription templates",
        "Custom form fields",
        "Clinic branding",
        "Priority support",
      ],
    },
    {
      id: "PRO",
      tier: 3,
      name: "Docita Pro",
      description: "Full-featured solution for professional clinics",
      tagline: "Multi-Doctor Clinics",
      color: "purple",
      pricing: { monthly: 4999, yearly: 53990, currency: CURRENCY_SYMBOLS.INR }, 
      limits: { patients: 10000, doctors: 999, storageGB: 20, branches: 3 },
      features: [
        "10,000 patients",
        "Everything in Plus",
        "Up to 5 doctors",
        "Advanced analytics",
        "Revenue reports",
        "API access",
      ],
    },
    {
      id: "ENTERPRISE",
      tier: 4,
      name: "Docita Enterprise",
      description: "Hospital-grade solution with full customization",
      tagline: "Hospital-Grade System",
      color: "orange",
      pricing: {
        monthly: "custom",
        yearly: "custom",
        currency: CURRENCY_SYMBOLS.INR,
      },
      limits: { patients: 999999, doctors: 999, storageGB: 100, branches: 999 },
      features: [
        "Unlimited patients",
        "Everything in Pro",
        "Unlimited doctors",
        "Multi-branch support",
        "Custom integrations",
        "Dedicated support",
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
    pricing: { monthly: 2999, yearly: 32390, currency: CURRENCY_SYMBOLS.INR }, 
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

const CURRENCY_MULTIPLIERS: Record<string, number> = {
  INR: 1,
  USD: 0.04,
  GBP: 0.028,
  EUR: 0.03,
  AUD: 0.05,
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

      if (tierId === "INTELLIGENCE") {
        const pricing = config.intelligenceInfo?.pricing;
        if (!pricing) return null;

        if (pricing.monthly === "custom" || pricing.yearly === "custom") {
          return { monthly: 0, yearly: 0, isCustom: true };
        }

        const multiplier = CURRENCY_MULTIPLIERS[currency] || 1;
        return {
          monthly: Math.round(pricing.monthly * multiplier),
          yearly: Math.round(pricing.yearly * multiplier),
          isCustom: false,
        };
      }

      const tier = getTier(tierId);
      if (!tier) return null;

      const { monthly, yearly } = tier.pricing;

      if (monthly === "custom" || yearly === "custom") {
        return { monthly: 0, yearly: 0, isCustom: true };
      }

      const multiplier = CURRENCY_MULTIPLIERS[currency] || 1;
      return {
        monthly: Math.round(monthly * multiplier),
        yearly: Math.round(yearly * multiplier),
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
