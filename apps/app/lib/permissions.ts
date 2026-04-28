import {
  BILLING_ROLES,
  CLINIC_ADMIN_ROLES,
  hasAllAppPermissions,
  hasAnyAppPermission,
  hasAppPermission,
  type AppPermission,
  type UserRole,
} from "@workspace/types";

export type Permission = AppPermission;

export const hasPermission = hasAppPermission;
export const hasAnyPermission = hasAnyAppPermission;
export const hasAllPermissions = hasAllAppPermissions;

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

export { BILLING_ROLES, CLINIC_ADMIN_ROLES };
