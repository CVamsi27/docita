import { z } from "zod";

/**
 * =====================================================
 * TIER SYSTEM - Single Source of Truth
 * =====================================================
 * Docita Tier System for subscription management
 */

// Tier enum and schema
export const tierSchema = z.enum([
  "CAPTURE",
  "CORE", 
  "PLUS",
  "PRO",
  "ENTERPRISE",
  "INTELLIGENCE"
]);
export type TierName = z.infer<typeof tierSchema>;

// Tier numeric values for comparison
export enum Tier {
  CAPTURE = 0,
  CORE = 1,
  PLUS = 2,
  PRO = 3,
  ENTERPRISE = 4,
  INTELLIGENCE = 5,
}

// Feature enum
export enum Feature {
  // ======= Tier 0: CAPTURE (Free) =======
  PAPER_SCANNING = 'PAPER_SCANNING',
  EXCEL_IMPORT = 'EXCEL_IMPORT',
  PATIENT_DEDUPLICATION = 'PATIENT_DEDUPLICATION',
  BASIC_PATIENT_MANAGEMENT = 'BASIC_PATIENT_MANAGEMENT',
  DOCUMENT_ARCHIVAL = 'DOCUMENT_ARCHIVAL',
  EXPORT_CSV = 'EXPORT_CSV',
  OCR_BASIC = 'OCR_BASIC',

  // ======= Tier 1: CORE =======
  CALENDAR_SLOTS = 'CALENDAR_SLOTS',
  VISIT_HISTORY = 'VISIT_HISTORY',
  MEDICINES_LIST = 'MEDICINES_LIST',
  INVOICING = 'INVOICING',
  DIGITAL_PRESCRIPTIONS = 'DIGITAL_PRESCRIPTIONS',
  ONE_WAY_WHATSAPP = 'ONE_WAY_WHATSAPP',
  BASIC_ANALYTICS = 'BASIC_ANALYTICS',
  MEDICAL_CODING = 'MEDICAL_CODING',

  // ======= Tier 2: PLUS =======
  WHATSAPP_API = 'WHATSAPP_API',
  AUTO_REMINDERS = 'AUTO_REMINDERS',
  PAYMENT_LINKS = 'PAYMENT_LINKS',
  TWO_WAY_WHATSAPP = 'TWO_WAY_WHATSAPP',
  PRESCRIPTION_TEMPLATES = 'PRESCRIPTION_TEMPLATES',
  MULTI_DEVICE = 'MULTI_DEVICE',
  ROLE_MANAGEMENT = 'ROLE_MANAGEMENT',
  CONSENT_MANAGEMENT = 'CONSENT_MANAGEMENT',
  DOCTOR_SIGNATURE = 'DOCTOR_SIGNATURE',

  // ======= Tier 3: PRO =======
  MULTI_DOCTOR = 'MULTI_DOCTOR',
  MULTI_CLINIC = 'MULTI_CLINIC',
  LAB_TESTS = 'LAB_TESTS',
  INVENTORY = 'INVENTORY',
  QUEUE_MANAGEMENT = 'QUEUE_MANAGEMENT',
  AUDIT_LOGS = 'AUDIT_LOGS',
  INSURANCE_BILLING = 'INSURANCE_BILLING',
  DIGITAL_INTAKE_FORMS = 'DIGITAL_INTAKE_FORMS',
  BROADCAST_CAMPAIGNS = 'BROADCAST_CAMPAIGNS',
  OCR_ADVANCED = 'OCR_ADVANCED',
  ADVANCED_ANALYTICS = 'ADVANCED_ANALYTICS',

  // ======= Tier 4: ENTERPRISE =======
  FULL_EHR = 'FULL_EHR',
  API_ACCESS = 'API_ACCESS',
  MULTI_LOCATION_ANALYTICS = 'MULTI_LOCATION_ANALYTICS',
  CUSTOM_BRANDING = 'CUSTOM_BRANDING',
  DATA_WAREHOUSE_EXPORT = 'DATA_WAREHOUSE_EXPORT',
  SSO = 'SSO',
  WHATSAPP_CHATBOTS = 'WHATSAPP_CHATBOTS',
  BULK_IMPORT_SUITE = 'BULK_IMPORT_SUITE',

