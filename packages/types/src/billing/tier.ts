import { z } from "zod";

export const tierSchema = z.enum([
  "STARTER",
  "ESSENTIAL",
  "PROFESSIONAL",
  "HOSPITAL",
  "ENTERPRISE",
  "INTELLIGENCE",
  "FRONT_DESK",
]);
export type TierName = z.infer<typeof tierSchema>;

export enum Tier {
  STARTER = 0,
  ESSENTIAL = 1,
  PROFESSIONAL = 2,
  /** Multi-doctor multi-branch hospital SKU; ranked between Professional and Enterprise so any feature gated to ENTERPRISE remains gated to HOSPITAL too. */
  HOSPITAL = 3,
  ENTERPRISE = 4,
  /** Add-on, not a billed tier. Checked separately via the intelligence flag, never via raw `>=` comparison. */
  INTELLIGENCE = 5,
  /** Billed SKU; feature gating uses {@link hasFeatureAccess} / {@link FRONT_DESK_BLOCKED_FEATURES}, not raw `>=`. */
  FRONT_DESK = 6,
}

export const BILLED_TIERS = [
  Tier.STARTER,
  Tier.ESSENTIAL,
  Tier.PROFESSIONAL,
  Tier.HOSPITAL,
  Tier.ENTERPRISE,
  Tier.FRONT_DESK,
] as const;

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
  LEAVE_MANAGEMENT = "LEAVE_MANAGEMENT",
  WHATSAPP_MESSAGING = "WHATSAPP_MESSAGING",
  WHATSAPP_OWN_NUMBER = "WHATSAPP_OWN_NUMBER",
  WHATSAPP_MANAGED_NUMBER = "WHATSAPP_MANAGED_NUMBER",

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
  DEDICATED_DEPLOYMENT = "DEDICATED_DEPLOYMENT",
  SSO = "SSO",
  BULK_IMPORT_SUITE = "BULK_IMPORT_SUITE",

  AI_PRESCRIPTION_ASSISTANT = "AI_PRESCRIPTION_ASSISTANT",
  AI_DIAGNOSIS_HINTS = "AI_DIAGNOSIS_HINTS",
  SMART_TASK_ENGINE = "SMART_TASK_ENGINE",
  PREDICTIVE_NO_SHOW = "PREDICTIVE_NO_SHOW",
  PATIENT_SEGMENTATION = "PATIENT_SEGMENTATION",
  ANOMALY_DETECTION = "ANOMALY_DETECTION",
}

const PLANNED_FEATURES: ReadonlySet<Feature> = new Set([
  Feature.MULTI_CLINIC,
  Feature.INSURANCE_BILLING,
  Feature.DIGITAL_INTAKE_FORMS,
  Feature.BROADCAST_CAMPAIGNS,
  Feature.FULL_EHR,
  Feature.API_ACCESS,
  Feature.MULTI_LOCATION_ANALYTICS,
  Feature.CUSTOM_BRANDING,
  Feature.DATA_WAREHOUSE_EXPORT,
  Feature.DEDICATED_DEPLOYMENT,
  Feature.SSO,
  Feature.BULK_IMPORT_SUITE,
  Feature.AI_PRESCRIPTION_ASSISTANT,
  Feature.AI_DIAGNOSIS_HINTS,
  Feature.SMART_TASK_ENGINE,
  Feature.PREDICTIVE_NO_SHOW,
  Feature.PATIENT_SEGMENTATION,
  Feature.ANOMALY_DETECTION,
]);

export function isFeatureGenerallyAvailable(feature: Feature): boolean {
  return !PLANNED_FEATURES.has(feature);
}

/**
 * Clinical / multi-doctor features blocked for front-desk workspaces and
 * {@link TierName} `FRONT_DESK`, regardless of numeric tier ordering.
 */
