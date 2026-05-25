import { Feature, Tier } from "../billing/tier";
import type { UserRole } from "../shared/users";

export type AccessMode = "read" | "write";

export const APP_PERMISSIONS = [
  "manageStaff",
  "manageClinic",
  "startConsultation",
  "viewPatients",
  "createPatient",
  "editPatient",
  "deletePatient",
  "viewAppointments",
  "createAppointment",
  "manageBilling",
  "viewInvoices",
  "createInvoice",
  "viewPrescriptions",
  "createPrescription",
  "viewReports",
  "manageInventory",
  "manageTemplates",
  "exportData",
  "viewPlatformAnalytics",
  "viewSystemLogs",
  "manageTenants",
] as const;

export type AppPermission = (typeof APP_PERMISSIONS)[number];

export const APP_PERMISSIONS_BY_ROLE: Record<UserRole, AppPermission[]> = {
  INTERNAL: [],
  ADMIN: [
    "manageStaff",
    "manageClinic",
    "viewPatients",
    "createPatient",
    "editPatient",
    "deletePatient",
    "viewAppointments",
    "createAppointment",
    "manageBilling",
    "viewInvoices",
    "createInvoice",
    "viewPrescriptions",
    "viewReports",
    "manageInventory",
    "manageTemplates",
    "exportData",
  ],
  ADMIN_DOCTOR: [
    "manageStaff",
    "manageClinic",
    "viewPatients",
    "createPatient",
    "editPatient",
    "deletePatient",
    "viewAppointments",
    "createAppointment",
    "manageBilling",
    "viewInvoices",
    "createInvoice",
    "viewReports",
    "manageInventory",
    "manageTemplates",
    "exportData",
    "startConsultation",
    "viewPrescriptions",
    "createPrescription",
  ],
  DOCTOR: [
    "startConsultation",
    "viewPatients",
    "createPatient",
    "editPatient",
    "viewAppointments",
    "createAppointment",
    "viewPrescriptions",
    "createPrescription",
  ],
  NURSE: [
    "viewPatients",
    "editPatient",
    "viewAppointments",
    "createAppointment",
    "viewPrescriptions",
  ],
  RECEPTIONIST: [
    "viewPatients",
    "createPatient",
    "editPatient",
    "viewAppointments",
    "createAppointment",
    "viewInvoices",
    "createInvoice",
    "viewPrescriptions",
  ],
  PATIENT: ["viewAppointments"],
};

export function hasAppPermission(
  role: UserRole | null | undefined,
  permission: AppPermission,
): boolean {
  if (!role) return false;
  if (role === "INTERNAL") return true;
  return APP_PERMISSIONS_BY_ROLE[role].includes(permission);
}

export function hasAnyAppPermission(
  role: UserRole | null | undefined,
  permissions: AppPermission[],
): boolean {
  if (!role) return false;
  return permissions.some((permission) => hasAppPermission(role, permission));
}

export function hasAllAppPermissions(
  role: UserRole | null | undefined,
  permissions: AppPermission[],
): boolean {
  if (!role) return false;
  return permissions.every((permission) =>
    hasAppPermission(role, permission),
  );
}

export const CLINIC_ADMIN_ROLES = new Set<UserRole>([
  "ADMIN",
  "ADMIN_DOCTOR",
]);
export const BILLING_ROLES = new Set<UserRole>(["ADMIN", "ADMIN_DOCTOR"]);

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
  /** Front-desk cash / POS / UPI recording (not payment links or subscription billing). */
  PAGE_DESK_PAYMENT: "page.desk-payment",
  /** Live OPD floor panel for the front desk: now-serving token, queue, recently completed.
      Multi-doctor/multi-branch readout — gated to Hospital/Enterprise. */
  PAGE_DESK_FLOOR: "page.desk-floor",
  PAGE_INVENTORY: "page.inventory",
  PAGE_DOCUMENTS: "page.documents",
  PAGE_ANALYTICS: "page.analytics",
  PAGE_CODING_QUEUE: "page.coding-queue",
  PAGE_IMPORT: "page.import",
  PAGE_WHATSAPP: "page.whatsapp",
  PAGE_WHATSAPP_SENDER: "page.whatsapp.sender",
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
  /** In-app staff notifications (appointments, requests, etc.); not WhatsApp-only. */
  API_STAFF_NOTIFICATIONS: "api.staff-notifications",
  API_MEDICAL_CODING: "api.medical-coding",
  API_INVENTORY: "api.inventory",
  API_QUEUE: "api.queue",
  API_MEDICAL_DOCUMENTS: "api.medical-documents",
  API_WHATSAPP: "api.whatsapp",
  API_WHATSAPP_SENDER: "api.whatsapp.sender",
  API_LAB_TESTS: "api.lab-tests",
  API_PATIENTS: "api.patients",
  API_PATIENTS_READ: "api.patients.read",
  API_PATIENTS_WRITE: "api.patients.write",
  API_PATIENT_TIMELINE: "api.patient-timeline",
  API_PATIENT_METRICS: "api.patient-metrics",
  API_DOCTORS: "api.doctors",
  API_PRESCRIPTIONS: "api.prescriptions",
  API_INVOICES: "api.invoices",
  API_PAYMENTS: "api.payments",
  /** Desk invoice settlement (cash / terminal); separate from `API_PAYMENTS` (links / gateway). */
  API_DESK_INVOICE_SETTLEMENT: "api.desk.invoice-settlement",
} as const;

