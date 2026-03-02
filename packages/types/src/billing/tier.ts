import { z } from "zod";

export const tierSchema = z.enum([
  "CAPTURE",
  "CORE",
  "PLUS",
  "PRO",
  "ENTERPRISE",
  "INTELLIGENCE",
]);
export type TierName = z.infer<typeof tierSchema>;

export enum Tier {
  CAPTURE = 0,
  CORE = 1,
  PLUS = 2,
  PRO = 3,
  ENTERPRISE = 4,
  INTELLIGENCE = 5,
}

export enum Feature {

  PAPER_SCANNING = "PAPER_SCANNING",
  EXCEL_IMPORT = "EXCEL_IMPORT",
  PATIENT_DEDUPLICATION = "PATIENT_DEDUPLICATION",
  BASIC_PATIENT_MANAGEMENT = "BASIC_PATIENT_MANAGEMENT",
  DOCUMENT_ARCHIVAL = "DOCUMENT_ARCHIVAL",
  EXPORT_CSV = "EXPORT_CSV",
  OCR_BASIC = "OCR_BASIC",

  CALENDAR_SLOTS = "CALENDAR_SLOTS",
  VISIT_HISTORY = "VISIT_HISTORY",
  MEDICINES_LIST = "MEDICINES_LIST",
  INVOICING = "INVOICING",
  DIGITAL_PRESCRIPTIONS = "DIGITAL_PRESCRIPTIONS",
  BASIC_ANALYTICS = "BASIC_ANALYTICS",
  MEDICAL_CODING = "MEDICAL_CODING",

  AUTO_REMINDERS = "AUTO_REMINDERS",
  PAYMENT_LINKS = "PAYMENT_LINKS",
  PRESCRIPTION_TEMPLATES = "PRESCRIPTION_TEMPLATES",
  MULTI_DEVICE = "MULTI_DEVICE",
  ROLE_MANAGEMENT = "ROLE_MANAGEMENT",
  CONSENT_MANAGEMENT = "CONSENT_MANAGEMENT",
  DOCTOR_SIGNATURE = "DOCTOR_SIGNATURE",

  MULTI_DOCTOR = "MULTI_DOCTOR",
  MULTI_CLINIC = "MULTI_CLINIC",
  LAB_TESTS = "LAB_TESTS",
  INVENTORY = "INVENTORY",
  QUEUE_MANAGEMENT = "QUEUE_MANAGEMENT",
  AUDIT_LOGS = "AUDIT_LOGS",
  INSURANCE_BILLING = "INSURANCE_BILLING",
  DIGITAL_INTAKE_FORMS = "DIGITAL_INTAKE_FORMS",
  BROADCAST_CAMPAIGNS = "BROADCAST_CAMPAIGNS",
  OCR_ADVANCED = "OCR_ADVANCED",
  ADVANCED_ANALYTICS = "ADVANCED_ANALYTICS",

  FULL_EHR = "FULL_EHR",
  API_ACCESS = "API_ACCESS",
  MULTI_LOCATION_ANALYTICS = "MULTI_LOCATION_ANALYTICS",
  CUSTOM_BRANDING = "CUSTOM_BRANDING",
  DATA_WAREHOUSE_EXPORT = "DATA_WAREHOUSE_EXPORT",
  SSO = "SSO",
  BULK_IMPORT_SUITE = "BULK_IMPORT_SUITE",

  AI_PRESCRIPTION_ASSISTANT = "AI_PRESCRIPTION_ASSISTANT",
  AI_DIAGNOSIS_HINTS = "AI_DIAGNOSIS_HINTS",
  SMART_TASK_ENGINE = "SMART_TASK_ENGINE",
  PREDICTIVE_NO_SHOW = "PREDICTIVE_NO_SHOW",
  PATIENT_SEGMENTATION = "PATIENT_SEGMENTATION",
  ANOMALY_DETECTION = "ANOMALY_DETECTION",
}

export const featureSchema = z.nativeEnum(Feature);

