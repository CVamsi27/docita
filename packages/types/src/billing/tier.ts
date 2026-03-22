import { z } from "zod";

export const tierSchema = z.enum([
  "STARTER",
  "ESSENTIAL",
  "PROFESSIONAL",
  "ENTERPRISE",
  "INTELLIGENCE",
]);
export type TierName = z.infer<typeof tierSchema>;

export enum Tier {
  STARTER = 0,
  ESSENTIAL = 1,
  PROFESSIONAL = 2,
  ENTERPRISE = 3,
  INTELLIGENCE = 4,
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
  DIGITAL_PRESCRIPTIONS = "DIGITAL_PRESCRIPTIONS",

  INVOICING = "INVOICING",
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

  [Feature.PAPER_SCANNING]: Tier.STARTER,
  [Feature.EXCEL_IMPORT]: Tier.STARTER,
  [Feature.PATIENT_DEDUPLICATION]: Tier.STARTER,
  [Feature.BASIC_PATIENT_MANAGEMENT]: Tier.STARTER,
  [Feature.DOCUMENT_ARCHIVAL]: Tier.STARTER,
  [Feature.EXPORT_CSV]: Tier.STARTER,
  [Feature.OCR_BASIC]: Tier.STARTER,
  [Feature.CALENDAR_SLOTS]: Tier.STARTER,
  [Feature.VISIT_HISTORY]: Tier.STARTER,
  [Feature.MEDICINES_LIST]: Tier.STARTER,
  [Feature.DIGITAL_PRESCRIPTIONS]: Tier.STARTER,

  [Feature.INVOICING]: Tier.ESSENTIAL,
  [Feature.BASIC_ANALYTICS]: Tier.ESSENTIAL,
  [Feature.MEDICAL_CODING]: Tier.ESSENTIAL,
  [Feature.ROLE_MANAGEMENT]: Tier.ESSENTIAL,
  [Feature.AUTO_REMINDERS]: Tier.ESSENTIAL,
  [Feature.PAYMENT_LINKS]: Tier.ESSENTIAL,
  [Feature.PRESCRIPTION_TEMPLATES]: Tier.ESSENTIAL,
  [Feature.MULTI_DEVICE]: Tier.ESSENTIAL,
  [Feature.CONSENT_MANAGEMENT]: Tier.ESSENTIAL,
  [Feature.DOCTOR_SIGNATURE]: Tier.ESSENTIAL,

  [Feature.MULTI_DOCTOR]: Tier.PROFESSIONAL,
  [Feature.MULTI_CLINIC]: Tier.PROFESSIONAL,
  [Feature.LAB_TESTS]: Tier.PROFESSIONAL,
  [Feature.INVENTORY]: Tier.PROFESSIONAL,
  [Feature.QUEUE_MANAGEMENT]: Tier.PROFESSIONAL,
  [Feature.AUDIT_LOGS]: Tier.PROFESSIONAL,
  [Feature.INSURANCE_BILLING]: Tier.PROFESSIONAL,
  [Feature.DIGITAL_INTAKE_FORMS]: Tier.PROFESSIONAL,
  [Feature.BROADCAST_CAMPAIGNS]: Tier.PROFESSIONAL,
  [Feature.OCR_ADVANCED]: Tier.PROFESSIONAL,
  [Feature.ADVANCED_ANALYTICS]: Tier.PROFESSIONAL,

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

export const TIER_PRICING: Record<TierName, TierPricing> = {
  STARTER: { monthly: 0, yearly: 0, currency: "₹" },
  ESSENTIAL: { monthly: 999, yearly: 10789, currency: "₹" },
  PROFESSIONAL: { monthly: 3999, yearly: 43189, currency: "₹" },
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
  prescriptions: z.number().optional(),
  invoices: z.number().optional(),
  ocrPages: z.number().optional(),
  apiCallsPerDay: z.number().optional(),
});
export type TierLimits = z.infer<typeof tierLimitsSchema>;

