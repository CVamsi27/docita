/**
 * Centralized Permission Helpers
 *
 * Single source of truth for all permission checks.
 * Use these helpers instead of inline role checks.
 */

import type { UserRole } from "@workspace/types";

// ============================================================================
// Permission Types
// ============================================================================

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
  // Super Admin Specific
  | "viewPlatformAnalytics"
  | "viewSystemLogs"
  | "manageTenants";

// ============================================================================
// Role-based Permission Mapping
// ============================================================================

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: [
    "viewPlatformAnalytics",
    "viewSystemLogs",
    "manageTenants",
    // Can view high-level stats but not operational data
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
    "viewPrescriptions", // Can view for auditing, but not create
    "viewReports",
    "manageInventory",
    "manageTemplates",
    "exportData",
  ],
  ADMIN_DOCTOR: [
    // Admin capabilities
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
    // Doctor capabilities
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
    "viewInvoices", // Can view patient invoices
    "viewReports",
    "manageTemplates",
  ],
  RECEPTIONIST: [
    "viewPatients",
    "createPatient",
    "editPatient",
    "viewAppointments",
    "createAppointment",
    "viewInvoices",
    "viewPrescriptions",
    // No "createInvoice" - view only
    // No "createPrescription" - view only
  ],
};

// ============================================================================
// Permission Check Helpers
// ============================================================================

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions?.includes(permission) ?? false;
}

/**
 * Check if a role has all specified permissions
 */
export function hasAllPermissions(
  role: UserRole,
  permissions: Permission[],
): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(
  role: UserRole,
  permissions: Permission[],
): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

// ============================================================================
// Convenience Permission Checks (Most Common Use Cases)
// ============================================================================

export const canManageStaff = (role: UserRole) =>
  hasPermission(role, "manageStaff");

export const canManageClinic = (role: UserRole) =>
  hasPermission(role, "manageClinic");

export const canStartConsultation = (role: UserRole) =>
  hasPermission(role, "startConsultation");

export const canManageBilling = (role: UserRole) =>
  hasPermission(role, "manageBilling");

export const canViewReports = (role: UserRole) =>
  hasPermission(role, "viewReports");

export const canManageInventory = (role: UserRole) =>
  hasPermission(role, "manageInventory");

export const canExportData = (role: UserRole) =>
  hasPermission(role, "exportData");

export const canCreatePrescription = (role: UserRole) =>
  hasPermission(role, "createPrescription");

export const canManagePatients = (role: UserRole) =>
  hasAllPermissions(role, ["viewPatients", "createPatient", "editPatient"]);

export const canManageAppointments = (role: UserRole) =>
  hasAllPermissions(role, ["viewAppointments", "createAppointment"]);

// ============================================================================
// Role Hierarchy Checks
// ============================================================================

const ROLE_HIERARCHY: Record<UserRole, number> = {
  SUPER_ADMIN: 100,
  ADMIN_DOCTOR: 80,
  ADMIN: 70,
  DOCTOR: 50,
  RECEPTIONIST: 30,
};

/**
 * Check if a role is at or above another role in the hierarchy
 */
export function isRoleAtLeast(role: UserRole, minimumRole: UserRole): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minimumRole];
}

/**
 * Check if the user is an admin-level role
 */
export function isAdmin(role: UserRole): boolean {
  return ["SUPER_ADMIN", "ADMIN", "ADMIN_DOCTOR"].includes(role);
}

/**
 * Check if the user is a doctor (can see patients clinically)
 */
export function isDoctor(role: UserRole): boolean {
  return ["DOCTOR", "ADMIN_DOCTOR"].includes(role);
}