export const FEATURE_TIER_MAP: Record<Feature, Tier> = {

  [Feature.PAPER_SCANNING]: Tier.CAPTURE,
  [Feature.EXCEL_IMPORT]: Tier.CAPTURE,
  [Feature.PATIENT_DEDUPLICATION]: Tier.CAPTURE,
  [Feature.BASIC_PATIENT_MANAGEMENT]: Tier.CAPTURE,
  [Feature.DOCUMENT_ARCHIVAL]: Tier.CAPTURE,
  [Feature.EXPORT_CSV]: Tier.CAPTURE,
  [Feature.OCR_BASIC]: Tier.CAPTURE,

  [Feature.CALENDAR_SLOTS]: Tier.CORE,
  [Feature.VISIT_HISTORY]: Tier.CORE,
  [Feature.MEDICINES_LIST]: Tier.CORE,
  [Feature.INVOICING]: Tier.CORE,
  [Feature.DIGITAL_PRESCRIPTIONS]: Tier.CORE,
  [Feature.BASIC_ANALYTICS]: Tier.CORE,
  [Feature.MEDICAL_CODING]: Tier.CORE,
  [Feature.ROLE_MANAGEMENT]: Tier.CORE,

  [Feature.AUTO_REMINDERS]: Tier.CORE,
  [Feature.PAYMENT_LINKS]: Tier.CORE,
  [Feature.PRESCRIPTION_TEMPLATES]: Tier.PLUS,
  [Feature.MULTI_DEVICE]: Tier.PLUS,
  [Feature.CONSENT_MANAGEMENT]: Tier.PLUS,
  [Feature.DOCTOR_SIGNATURE]: Tier.PLUS,

  [Feature.MULTI_DOCTOR]: Tier.PRO,
  [Feature.MULTI_CLINIC]: Tier.PRO,
  [Feature.LAB_TESTS]: Tier.PRO,
  [Feature.INVENTORY]: Tier.PRO,
  [Feature.QUEUE_MANAGEMENT]: Tier.PRO,
  [Feature.AUDIT_LOGS]: Tier.PRO,
  [Feature.INSURANCE_BILLING]: Tier.PRO,
  [Feature.DIGITAL_INTAKE_FORMS]: Tier.PRO,
  [Feature.BROADCAST_CAMPAIGNS]: Tier.PRO,
  [Feature.OCR_ADVANCED]: Tier.PRO,
  [Feature.ADVANCED_ANALYTICS]: Tier.PRO,

  [Feature.FULL_EHR]: Tier.ENTERPRISE,
  [Feature.API_ACCESS]: Tier.ENTERPRISE,
  [Feature.MULTI_LOCATION_ANALYTICS]: Tier.ENTERPRISE,
  [Feature.CUSTOM_BRANDING]: Tier.ENTERPRISE,
  [Feature.DATA_WAREHOUSE_EXPORT]: Tier.ENTERPRISE,
  [Feature.SSO]: Tier.ENTERPRISE,
  [Feature.BULK_IMPORT_SUITE]: Tier.ENTERPRISE,

  [Feature.AI_PRESCRIPTION_ASSISTANT]: Tier.INTELLIGENCE,
  [Feature.AI_DIAGNOSIS_HINTS]: Tier.INTELLIGENCE,
  [Feature.SMART_TASK_ENGINE]: Tier.INTELLIGENCE,
  [Feature.PREDICTIVE_NO_SHOW]: Tier.INTELLIGENCE,
  [Feature.PATIENT_SEGMENTATION]: Tier.INTELLIGENCE,
  [Feature.ANOMALY_DETECTION]: Tier.INTELLIGENCE,
};

export type SupportedCurrency = "INR" | "USD" | "EUR" | "GBP" | "AUD";

export const PRICING_CURRENCY_SYMBOLS: Record<SupportedCurrency, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  AUD: "A$",
};

export const PRICING_CURRENCY_CONFIG: Record<
  SupportedCurrency,
  {
    symbol: string;
    name: string;
    locale: string;
    decimalPlaces: number;
  }
> = {
  INR: { symbol: "₹", name: "Indian Rupee", locale: "en-IN", decimalPlaces: 0 },
  USD: { symbol: "$", name: "US Dollar", locale: "en-US", decimalPlaces: 2 },
  EUR: { symbol: "€", name: "Euro", locale: "de-DE", decimalPlaces: 2 },
  GBP: {
    symbol: "£",
    name: "British Pound",
    locale: "en-GB",
    decimalPlaces: 2,
  },
  AUD: {
    symbol: "A$",
    name: "Australian Dollar",
    locale: "en-AU",
    decimalPlaces: 2,
  },
};

export const tierPricingSchema = z.object({
  monthly: z.union([z.number(), z.literal("custom")]),
  yearly: z.union([z.number(), z.literal("custom")]),
  currency: z.string(),
});
export type TierPricing = z.infer<typeof tierPricingSchema>;

export interface MultiCurrencyTierPricing {
  monthly: number | "custom";
  yearly: number | "custom";
}

export const TIER_PRICING_BY_CURRENCY: Record<
  SupportedCurrency,
  Record<TierName, MultiCurrencyTierPricing>
> = {

  INR: {
    CAPTURE: { monthly: 0, yearly: 0 },
    CORE: { monthly: 799, yearly: 8629 },
    PLUS: { monthly: 1999, yearly: 21589 },
    PRO: { monthly: 3999, yearly: 43189 },
    ENTERPRISE: { monthly: "custom", yearly: "custom" },
    INTELLIGENCE: { monthly: 1999, yearly: 21589 },
  },

  USD: {
    CAPTURE: { monthly: 0, yearly: 0 },
    CORE: { monthly: 19, yearly: 205 }, 
    PLUS: { monthly: 39, yearly: 421 }, 
    PRO: { monthly: 79, yearly: 853 }, 
    ENTERPRISE: { monthly: "custom", yearly: "custom" },
    INTELLIGENCE: { monthly: 29, yearly: 313 },
  },

  EUR: {
    CAPTURE: { monthly: 0, yearly: 0 },
    CORE: { monthly: 17, yearly: 184 }, 
    PLUS: { monthly: 35, yearly: 378 }, 
    PRO: { monthly: 69, yearly: 745 }, 
    ENTERPRISE: { monthly: "custom", yearly: "custom" },
    INTELLIGENCE: { monthly: 25, yearly: 270 },
  },

  GBP: {
    CAPTURE: { monthly: 0, yearly: 0 },
    CORE: { monthly: 15, yearly: 162 }, 
    PLUS: { monthly: 29, yearly: 313 }, 
    PRO: { monthly: 59, yearly: 637 }, 
    ENTERPRISE: { monthly: "custom", yearly: "custom" },
    INTELLIGENCE: { monthly: 22, yearly: 238 },
  },

  AUD: {
    CAPTURE: { monthly: 0, yearly: 0 },
    CORE: { monthly: 29, yearly: 313 }, 
    PLUS: { monthly: 59, yearly: 637 }, 
    PRO: { monthly: 119, yearly: 1285 }, 
    ENTERPRISE: { monthly: "custom", yearly: "custom" },
    INTELLIGENCE: { monthly: 45, yearly: 486 },
  },
};