export const TIER_LIMITS: Record<TierName, TierLimits> = {
  STARTER: {
    patients: 50,
    doctors: 1,
    storageGB: 1,
    branches: 1,
    appointments: 100,
    users: 1,
    prescriptions: 50,
    invoices: 0,
    ocrPages: 50,
    apiCallsPerDay: 0,
  },
  ESSENTIAL: {
    patients: 500,
    doctors: 1,
    storageGB: 10,
    branches: 1,
    appointments: 1000,
    users: 3,
    prescriptions: 500,
    invoices: 300,
    ocrPages: 200,
    apiCallsPerDay: 0,
  },
  PROFESSIONAL: {
    patients: 10000,
    doctors: 999,
    storageGB: 100,
    branches: 5,
    appointments: 20000,
    users: 15,
    prescriptions: 5000,
    invoices: 4000,
    ocrPages: 2000,
    apiCallsPerDay: 0,
  },
  ENTERPRISE: {
    patients: 999999,
    doctors: 999,
    storageGB: 500,
    branches: 999,
    appointments: 999999,
    users: 999,
    prescriptions: 999999,
    invoices: 999999,
    ocrPages: 10000,
    apiCallsPerDay: 10000,
  },
  INTELLIGENCE: {
    patients: 999999,
    doctors: 999,
    storageGB: 100,
    branches: 999,
    appointments: 999999,
    users: 999,
    prescriptions: 999999,
    invoices: 999999,
    ocrPages: 10000,
    apiCallsPerDay: 0,
  },
};

const FLAT_OVERAGE_RATES = {
  patientRate: 1.5,
  appointmentRate: 0.75,
  storageRate: 40,
  userRate: 399,
  prescriptionRate: 0.75,
  invoiceRate: 0.4,
  ocrPageRate: 1.5,
  apiCallRate: 0,
};

const FLAT_OVERAGE_RATES_USD = {
  patientRate: 0.04,
  appointmentRate: 0.02,
  storageRate: 1.2,
  userRate: 12,
  prescriptionRate: 0.02,
  invoiceRate: 0.01,
  ocrPageRate: 0.04,
  apiCallRate: 0,
};

const FLAT_OVERAGE_RATES_EUR = {
  patientRate: 0.035,
  appointmentRate: 0.018,
  storageRate: 1.0,
  userRate: 10,
  prescriptionRate: 0.017,
  invoiceRate: 0.009,
  ocrPageRate: 0.035,
  apiCallRate: 0,
};

const FLAT_OVERAGE_RATES_GBP = {
  patientRate: 0.03,
  appointmentRate: 0.015,
  storageRate: 0.85,
  userRate: 9,
  prescriptionRate: 0.015,
  invoiceRate: 0.008,
  ocrPageRate: 0.03,
  apiCallRate: 0,
};

const FLAT_OVERAGE_RATES_AUD = {
  patientRate: 0.06,
  appointmentRate: 0.03,
  storageRate: 1.8,
  userRate: 18,
  prescriptionRate: 0.03,
  invoiceRate: 0.015,
  ocrPageRate: 0.06,
  apiCallRate: 0,
};

const ZERO_OVERAGE = {
  patientRate: 0,
  appointmentRate: 0,
  storageRate: 0,
  userRate: 0,
  prescriptionRate: 0,
  invoiceRate: 0,
  ocrPageRate: 0,
  apiCallRate: 0,
};

export const TIER_OVERAGE_RATES: Record<
  TierName,
  {
    patientRate: number;
    appointmentRate: number;
    storageRate: number;
    userRate: number;
    prescriptionRate: number;
    invoiceRate: number;
    ocrPageRate: number;
    apiCallRate: number;
  }
> = {
  STARTER: ZERO_OVERAGE,
  ESSENTIAL: FLAT_OVERAGE_RATES,
  PROFESSIONAL: FLAT_OVERAGE_RATES,
  ENTERPRISE: { ...ZERO_OVERAGE, apiCallRate: 0.01 },
  INTELLIGENCE: ZERO_OVERAGE,
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
      prescriptionRate: number;
      invoiceRate: number;
      ocrPageRate: number;
      apiCallRate: number;
    }
  >