export const FRONT_DESK_BLOCKED_FEATURES: ReadonlySet<Feature> = new Set([
  Feature.DIGITAL_PRESCRIPTIONS,
  Feature.MEDICINES_LIST,
  Feature.PRESCRIPTION_TEMPLATES,
  Feature.DOCTOR_SIGNATURE,
  Feature.MEDICAL_CODING,
  Feature.LEAVE_MANAGEMENT,
  Feature.INVENTORY,
  Feature.INSURANCE_BILLING,
  Feature.OCR_ADVANCED,
  Feature.FULL_EHR,
  Feature.API_ACCESS,
  Feature.MULTI_LOCATION_ANALYTICS,
  Feature.CUSTOM_BRANDING,
  Feature.DATA_WAREHOUSE_EXPORT,
  Feature.SSO,
  Feature.BULK_IMPORT_SUITE,
  Feature.AI_PRESCRIPTION_ASSISTANT,
  Feature.AI_DIAGNOSIS_HINTS,
  Feature.SMART_TASK_ENGINE,
  Feature.PREDICTIVE_NO_SHOW,
  Feature.PATIENT_SEGMENTATION,
  Feature.ANOMALY_DETECTION,
  Feature.MULTI_DOCTOR,
  Feature.MULTI_CLINIC,
]);

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
  [Feature.LEAVE_MANAGEMENT]: Tier.ESSENTIAL,
  [Feature.WHATSAPP_MESSAGING]: Tier.ESSENTIAL,
  [Feature.WHATSAPP_OWN_NUMBER]: Tier.PROFESSIONAL,
  [Feature.WHATSAPP_MANAGED_NUMBER]: Tier.HOSPITAL,

  [Feature.MULTI_DOCTOR]: Tier.ESSENTIAL,
  [Feature.MULTI_CLINIC]: Tier.ESSENTIAL,
  [Feature.LAB_TESTS]: Tier.ESSENTIAL,
  [Feature.INVENTORY]: Tier.ESSENTIAL,
  [Feature.QUEUE_MANAGEMENT]: Tier.ESSENTIAL,
  [Feature.AUDIT_LOGS]: Tier.ESSENTIAL,
  [Feature.INSURANCE_BILLING]: Tier.ESSENTIAL,
  [Feature.DIGITAL_INTAKE_FORMS]: Tier.ESSENTIAL,
  [Feature.OCR_ADVANCED]: Tier.ESSENTIAL,
  [Feature.ADVANCED_ANALYTICS]: Tier.ESSENTIAL,
  [Feature.AI_PRESCRIPTION_ASSISTANT]: Tier.ESSENTIAL,
  [Feature.AI_DIAGNOSIS_HINTS]: Tier.ESSENTIAL,
  [Feature.SMART_TASK_ENGINE]: Tier.ESSENTIAL,
  [Feature.PREDICTIVE_NO_SHOW]: Tier.ESSENTIAL,
  [Feature.ANOMALY_DETECTION]: Tier.ESSENTIAL,

  [Feature.BROADCAST_CAMPAIGNS]: Tier.PROFESSIONAL,
  [Feature.PATIENT_SEGMENTATION]: Tier.PROFESSIONAL,
  [Feature.FULL_EHR]: Tier.PROFESSIONAL,
  [Feature.API_ACCESS]: Tier.PROFESSIONAL,
  [Feature.MULTI_LOCATION_ANALYTICS]: Tier.PROFESSIONAL,
  [Feature.CUSTOM_BRANDING]: Tier.PROFESSIONAL,
  [Feature.SSO]: Tier.PROFESSIONAL,
  [Feature.BULK_IMPORT_SUITE]: Tier.PROFESSIONAL,

  [Feature.DATA_WAREHOUSE_EXPORT]: Tier.ENTERPRISE,
  [Feature.DEDICATED_DEPLOYMENT]: Tier.ENTERPRISE,
};

export function getMinimumTierForFeature(feature: Feature): Tier {
  return FEATURE_TIER_MAP[feature];
}

export function assertNotIntelligenceComparison(tier: Tier): void {
  if (tier === Tier.INTELLIGENCE || tier === Tier.FRONT_DESK) {
    throw new Error(
      "Tier.INTELLIGENCE and Tier.FRONT_DESK must use feature access checks, not numeric tier comparisons.",
    );
  }
}

export type SupportedCurrency =
  | "INR"
  | "USD"
  | "EUR"
  | "GBP"
  | "AUD"
  | "CAD"
  | "SGD"
  | "AED"
  | "ZAR";

export const PRICING_CURRENCY_SYMBOLS: Record<SupportedCurrency, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  AUD: "A$",
  CAD: "C$",
  SGD: "S$",
  AED: "AED",
  ZAR: "R",
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
  CAD: {
    symbol: "C$",
    name: "Canadian Dollar",
    locale: "en-CA",
    decimalPlaces: 2,
  },
  SGD: {
    symbol: "S$",
    name: "Singapore Dollar",
    locale: "en-SG",
    decimalPlaces: 2,
  },
  AED: {
    symbol: "AED",
    name: "UAE Dirham",
    locale: "en-AE",
    decimalPlaces: 2,
  },
  ZAR: {
    symbol: "R",
    name: "South African Rand",
    locale: "en-ZA",
    decimalPlaces: 2,
  },
};

/** Free-trial length (days) for unpaid Starter/Essential onboarding and copy alignment. */
export const SUBSCRIPTION_TRIAL_DAYS = 30 as const;

/**
 * Grace window (days) after a trial ends before access is hard-locked.
 * During this window the clinic can still access the app but sees a
 * persistent "trial ended — pay now" banner.
 */
export const TRIAL_GRACE_DAYS = 3 as const;

/** Discriminated value for where the clinic is in the trial lifecycle. */
export type TrialWindowState = "ACTIVE" | "GRACE" | "EXPIRED";

/** Guided setup list price (whole currency units, not cents) for internal presets and marketing. */
export const GUIDED_SETUP_LIST_PRICE_BY_CURRENCY: Record<
  SupportedCurrency,
  number