export const TIER_PRICING: Record<TierName, TierPricing> = {
  CAPTURE: { monthly: 0, yearly: 0, currency: "₹" },
  CORE: { monthly: 799, yearly: 8629, currency: "₹" },
  PLUS: { monthly: 1999, yearly: 21589, currency: "₹" },
  PRO: { monthly: 3999, yearly: 43189, currency: "₹" },
  ENTERPRISE: { monthly: "custom", yearly: "custom", currency: "₹" },
  INTELLIGENCE: { monthly: 1999, yearly: 21589, currency: "₹" },
};

export const ANNUAL_DISCOUNT_PERCENT = 10;
export const SEMI_ANNUAL_DISCOUNT_PERCENT = 5;
export const REFERRAL_DISCOUNT_PERCENT = 25;
export const MAX_REFERRAL_CREDITS_PER_YEAR = 12;
export const GRACE_PERIOD_DAYS = 3;

export const tierLimitsSchema = z.object({
  patients: z.number(),
  doctors: z.number(),
  storageGB: z.number(),
  branches: z.number(),
  appointments: z.number().optional(),
  users: z.number().optional(),
});
export type TierLimits = z.infer<typeof tierLimitsSchema>;

export const TIER_LIMITS: Record<TierName, TierLimits> = {
  CAPTURE: {
    patients: 50,
    doctors: 1,
    storageGB: 1,
    branches: 1,
    appointments: 100,
    users: 1,
  },
  CORE: {
    patients: 300,
    doctors: 1,
    storageGB: 5,
    branches: 1,
    appointments: 500,
    users: 2,
  },
  PLUS: {
    patients: 1000,
    doctors: 3,
    storageGB: 20,
    branches: 1,
    appointments: 2000,
    users: 2,
  },
  PRO: {
    patients: 5000,
    doctors: 999,
    storageGB: 100,
    branches: 3,
    appointments: 8000,
    users: 5,
  },
  ENTERPRISE: {
    patients: 999999,
    doctors: 999,
    storageGB: 500,
    branches: 999,
    appointments: 999999,
    users: 999,
  },
  INTELLIGENCE: {
    patients: 999999,
    doctors: 999,
    storageGB: 100,
    branches: 999,
    appointments: 999999,
    users: 999,
  },
};

export const TIER_OVERAGE_RATES: Record<
  TierName,
  {
    patientRate: number;
    appointmentRate: number;
    storageRate: number;
    userRate: number;
  }
> = {
  CAPTURE: { patientRate: 0, appointmentRate: 0, storageRate: 0, userRate: 0 }, 
  CORE: { patientRate: 2, appointmentRate: 1, storageRate: 50, userRate: 299 },
  PLUS: {
    patientRate: 1.5,
    appointmentRate: 0.75,
    storageRate: 40,
    userRate: 299,
  },
  PRO: { patientRate: 1, appointmentRate: 0.5, storageRate: 30, userRate: 499 },
  ENTERPRISE: {
    patientRate: 0,
    appointmentRate: 0,
    storageRate: 0,
    userRate: 0,
  }, 
  INTELLIGENCE: {
    patientRate: 0,
    appointmentRate: 0,
    storageRate: 0,
    userRate: 0,
  },
};

export const TIER_OVERAGE_RATES_BY_CURRENCY: Record<
  SupportedCurrency,
  Record<
    TierName,
    {
      patientRate: number;
      appointmentRate: number;
      storageRate: number;
      userRate: number;
    }
  >
