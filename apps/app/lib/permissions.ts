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
  /**
   * SUPER_ADMIN exists in the type system but is an admin-console-only role.
   * It cannot log into apps/app (the login rejects it). Kept here solely so
   * the Record type is exhaustive; this branch is never reached at runtime.
   */
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
// Role Sets — single source of truth for role-based access control
// ============================================================================

/**
 * Clinic-level admin roles. SUPER_ADMIN is intentionally excluded — that role
 * only exists in the internal admin console (apps/admin) and cannot log in to
 * the clinic app (apps/app).
 */
export const CLINIC_ADMIN_ROLES = new Set<UserRole>([
  "ADMIN",
  "ADMIN_DOCTOR",
]);

/**
 * Roles that can access billing / subscription management.
 * Alias kept separate in case billing access ever diverges from base admin.
 */
export const BILLING_ROLES = CLINIC_ADMIN_ROLES;

/**
 * Roles that have clinical (doctor) privileges.
 */
export const CLINICAL_ROLES = new Set<UserRole>(["DOCTOR", "ADMIN_DOCTOR"]);

// ============================================================================
// Role Hierarchy Checks
// ============================================================================

const ROLE_HIERARCHY: Record<UserRole, number> = {
  SUPER_ADMIN: 100, // admin-app only; never appears in clinic app
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
 * Check if the user is a clinic-admin-level role.
 * SUPER_ADMIN is excluded — it cannot log in to the clinic app.
 */
export function isAdmin(role: UserRole): boolean {
  return CLINIC_ADMIN_ROLES.has(role);
}

/**
 * Check if the user is a doctor (can see patients clinically)
 */
export function isDoctor(role: UserRole): boolean {
  return ["DOCTOR", "ADMIN_DOCTOR"].includes(role);
}