> = {
  INR: 4999,
  USD: 60,
  EUR: 55,
  GBP: 45,
  AUD: 90,
  CAD: 85,
  SGD: 65,
  AED: 185,
  ZAR: 999,
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

export function deriveAnnualPrice(monthly: number): number {
  return Math.round(monthly * 10);
}

function buildTierPricing(
  monthly: number | "custom",
): MultiCurrencyTierPricing {
  if (monthly === "custom") {
    return { monthly, yearly: "custom" };
  }

  return {
    monthly,
    yearly: deriveAnnualPrice(monthly),
  };
}

export const TIER_PRICING_BY_CURRENCY: Record<
  SupportedCurrency,
  Record<TierName, MultiCurrencyTierPricing>
> = {
  INR: {
    STARTER: buildTierPricing(499),
    ESSENTIAL: buildTierPricing(999),
    FRONT_DESK: buildTierPricing(799),
    PROFESSIONAL: buildTierPricing(2499),
    HOSPITAL: buildTierPricing(7999),
    ENTERPRISE: buildTierPricing("custom"),
    INTELLIGENCE: buildTierPricing(0),
  },
  USD: {
    STARTER: buildTierPricing(9),
    ESSENTIAL: buildTierPricing(19),
    FRONT_DESK: buildTierPricing(15),
    PROFESSIONAL: buildTierPricing(49),
    HOSPITAL: buildTierPricing(149),
    ENTERPRISE: buildTierPricing("custom"),
    INTELLIGENCE: buildTierPricing(0),
  },
  EUR: {
    STARTER: buildTierPricing(8),
    ESSENTIAL: buildTierPricing(17),
    FRONT_DESK: buildTierPricing(14),
    PROFESSIONAL: buildTierPricing(45),
    HOSPITAL: buildTierPricing(139),
    ENTERPRISE: buildTierPricing("custom"),
    INTELLIGENCE: buildTierPricing(0),
  },
  GBP: {
    STARTER: buildTierPricing(7),
    ESSENTIAL: buildTierPricing(15),
    FRONT_DESK: buildTierPricing(12),
    PROFESSIONAL: buildTierPricing(39),
    HOSPITAL: buildTierPricing(119),
    ENTERPRISE: buildTierPricing("custom"),
    INTELLIGENCE: buildTierPricing(0),
  },
  AUD: {
    STARTER: buildTierPricing(14),
    ESSENTIAL: buildTierPricing(29),
    FRONT_DESK: buildTierPricing(24),
    PROFESSIONAL: buildTierPricing(75),
    HOSPITAL: buildTierPricing(225),
    ENTERPRISE: buildTierPricing("custom"),
    INTELLIGENCE: buildTierPricing(0),
  },
  CAD: {
    STARTER: buildTierPricing(12),
    ESSENTIAL: buildTierPricing(25),
    FRONT_DESK: buildTierPricing(20),
    PROFESSIONAL: buildTierPricing(65),
    HOSPITAL: buildTierPricing(199),
    ENTERPRISE: buildTierPricing("custom"),
    INTELLIGENCE: buildTierPricing(0),
  },
  SGD: {
    STARTER: buildTierPricing(12),
    ESSENTIAL: buildTierPricing(25),
    FRONT_DESK: buildTierPricing(20),
    PROFESSIONAL: buildTierPricing(65),
    HOSPITAL: buildTierPricing(199),
    ENTERPRISE: buildTierPricing("custom"),
    INTELLIGENCE: buildTierPricing(0),
  },
  AED: {
    STARTER: buildTierPricing(35),
    ESSENTIAL: buildTierPricing(69),
    FRONT_DESK: buildTierPricing(55),
    PROFESSIONAL: buildTierPricing(179),
    HOSPITAL: buildTierPricing(549),
    ENTERPRISE: buildTierPricing("custom"),
    INTELLIGENCE: buildTierPricing(0),
  },
  ZAR: {
    STARTER: buildTierPricing(179),
    ESSENTIAL: buildTierPricing(349),
    FRONT_DESK: buildTierPricing(279),
    PROFESSIONAL: buildTierPricing(899),
    HOSPITAL: buildTierPricing(2799),
    ENTERPRISE: buildTierPricing("custom"),
    INTELLIGENCE: buildTierPricing(0),
  },
};

export const TIER_PRICING: Record<TierName, TierPricing> = {
  STARTER: { monthly: 499, yearly: deriveAnnualPrice(499), currency: "₹" },
  ESSENTIAL: { monthly: 999, yearly: deriveAnnualPrice(999), currency: "₹" },
  FRONT_DESK: { monthly: 799, yearly: deriveAnnualPrice(799), currency: "₹" },
  PROFESSIONAL: {
    monthly: 2499,
    yearly: deriveAnnualPrice(2499),
    currency: "₹",
  },
  HOSPITAL: {
    monthly: 7999,
    yearly: deriveAnnualPrice(7999),
    currency: "₹",
  },
  ENTERPRISE: { monthly: "custom", yearly: "custom", currency: "₹" },
  INTELLIGENCE: { monthly: 0, yearly: 0, currency: "₹" },
};

export const ANNUAL_DISCOUNT_PERCENT = 17;
export const SEMI_ANNUAL_DISCOUNT_PERCENT = 8;
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
    storageGB: 2,
    branches: 1,
    appointments: 50,
    users: 1,
    prescriptions: 20,
    invoices: 10,
    ocrPages: 100,
    apiCallsPerDay: 0,
  },
  ESSENTIAL: {
    patients: 999999,
    doctors: 1,
    storageGB: 10,
    branches: 1,
    appointments: 500,
    users: 5,
    prescriptions: 999999,
    invoices: 999999,
    ocrPages: 500,
    apiCallsPerDay: 0,
  },
  FRONT_DESK: {
    patients: 999999,
    doctors: 999999,
    storageGB: 10,
    branches: 1,
    appointments: 500,
    users: 5,
    prescriptions: 0,
    invoices: 999999,
    ocrPages: 500,
    apiCallsPerDay: 0,
  },
  PROFESSIONAL: {
    patients: 999999,
    doctors: 5,
    storageGB: 50,
    branches: 1,
    appointments: 2000,
    users: 20,
    prescriptions: 999999,
    invoices: 999999,
    ocrPages: 2000,
    apiCallsPerDay: 10000,
  },
  HOSPITAL: {
    patients: 999999,
    doctors: 25,
    storageGB: 250,
    branches: 5,
    appointments: 8000,
    users: 75,
    prescriptions: 999999,
    invoices: 999999,
    ocrPages: 8000,
    apiCallsPerDay: 50000,
  },
  ENTERPRISE: {
    patients: 999999,
    doctors: 999999,
    storageGB: 500,
    branches: 999999,
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

const PRO_OVERAGE_RATES_BY_CURRENCY: Record<
  SupportedCurrency,
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
  INR: {
    patientRate: 1.5,
    appointmentRate: 2,
    storageRate: 0,
    userRate: 249,
    prescriptionRate: 0,
    invoiceRate: 0,
    ocrPageRate: 0,
    apiCallRate: 0,
  },
  USD: {
    patientRate: 0.04,
    appointmentRate: 0.05,
    storageRate: 0,
    userRate: 5,
    prescriptionRate: 0,
    invoiceRate: 0,
    ocrPageRate: 0,
    apiCallRate: 0,
  },
  EUR: {
    patientRate: 0.03,
    appointmentRate: 0.05,
    storageRate: 0,
    userRate: 4,
    prescriptionRate: 0,
    invoiceRate: 0,
    ocrPageRate: 0,
    apiCallRate: 0,
  },
  GBP: {
    patientRate: 0.03,
    appointmentRate: 0.04,
    storageRate: 0,
    userRate: 4,
    prescriptionRate: 0,
    invoiceRate: 0,
    ocrPageRate: 0,
    apiCallRate: 0,
  },
  AUD: {
    patientRate: 0.05,
    appointmentRate: 0.07,
    storageRate: 0,
    userRate: 7,
    prescriptionRate: 0,
    invoiceRate: 0,
    ocrPageRate: 0,
    apiCallRate: 0,
  },
  CAD: {
    patientRate: 0.05,
    appointmentRate: 0.07,
    storageRate: 0,
    userRate: 7,
    prescriptionRate: 0,
    invoiceRate: 0,
    ocrPageRate: 0,
    apiCallRate: 0,
  },
  SGD: {
    patientRate: 0.05,
    appointmentRate: 0.07,
    storageRate: 0,
    userRate: 7,
    prescriptionRate: 0,
    invoiceRate: 0,
    ocrPageRate: 0,
    apiCallRate: 0,
  },
  AED: {
    patientRate: 0.14,
    appointmentRate: 0.18,
    storageRate: 0,
    userRate: 18,
    prescriptionRate: 0,
    invoiceRate: 0,
    ocrPageRate: 0,
    apiCallRate: 0,
  },
  ZAR: {
    patientRate: 0.7,
    appointmentRate: 0.9,
    storageRate: 0,
    userRate: 90,
    prescriptionRate: 0,
    invoiceRate: 0,
    ocrPageRate: 0,
    apiCallRate: 0,
  },
};