> = {
  INR: TIER_OVERAGE_RATES,

  USD: {
    STARTER: ZERO_OVERAGE,
    ESSENTIAL: FLAT_OVERAGE_RATES_USD,
    PROFESSIONAL: FLAT_OVERAGE_RATES_USD,
    ENTERPRISE: { ...ZERO_OVERAGE, apiCallRate: 0.0003 },
    INTELLIGENCE: ZERO_OVERAGE,
  },

  EUR: {
    STARTER: ZERO_OVERAGE,
    ESSENTIAL: FLAT_OVERAGE_RATES_EUR,
    PROFESSIONAL: FLAT_OVERAGE_RATES_EUR,
    ENTERPRISE: { ...ZERO_OVERAGE, apiCallRate: 0.00025 },
    INTELLIGENCE: ZERO_OVERAGE,
  },

  GBP: {
    STARTER: ZERO_OVERAGE,
    ESSENTIAL: FLAT_OVERAGE_RATES_GBP,
    PROFESSIONAL: FLAT_OVERAGE_RATES_GBP,
    ENTERPRISE: { ...ZERO_OVERAGE, apiCallRate: 0.0002 },
    INTELLIGENCE: ZERO_OVERAGE,
  },

  AUD: {
    STARTER: ZERO_OVERAGE,
    ESSENTIAL: FLAT_OVERAGE_RATES_AUD,
    PROFESSIONAL: FLAT_OVERAGE_RATES_AUD,
    ENTERPRISE: { ...ZERO_OVERAGE, apiCallRate: 0.0004 },
    INTELLIGENCE: ZERO_OVERAGE,
  },
};

export interface AddOnPricing {
  basePrice: number | "custom";
  includedQuota: number;
  overageRate: number;
}

export const WHATSAPP_ADDON_PRICING: Record<
  Exclude<TierName, "STARTER" | "INTELLIGENCE">,
  AddOnPricing
> = {
  ESSENTIAL: { basePrice: 499, includedQuota: 500, overageRate: 0.5 },
  PROFESSIONAL: { basePrice: 1499, includedQuota: 5000, overageRate: 0.3 },
  ENTERPRISE: { basePrice: "custom", includedQuota: 15000, overageRate: 0.2 },
};

export const INTELLIGENCE_ADDON_PRICING: Record<
  Exclude<TierName, "STARTER" | "INTELLIGENCE">,
  AddOnPricing
> = {
  ESSENTIAL: { basePrice: 1999, includedQuota: 500, overageRate: 3 },
  PROFESSIONAL: { basePrice: 3499, includedQuota: 5000, overageRate: 2 },
  ENTERPRISE: { basePrice: "custom", includedQuota: 15000, overageRate: 1.5 },
};

export const WHATSAPP_ADDON_PRICING_BY_CURRENCY: Record<
  SupportedCurrency,
  Record<Exclude<TierName, "STARTER" | "INTELLIGENCE">, AddOnPricing>
> = {
  INR: WHATSAPP_ADDON_PRICING,
  USD: {
    ESSENTIAL: { basePrice: 9, includedQuota: 500, overageRate: 0.015 },
    PROFESSIONAL: { basePrice: 25, includedQuota: 5000, overageRate: 0.008 },
    ENTERPRISE: { basePrice: "custom", includedQuota: 15000, overageRate: 0.005 },
  },
  EUR: {
    ESSENTIAL: { basePrice: 8, includedQuota: 500, overageRate: 0.013 },
    PROFESSIONAL: { basePrice: 22, includedQuota: 5000, overageRate: 0.007 },
    ENTERPRISE: { basePrice: "custom", includedQuota: 15000, overageRate: 0.004 },
  },
  GBP: {
    ESSENTIAL: { basePrice: 7, includedQuota: 500, overageRate: 0.012 },
    PROFESSIONAL: { basePrice: 19, includedQuota: 5000, overageRate: 0.006 },
    ENTERPRISE: { basePrice: "custom", includedQuota: 15000, overageRate: 0.004 },
  },
  AUD: {
    ESSENTIAL: { basePrice: 15, includedQuota: 500, overageRate: 0.022 },
    PROFESSIONAL: { basePrice: 35, includedQuota: 5000, overageRate: 0.012 },
    ENTERPRISE: { basePrice: "custom", includedQuota: 15000, overageRate: 0.008 },
  },
};

