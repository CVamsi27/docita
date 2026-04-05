import { Feature, Tier } from "../billing/tier";
import type { UserRole } from "../shared/users";

export type AccessMode = "read" | "write";

export type AppPermission =
  | "manageStaff"
  | "manageClinic"
  | "startConsultation"
  | "viewPatients"
  | "createPatient"
  | "editPatient"
  | "deletePatient"
  | "viewAppointments"
  | "createAppointment"
  | "manageBilling"
  | "viewInvoices"
  | "createInvoice"
  | "viewPrescriptions"
  | "createPrescription"
  | "viewReports"
  | "manageInventory"
  | "manageTemplates"
  | "exportData"
  | "viewPlatformAnalytics"
  | "viewSystemLogs"
  | "manageTenants";

export interface AccessRequirement {
  roles?: UserRole[];
  permissions?: AppPermission[];
}

export interface AccessPolicy {
  read?: AccessRequirement;
  write?: AccessRequirement;
  feature?: Feature;
  tier?: Tier;
  comingSoon?: boolean;
}

export const APP_ACCESS_TARGETS = {
  PAGE_DASHBOARD: "page.dashboard",
  PAGE_PATIENTS: "page.patients",
  PAGE_APPOINTMENTS: "page.appointments",
  PAGE_CONSULTATION: "page.consultation",
  PAGE_PRESCRIPTIONS: "page.prescriptions",
  PAGE_LAB_TESTS: "page.lab-tests",
  PAGE_INVOICES: "page.invoices",
  PAGE_INVENTORY: "page.inventory",
  PAGE_DOCUMENTS: "page.documents",
  PAGE_ANALYTICS: "page.analytics",
  PAGE_CODING_QUEUE: "page.coding-queue",
  PAGE_IMPORT: "page.import",
  PAGE_WHATSAPP: "page.whatsapp",
  PAGE_AI_ASSISTANT: "page.ai-assistant",
  PAGE_SPECIALTY: "page.specialty",
  PAGE_HOSPITAL: "page.hospital",
  PAGE_PROFILE: "page.profile",
  PAGE_SETTINGS: "page.settings",
  PAGE_UPGRADE: "page.upgrade",
  PAGE_SETTINGS_SUBSCRIPTION: "page.settings.subscription",

  API_SUBSCRIPTION_BILLING: "api.subscription.billing",
  API_ANALYTICS: "api.analytics",
  API_APPOINTMENTS: "api.appointments",
  API_MEDICAL_CODING: "api.medical-coding",
  API_INVENTORY: "api.inventory",
  API_QUEUE: "api.queue",
  API_MEDICAL_DOCUMENTS: "api.medical-documents",
  API_WHATSAPP: "api.whatsapp",
  API_LAB_TESTS: "api.lab-tests",
} as const;

export type AppAccessTarget =
  (typeof APP_ACCESS_TARGETS)[keyof typeof APP_ACCESS_TARGETS];

const ALL_STAFF_ROLES: UserRole[] = [
  "ADMIN",
  "ADMIN_DOCTOR",
  "DOCTOR",
  "RECEPTIONIST",
];

const ADMIN_BILLING_ROLES: UserRole[] = ["ADMIN", "ADMIN_DOCTOR"];
const CLINICAL_CODING_ROLES: UserRole[] = ["ADMIN", "ADMIN_DOCTOR", "DOCTOR"];
const ANALYTICS_ROLES: UserRole[] = ["ADMIN", "ADMIN_DOCTOR", "DOCTOR"];
const IMPORT_ROLES: UserRole[] = ["ADMIN", "ADMIN_DOCTOR", "SUPER_ADMIN"];