const CLINIC_OVERAGE_RATES_BY_CURRENCY: Record<
  SupportedCurrency,
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
  INR: {
    patientRate: 1,
    appointmentRate: 1.5,
    storageRate: 0,
    userRate: 199,
    prescriptionRate: 0,
    invoiceRate: 0,
    ocrPageRate: 0,
    apiCallRate: 0.029,
  },
  USD: {
    patientRate: 0.02,
    appointmentRate: 0.03,
    storageRate: 0,
    userRate: 4,
    prescriptionRate: 0,
    invoiceRate: 0,
    ocrPageRate: 0,
    apiCallRate: 0.0007,
  },
  EUR: {
    patientRate: 0.02,
    appointmentRate: 0.03,
    storageRate: 0,
    userRate: 3,
    prescriptionRate: 0,
    invoiceRate: 0,
    ocrPageRate: 0,
    apiCallRate: 0.0006,
  },
  GBP: {
    patientRate: 0.02,
    appointmentRate: 0.025,
    storageRate: 0,
    userRate: 3,
    prescriptionRate: 0,
    invoiceRate: 0,
    ocrPageRate: 0,
    apiCallRate: 0.0005,
  },
  AUD: {
    patientRate: 0.03,
    appointmentRate: 0.05,
    storageRate: 0,
    userRate: 5,
    prescriptionRate: 0,
    invoiceRate: 0,
    ocrPageRate: 0,
    apiCallRate: 0.0008,
  },
  CAD: {
    patientRate: 0.03,
    appointmentRate: 0.04,
    storageRate: 0,
    userRate: 5,
    prescriptionRate: 0,
    invoiceRate: 0,
    ocrPageRate: 0,
    apiCallRate: 0.0007,
  },
  SGD: {
    patientRate: 0.03,
    appointmentRate: 0.04,
    storageRate: 0,
    userRate: 5,
    prescriptionRate: 0,
    invoiceRate: 0,
    ocrPageRate: 0,
    apiCallRate: 0.0007,
  },
  AED: {
    patientRate: 0.08,
    appointmentRate: 0.11,
    storageRate: 0,
    userRate: 14,
    prescriptionRate: 0,
    invoiceRate: 0,
    ocrPageRate: 0,
    apiCallRate: 0.0018,
  },
  ZAR: {
    patientRate: 0.45,
    appointmentRate: 0.6,
    storageRate: 0,
    userRate: 70,
    prescriptionRate: 0,
    invoiceRate: 0,
    ocrPageRate: 0,
    apiCallRate: 0.009,
  },
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
  ESSENTIAL: PRO_OVERAGE_RATES_BY_CURRENCY.INR,
  FRONT_DESK: PRO_OVERAGE_RATES_BY_CURRENCY.INR,
  PROFESSIONAL: CLINIC_OVERAGE_RATES_BY_CURRENCY.INR,
  HOSPITAL: CLINIC_OVERAGE_RATES_BY_CURRENCY.INR,
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
    ESSENTIAL: PRO_OVERAGE_RATES_BY_CURRENCY.USD,
    FRONT_DESK: PRO_OVERAGE_RATES_BY_CURRENCY.USD,
    PROFESSIONAL: CLINIC_OVERAGE_RATES_BY_CURRENCY.USD,
    HOSPITAL: CLINIC_OVERAGE_RATES_BY_CURRENCY.USD,
    ENTERPRISE: { ...ZERO_OVERAGE, apiCallRate: 0.0003 },
    INTELLIGENCE: ZERO_OVERAGE,
  },
  EUR: {
    STARTER: ZERO_OVERAGE,
    ESSENTIAL: PRO_OVERAGE_RATES_BY_CURRENCY.EUR,
    FRONT_DESK: PRO_OVERAGE_RATES_BY_CURRENCY.EUR,
    PROFESSIONAL: CLINIC_OVERAGE_RATES_BY_CURRENCY.EUR,
    HOSPITAL: CLINIC_OVERAGE_RATES_BY_CURRENCY.EUR,
    ENTERPRISE: { ...ZERO_OVERAGE, apiCallRate: 0.00025 },
    INTELLIGENCE: ZERO_OVERAGE,
  },
  GBP: {
    STARTER: ZERO_OVERAGE,
    ESSENTIAL: PRO_OVERAGE_RATES_BY_CURRENCY.GBP,
    FRONT_DESK: PRO_OVERAGE_RATES_BY_CURRENCY.GBP,
    PROFESSIONAL: CLINIC_OVERAGE_RATES_BY_CURRENCY.GBP,
    HOSPITAL: CLINIC_OVERAGE_RATES_BY_CURRENCY.GBP,
    ENTERPRISE: { ...ZERO_OVERAGE, apiCallRate: 0.0002 },
    INTELLIGENCE: ZERO_OVERAGE,
  },
  AUD: {
    STARTER: ZERO_OVERAGE,
    ESSENTIAL: PRO_OVERAGE_RATES_BY_CURRENCY.AUD,
    FRONT_DESK: PRO_OVERAGE_RATES_BY_CURRENCY.AUD,
    PROFESSIONAL: CLINIC_OVERAGE_RATES_BY_CURRENCY.AUD,
    HOSPITAL: CLINIC_OVERAGE_RATES_BY_CURRENCY.AUD,
    ENTERPRISE: { ...ZERO_OVERAGE, apiCallRate: 0.0004 },
    INTELLIGENCE: ZERO_OVERAGE,
  },
  CAD: {
    STARTER: ZERO_OVERAGE,
    ESSENTIAL: PRO_OVERAGE_RATES_BY_CURRENCY.CAD,
    FRONT_DESK: PRO_OVERAGE_RATES_BY_CURRENCY.CAD,
    PROFESSIONAL: CLINIC_OVERAGE_RATES_BY_CURRENCY.CAD,
    HOSPITAL: CLINIC_OVERAGE_RATES_BY_CURRENCY.CAD,
    ENTERPRISE: { ...ZERO_OVERAGE, apiCallRate: 0.00035 },
    INTELLIGENCE: ZERO_OVERAGE,
  },
  SGD: {
    STARTER: ZERO_OVERAGE,
    ESSENTIAL: PRO_OVERAGE_RATES_BY_CURRENCY.SGD,
    FRONT_DESK: PRO_OVERAGE_RATES_BY_CURRENCY.SGD,
    PROFESSIONAL: CLINIC_OVERAGE_RATES_BY_CURRENCY.SGD,
    HOSPITAL: CLINIC_OVERAGE_RATES_BY_CURRENCY.SGD,
    ENTERPRISE: { ...ZERO_OVERAGE, apiCallRate: 0.00035 },
    INTELLIGENCE: ZERO_OVERAGE,
  },
  AED: {
    STARTER: ZERO_OVERAGE,
    ESSENTIAL: PRO_OVERAGE_RATES_BY_CURRENCY.AED,
    FRONT_DESK: PRO_OVERAGE_RATES_BY_CURRENCY.AED,
    PROFESSIONAL: CLINIC_OVERAGE_RATES_BY_CURRENCY.AED,
    HOSPITAL: CLINIC_OVERAGE_RATES_BY_CURRENCY.AED,
    ENTERPRISE: { ...ZERO_OVERAGE, apiCallRate: 0.0004 },
    INTELLIGENCE: ZERO_OVERAGE,
  },
  ZAR: {
    STARTER: ZERO_OVERAGE,
    ESSENTIAL: PRO_OVERAGE_RATES_BY_CURRENCY.ZAR,
    FRONT_DESK: PRO_OVERAGE_RATES_BY_CURRENCY.ZAR,
    PROFESSIONAL: CLINIC_OVERAGE_RATES_BY_CURRENCY.ZAR,
    HOSPITAL: CLINIC_OVERAGE_RATES_BY_CURRENCY.ZAR,
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
  ESSENTIAL: { basePrice: 0, includedQuota: 500, overageRate: 0.75 },
  FRONT_DESK: { basePrice: 0, includedQuota: 500, overageRate: 0.75 },
  PROFESSIONAL: { basePrice: 0, includedQuota: 2000, overageRate: 0.5 },
  HOSPITAL: { basePrice: 0, includedQuota: 6000, overageRate: 0.35 },
  ENTERPRISE: { basePrice: 0, includedQuota: 15000, overageRate: 0.2 },
};