  // ======= Tier 5: INTELLIGENCE (Add-on) =======
  AI_PRESCRIPTION_ASSISTANT = 'AI_PRESCRIPTION_ASSISTANT',
  AI_DIAGNOSIS_HINTS = 'AI_DIAGNOSIS_HINTS',
  SMART_TASK_ENGINE = 'SMART_TASK_ENGINE',
  PREDICTIVE_NO_SHOW = 'PREDICTIVE_NO_SHOW',
  PATIENT_SEGMENTATION = 'PATIENT_SEGMENTATION',
  ANOMALY_DETECTION = 'ANOMALY_DETECTION',
}

export const featureSchema = z.nativeEnum(Feature);

/**
 * Mapping of features to their minimum required tier
 */
export const FEATURE_TIER_MAP: Record<Feature, Tier> = {
  // Tier 0: CAPTURE
  [Feature.PAPER_SCANNING]: Tier.CAPTURE,
  [Feature.EXCEL_IMPORT]: Tier.CAPTURE,
  [Feature.PATIENT_DEDUPLICATION]: Tier.CAPTURE,
  [Feature.BASIC_PATIENT_MANAGEMENT]: Tier.CAPTURE,
  [Feature.DOCUMENT_ARCHIVAL]: Tier.CAPTURE,
  [Feature.EXPORT_CSV]: Tier.CAPTURE,
  [Feature.OCR_BASIC]: Tier.CAPTURE,

  // Tier 1: CORE
  [Feature.CALENDAR_SLOTS]: Tier.CORE,
  [Feature.VISIT_HISTORY]: Tier.CORE,
  [Feature.MEDICINES_LIST]: Tier.CORE,
  [Feature.INVOICING]: Tier.CORE,
  [Feature.DIGITAL_PRESCRIPTIONS]: Tier.CORE,
  [Feature.ONE_WAY_WHATSAPP]: Tier.CORE,
  [Feature.BASIC_ANALYTICS]: Tier.CORE,
  [Feature.MEDICAL_CODING]: Tier.CORE,

  // Tier 2: PLUS
  [Feature.WHATSAPP_API]: Tier.PLUS,
  [Feature.AUTO_REMINDERS]: Tier.PLUS,
  [Feature.PAYMENT_LINKS]: Tier.PLUS,
  [Feature.TWO_WAY_WHATSAPP]: Tier.PLUS,
  [Feature.PRESCRIPTION_TEMPLATES]: Tier.PLUS,
  [Feature.MULTI_DEVICE]: Tier.PLUS,
  [Feature.ROLE_MANAGEMENT]: Tier.PLUS,
  [Feature.CONSENT_MANAGEMENT]: Tier.PLUS,
  [Feature.DOCTOR_SIGNATURE]: Tier.PLUS,

  // Tier 3: PRO
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

  // Tier 4: ENTERPRISE
  [Feature.FULL_EHR]: Tier.ENTERPRISE,
  [Feature.API_ACCESS]: Tier.ENTERPRISE,
  [Feature.MULTI_LOCATION_ANALYTICS]: Tier.ENTERPRISE,
  [Feature.CUSTOM_BRANDING]: Tier.ENTERPRISE,
  [Feature.DATA_WAREHOUSE_EXPORT]: Tier.ENTERPRISE,
  [Feature.SSO]: Tier.ENTERPRISE,
  [Feature.WHATSAPP_CHATBOTS]: Tier.ENTERPRISE,
  [Feature.BULK_IMPORT_SUITE]: Tier.ENTERPRISE,

  // Tier 5: INTELLIGENCE (Add-on)
  [Feature.AI_PRESCRIPTION_ASSISTANT]: Tier.INTELLIGENCE,
  [Feature.AI_DIAGNOSIS_HINTS]: Tier.INTELLIGENCE,
  [Feature.SMART_TASK_ENGINE]: Tier.INTELLIGENCE,
  [Feature.PREDICTIVE_NO_SHOW]: Tier.INTELLIGENCE,
  [Feature.PATIENT_SEGMENTATION]: Tier.INTELLIGENCE,
  [Feature.ANOMALY_DETECTION]: Tier.INTELLIGENCE,
};

