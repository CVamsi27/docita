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

export function usePermissions() {
  const { user } = useAuth();
  const role = (user?.role || "RECEPTIONIST") as UserRole;

  return useMemo(
    () => ({
      canStartConsultation: canStartConsultation(role),
      canManageStaff: canManageStaff(role),
      canManageClinic: canManageClinic(role),
      canManageBilling: canManageBilling(role),
      canViewReports: canViewReports(role),
      canManageInventory: canManageInventory(role),
      canExportData: canExportData(role),
      canCreatePrescription: canCreatePrescription(role),

      isAdmin: isAdmin(role),
      isDoctor: isDoctorRole(role),

      role,
    }),
    [role],
  );
}