> = {
  INR: TIER_OVERAGE_RATES,

  USD: {
    CAPTURE: {
      patientRate: 0,
      appointmentRate: 0,
      storageRate: 0,
      userRate: 0,
    },
    CORE: {
      patientRate: 0.05,
      appointmentRate: 0.025,
      storageRate: 1.5,
      userRate: 9,
    },
    PLUS: {
      patientRate: 0.04,
      appointmentRate: 0.02,
      storageRate: 1.2,
      userRate: 9,
    },
    PRO: {
      patientRate: 0.03,
      appointmentRate: 0.015,
      storageRate: 0.9,
      userRate: 15,
    },
    ENTERPRISE: {
      patientRate: 0,
      appointmentRate: 0,
      storageRate: 0,
      userRate: 0,
    },
    INTELLIGENCE: {
      patientRate: 0,
      appointmentRate: 0,
      storageRate: 0,
      userRate: 0,
    },
  },

  EUR: {
    CAPTURE: {
      patientRate: 0,
      appointmentRate: 0,
      storageRate: 0,
      userRate: 0,
    },
    CORE: {
      patientRate: 0.045,
      appointmentRate: 0.022,
      storageRate: 1.3,
      userRate: 8,
    },
    PLUS: {
      patientRate: 0.035,
      appointmentRate: 0.018,
      storageRate: 1.0,
      userRate: 8,
    },
    PRO: {
      patientRate: 0.025,
      appointmentRate: 0.012,
      storageRate: 0.75,
      userRate: 13,
    },
    ENTERPRISE: {
      patientRate: 0,
      appointmentRate: 0,
      storageRate: 0,
      userRate: 0,
    },
    INTELLIGENCE: {
      patientRate: 0,
      appointmentRate: 0,
      storageRate: 0,
      userRate: 0,
    },
  },

  GBP: {
    CAPTURE: {
      patientRate: 0,
      appointmentRate: 0,
      storageRate: 0,
      userRate: 0,
    },
    CORE: {
      patientRate: 0.04,
      appointmentRate: 0.02,
      storageRate: 1.1,
      userRate: 7,
    },
    PLUS: {
      patientRate: 0.03,
      appointmentRate: 0.015,
      storageRate: 0.85,
      userRate: 7,
    },
    PRO: {
      patientRate: 0.02,
      appointmentRate: 0.01,
      storageRate: 0.65,
      userRate: 11,
    },
    ENTERPRISE: {
      patientRate: 0,
      appointmentRate: 0,
      storageRate: 0,
      userRate: 0,
    },
    INTELLIGENCE: {
      patientRate: 0,
      appointmentRate: 0,
      storageRate: 0,
      userRate: 0,
    },
  },

  AUD: {
    CAPTURE: {
      patientRate: 0,
      appointmentRate: 0,
      storageRate: 0,
      userRate: 0,
    },
    CORE: {
      patientRate: 0.08,
      appointmentRate: 0.04,
      storageRate: 2.2,
      userRate: 14,
    },
    PLUS: {
      patientRate: 0.06,
      appointmentRate: 0.03,
      storageRate: 1.8,
      userRate: 14,
    },
    PRO: {
      patientRate: 0.045,
      appointmentRate: 0.022,
      storageRate: 1.35,
      userRate: 22,
    },
    ENTERPRISE: {
      patientRate: 0,
      appointmentRate: 0,
      storageRate: 0,
      userRate: 0,
    },
    INTELLIGENCE: {
      patientRate: 0,
      appointmentRate: 0,
      storageRate: 0,
      userRate: 0,
    },
  },
};

export interface AddOnPricing {
  basePrice: number | "custom";
  includedQuota: number;
  overageRate: number;
}

export const WHATSAPP_ADDON_PRICING: Record<
  Exclude<TierName, "CAPTURE" | "INTELLIGENCE">,
  AddOnPricing
> = {
  CORE: { basePrice: 499, includedQuota: 500, overageRate: 0.5 },
  PLUS: { basePrice: 799, includedQuota: 1500, overageRate: 0.4 },
  PRO: { basePrice: 1499, includedQuota: 5000, overageRate: 0.3 },
  ENTERPRISE: { basePrice: "custom", includedQuota: 15000, overageRate: 0.2 },
};

export const INTELLIGENCE_ADDON_PRICING: Record<
  Exclude<TierName, "CAPTURE" | "INTELLIGENCE">,
  AddOnPricing
> = {
  CORE: { basePrice: 1999, includedQuota: 500, overageRate: 3 },
  PLUS: { basePrice: 2499, includedQuota: 1500, overageRate: 2.5 },
  PRO: { basePrice: 3499, includedQuota: 5000, overageRate: 2 },
  ENTERPRISE: { basePrice: "custom", includedQuota: 15000, overageRate: 1.5 },
};

export const WHATSAPP_ADDON_PRICING_BY_CURRENCY: Record<
  SupportedCurrency,
  Record<Exclude<TierName, "CAPTURE" | "INTELLIGENCE">, AddOnPricing>
> = {
  INR: WHATSAPP_ADDON_PRICING,
  USD: {
    CORE: { basePrice: 9, includedQuota: 500, overageRate: 0.015 },
    PLUS: { basePrice: 15, includedQuota: 1500, overageRate: 0.012 },
    PRO: { basePrice: 25, includedQuota: 5000, overageRate: 0.008 },
    ENTERPRISE: {
      basePrice: "custom",
      includedQuota: 15000,
      overageRate: 0.005,
    },
  },
  EUR: {
    CORE: { basePrice: 8, includedQuota: 500, overageRate: 0.013 },
    PLUS: { basePrice: 13, includedQuota: 1500, overageRate: 0.01 },
    PRO: { basePrice: 22, includedQuota: 5000, overageRate: 0.007 },
    ENTERPRISE: {
      basePrice: "custom",
      includedQuota: 15000,
      overageRate: 0.004,
    },
  },
  GBP: {
    CORE: { basePrice: 7, includedQuota: 500, overageRate: 0.012 },
    PLUS: { basePrice: 11, includedQuota: 1500, overageRate: 0.009 },
    PRO: { basePrice: 19, includedQuota: 5000, overageRate: 0.006 },
    ENTERPRISE: {
      basePrice: "custom",
      includedQuota: 15000,
      overageRate: 0.004,
    },
  },
  AUD: {
    CORE: { basePrice: 15, includedQuota: 500, overageRate: 0.022 },
    PLUS: { basePrice: 22, includedQuota: 1500, overageRate: 0.018 },
    PRO: { basePrice: 35, includedQuota: 5000, overageRate: 0.012 },
    ENTERPRISE: {
      basePrice: "custom",
      includedQuota: 15000,
      overageRate: 0.008,
    },
  },
};

