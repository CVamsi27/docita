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
  SUPER_ADMIN: [
    "viewPlatformAnalytics",
    "viewSystemLogs",
    "manageTenants",
    "viewReports",
  ],
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
  STAFF_ADMIN: [
    "manageStaff",
    "manageClinic",
    "viewPatients",
    "createPatient",
    "editPatient",
    "viewAppointments",
    "createAppointment",
    "manageBilling",
    "viewInvoices",
    "createInvoice",
    "manageInventory",
    "manageTemplates",
  ],
  STAFF: [
    "viewPatients",
    "createPatient",
    "editPatient",
    "viewAppointments",
    "createAppointment",
    "viewInvoices",
    "createInvoice",
  ],
  NURSE: [
    "viewPatients",
    "editPatient",
    "viewAppointments",
    "viewPrescriptions",
  ],
  PHARMACIST: [
    "viewPatients",
    "viewPrescriptions",
    "manageInventory",
  ],
  RECEPTIONIST: [
    "viewPatients",
    "createPatient",
    "editPatient",
    "viewAppointments",
    "createAppointment",
    "viewInvoices",
    "createInvoice",
  ],
  BILLING: [
    "viewPatients",
    "viewInvoices",
    "createInvoice",
    "manageBilling",
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  if (!role) return false;
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