export type AppAccessTarget =
  (typeof APP_ACCESS_TARGETS)[keyof typeof APP_ACCESS_TARGETS];

const DASHBOARD_ROLES: UserRole[] = [
  "ADMIN",
  "ADMIN_DOCTOR",
  "DOCTOR",
  "NURSE",
  "RECEPTIONIST",
];
const SETTINGS_ROLES: UserRole[] = [
  "ADMIN",
  "ADMIN_DOCTOR",
  "DOCTOR",
  "RECEPTIONIST",
];
const CARE_COORDINATION_ROLES: UserRole[] = [
  "ADMIN",
  "ADMIN_DOCTOR",
  "DOCTOR",
  "NURSE",
  "RECEPTIONIST",
];
const CLINICAL_SUPPORT_ROLES: UserRole[] = [
  "ADMIN",
  "ADMIN_DOCTOR",
  "DOCTOR",
  "NURSE",
];
const ADMIN_BILLING_ROLES: UserRole[] = ["ADMIN", "ADMIN_DOCTOR"];
// Prescription authorship is a clinical act — non-clinical ADMIN cannot
// author Rx. ADMIN_DOCTOR can because they are also a practicing doctor.
const PRESCRIPTION_ROLES: UserRole[] = ["ADMIN_DOCTOR", "DOCTOR"];
const CLINICAL_CODING_ROLES: UserRole[] = ["ADMIN_DOCTOR", "DOCTOR"];
const ANALYTICS_ROLES: UserRole[] = ["ADMIN", "ADMIN_DOCTOR", "DOCTOR"];
const IMPORT_ROLES: UserRole[] = ["ADMIN", "ADMIN_DOCTOR", "INTERNAL"];