export const INTELLIGENCE_ADDON_PRICING_BY_CURRENCY: Record<
  SupportedCurrency,
  Record<Exclude<TierName, "CAPTURE" | "INTELLIGENCE">, AddOnPricing>
> = {
  INR: INTELLIGENCE_ADDON_PRICING,
  USD: {
    CORE: { basePrice: 29, includedQuota: 500, overageRate: 0.05 },
    PLUS: { basePrice: 39, includedQuota: 1500, overageRate: 0.04 },
    PRO: { basePrice: 55, includedQuota: 5000, overageRate: 0.03 },
    ENTERPRISE: {
      basePrice: "custom",
      includedQuota: 15000,
      overageRate: 0.02,
    },
  },
  EUR: {
    CORE: { basePrice: 25, includedQuota: 500, overageRate: 0.045 },
    PLUS: { basePrice: 35, includedQuota: 1500, overageRate: 0.035 },
    PRO: { basePrice: 49, includedQuota: 5000, overageRate: 0.025 },
    ENTERPRISE: {
      basePrice: "custom",
      includedQuota: 15000,
      overageRate: 0.018,
    },
  },
  GBP: {
    CORE: { basePrice: 22, includedQuota: 500, overageRate: 0.04 },
    PLUS: { basePrice: 29, includedQuota: 1500, overageRate: 0.03 },
    PRO: { basePrice: 42, includedQuota: 5000, overageRate: 0.022 },
    ENTERPRISE: {
      basePrice: "custom",
      includedQuota: 15000,
      overageRate: 0.015,
    },
  },
  AUD: {
    CORE: { basePrice: 45, includedQuota: 500, overageRate: 0.075 },
    PLUS: { basePrice: 59, includedQuota: 1500, overageRate: 0.06 },
    PRO: { basePrice: 85, includedQuota: 5000, overageRate: 0.045 },
    ENTERPRISE: {
      basePrice: "custom",
      includedQuota: 15000,
      overageRate: 0.03,
    },
  },
};

export const AI_CREDIT_COSTS = {
  clinicalNote: 5,
  prescriptionSuggestion: 2,
  voiceToText: 1, 
  noShowPrediction: 1,
  riskSegmentation: 3,
  anomalyDetection: 2,
  treatmentInsight: 5,
  codingSuggestion: 3,
};

export type DiscountType =
  | "ANNUAL_COMMITMENT"
  | "SEMI_ANNUAL_COMMITMENT"
  | "LOYALTY_1_YEAR"
  | "LOYALTY_2_YEARS"
  | "LOYALTY_3_YEARS"
  | "REFERRAL_NEW_CUSTOMER"
  | "GOVERNMENT"
  | "NGO"
  | "MEDICAL_COLLEGE"
  | "RURAL_HEALTH"
  | "STARTUP_CLINIC";

export const DISCOUNT_CONFIG: Record<
  DiscountType,
  {
    percentOff: number;
    maxCombined: number;
    appliesToAddOns: boolean;
  }
> = {
  ANNUAL_COMMITMENT: { percentOff: 10, maxCombined: 20, appliesToAddOns: true },
  SEMI_ANNUAL_COMMITMENT: {
    percentOff: 5,
    maxCombined: 15,
    appliesToAddOns: true,
  },
  LOYALTY_1_YEAR: { percentOff: 5, maxCombined: 20, appliesToAddOns: true },
  LOYALTY_2_YEARS: { percentOff: 7, maxCombined: 20, appliesToAddOns: true },
  LOYALTY_3_YEARS: { percentOff: 10, maxCombined: 20, appliesToAddOns: true },
  REFERRAL_NEW_CUSTOMER: {
    percentOff: 100,
    maxCombined: 100,
    appliesToAddOns: true,
  }, 
  GOVERNMENT: { percentOff: 30, maxCombined: 30, appliesToAddOns: true },
  NGO: { percentOff: 40, maxCombined: 40, appliesToAddOns: true },
  MEDICAL_COLLEGE: { percentOff: 50, maxCombined: 50, appliesToAddOns: true },
  RURAL_HEALTH: { percentOff: 40, maxCombined: 40, appliesToAddOns: true },
  STARTUP_CLINIC: { percentOff: 25, maxCombined: 25, appliesToAddOns: false },
};

export const REFERRAL_REWARDS: Record<TierName, number> = {
  CAPTURE: 0,
  CORE: 500,
  PLUS: 1000,
  PRO: 2500,
  ENTERPRISE: 5000,
  INTELLIGENCE: 0,
};

export const REFERRAL_REWARDS_BY_CURRENCY: Record<
  SupportedCurrency,
  Record<TierName, number>