// =====================================================
// TIER PRICING
// =====================================================

export const tierPricingSchema = z.object({
  monthly: z.union([z.number(), z.literal('custom')]),
  yearly: z.union([z.number(), z.literal('custom')]),
  currency: z.string(),
});
export type TierPricing = z.infer<typeof tierPricingSchema>;

export const TIER_PRICING: Record<TierName, TierPricing> = {
  CAPTURE: { monthly: 0, yearly: 0, currency: '₹' },
  CORE: { monthly: 999, yearly: 10790, currency: '₹' },
  PLUS: { monthly: 2499, yearly: 26990, currency: '₹' },
  PRO: { monthly: 4999, yearly: 53990, currency: '₹' },
  ENTERPRISE: { monthly: 'custom', yearly: 'custom', currency: '₹' },
  INTELLIGENCE: { monthly: 2999, yearly: 32390, currency: '₹' },
};

export const ANNUAL_DISCOUNT_PERCENT = 10;

// =====================================================
// TIER LIMITS
// =====================================================

export const tierLimitsSchema = z.object({
  patients: z.number(),
  doctors: z.number(),
  storageGB: z.number(),
  branches: z.number(),
});
export type TierLimits = z.infer<typeof tierLimitsSchema>;

export const TIER_LIMITS: Record<TierName, TierLimits> = {
  CAPTURE: { patients: 100, doctors: 1, storageGB: 1, branches: 1 },
  CORE: { patients: 500, doctors: 1, storageGB: 2, branches: 1 },
  PLUS: { patients: 2000, doctors: 3, storageGB: 5, branches: 1 },
  PRO: { patients: 10000, doctors: 999, storageGB: 20, branches: 3 },
  ENTERPRISE: { patients: 999999, doctors: 999, storageGB: 100, branches: 999 },
  INTELLIGENCE: { patients: 999999, doctors: 999, storageGB: 100, branches: 999 },
};

// =====================================================
// TIER INFO
// =====================================================

export const tierInfoSchema = z.object({
  name: z.string(),
  description: z.string(),
  tagline: z.string(),
  color: z.string(),
});
export type TierInfo = z.infer<typeof tierInfoSchema>;

export const TIER_INFO: Record<TierName, TierInfo> = {
  CAPTURE: {
    name: 'Docita Capture',
    description: 'Perfect for getting started with digitization',
    tagline: 'Free forever',
    color: 'gray',
  },
  CORE: {
    name: 'Docita Core',
    description: 'Essential features for small clinics',
    tagline: 'Solo Clinic Essentials',
    color: 'blue',
  },
  PLUS: {
    name: 'Docita Plus',
    description: 'Advanced features for growing clinics',
    tagline: 'WhatsApp Automation',
    color: 'green',
  },
  PRO: {
    name: 'Docita Pro',
    description: 'Full-featured solution for professional clinics',
    tagline: 'Multi-Doctor Clinics',
    color: 'purple',
  },
  ENTERPRISE: {
    name: 'Docita Enterprise',
    description: 'Hospital-grade solution with full customization',
    tagline: 'Hospital-Grade System',
    color: 'orange',
  },
  INTELLIGENCE: {
    name: 'Docita Intelligence',
    description: 'AI-powered features to enhance your clinic',
    tagline: 'AI-Powered Add-on',
    color: 'pink',
  },
};

// =====================================================
// FEATURE DISPLAY
// =====================================================

export const featureDisplaySchema = z.object({
  name: z.string(),
  description: z.string(),
});
export type FeatureDisplay = z.infer<typeof featureDisplaySchema>;

