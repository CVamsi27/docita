import type { UserRole } from "@workspace/types";

export type Permission =
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

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
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
  ],
  RECEPTIONIST: [
    "viewPatients",
    "createPatient",
    "editPatient",
    "viewAppointments",
    "createAppointment",
    "viewInvoices",
  ],
  PATIENT: ["viewAppointments"],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  if (!role) return false;
  if (role === "INTERNAL") return true;
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

export function hasAnyPermission(
  role: UserRole,
  permissions: Permission[],
): boolean {
  if (!role) return false;
  return permissions.some((permission) => hasPermission(role, permission));
}

export function hasAllPermissions(
  role: UserRole,
  permissions: Permission[],
): boolean {
  if (!role) return false;
  return permissions.every((permission) => hasPermission(role, permission));
}

export function isAdmin(role: UserRole): boolean {
  return hasPermission(role, "manageClinic");
}

export function isDoctor(role: UserRole): boolean {
  return ["DOCTOR", "ADMIN_DOCTOR"].includes(role);
}

export function canStartConsultation(role: UserRole): boolean {
  return hasPermission(role, "startConsultation");
}

export function canManageStaff(role: UserRole): boolean {
  return hasPermission(role, "manageStaff");
}

export function canManageClinic(role: UserRole): boolean {
  return hasPermission(role, "manageClinic");
}

export function canManageBilling(role: UserRole): boolean {
  return hasPermission(role, "manageBilling");
}

export function canViewReports(role: UserRole): boolean {
  return hasPermission(role, "viewReports");
}

export function canManageInventory(role: UserRole): boolean {
  return hasPermission(role, "manageInventory");
}

export function canExportData(role: UserRole): boolean {
  return hasPermission(role, "exportData");
}

export function canCreatePrescription(role: UserRole): boolean {
  return hasPermission(role, "createPrescription");
}

export function canViewPatients(role: UserRole): boolean {
  return hasPermission(role, "viewPatients");
}

export function canCreatePatient(role: UserRole): boolean {
  return hasPermission(role, "createPatient");
}

export function canEditPatient(role: UserRole): boolean {
  return hasPermission(role, "editPatient");
}

export function canDeletePatient(role: UserRole): boolean {
  return hasPermission(role, "deletePatient");
}

export function canViewAppointments(role: UserRole): boolean {
  return hasPermission(role, "viewAppointments");
}

export function canCreateAppointment(role: UserRole): boolean {
  return hasPermission(role, "createAppointment");
}

export function canViewInvoices(role: UserRole): boolean {
  return hasPermission(role, "viewInvoices");
}

export function canCreateInvoice(role: UserRole): boolean {
  return hasPermission(role, "createInvoice");
}

export function canViewPrescriptions(role: UserRole): boolean {
  return hasPermission(role, "viewPrescriptions");
}

export function canManageTemplates(role: UserRole): boolean {
  return hasPermission(role, "manageTemplates");
}

export function canViewPlatformAnalytics(role: UserRole): boolean {
  return hasPermission(role, "viewPlatformAnalytics");
}

export function canViewSystemLogs(role: UserRole): boolean {
  return hasPermission(role, "viewSystemLogs");
}

export function canManageTenants(role: UserRole): boolean {
  return hasPermission(role, "manageTenants");
}

export const CLINIC_ADMIN_ROLES = new Set<UserRole>(["ADMIN", "ADMIN_DOCTOR"]);
export const BILLING_ROLES = new Set<UserRole>(["ADMIN", "ADMIN_DOCTOR"]);