> = {
  INR: REFERRAL_REWARDS,
  USD: {
    CAPTURE: 0,
    CORE: 15,
    PLUS: 30,
    PRO: 60,
    ENTERPRISE: 100,
    INTELLIGENCE: 0,
  },
  EUR: {
    CAPTURE: 0,
    CORE: 12,
    PLUS: 25,
    PRO: 50,
    ENTERPRISE: 85,
    INTELLIGENCE: 0,
  },
  GBP: {
    CAPTURE: 0,
    CORE: 10,
    PLUS: 22,
    PRO: 45,
    ENTERPRISE: 75,
    INTELLIGENCE: 0,
  },
  AUD: {
    CAPTURE: 0,
    CORE: 22,
    PLUS: 45,
    PRO: 90,
    ENTERPRISE: 150,
    INTELLIGENCE: 0,
  },
};

export function getTierPricingByCurrency(
  tier: TierName,
  currency: SupportedCurrency = "INR",
): MultiCurrencyTierPricing {
  return TIER_PRICING_BY_CURRENCY[currency][tier];
}

export function getOverageRatesByCurrency(
  tier: TierName,
  currency: SupportedCurrency = "INR",
) {
  return TIER_OVERAGE_RATES_BY_CURRENCY[currency][tier];
}

export function getWhatsAppAddonPricingByCurrency(
  tier: Exclude<TierName, "CAPTURE" | "INTELLIGENCE">,
  currency: SupportedCurrency = "INR",
): AddOnPricing {
  return WHATSAPP_ADDON_PRICING_BY_CURRENCY[currency][tier];
}

export function getIntelligenceAddonPricingByCurrency(
  tier: Exclude<TierName, "CAPTURE" | "INTELLIGENCE">,
  currency: SupportedCurrency = "INR",
): AddOnPricing {
  return INTELLIGENCE_ADDON_PRICING_BY_CURRENCY[currency][tier];
}

export function getReferralRewardByCurrency(
  tier: TierName,
  currency: SupportedCurrency = "INR",
): number {
  return REFERRAL_REWARDS_BY_CURRENCY[currency][tier];
}

export function formatPriceWithCurrency(
  amount: number | "custom",
  currency: SupportedCurrency = "INR",
): string {
  if (amount === "custom") return "Custom";
  const config = PRICING_CURRENCY_CONFIG[currency];
  return new Intl.NumberFormat(config.locale, {
    style: "currency",
    currency,
    minimumFractionDigits: config.decimalPlaces,
    maximumFractionDigits: config.decimalPlaces,
  }).format(amount);
}

export const tierInfoSchema = z.object({
  name: z.string(),
  description: z.string(),
  tagline: z.string(),
  color: z.string(),
});
export type TierInfo = z.infer<typeof tierInfoSchema>;

export const TIER_INFO: Record<TierName, TierInfo> = {
  CAPTURE: {
    name: "Docita Capture",
    description: "Perfect for getting started with digitization",
    tagline: "Free forever",
    color: "gray",
  },
  CORE: {
    name: "Docita Core",
    description: "Essential features for small clinics",
    tagline: "Solo Clinic Essentials",
    color: "blue",
  },
  PLUS: {
    name: "Docita Plus",
    description: "Advanced features for growing clinics",
    tagline: "WhatsApp Automation",
    color: "green",
  },
  PRO: {
    name: "Docita Pro",
    description: "Full-featured solution for professional clinics",
    tagline: "Multi-Doctor Clinics",
    color: "purple",
  },
  ENTERPRISE: {
    name: "Docita Enterprise",
    description: "Hospital-grade solution with full customization",
    tagline: "Hospital-Grade System",
    color: "orange",
  },
  INTELLIGENCE: {
    name: "Docita Intelligence",
    description: "AI-powered features to enhance your clinic",
    tagline: "AI-Powered Add-on",
    color: "pink",
  },
};

export const featureDisplaySchema = z.object({
  name: z.string(),
  description: z.string(),
});
export type FeatureDisplay = z.infer<typeof featureDisplaySchema>;