export const FEATURE_DISPLAY: Record<Feature, FeatureDisplay> = {
  // Tier 0: CAPTURE
  [Feature.PAPER_SCANNING]: { name: 'Paper Scanning', description: 'Scan documents with your camera' },
  [Feature.EXCEL_IMPORT]: { name: 'Excel Import', description: 'Import patient data from Excel/CSV' },
  [Feature.PATIENT_DEDUPLICATION]: { name: 'Patient Deduplication', description: 'Automatic duplicate detection' },
  [Feature.BASIC_PATIENT_MANAGEMENT]: { name: 'Patient Management', description: 'Basic patient records' },
  [Feature.DOCUMENT_ARCHIVAL]: { name: 'Document Archival', description: 'Store and organize documents' },
  [Feature.EXPORT_CSV]: { name: 'CSV Export', description: 'Export data to CSV' },
  [Feature.OCR_BASIC]: { name: 'Basic OCR', description: 'Extract text from images' },

  // Tier 1: CORE
  [Feature.CALENDAR_SLOTS]: { name: 'Appointments', description: 'Schedule and manage appointments' },
  [Feature.VISIT_HISTORY]: { name: 'Visit History', description: 'Track patient visit history' },
  [Feature.MEDICINES_LIST]: { name: 'Medicine Database', description: 'Search and add medicines' },
  [Feature.INVOICING]: { name: 'Invoicing', description: 'Create and manage invoices' },
  [Feature.DIGITAL_PRESCRIPTIONS]: { name: 'Digital Prescriptions', description: 'Create digital prescriptions' },
  [Feature.ONE_WAY_WHATSAPP]: { name: 'WhatsApp Notifications', description: 'Send appointment reminders' },
  [Feature.BASIC_ANALYTICS]: { name: 'Basic Analytics', description: 'View clinic statistics' },
  [Feature.MEDICAL_CODING]: { name: 'Medical Coding', description: 'ICD/CPT code management' },

  // Tier 2: PLUS
  [Feature.WHATSAPP_API]: { name: 'WhatsApp API', description: 'Full WhatsApp Business integration' },
  [Feature.AUTO_REMINDERS]: { name: 'Auto Reminders', description: 'Automated appointment reminders' },
  [Feature.PAYMENT_LINKS]: { name: 'Payment Links', description: 'Send payment links via WhatsApp' },
  [Feature.TWO_WAY_WHATSAPP]: { name: 'Two-Way WhatsApp', description: 'Receive patient messages' },
  [Feature.PRESCRIPTION_TEMPLATES]: { name: 'Prescription Templates', description: 'Save and reuse templates' },
  [Feature.MULTI_DEVICE]: { name: 'Multi-Device', description: 'Access from multiple devices' },
  [Feature.ROLE_MANAGEMENT]: { name: 'Role Management', description: 'Manage staff roles and permissions' },
  [Feature.CONSENT_MANAGEMENT]: { name: 'Consent Management', description: 'Digital consent forms' },
  [Feature.DOCTOR_SIGNATURE]: { name: 'Digital Signature', description: 'Add signature to prescriptions' },

  // Tier 3: PRO
  [Feature.MULTI_DOCTOR]: { name: 'Multi-Doctor', description: 'Support for multiple doctors' },
  [Feature.MULTI_CLINIC]: { name: 'Multi-Clinic', description: 'Manage multiple clinic locations' },
  [Feature.LAB_TESTS]: { name: 'Lab Integration', description: 'Order and track lab tests' },
  [Feature.INVENTORY]: { name: 'Inventory', description: 'Manage medicine inventory' },
  [Feature.QUEUE_MANAGEMENT]: { name: 'Queue Management', description: 'Digital token system' },
  [Feature.AUDIT_LOGS]: { name: 'Audit Logs', description: 'Track all system activities' },
  [Feature.INSURANCE_BILLING]: { name: 'Insurance Billing', description: 'Insurance claim management' },
  [Feature.DIGITAL_INTAKE_FORMS]: { name: 'Intake Forms', description: 'Digital patient intake forms' },
  [Feature.BROADCAST_CAMPAIGNS]: { name: 'Broadcast Campaigns', description: 'Send bulk messages' },
  [Feature.OCR_ADVANCED]: { name: 'Advanced OCR', description: 'AI-powered document extraction' },
  [Feature.ADVANCED_ANALYTICS]: { name: 'Advanced Analytics', description: 'Detailed reports and insights' },

  // Tier 4: ENTERPRISE
  [Feature.FULL_EHR]: { name: 'Full EHR', description: 'Complete electronic health records' },
  [Feature.API_ACCESS]: { name: 'API Access', description: 'Access to Docita API' },
  [Feature.MULTI_LOCATION_ANALYTICS]: { name: 'Multi-Location Analytics', description: 'Analytics across branches' },
  [Feature.CUSTOM_BRANDING]: { name: 'Custom Branding', description: 'White-label with your brand' },
  [Feature.DATA_WAREHOUSE_EXPORT]: { name: 'Data Export', description: 'Export to data warehouse' },
  [Feature.SSO]: { name: 'Single Sign-On', description: 'Enterprise SSO integration' },
  [Feature.WHATSAPP_CHATBOTS]: { name: 'WhatsApp Chatbots', description: 'AI-powered chatbots' },
  [Feature.BULK_IMPORT_SUITE]: { name: 'Bulk Import Suite', description: 'Advanced bulk data import' },

  // Tier 5: INTELLIGENCE
  [Feature.AI_PRESCRIPTION_ASSISTANT]: { name: 'AI Prescription Assistant', description: 'AI-powered prescription suggestions' },
  [Feature.AI_DIAGNOSIS_HINTS]: { name: 'AI Diagnosis Hints', description: 'AI-powered diagnosis suggestions' },
  [Feature.SMART_TASK_ENGINE]: { name: 'Smart Tasks', description: 'AI-powered task automation' },
  [Feature.PREDICTIVE_NO_SHOW]: { name: 'No-Show Prediction', description: 'Predict appointment no-shows' },
  [Feature.PATIENT_SEGMENTATION]: { name: 'Patient Segmentation', description: 'AI-powered patient grouping' },
  [Feature.ANOMALY_DETECTION]: { name: 'Anomaly Detection', description: 'Detect unusual patterns' },
};

