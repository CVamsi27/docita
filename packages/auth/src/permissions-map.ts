/**
 * Role-based permission mapping
 * Centralized permissions configuration for all roles
 * Used by both frontend (UI control) and API (authorization)
 */

import type { Permission } from './auth-context.js';

export const PERMISSIONS_BY_ROLE: Record<string, Permission[]> = {
  SUPER_ADMIN: [
    // Super admin has all permissions
    'VIEW_PATIENTS',
    'CREATE_PATIENTS',
    'EDIT_PATIENTS',
    'DELETE_PATIENTS',
    'VIEW_APPOINTMENTS',
    'CREATE_APPOINTMENTS',
    'EDIT_APPOINTMENTS',
    'DELETE_APPOINTMENTS',
    'VIEW_CONSULTATIONS',
    'CREATE_CONSULTATIONS',
    'EDIT_CONSULTATIONS',
    'VIEW_INVOICES',
    'CREATE_INVOICES',
    'EDIT_INVOICES',
    'VIEW_PRESCRIPTIONS',
    'CREATE_PRESCRIPTIONS',
    'EDIT_PRESCRIPTIONS',
    'VIEW_SETTINGS',
    'EDIT_SETTINGS',
    'VIEW_ANALYTICS',
    'VIEW_STAFF',
    'CREATE_STAFF',
    'EDIT_STAFF',
    'DELETE_STAFF',
    'MANAGE_BILLING',
    'MANAGE_SUBSCRIPTIONS',
    'VIEW_AUDIT_LOGS',
    'ADMIN_PANEL',
  ],
  CLINIC_ADMIN: [
    'VIEW_PATIENTS',
    'CREATE_PATIENTS',
    'EDIT_PATIENTS',
    'VIEW_APPOINTMENTS',
    'CREATE_APPOINTMENTS',
    'EDIT_APPOINTMENTS',
    'VIEW_CONSULTATIONS',
    'VIEW_INVOICES',
    'CREATE_INVOICES',
    'EDIT_INVOICES',
    'VIEW_PRESCRIPTIONS',
    'VIEW_SETTINGS',
    'EDIT_SETTINGS',
    'VIEW_ANALYTICS',
    'VIEW_STAFF',
    'CREATE_STAFF',
    'EDIT_STAFF',
    'DELETE_STAFF',
    'MANAGE_BILLING',
  ],
  DOCTOR: [
    'VIEW_PATIENTS',
    'CREATE_PATIENTS',
    'EDIT_PATIENTS',
    'VIEW_APPOINTMENTS',
    'CREATE_APPOINTMENTS',
    'EDIT_APPOINTMENTS',
    'VIEW_CONSULTATIONS',
    'CREATE_CONSULTATIONS',
    'EDIT_CONSULTATIONS',
    'VIEW_INVOICES',
    'CREATE_INVOICES',
    'VIEW_PRESCRIPTIONS',
    'CREATE_PRESCRIPTIONS',
    'EDIT_PRESCRIPTIONS',
    'VIEW_ANALYTICS',
  ],
  STAFF: [
    'VIEW_PATIENTS',
    'CREATE_PATIENTS',
    'EDIT_PATIENTS',
    'VIEW_APPOINTMENTS',
    'CREATE_APPOINTMENTS',
    'EDIT_APPOINTMENTS',
    'VIEW_CONSULTATIONS',
    'VIEW_INVOICES',
    'CREATE_INVOICES',
    'VIEW_PRESCRIPTIONS',
  ],
  PATIENT: ['VIEW_PATIENTS'],
};

/**
 * Check if user has a specific permission
 */
export function hasPermission(role: string, permission: Permission): boolean {
  const rolePermissions = PERMISSIONS_BY_ROLE[role] || [];
  return rolePermissions.includes(permission);
}

/**
 * Get all permissions for a role
 */
export function getPermissionsForRole(role: string): Permission[] {
  return PERMISSIONS_BY_ROLE[role] || [];
}

/**
 * Check if user can perform multiple actions
 */
export function canPerformActions(
  role: string,
  permissions: Permission[]
): boolean {
  return permissions.every((perm) => hasPermission(role, perm));
}