export const INTELLIGENCE_ADDON_PRICING_BY_CURRENCY: Record<
  SupportedCurrency,
  Record<Exclude<TierName, "STARTER" | "INTELLIGENCE">, AddOnPricing>
> = {
  INR: INTELLIGENCE_ADDON_PRICING,
  USD: {
    ESSENTIAL: { basePrice: 29, includedQuota: 500, overageRate: 0.05 },
    PROFESSIONAL: { basePrice: 55, includedQuota: 5000, overageRate: 0.03 },
    ENTERPRISE: { basePrice: "custom", includedQuota: 15000, overageRate: 0.02 },
  },
  EUR: {
    ESSENTIAL: { basePrice: 25, includedQuota: 500, overageRate: 0.045 },
    PROFESSIONAL: { basePrice: 49, includedQuota: 5000, overageRate: 0.025 },
    ENTERPRISE: { basePrice: "custom", includedQuota: 15000, overageRate: 0.018 },
  },
  GBP: {
    ESSENTIAL: { basePrice: 22, includedQuota: 500, overageRate: 0.04 },
    PROFESSIONAL: { basePrice: 42, includedQuota: 5000, overageRate: 0.022 },
    ENTERPRISE: { basePrice: "custom", includedQuota: 15000, overageRate: 0.015 },
  },
  AUD: {
    ESSENTIAL: { basePrice: 45, includedQuota: 500, overageRate: 0.075 },
    PROFESSIONAL: { basePrice: 85, includedQuota: 5000, overageRate: 0.045 },
    ENTERPRISE: { basePrice: "custom", includedQuota: 15000, overageRate: 0.03 },
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
  STARTER: 0,
  ESSENTIAL: 500,
  PROFESSIONAL: 2500,
  ENTERPRISE: 5000,
  INTELLIGENCE: 0,
};

export const REFERRAL_REWARDS_BY_CURRENCY: Record<
  SupportedCurrency,
  Record<TierName, number>
> = {
  INR: REFERRAL_REWARDS,
  USD: {
    STARTER: 0,
    ESSENTIAL: 15,
    PROFESSIONAL: 60,
    ENTERPRISE: 100,
    INTELLIGENCE: 0,
  },
  EUR: {
    STARTER: 0,
    ESSENTIAL: 12,
    PROFESSIONAL: 50,
    ENTERPRISE: 85,
    INTELLIGENCE: 0,
  },
  GBP: {
    STARTER: 0,
    ESSENTIAL: 10,
    PROFESSIONAL: 45,
    ENTERPRISE: 75,
    INTELLIGENCE: 0,
  },
  AUD: {
    STARTER: 0,
    ESSENTIAL: 22,
    PROFESSIONAL: 90,
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
  tier: Exclude<TierName, "STARTER" | "INTELLIGENCE">,
  currency: SupportedCurrency = "INR",
): AddOnPricing {
  return WHATSAPP_ADDON_PRICING_BY_CURRENCY[currency][tier];
}

export function getIntelligenceAddonPricingByCurrency(
  tier: Exclude<TierName, "STARTER" | "INTELLIGENCE">,
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
  STARTER: {
    name: "Docita Starter",
    description: "Basic clinical workflow for free — appointments, prescriptions, and patient records",
    tagline: "Free forever",
    color: "gray",
  },
  ESSENTIAL: {
    name: "Docita Essential",
    description: "Professional practice management for solo clinics",
    tagline: "Solo Clinic Pro",
    color: "blue",
  },
  PROFESSIONAL: {
    name: "Docita Professional",
    description: "Full-featured solution for multi-doctor clinics",
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
  [Feature.DIGITAL_PRESCRIPTIONS]: {
    name: "Digital Prescriptions",
    description: "Create digital prescriptions",
  },

  [Feature.INVOICING]: {
    name: "Invoicing",
    description: "Create and manage invoices",
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
    description: "Reusable prescription templates",
  },
  [Feature.MULTI_DEVICE]: {
    name: "Multi-Device Login",
    description: "Staff can log in from multiple devices",
  },
  [Feature.ROLE_MANAGEMENT]: {
    name: "Role Management",
    description: "Assign roles to staff members",
  },
  [Feature.CONSENT_MANAGEMENT]: {
    name: "Consent Management",
    description: "Digital patient consent forms",
  },
  [Feature.DOCTOR_SIGNATURE]: {
    name: "Doctor Signature",
    description: "Digital signature on prescriptions",
  },

  [Feature.MULTI_DOCTOR]: {
    name: "Multi-Doctor",
    description: "Manage multiple doctors",
  },
  [Feature.MULTI_CLINIC]: {
    name: "Multi-Branch",
    description: "Manage multiple clinic branches",
  },
  [Feature.LAB_TESTS]: {
    name: "Lab Tests",
    description: "Lab test catalog and tracking",
  },
  [Feature.INVENTORY]: {
    name: "Inventory",
    description: "Medicine and supplies inventory",
  },
  [Feature.QUEUE_MANAGEMENT]: {
    name: "Queue Management",
    description: "Token queue system",
  },
  [Feature.AUDIT_LOGS]: {
    name: "Audit Logs",
    description: "Complete audit trail",
  },
  [Feature.INSURANCE_BILLING]: {
    name: "Insurance Billing",
    description: "Insurance claim management",
  },
  [Feature.DIGITAL_INTAKE_FORMS]: {
    name: "Digital Intake Forms",
    description: "Patient intake forms online",
  },
  [Feature.BROADCAST_CAMPAIGNS]: {
    name: "Broadcast Campaigns",
    description: "WhatsApp bulk messaging",
  },
  [Feature.OCR_ADVANCED]: {
    name: "Advanced OCR",
    description: "AI-powered document extraction",
  },
  [Feature.ADVANCED_ANALYTICS]: {
    name: "Advanced Analytics",
    description: "Deep clinic performance analytics",
  },

  [Feature.FULL_EHR]: {
    name: "Full EHR",
    description: "Complete electronic health records",
  },
  [Feature.API_ACCESS]: {
    name: "API Access",
    description: "REST API for integrations",
  },
  [Feature.MULTI_LOCATION_ANALYTICS]: {
    name: "Multi-Location Analytics",
    description: "Analytics across all branches",
  },
  [Feature.CUSTOM_BRANDING]: {
    name: "Custom Branding",
    description: "White-label with your brand",
  },
  [Feature.DATA_WAREHOUSE_EXPORT]: {
    name: "Data Warehouse Export",
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
  STARTER: [
    "Up to 50 patients",
    "Calendar & appointment scheduling",
    "Digital prescriptions with PDF",
    "Patient profiles & visit history",
    "Paper record scanning & archival",
    "Excel import with column mapping",
    "Basic OCR for document scanning",
    "Export to CSV/Excel",
    "Single doctor",
  ],
  ESSENTIAL: [
    "Everything in Starter",
    "Up to 500 patients",
    "Invoicing & billing",
    "Basic analytics dashboard",
    "ICD-10/CPT medical coding",
    "Prescription templates",
    "Digital consent management",
    "Doctor signature on prescriptions",
    "Multi-device staff login",
    "Team management (3 users, roles & permissions)",
    "Automated appointment reminders",
    "Payment links",
    "Email support",
  ],
  PROFESSIONAL: [
    "Everything in Essential",
    "Up to 10,000 patients",
    "Unlimited doctors",
    "Multi-doctor calendar",
    "Multi-clinic branching (up to 5 branches)",
    "Lab tests catalog & tracking",
    "Inventory & pharmacy module",
    "Token queue management",
    "Audit logs & compliance",
    "Digital intake forms",
    "WhatsApp broadcast campaigns",
    "Advanced OCR with AI",
    "Advanced analytics dashboard",
    "Insurance billing",
    "15 users included",
    "Priority support",
  ],
  ENTERPRISE: [
    "Everything in Professional",
    "Unlimited patients & doctors",
    "Full EHR capabilities",
    "API access for integrations",
    "Multi-location analytics",
    "Custom branding & white-label",
    "Data warehouse export",
    "SSO & advanced security",
    "Bulk import suite",
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