export const INTELLIGENCE_ADDON_PRICING: Record<
  Exclude<TierName, "STARTER" | "INTELLIGENCE">,
  AddOnPricing
> = {
  ESSENTIAL: { basePrice: 0, includedQuota: 0, overageRate: 0 },
  FRONT_DESK: { basePrice: 0, includedQuota: 0, overageRate: 0 },
  PROFESSIONAL: { basePrice: 0, includedQuota: 0, overageRate: 0 },
  HOSPITAL: { basePrice: 0, includedQuota: 0, overageRate: 0 },
  ENTERPRISE: { basePrice: 0, includedQuota: 0, overageRate: 0 },
};

export const WHATSAPP_ADDON_PRICING_BY_CURRENCY: Record<
  SupportedCurrency,
  Record<Exclude<TierName, "STARTER" | "INTELLIGENCE">, AddOnPricing>
> = {
  INR: WHATSAPP_ADDON_PRICING,
  USD: {
    ESSENTIAL: { basePrice: 0, includedQuota: 500, overageRate: 0.02 },
    FRONT_DESK: { basePrice: 0, includedQuota: 500, overageRate: 0.02 },
    PROFESSIONAL: { basePrice: 0, includedQuota: 2000, overageRate: 0.01 },
    HOSPITAL: { basePrice: 0, includedQuota: 6000, overageRate: 0.008 },
    ENTERPRISE: { basePrice: 0, includedQuota: 15000, overageRate: 0.005 },
  },
  EUR: {
    ESSENTIAL: { basePrice: 0, includedQuota: 500, overageRate: 0.02 },
    FRONT_DESK: { basePrice: 0, includedQuota: 500, overageRate: 0.02 },
    PROFESSIONAL: { basePrice: 0, includedQuota: 2000, overageRate: 0.01 },
    HOSPITAL: { basePrice: 0, includedQuota: 6000, overageRate: 0.007 },
    ENTERPRISE: { basePrice: 0, includedQuota: 15000, overageRate: 0.004 },
  },
  GBP: {
    ESSENTIAL: { basePrice: 0, includedQuota: 500, overageRate: 0.015 },
    FRONT_DESK: { basePrice: 0, includedQuota: 500, overageRate: 0.015 },
    PROFESSIONAL: { basePrice: 0, includedQuota: 2000, overageRate: 0.008 },
    HOSPITAL: { basePrice: 0, includedQuota: 6000, overageRate: 0.006 },
    ENTERPRISE: { basePrice: 0, includedQuota: 15000, overageRate: 0.004 },
  },
  AUD: {
    ESSENTIAL: { basePrice: 0, includedQuota: 500, overageRate: 0.03 },
    FRONT_DESK: { basePrice: 0, includedQuota: 500, overageRate: 0.03 },
    PROFESSIONAL: { basePrice: 0, includedQuota: 2000, overageRate: 0.02 },
    HOSPITAL: { basePrice: 0, includedQuota: 6000, overageRate: 0.014 },
    ENTERPRISE: { basePrice: 0, includedQuota: 15000, overageRate: 0.008 },
  },
  CAD: {
    ESSENTIAL: { basePrice: 0, includedQuota: 500, overageRate: 0.03 },
    FRONT_DESK: { basePrice: 0, includedQuota: 500, overageRate: 0.03 },
    PROFESSIONAL: { basePrice: 0, includedQuota: 2000, overageRate: 0.02 },
    HOSPITAL: { basePrice: 0, includedQuota: 6000, overageRate: 0.014 },
    ENTERPRISE: { basePrice: 0, includedQuota: 15000, overageRate: 0.008 },
  },
  SGD: {
    ESSENTIAL: { basePrice: 0, includedQuota: 500, overageRate: 0.03 },
    FRONT_DESK: { basePrice: 0, includedQuota: 500, overageRate: 0.03 },
    PROFESSIONAL: { basePrice: 0, includedQuota: 2000, overageRate: 0.02 },
    HOSPITAL: { basePrice: 0, includedQuota: 6000, overageRate: 0.014 },
    ENTERPRISE: { basePrice: 0, includedQuota: 15000, overageRate: 0.008 },
  },
  AED: {
    ESSENTIAL: { basePrice: 0, includedQuota: 500, overageRate: 0.07 },
    FRONT_DESK: { basePrice: 0, includedQuota: 500, overageRate: 0.07 },
    PROFESSIONAL: { basePrice: 0, includedQuota: 2000, overageRate: 0.04 },
    HOSPITAL: { basePrice: 0, includedQuota: 6000, overageRate: 0.03 },
    ENTERPRISE: { basePrice: 0, includedQuota: 15000, overageRate: 0.02 },
  },
  ZAR: {
    ESSENTIAL: { basePrice: 0, includedQuota: 500, overageRate: 0.35 },
    FRONT_DESK: { basePrice: 0, includedQuota: 500, overageRate: 0.35 },
    PROFESSIONAL: { basePrice: 0, includedQuota: 2000, overageRate: 0.2 },
    HOSPITAL: { basePrice: 0, includedQuota: 6000, overageRate: 0.15 },
    ENTERPRISE: { basePrice: 0, includedQuota: 15000, overageRate: 0.1 },
  },
};

