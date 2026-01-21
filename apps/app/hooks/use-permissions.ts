"use client";

import { useMemo } from "react";
import { useAuth } from "../lib/auth-context";
import {
  canCreatePrescription,
  canExportData,
  canManageBilling,
  canManageClinic,
  canManageInventory,
  canManageStaff,
  canStartConsultation,
  canViewReports,
  isAdmin,
  isDoctor as isDoctorRole,
} from "../lib/permissions";
import type { UserRole } from "@workspace/types";

/**
 * Hook to check user permissions
 * Decouples components from specific role checks.
 */
export function usePermissions() {
  const { user } = useAuth();
  const role = (user?.role || "RECEPTIONIST") as UserRole;

  return useMemo(
    () => ({
      // Action Permissions
      canStartConsultation: canStartConsultation(role),
      canManageStaff: canManageStaff(role),
      canManageClinic: canManageClinic(role),
      canManageBilling: canManageBilling(role),
      canViewReports: canViewReports(role),
      canManageInventory: canManageInventory(role),
      canExportData: canExportData(role),
      canCreatePrescription: canCreatePrescription(role),

      // Role Checks (Use sparingly, prefer capabilities above)
      isAdmin: isAdmin(role),
      isDoctor: isDoctorRole(role),
      
      // Raw role for edge cases
      role,
    }),
    [role]
  );
}