export const FEATURE_DISPLAY: Record<Feature, FeatureDisplay> = {

  [Feature.PAPER_SCANNING]: {
    name: "Paper Scanning",
    description: "Scan documents with your camera",
  },
  [Feature.EXCEL_IMPORT]: {
    name: "Excel Import",
    description: "Import patient data from Excel/CSV",
  },
  [Feature.PATIENT_DEDUPLICATION]: {
    name: "Patient Deduplication",
    description: "Automatic duplicate detection",
  },
  [Feature.BASIC_PATIENT_MANAGEMENT]: {
    name: "Patient Management",
    description: "Basic patient records",
  },
  [Feature.DOCUMENT_ARCHIVAL]: {
    name: "Document Archival",
    description: "Store and organize documents",
  },
  [Feature.EXPORT_CSV]: {
    name: "CSV Export",
    description: "Export data to CSV",
  },
  [Feature.OCR_BASIC]: {
    name: "Basic OCR",
    description: "Extract text from images",
  },

  [Feature.CALENDAR_SLOTS]: {
    name: "Appointments",
    description: "Schedule and manage appointments",
  },
  [Feature.VISIT_HISTORY]: {
    name: "Visit History",
    description: "Track patient visit history",
  },
  [Feature.MEDICINES_LIST]: {
    name: "Medicine Database",
    description: "Search and add medicines",
  },
  [Feature.INVOICING]: {
    name: "Invoicing",
    description: "Create and manage invoices",
  },
  [Feature.DIGITAL_PRESCRIPTIONS]: {
    name: "Digital Prescriptions",
    description: "Create digital prescriptions",
  },
  [Feature.BASIC_ANALYTICS]: {
    name: "Basic Analytics",
    description: "View clinic statistics",
  },
  [Feature.MEDICAL_CODING]: {
    name: "Medical Coding",
    description: "ICD/CPT code management",
  },

  [Feature.AUTO_REMINDERS]: {
    name: "Auto Reminders",
    description: "Automated appointment reminders",
  },
  [Feature.PAYMENT_LINKS]: {
    name: "Payment Links",
    description: "Send payment links via WhatsApp",
  },
  [Feature.PRESCRIPTION_TEMPLATES]: {
    name: "Prescription Templates",
    description: "Save and reuse templates",
  },
  [Feature.MULTI_DEVICE]: {
    name: "Multi-Device",
    description: "Access from multiple devices",
  },
  [Feature.ROLE_MANAGEMENT]: {
    name: "Role Management",
    description: "Manage staff roles and permissions",
  },
  [Feature.CONSENT_MANAGEMENT]: {
    name: "Consent Management",
    description: "Digital consent forms",
  },
  [Feature.DOCTOR_SIGNATURE]: {
    name: "Digital Signature",
    description: "Add signature to prescriptions",
  },

  [Feature.MULTI_DOCTOR]: {
    name: "Multi-Doctor",
    description: "Support for multiple doctors",
  },
  [Feature.MULTI_CLINIC]: {
    name: "Multi-Clinic",
    description: "Manage multiple clinic locations",
  },
  [Feature.LAB_TESTS]: {
    name: "Lab Integration",
    description: "Order and track lab tests",
  },
  [Feature.INVENTORY]: {
    name: "Inventory",
    description: "Manage medicine inventory",
  },
  [Feature.QUEUE_MANAGEMENT]: {
    name: "Queue Management",
    description: "Digital token system",
  },
  [Feature.AUDIT_LOGS]: {
    name: "Audit Logs",
    description: "Track all system activities",
  },
  [Feature.INSURANCE_BILLING]: {
    name: "Insurance Billing",
    description: "Insurance claim management",
  },
  [Feature.DIGITAL_INTAKE_FORMS]: {
    name: "Intake Forms",
    description: "Digital patient intake forms",
  },
  [Feature.BROADCAST_CAMPAIGNS]: {
    name: "Broadcast Campaigns",
    description: "Send bulk messages",
  },
  [Feature.OCR_ADVANCED]: {
    name: "Advanced OCR",
    description: "AI-powered document extraction",
  },
  [Feature.ADVANCED_ANALYTICS]: {
    name: "Advanced Analytics",
    description: "Detailed reports and insights",
  },

  [Feature.FULL_EHR]: {
    name: "Full EHR",
    description: "Complete electronic health records",
  },
  [Feature.API_ACCESS]: {
    name: "API Access",
    description: "Access to Docita API",
  },
  [Feature.MULTI_LOCATION_ANALYTICS]: {
    name: "Multi-Location Analytics",
    description: "Analytics across branches",
  },
  [Feature.CUSTOM_BRANDING]: {
    name: "Custom Branding",
    description: "White-label with your brand",
  },
  [Feature.DATA_WAREHOUSE_EXPORT]: {
    name: "Data Export",
    description: "Export to data warehouse",
  },
  [Feature.SSO]: {
    name: "Single Sign-On",
    description: "Enterprise SSO integration",
  },
  [Feature.BULK_IMPORT_SUITE]: {
    name: "Bulk Import Suite",
    description: "Advanced bulk data import",
  },

  [Feature.AI_PRESCRIPTION_ASSISTANT]: {
    name: "AI Prescription Assistant",
    description: "AI-powered prescription suggestions",
  },
  [Feature.AI_DIAGNOSIS_HINTS]: {
    name: "AI Diagnosis Hints",
    description: "AI-powered diagnosis suggestions",
  },
  [Feature.SMART_TASK_ENGINE]: {
    name: "Smart Tasks",
    description: "AI-powered task automation",
  },
  [Feature.PREDICTIVE_NO_SHOW]: {
    name: "No-Show Prediction",
    description: "Predict appointment no-shows",
  },
  [Feature.PATIENT_SEGMENTATION]: {
    name: "Patient Segmentation",
    description: "AI-powered patient grouping",
  },
  [Feature.ANOMALY_DETECTION]: {
    name: "Anomaly Detection",
    description: "Detect unusual patterns",
  },
};

export const intelligenceAddonSchema = z.object({
  feature: z.nativeEnum(Feature),
  name: z.string(),
  description: z.string(),
  monthlyPrice: z.number(),
  icon: z.string(),
});
export type IntelligenceAddon = z.infer<typeof intelligenceAddonSchema>;