const INTELLIGENCE_ZERO_PRICING: Record<
  Exclude<TierName, "STARTER" | "INTELLIGENCE">,
  AddOnPricing
> = {
  ESSENTIAL: { basePrice: 0, includedQuota: 0, overageRate: 0 },
  FRONT_DESK: { basePrice: 0, includedQuota: 0, overageRate: 0 },
  PROFESSIONAL: { basePrice: 0, includedQuota: 0, overageRate: 0 },
  HOSPITAL: { basePrice: 0, includedQuota: 0, overageRate: 0 },
  ENTERPRISE: { basePrice: 0, includedQuota: 0, overageRate: 0 },
};

export const INTELLIGENCE_ADDON_PRICING_BY_CURRENCY: Record<
  SupportedCurrency,
  Record<Exclude<TierName, "STARTER" | "INTELLIGENCE">, AddOnPricing>
> = {
  INR: INTELLIGENCE_ZERO_PRICING,
  USD: INTELLIGENCE_ZERO_PRICING,
  EUR: INTELLIGENCE_ZERO_PRICING,
  GBP: INTELLIGENCE_ZERO_PRICING,
  AUD: INTELLIGENCE_ZERO_PRICING,
  CAD: INTELLIGENCE_ZERO_PRICING,
  SGD: INTELLIGENCE_ZERO_PRICING,
  AED: INTELLIGENCE_ZERO_PRICING,
  ZAR: INTELLIGENCE_ZERO_PRICING,
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
  ANNUAL_COMMITMENT: { percentOff: 17, maxCombined: 20, appliesToAddOns: true },
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
  FRONT_DESK: 400,
  PROFESSIONAL: 2500,
  HOSPITAL: 4000,
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
    FRONT_DESK: 12,
    PROFESSIONAL: 60,
    HOSPITAL: 80,
    ENTERPRISE: 100,
    INTELLIGENCE: 0,
  },
  EUR: {
    STARTER: 0,
    ESSENTIAL: 12,
    FRONT_DESK: 10,
    PROFESSIONAL: 50,
    HOSPITAL: 70,
    ENTERPRISE: 85,
    INTELLIGENCE: 0,
  },
  GBP: {
    STARTER: 0,
    ESSENTIAL: 10,
    FRONT_DESK: 8,
    PROFESSIONAL: 45,
    HOSPITAL: 60,
    ENTERPRISE: 75,
    INTELLIGENCE: 0,
  },
  AUD: {
    STARTER: 0,
    ESSENTIAL: 22,
    FRONT_DESK: 18,
    PROFESSIONAL: 90,
    HOSPITAL: 120,
    ENTERPRISE: 150,
    INTELLIGENCE: 0,
  },
  CAD: {
    STARTER: 0,
    ESSENTIAL: 20,
    FRONT_DESK: 16,
    PROFESSIONAL: 70,
    HOSPITAL: 95,
    ENTERPRISE: 120,
    INTELLIGENCE: 0,
  },
  SGD: {
    STARTER: 0,
    ESSENTIAL: 20,
    FRONT_DESK: 16,
    PROFESSIONAL: 70,
    HOSPITAL: 95,
    ENTERPRISE: 120,
    INTELLIGENCE: 0,
  },
  AED: {
    STARTER: 0,
    ESSENTIAL: 60,
    FRONT_DESK: 48,
    PROFESSIONAL: 180,
    HOSPITAL: 240,
    ENTERPRISE: 300,
    INTELLIGENCE: 0,
  },
  ZAR: {
    STARTER: 0,
    ESSENTIAL: 280,
    FRONT_DESK: 220,
    PROFESSIONAL: 900,
    HOSPITAL: 1200,
    ENTERPRISE: 1500,
    INTELLIGENCE: 0,
  },
};

