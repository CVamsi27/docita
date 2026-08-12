import {
  Feature,
  MODE_BLOCKED_FEATURES,
  PLAN_MODES,
  PUBLISHED_PLAN_LADDER,
  Tier,
  tierSupportsMode,
  type PlanMode,
} from "@workspace/types";

export const FEATURE_CATEGORIES: { label: string; features: Feature[] }[] = [
  {
    label: "Patient Records",
    features: [
      Feature.BASIC_PATIENT_MANAGEMENT,
      Feature.PATIENT_DEDUPLICATION,
      Feature.PAPER_SCANNING,
      Feature.EXCEL_IMPORT,
      Feature.EXPORT_CSV,
      Feature.DOCUMENT_ARCHIVAL,
      Feature.VISIT_HISTORY,
    ],
  },
  {
    label: "Clinical Workflows",
    features: [
      Feature.DIGITAL_PRESCRIPTIONS,
      Feature.MEDICINES_LIST,
      Feature.MEDICAL_CODING,
      Feature.PRESCRIPTION_TEMPLATES,
      Feature.DIGITAL_INTAKE_FORMS,
      Feature.FULL_EHR,
      Feature.LAB_TESTS,
      Feature.VACCINE_TRACKING,
      Feature.CONSENT_MANAGEMENT,
      Feature.DOCTOR_SIGNATURE,
    ],
  },
  {
    label: "Scheduling & Queues",
    features: [
      Feature.CALENDAR_SLOTS,
      Feature.AUTO_REMINDERS,
      Feature.QUEUE_MANAGEMENT,
    ],
  },
  {
    label: "Scanning",
    features: [Feature.OCR_BASIC, Feature.OCR_ADVANCED],
  },
  {
    label: "Billing & Payments",
    features: [
      Feature.INVOICING,
      Feature.PAYMENT_LINKS,
      Feature.INSURANCE_BILLING,
    ],
  },
  {
    label: "Communication",
    features: [Feature.WHATSAPP_MESSAGING, Feature.BROADCAST_CAMPAIGNS],
  },
  {
    label: "Team & Access Control",
    features: [
      Feature.MULTI_DEVICE,
      Feature.ROLE_MANAGEMENT,
      Feature.AUDIT_LOGS,
      Feature.SSO,
    ],
  },
  {
    label: "Analytics",
    features: [
      Feature.BASIC_ANALYTICS,
      Feature.ADVANCED_ANALYTICS,
      Feature.MULTI_LOCATION_ANALYTICS,
    ],
  },
  {
    label: "Scale & Integrations",
    features: [
      Feature.MULTI_DOCTOR,
      Feature.MULTI_CLINIC,
      Feature.INVENTORY,
      Feature.API_ACCESS,
      Feature.CUSTOM_BRANDING,
      Feature.DATA_WAREHOUSE_EXPORT,
      Feature.BULK_IMPORT_SUITE,
    ],
  },
  {
    label: "AI Features",
    features: [
      Feature.AI_PRESCRIPTION_ASSISTANT,
      Feature.AI_DIAGNOSIS_HINTS,
      Feature.SMART_TASK_ENGINE,
      Feature.PREDICTIVE_NO_SHOW,
      Feature.PATIENT_SEGMENTATION,
      Feature.ANOMALY_DETECTION,
    ],
  },
];

export const KEY_FEATURE_CATEGORIES = FEATURE_CATEGORIES.slice(0, 4);

// ---------------------------------------------------------------------------
// Plan-mode gating (Full / Front Desk / Core)
//
// Front Desk and Core are PlanModes layered on the 5 clinical tiers, not tiers
// of their own. These pure helpers drive which tier columns show and which
// features / limits are gated off in each mode, all from the canonical
// `@workspace/types` model so the table stays in sync with feature access.
// ---------------------------------------------------------------------------

export const COMPARISON_MODES: readonly PlanMode[] = PLAN_MODES;

/**
 * Tier columns for a mode: the published 5-tier ladder minus tiers the mode
 * doesn't support. Starter is Full-only, so it drops out of Front Desk / Core.
 */
export function comparisonTiersForMode(mode: PlanMode): Tier[] {
  return PUBLISHED_PLAN_LADDER.filter((name) =>
    tierSupportsMode(name, mode),
  ).map((name) => Tier[name]);
}

export function isFeatureBlockedInMode(
  feature: Feature,
  mode: PlanMode,
): boolean {
  return MODE_BLOCKED_FEATURES[mode].has(feature);
}

/**
 * Limit rows whose availability tracks a mode-gated capability. A row is blanked
 * to "—" when its representative feature is blocked in the active mode (e.g.
 * Prescriptions in Front Desk, WhatsApp messages in Core). Rows without an entry
 * here are always shown.
 */
const LIMIT_ROW_MODE_FEATURE: Record<string, Feature> = {
  Prescriptions: Feature.DIGITAL_PRESCRIPTIONS,
  "WhatsApp messages (incl. / mo)": Feature.WHATSAPP_MESSAGING,
};

export function isLimitRowBlockedInMode(
  rowName: string,
  mode: PlanMode,
): boolean {
  const feature = LIMIT_ROW_MODE_FEATURE[rowName];
  return feature !== undefined && isFeatureBlockedInMode(feature, mode);
}

export const LIMIT_ROW_DESCRIPTIONS: Record<string, string> = {
  "Patient Limit":
    "Maximum number of unique patient profiles you can actively manage in the plan",
  Doctors:
    "Maximum number of doctor accounts that can practice under this facility plan",
  Storage:
    "Total cloud storage included for files like scanned records, prescriptions, and reports",
  Branches:
    "Number of facility locations/branches you can operate under one subscription",
  Consultations:
    "Number of consultations included in the billing cycle before overage charges apply",
  Prescriptions:
    "Number of digital prescriptions included in the billing cycle",
  Invoices: "Number of invoices you can generate in the billing cycle",
  "WhatsApp messages (incl. / mo)":
    "WhatsApp messages included per calendar month before per-message overage applies (Essential and above)",
};