export const APP_ACCESS_MATRIX: Record<AppAccessTarget, AccessPolicy> = {
  [APP_ACCESS_TARGETS.PAGE_DASHBOARD]: {
    read: { roles: DASHBOARD_ROLES },
  },
  [APP_ACCESS_TARGETS.PAGE_SETTINGS]: {
    read: { roles: SETTINGS_ROLES },
  },
  [APP_ACCESS_TARGETS.PAGE_PROFILE]: {
    read: { roles: DASHBOARD_ROLES },
  },
  [APP_ACCESS_TARGETS.PAGE_PATIENTS]: {
    read: { roles: CARE_COORDINATION_ROLES },
    feature: Feature.BASIC_PATIENT_MANAGEMENT,
  },
  [APP_ACCESS_TARGETS.PAGE_APPOINTMENTS]: {
    read: { roles: CARE_COORDINATION_ROLES },
    feature: Feature.CALENDAR_SLOTS,
  },
  [APP_ACCESS_TARGETS.PAGE_CONSULTATION]: {
    read: { roles: CARE_COORDINATION_ROLES },
    feature: Feature.CALENDAR_SLOTS,
  },
  [APP_ACCESS_TARGETS.PAGE_PRESCRIPTIONS]: {
    read: {
      roles: ["ADMIN", "ADMIN_DOCTOR", "DOCTOR", "NURSE", "RECEPTIONIST"],
    },
    feature: Feature.DIGITAL_PRESCRIPTIONS,
  },
  [APP_ACCESS_TARGETS.PAGE_LAB_TESTS]: {
    read: {
      roles: ["ADMIN", "ADMIN_DOCTOR", "DOCTOR", "NURSE", "RECEPTIONIST"],
    },
    feature: Feature.LAB_TESTS,
  },
  [APP_ACCESS_TARGETS.PAGE_INVOICES]: {
    read: { roles: ["ADMIN", "ADMIN_DOCTOR", "DOCTOR", "RECEPTIONIST"] },
    feature: Feature.INVOICING,
  },
  [APP_ACCESS_TARGETS.PAGE_DESK_PAYMENT]: {
    read: { roles: ["ADMIN", "ADMIN_DOCTOR", "DOCTOR", "RECEPTIONIST"] },
    feature: Feature.INVOICING,
  },
  [APP_ACCESS_TARGETS.PAGE_DESK_FLOOR]: {
    read: { roles: ["ADMIN", "ADMIN_DOCTOR", "DOCTOR", "RECEPTIONIST"] },
    feature: Feature.QUEUE_MANAGEMENT,
    /** Hospital and Enterprise SKUs only. With the current Tier rank
        (HOSPITAL=3, ENTERPRISE=4) gating at HOSPITAL admits both, plus
        the INTELLIGENCE addon which sits above. FRONT_DESK is special-
        cased in canAccessTier to cap at ESSENTIAL, so it is excluded. */
    tier: Tier.HOSPITAL,
  },
  [APP_ACCESS_TARGETS.PAGE_INVENTORY]: {
    read: { roles: ["ADMIN", "ADMIN_DOCTOR", "DOCTOR", "RECEPTIONIST"] },
    feature: Feature.INVENTORY,
  },
  [APP_ACCESS_TARGETS.PAGE_DOCUMENTS]: {
    read: { roles: CLINICAL_SUPPORT_ROLES },
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
    read: { roles: ["ADMIN", "ADMIN_DOCTOR", "DOCTOR", "RECEPTIONIST"] },
    feature: Feature.WHATSAPP_MESSAGING,
  },
  [APP_ACCESS_TARGETS.PAGE_WHATSAPP_SENDER]: {
    read: { roles: ["ADMIN", "ADMIN_DOCTOR"] },
    feature: Feature.WHATSAPP_OWN_NUMBER,
  },
  [APP_ACCESS_TARGETS.PAGE_SPECIALTY]: {
    read: { roles: CLINICAL_SUPPORT_ROLES },
    feature: Feature.CALENDAR_SLOTS,
  },
  [APP_ACCESS_TARGETS.PAGE_HOSPITAL]: {
    read: { roles: CLINICAL_SUPPORT_ROLES },
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
    read: { roles: CARE_COORDINATION_ROLES },
    write: { roles: CARE_COORDINATION_ROLES },
    feature: Feature.CALENDAR_SLOTS,
  },
  [APP_ACCESS_TARGETS.API_STAFF_NOTIFICATIONS]: {
    read: { roles: CARE_COORDINATION_ROLES },
    write: { roles: CARE_COORDINATION_ROLES },
    feature: Feature.CALENDAR_SLOTS,
  },
  [APP_ACCESS_TARGETS.API_MEDICAL_CODING]: {
    read: { roles: CLINICAL_CODING_ROLES },
    write: { roles: CLINICAL_CODING_ROLES },
    feature: Feature.MEDICAL_CODING,
  },
  [APP_ACCESS_TARGETS.API_INVENTORY]: {
    read: { roles: ["ADMIN", "ADMIN_DOCTOR", "DOCTOR", "RECEPTIONIST"] },
    write: { roles: ["ADMIN", "ADMIN_DOCTOR", "DOCTOR", "RECEPTIONIST"] },
    feature: Feature.INVENTORY,
  },
  [APP_ACCESS_TARGETS.API_QUEUE]: {
    read: { roles: CARE_COORDINATION_ROLES },
    write: { roles: CARE_COORDINATION_ROLES },
    feature: Feature.QUEUE_MANAGEMENT,
  },
  [APP_ACCESS_TARGETS.API_MEDICAL_DOCUMENTS]: {
    read: { roles: CLINICAL_SUPPORT_ROLES },
    write: { roles: CLINICAL_SUPPORT_ROLES },
    feature: Feature.DOCUMENT_ARCHIVAL,
  },
  [APP_ACCESS_TARGETS.API_WHATSAPP]: {
    read: { roles: ["ADMIN", "ADMIN_DOCTOR", "DOCTOR", "RECEPTIONIST"] },
    write: { roles: ["ADMIN", "ADMIN_DOCTOR", "DOCTOR", "RECEPTIONIST"] },
    feature: Feature.WHATSAPP_MESSAGING,
  },
  [APP_ACCESS_TARGETS.API_WHATSAPP_SENDER]: {
    read: { roles: ["ADMIN", "ADMIN_DOCTOR"] },
    write: { roles: ["ADMIN", "ADMIN_DOCTOR"] },
    feature: Feature.WHATSAPP_OWN_NUMBER,
  },
  [APP_ACCESS_TARGETS.API_LAB_TESTS]: {
    read: {
      roles: ["ADMIN", "ADMIN_DOCTOR", "DOCTOR", "NURSE", "RECEPTIONIST"],
    },
    write: {
      roles: ["ADMIN", "ADMIN_DOCTOR", "DOCTOR", "NURSE", "RECEPTIONIST"],
    },
    feature: Feature.LAB_TESTS,
  },
  [APP_ACCESS_TARGETS.API_PATIENTS]: {
    read: { roles: CARE_COORDINATION_ROLES },
    write: { roles: ["ADMIN", "ADMIN_DOCTOR", "DOCTOR", "RECEPTIONIST"] },
    feature: Feature.BASIC_PATIENT_MANAGEMENT,
  },
  [APP_ACCESS_TARGETS.API_PATIENTS_READ]: {
    read: { roles: CARE_COORDINATION_ROLES },
    feature: Feature.BASIC_PATIENT_MANAGEMENT,
  },
  [APP_ACCESS_TARGETS.API_PATIENTS_WRITE]: {
    read: {
      roles: ["ADMIN", "ADMIN_DOCTOR", "DOCTOR", "RECEPTIONIST", "NURSE"],
    },
    write: {
      roles: ["ADMIN", "ADMIN_DOCTOR", "DOCTOR", "RECEPTIONIST", "NURSE"],
    },
    feature: Feature.BASIC_PATIENT_MANAGEMENT,
  },
  [APP_ACCESS_TARGETS.API_PATIENT_TIMELINE]: {
    read: { roles: CARE_COORDINATION_ROLES },
    feature: Feature.BASIC_PATIENT_MANAGEMENT,
  },
  [APP_ACCESS_TARGETS.API_PATIENT_METRICS]: {
    read: { roles: CARE_COORDINATION_ROLES },
    write: { roles: ["ADMIN", "ADMIN_DOCTOR", "DOCTOR", "NURSE"] },
    feature: Feature.BASIC_PATIENT_MANAGEMENT,
  },
  [APP_ACCESS_TARGETS.API_DOCTORS]: {
    read: { roles: CARE_COORDINATION_ROLES },
    write: { roles: ADMIN_BILLING_ROLES },
  },
  [APP_ACCESS_TARGETS.API_PRESCRIPTIONS]: {
    /** Read = list, detail, PDF print. Receptionists hand printed Rx to
        patients; nurses reference Rx during patient prep. */
    read: {
      roles: ["ADMIN", "ADMIN_DOCTOR", "DOCTOR", "NURSE", "RECEPTIONIST"],
    },
    /** Authoring (create / edit / sign) is clinical-only. */
    write: { roles: PRESCRIPTION_ROLES },
    feature: Feature.DIGITAL_PRESCRIPTIONS,
  },
  [APP_ACCESS_TARGETS.API_INVOICES]: {
    read: { roles: ["ADMIN", "ADMIN_DOCTOR", "DOCTOR", "RECEPTIONIST"] },
    write: { roles: ["ADMIN", "ADMIN_DOCTOR", "DOCTOR", "RECEPTIONIST"] },
    feature: Feature.INVOICING,
  },
  [APP_ACCESS_TARGETS.API_PAYMENTS]: {
    read: { roles: ["ADMIN", "ADMIN_DOCTOR", "DOCTOR", "RECEPTIONIST"] },
    write: { roles: ["ADMIN", "ADMIN_DOCTOR", "DOCTOR", "RECEPTIONIST"] },
    feature: Feature.PAYMENT_LINKS,
  },
  [APP_ACCESS_TARGETS.API_DESK_INVOICE_SETTLEMENT]: {
    read: { roles: ["ADMIN", "ADMIN_DOCTOR", "DOCTOR", "RECEPTIONIST"] },
    write: { roles: ["ADMIN", "RECEPTIONIST", "ADMIN_DOCTOR"] },
    feature: Feature.INVOICING,
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