// =====================================================
// INTELLIGENCE ADD-ONS
// =====================================================

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
    name: 'AI Diagnosis Assist',
    description: 'Get AI-powered diagnosis suggestions based on symptoms',
    monthlyPrice: 1999,
    icon: 'Brain',
  },
  {
    feature: Feature.AI_PRESCRIPTION_ASSISTANT,
    name: 'AI Prescription Assistant',
    description: 'Smart prescription suggestions and drug interactions',
    monthlyPrice: 999,
    icon: 'Pill',
  },
  {
    feature: Feature.SMART_TASK_ENGINE,
    name: 'Smart Task Engine',
    description: 'AI-powered workflow automation and reminders',
    monthlyPrice: 1499,
    icon: 'Bot',
  },
];

export const INTELLIGENCE_BUNDLE_DISCOUNT = 0.4; // 40% discount

// =====================================================
// TIER FEATURES LIST
// =====================================================

export const TIER_FEATURES: Record<TierName, string[]> = {
  CAPTURE: [
    'Up to 100 patients',
    'Paper record scanning & archival',
    'Excel import with column mapping',
    'Patient deduplication',
    'Document storage',
    'Export to CSV/Excel',
    'Single doctor',
  ],
  CORE: [
    'Everything in Capture',
    'Up to 500 patients',
    'Calendar & appointment scheduling',
    'Patient profiles & visit history',
    'Digital prescriptions with PDF',
    'Invoicing & billing',
    'One-way WhatsApp messaging',
    'Basic analytics dashboard',
    'Email support',
  ],
  PLUS: [
    'Everything in Core',
    'Up to 2,000 patients',
    'Full WhatsApp Business API',
    'Automated appointment reminders',
    'Payment links via WhatsApp',
    'Two-way WhatsApp flows',
    'Prescription templates',
    'Multi-device staff login (3 users)',
    'Role-based access controls',
    'Basic OCR for documents',
    'Medical coding (ICD-10/CPT)',
    'Phone support',
  ],
  PRO: [
    'Everything in Plus',
    'Up to 10,000 patients',
    'Multi-doctor calendar',
    'Multi-clinic branching',
    'Lab tests catalog & tracking',
    'Inventory & pharmacy module',
    'Token queue management',
    'Audit logs & compliance',
    'Digital intake forms',
    'WhatsApp broadcast campaigns',
    'Advanced OCR with AI',
    'Advanced medical coding',
    'Priority support',
  ],
  ENTERPRISE: [
    'Everything in Pro',
    'Unlimited patients & doctors',
    'Full EHR capabilities',
    'API access for integrations',
    'Multi-location analytics',
    'Custom branding & white-label',
    'Data warehouse export',
    'SSO & advanced security',
    'WhatsApp chatbots',
    'Bulk import suite',
    'ABDM integration ready',
    'Dedicated account manager',
    'SLA guarantee',
  ],
  INTELLIGENCE: [
    'AI prescription assistant',
    'Diagnosis suggestions (non-clinical)',
    'Smart task automation',
    'Predictive no-show model',
    'Patient risk segmentation',
    'Anomaly detection in analytics',
    'Voice-to-text dictation',
  ],
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Get the numeric tier value from a tier name
 */
export function getTierValue(tierName: TierName): Tier {
  return Tier[tierName];
}

/**
 * Get the tier name from a numeric tier value
 */
export function getTierName(tier: Tier): TierName {
  return Tier[tier] as TierName;
}

/**
 * Check if a feature is available for a given tier
 */
export function hasFeatureAccess(tier: TierName, feature: Feature, hasIntelligence = false): boolean {
  const requiredTier = FEATURE_TIER_MAP[feature];
  
  if (requiredTier === Tier.INTELLIGENCE) {
    return hasIntelligence;
  }
  
  return getTierValue(tier) >= requiredTier;
}

/**
 * Get features for a specific tier
 */
export function getFeaturesForTier(tier: TierName): Feature[] {
  const tierValue = getTierValue(tier);
  return Object.entries(FEATURE_TIER_MAP)
    .filter(([, requiredTier]) => requiredTier === tierValue)
    .map(([feature]) => feature as Feature);
}

/**
 * Get all features available up to and including a tier
 */
export function getAllFeaturesUpToTier(tier: TierName): Feature[] {
  const tierValue = getTierValue(tier);
  return Object.entries(FEATURE_TIER_MAP)
    .filter(([, requiredTier]) => requiredTier <= tierValue)
    .map(([feature]) => feature as Feature);
}

/**
 * Get intelligence bundle price with discount
 */
export function getIntelligenceBundlePrice(): number {
  const totalPrice = INTELLIGENCE_ADDONS.reduce((sum, addon) => sum + addon.monthlyPrice, 0);
  return Math.round(totalPrice * (1 - INTELLIGENCE_BUNDLE_DISCOUNT));
}

/**
 * Get tier info by tier (numeric or string)
 */
export function getTierInfo(tier: Tier | TierName): TierInfo {
  const tierName = typeof tier === 'number' ? getTierName(tier) : tier;
  return TIER_INFO[tierName];
}

/**
 * Get tier pricing by tier (numeric or string)
 */
export function getTierPricing(tier: Tier | TierName): TierPricing {
  const tierName = typeof tier === 'number' ? getTierName(tier) : tier;
  return TIER_PRICING[tierName];
}

/**
 * Get tier limits by tier (numeric or string)
 */
export function getTierLimits(tier: Tier | TierName): TierLimits {
  const tierName = typeof tier === 'number' ? getTierName(tier) : tier;
  return TIER_LIMITS[tierName];
}

/**
 * Get tier features by tier (numeric or string)
 */
export function getTierFeaturesList(tier: Tier | TierName): string[] {
  const tierName = typeof tier === 'number' ? getTierName(tier) : tier;
  return TIER_FEATURES[tierName];
}