// Currency-aware pricing helpers (getTierPricingByCurrency, getOverageRatesByCurrency, ...)
// were extracted to `@workspace/utils/billing/tier-pricing` per §15.3. Import them from
// `@workspace/utils`.

export const tierInfoSchema = z.object({
  name: z.string(),
  description: z.string(),
  tagline: z.string(),
  color: z.string(),
});
export type TierInfo = z.infer<typeof tierInfoSchema>;

export const TIER_INFO: Record<TierName, TierInfo> = {
  STARTER: {
    name: "Starter",
    description: "Basic clinical workflow for solo doctors moving off paper",
    tagline: "Go digital from day one",
    color: "gray",
  },
  ESSENTIAL: {
    name: "Essential",
    description:
      "For solo clinics that want clear limits, WhatsApp messaging, and simple billing.",
    tagline: "For solo clinics",
    color: "blue",
  },
  PROFESSIONAL: {
    name: "Professional",
    description:
      "For growing clinics with multiple doctors, branding, and advanced workflows.",
    tagline: "Built for growing clinics",
    color: "purple",
  },
  HOSPITAL: {
    name: "Hospital",
    description:
      "For multi-doctor multi-branch hospitals: pooled WhatsApp, multi-branch analytics, dedicated CSM.",
    tagline: "Multi-branch and multi-specialty",
    color: "indigo",
  },
  ENTERPRISE: {
    name: "Enterprise",
    description: "Hospital-grade solution with full customization",
    tagline: "Hospital-Grade System",
    color: "orange",
  },
  INTELLIGENCE: {
    name: "Intelligence",
    description: "AI-powered features to enhance your clinic",
    tagline: "AI-Powered Add-on",
    color: "pink",
  },
  FRONT_DESK: {
    name: "Front desk",
    description:
      "Reception-first scheduling, queue, and billing without full clinical workflows in-app",
    tagline: "Reception and operations",
    color: "teal",
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
    "Consultation scheduling",
    "Digital prescriptions with PDF",
    "Patient profiles & visit history",
    "Paper record scanning & archival",
    "Excel import with column mapping",
    "Basic OCR for document scanning",
    "Export to CSV/Excel",
    "Single doctor",
  ],
  ESSENTIAL: [
    "All features from Starter",
    "Unlimited patients included",
    "1 doctor included",
    "500 consultations/mo included",
    "WhatsApp messaging (500 msgs/mo included)",
    "Lab tests & inventory",
    "Queue management",
    "Advanced analytics & reporting",
    "ICD-10/CPT medical coding",
    "Digital intake forms (planned)",
    "Audit logs & compliance",
    "Prescription templates & doctor signature",
    "Automated reminders & payment links",
    "Insurance billing (planned)",
    "Leave management",
  ],
  PROFESSIONAL: [
    "Everything in Essential",
    "Unlimited patients included",
    "5 doctors included",
    "2,000 consultations/mo included",
    "WhatsApp messaging (2,000 msgs/mo included)",
    "Priority support with SLA",
  ],
  HOSPITAL: [
    "Everything in Professional",
    "Up to 25 doctors and 5 branches included",
    "75 staff users included",
    "8,000 consultations/mo included",
    "WhatsApp messaging (6,000 msgs/mo pooled)",
    "Multi-location analytics & multi-branch dashboards (planned)",
    "Dedicated customer success manager",
    "Higher API throughput for hospital integrations (planned)",
  ],
  ENTERPRISE: [
    "Everything in Hospital",
    "Unlimited patients, users & branches",
    "Custom contract & invoicing",
    "Dedicated account manager",
    "Custom SLA guarantee",
    "Data warehouse export (planned)",
  ],
  FRONT_DESK: [
    "Appointment scheduling and queue",
    "Patient check-in and basic profiles",
    "Invoicing and payment links",
    "WhatsApp messaging within plan limits",
    "Admin and receptionist roles",
    "Schedule-only doctor profiles (no app login)",
  ],
  INTELLIGENCE: [],
};