export const APP_ACCESS_MATRIX: Record<AppAccessTarget, AccessPolicy> = {
  [APP_ACCESS_TARGETS.PAGE_DASHBOARD]: {
    read: { roles: ALL_STAFF_ROLES },
  },
  [APP_ACCESS_TARGETS.PAGE_SETTINGS]: {
    read: { roles: ALL_STAFF_ROLES },
  },
  [APP_ACCESS_TARGETS.PAGE_PROFILE]: {
    read: { roles: ALL_STAFF_ROLES },
  },
  [APP_ACCESS_TARGETS.PAGE_PATIENTS]: {
    read: { roles: ALL_STAFF_ROLES },
    feature: Feature.BASIC_PATIENT_MANAGEMENT,
  },
  [APP_ACCESS_TARGETS.PAGE_APPOINTMENTS]: {
    read: { roles: ALL_STAFF_ROLES },
    feature: Feature.CALENDAR_SLOTS,
  },
  [APP_ACCESS_TARGETS.PAGE_CONSULTATION]: {
    read: { roles: ALL_STAFF_ROLES },
    feature: Feature.CALENDAR_SLOTS,
  },
  [APP_ACCESS_TARGETS.PAGE_PRESCRIPTIONS]: {
    read: { roles: ALL_STAFF_ROLES },
    feature: Feature.DIGITAL_PRESCRIPTIONS,
  },
  [APP_ACCESS_TARGETS.PAGE_LAB_TESTS]: {
    read: { roles: ALL_STAFF_ROLES },
    feature: Feature.LAB_TESTS,
  },
  [APP_ACCESS_TARGETS.PAGE_INVOICES]: {
    read: { roles: ALL_STAFF_ROLES },
    feature: Feature.INVOICING,
  },
  [APP_ACCESS_TARGETS.PAGE_INVENTORY]: {
    read: { roles: ALL_STAFF_ROLES },
    feature: Feature.INVENTORY,
  },
  [APP_ACCESS_TARGETS.PAGE_DOCUMENTS]: {
    read: { roles: ALL_STAFF_ROLES },
    feature: Feature.DOCUMENT_ARCHIVAL,
  },
  [APP_ACCESS_TARGETS.PAGE_ANALYTICS]: {
    read: { roles: ANALYTICS_ROLES },
    feature: Feature.BASIC_ANALYTICS,
  },
  [APP_ACCESS_TARGETS.PAGE_CODING_QUEUE]: {
    read: { roles: CLINICAL_CODING_ROLES },
    feature: Feature.MEDICAL_CODING,
  },
  [APP_ACCESS_TARGETS.PAGE_IMPORT]: {
    read: { roles: IMPORT_ROLES },
    feature: Feature.EXCEL_IMPORT,
  },
  [APP_ACCESS_TARGETS.PAGE_WHATSAPP]: {
    read: { roles: ALL_STAFF_ROLES },
    feature: Feature.WHATSAPP_MESSAGING,
  },
  [APP_ACCESS_TARGETS.PAGE_SPECIALTY]: {
    read: { roles: ALL_STAFF_ROLES },
    feature: Feature.CALENDAR_SLOTS,
  },
  [APP_ACCESS_TARGETS.PAGE_HOSPITAL]: {
    read: { roles: ALL_STAFF_ROLES },
    feature: Feature.FULL_EHR,
    comingSoon: true,
  },
  [APP_ACCESS_TARGETS.PAGE_AI_ASSISTANT]: {
    read: { roles: CLINICAL_CODING_ROLES },
    feature: Feature.AI_PRESCRIPTION_ASSISTANT,
    comingSoon: true,
  },
  [APP_ACCESS_TARGETS.PAGE_UPGRADE]: {
    read: { roles: ADMIN_BILLING_ROLES, permissions: ["manageBilling"] },
  },
  [APP_ACCESS_TARGETS.PAGE_SETTINGS_SUBSCRIPTION]: {
    read: { roles: ADMIN_BILLING_ROLES, permissions: ["manageBilling"] },
  },

  [APP_ACCESS_TARGETS.API_SUBSCRIPTION_BILLING]: {
    read: { roles: ADMIN_BILLING_ROLES },
    write: { roles: ADMIN_BILLING_ROLES },
  },
  [APP_ACCESS_TARGETS.API_ANALYTICS]: {
    read: { roles: ANALYTICS_ROLES },
    write: { roles: ANALYTICS_ROLES },
    feature: Feature.BASIC_ANALYTICS,
  },
  [APP_ACCESS_TARGETS.API_APPOINTMENTS]: {
    read: { roles: ALL_STAFF_ROLES },
    write: { roles: ALL_STAFF_ROLES },
    feature: Feature.CALENDAR_SLOTS,
  },
  [APP_ACCESS_TARGETS.API_MEDICAL_CODING]: {
    read: { roles: CLINICAL_CODING_ROLES },
    write: { roles: CLINICAL_CODING_ROLES },
    feature: Feature.MEDICAL_CODING,
  },
  [APP_ACCESS_TARGETS.API_INVENTORY]: {
    read: { roles: ALL_STAFF_ROLES },
    write: { roles: ALL_STAFF_ROLES },
    feature: Feature.INVENTORY,
  },
  [APP_ACCESS_TARGETS.API_QUEUE]: {
    read: { roles: ALL_STAFF_ROLES },
    write: { roles: ALL_STAFF_ROLES },
    feature: Feature.QUEUE_MANAGEMENT,
  },
  [APP_ACCESS_TARGETS.API_MEDICAL_DOCUMENTS]: {
    read: { roles: ALL_STAFF_ROLES },
    write: { roles: ALL_STAFF_ROLES },
    feature: Feature.DOCUMENT_ARCHIVAL,
  },
  [APP_ACCESS_TARGETS.API_WHATSAPP]: {
    read: { roles: ALL_STAFF_ROLES },
    write: { roles: ALL_STAFF_ROLES },
    feature: Feature.WHATSAPP_MESSAGING,
  },
  [APP_ACCESS_TARGETS.API_LAB_TESTS]: {
    read: { roles: ALL_STAFF_ROLES },
    write: { roles: ALL_STAFF_ROLES },
    feature: Feature.LAB_TESTS,
  },
};

export function getAccessRequirement(
  target: AppAccessTarget,
  mode: AccessMode = "read",
): AccessRequirement {
  const policy = APP_ACCESS_MATRIX[target];
  if (mode === "write") {
    return policy.write ?? policy.read ?? {};
  }
  return policy.read ?? {};
}

export function getAccessRoles(
  target: AppAccessTarget,
  mode: AccessMode = "read",
): UserRole[] {
  return getAccessRequirement(target, mode).roles ?? [];
}

export function getAccessPermissions(
  target: AppAccessTarget,
  mode: AccessMode = "read",
): AppPermission[] {
  return getAccessRequirement(target, mode).permissions ?? [];
}

export function getAccessFeature(target: AppAccessTarget): Feature | undefined {
  return APP_ACCESS_MATRIX[target].feature;
}

export function getAccessTier(target: AppAccessTarget): Tier | undefined {
  return APP_ACCESS_MATRIX[target].tier;
}

export function isAccessComingSoon(target: AppAccessTarget): boolean {
  return APP_ACCESS_MATRIX[target].comingSoon === true;
}