export const INTELLIGENCE_ADDONS: IntelligenceAddon[] = [
  {
    feature: Feature.AI_DIAGNOSIS_HINTS,
    name: "AI Diagnosis Assist",
    description: "Get AI-powered diagnosis suggestions based on symptoms",
    monthlyPrice: 1999,
    icon: "Brain",
  },
  {
    feature: Feature.AI_PRESCRIPTION_ASSISTANT,
    name: "AI Prescription Assistant",
    description: "Smart prescription suggestions and drug interactions",
    monthlyPrice: 999,
    icon: "Pill",
  },
  {
    feature: Feature.SMART_TASK_ENGINE,
    name: "Smart Task Engine",
    description: "AI-powered workflow automation and reminders",
    monthlyPrice: 1499,
    icon: "Bot",
  },
];

export const INTELLIGENCE_BUNDLE_DISCOUNT = 0.4; 

export const TIER_FEATURES: Record<TierName, string[]> = {
  CAPTURE: [
    "Up to 100 patients",
    "Paper record scanning & archival",
    "Excel import with column mapping",
    "Patient deduplication",
    "Document storage",
    "Export to CSV/Excel",
    "Single doctor",
  ],
  CORE: [
    "Everything in Capture",
    "Up to 500 patients",
    "Calendar & appointment scheduling",
    "Patient profiles & visit history",
    "Digital prescriptions with PDF",
    "Invoicing & billing",
    "Team member management (roles & permissions)",
    "2 users included",
    "Core WhatsApp workflow (prescriptions, invoices, reminders, payments)",
    "Basic analytics dashboard",
    "Email support",
  ],
  PLUS: [
    "Everything in Core",
    "Up to 2,000 patients",
    "Full WhatsApp Business API",
    "Automated appointment reminders",
    "Payment links via WhatsApp",
    "Two-way WhatsApp flows",
    "Prescription templates",
    "Multi-device staff login",
    "Basic OCR for documents",
    "Medical coding (ICD-10/CPT)",
    "Phone support",
  ],
  PRO: [
    "Everything in Plus",
    "Up to 10,000 patients",
    "Multi-doctor calendar",
    "Multi-clinic branching",
    "Lab tests catalog & tracking",
    "Inventory & pharmacy module",
    "Token queue management",
    "Audit logs & compliance",
    "Digital intake forms",
    "WhatsApp broadcast campaigns",
    "Advanced OCR with AI",
    "Advanced medical coding",
    "Priority support",
  ],
  ENTERPRISE: [
    "Everything in Pro",
    "Unlimited patients & doctors",
    "Full EHR capabilities",
    "API access for integrations",
    "Multi-location analytics",
    "Custom branding & white-label",
    "Data warehouse export",
    "SSO & advanced security",
    "WhatsApp chatbots",
    "Bulk import suite",
    "ABDM integration ready",
    "Dedicated account manager",
    "SLA guarantee",
  ],
  INTELLIGENCE: [
    "AI prescription assistant",
    "Diagnosis suggestions (non-clinical)",
    "Smart task automation",
    "Predictive no-show model",
    "Patient risk segmentation",
    "Anomaly detection in analytics",
    "Voice-to-text dictation",
  ],
};

export function getTierValue(tierName: TierName): Tier {
  return Tier[tierName];
}

export function getTierName(tier: Tier): TierName {
  return Tier[tier] as TierName;
}

export function hasFeatureAccess(
  tier: TierName,
  feature: Feature,
  hasIntelligence = false,
): boolean {
  const requiredTier = FEATURE_TIER_MAP[feature];

  if (requiredTier === Tier.INTELLIGENCE) {
    return hasIntelligence;
  }

  return getTierValue(tier) >= requiredTier;
}

export function getFeaturesForTier(tier: TierName): Feature[] {
  const tierValue = getTierValue(tier);
  return Object.entries(FEATURE_TIER_MAP)
    .filter(([, requiredTier]) => requiredTier === tierValue)
    .map(([feature]) => feature as Feature);
}

export function getAllFeaturesUpToTier(tier: TierName): Feature[] {
  const tierValue = getTierValue(tier);
  return Object.entries(FEATURE_TIER_MAP)
    .filter(([, requiredTier]) => requiredTier <= tierValue)
    .map(([feature]) => feature as Feature);
}

export function getIntelligenceBundlePrice(): number {
  const totalPrice = INTELLIGENCE_ADDONS.reduce(
    (sum, addon) => sum + addon.monthlyPrice,
    0,
  );
  return Math.round(totalPrice * (1 - INTELLIGENCE_BUNDLE_DISCOUNT));
}

export function getTierInfo(tier: Tier | TierName): TierInfo {
  const tierName = typeof tier === "number" ? getTierName(tier) : tier;
  return TIER_INFO[tierName];
}

export function getTierPricing(tier: Tier | TierName): TierPricing {
  const tierName = typeof tier === "number" ? getTierName(tier) : tier;
  return TIER_PRICING[tierName];
}

export function getTierLimits(tier: Tier | TierName): TierLimits {
  const tierName = typeof tier === "number" ? getTierName(tier) : tier;
  return TIER_LIMITS[tierName];
}

export function getTierFeaturesList(tier: Tier | TierName): string[] {
  const tierName = typeof tier === "number" ? getTierName(tier) : tier;
  return TIER_FEATURES[tierName];
}