export function getTierValue(tierName: TierName): Tier {
  if (tierName === "FRONT_DESK") {
    return Tier.FRONT_DESK;
  }
  return Tier[tierName];
}

export function getTierName(tier: Tier): TierName {
  if (tier === Tier.FRONT_DESK) {
    return "FRONT_DESK";
  }
  return Tier[tier] as TierName;
}

export function hasFeatureAccess(
  tier: TierName,
  feature: Feature,
  hasIntelligence = false,
): boolean {
  if (!isFeatureGenerallyAvailable(feature)) {
    return false;
  }

  const requiredTier = FEATURE_TIER_MAP[feature];

  if (requiredTier === Tier.INTELLIGENCE) {
    return hasIntelligence;
  }

  if (tier === "FRONT_DESK") {
    if (FRONT_DESK_BLOCKED_FEATURES.has(feature)) {
      return false;
    }
    return Tier.ESSENTIAL >= requiredTier;
  }

  return getTierValue(tier) >= requiredTier;
}

/**
 * Generally available {@link Feature} values enabled for this billed tier,
 * derived only from {@link hasFeatureAccess} (same rules as API feature guards).
 */
export function getFeaturesForTier(tier: TierName): Feature[] {
  return (Object.keys(FEATURE_TIER_MAP) as Feature[]).filter((feature) =>
    hasFeatureAccess(tier, feature, false),
  );
}

/** Alias of {@link getFeaturesForTier}; cumulative SKUs use the same access set. */
export function getAllFeaturesUpToTier(tier: TierName): Feature[] {
  return getFeaturesForTier(tier);
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

export const usageMetricsSchema = z.object({
  consultations: z.number().int().min(0),
  users: z.number().int().min(0),
  whatsappMessages: z.number().int().min(0),
});
export type UsageMetrics = z.infer<typeof usageMetricsSchema>;

const usageMeterSchema = z
  .object({
    current: z.number().int().min(0),
    included: z.number().int().min(0),
    overage: z.number().int().min(0),
  })
  .strict();

const usageChargeSchema = z
  .object({
    quantity: z.number().int().min(0),
    rate: z.number().min(0),
    charge: z.number().min(0),
  })
  .strict();

const usageWarningSchema = z
  .object({
    percentUsed: z.number().min(0),
    threshold: z.union([z.literal(80), z.literal(100)]).nullable(),
  })
  .strict();

export const currentUsageSchema = z
  .object({
    period: z.object({
      start: z.string(),
      end: z.string(),
    }),
    usage: z
      .object({
        consultations: z.number().int().min(0),
        users: z.number().int().min(0),
        whatsappMessages: z.number().int().min(0),
      })
      .strict(),
    included: z
      .object({
        consultations: z.number().int().min(0),
        users: z.number().int().min(0),
        whatsappMessages: z.number().int().min(0),
      })
      .strict(),
    overages: z
      .object({
        consultations: z.number().int().min(0),
        users: z.number().int().min(0),
        whatsappMessages: z.number().int().min(0),
      })
      .strict(),
    rates: z
      .object({
        consultations: z.number().min(0),
        users: z.number().min(0),
        whatsappMessages: z.number().min(0),
      })
      .strict(),
    breakdown: z
      .object({
        consultations: usageChargeSchema,
        users: usageChargeSchema,
        whatsappMessages: usageChargeSchema,
      })
      .strict(),
    total: z.number().min(0),
    meters: z
      .object({
        consultations: usageMeterSchema,
        users: usageMeterSchema,
        whatsappMessages: usageMeterSchema,
      })
      .strict(),
    warnings: z
      .object({
        consultations: usageWarningSchema,
        users: usageWarningSchema,
        whatsappMessages: usageWarningSchema,
      })
      .strict(),
    tier: z.string(),
  })
  .strict();
export type CurrentUsage = z.infer<typeof currentUsageSchema>;

export const WHATSAPP_INCLUDED_IN_PRO = 500;

export const PRO_OVERAGE_RATES_INR = {
  consultation: 2,
  user: 249,
  whatsappMessage: 0.75,
} as const;
