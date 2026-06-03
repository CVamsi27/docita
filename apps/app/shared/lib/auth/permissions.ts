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

export function isAdmin(role: UserRole | string | undefined): boolean {
  if (!role) return false;
  return hasPermission(role, "manageClinic");
}

export function isDoctor(role: UserRole | string | undefined): boolean {
  if (!role) return false;
  return role === "DOCTOR" || role === "ADMIN_DOCTOR";
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

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  INTERNAL: 5,
  ADMIN: 4,
  ADMIN_DOCTOR: 3,
  DOCTOR: 2,
  NURSE: 1.5,
  RECEPTIONIST: 1,
  PATIENT: 0,
};

export function meetsRoleHierarchy(
  userRole: UserRole | undefined,
  required: UserRole,
): boolean {
  if (!userRole) return false;
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[required];
}

export { BILLING_ROLES, CLINIC_ADMIN_ROLES };
