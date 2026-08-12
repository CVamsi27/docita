import { useMemo } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { usePermissionStore } from "@/lib/stores/permission-store";
import {
  canCreateAppointment,
  canCreateInvoice,
  canCreatePatient,
  canCreatePrescription,
  canDeletePatient,
  canEditPatient,
  canExportData,
  canManageBilling,
  canManageClinic,
  canManageInventory,
  canManageStaff,
  canManageTemplates,
  canManageTenants,
  canStartConsultation,
  canViewAppointments,
  canViewInvoices,
  canViewPatients,
  canViewPlatformAnalytics,
  canViewPrescriptions,
  canViewReports,
  canViewSystemLogs,
  isAdmin,
  isDoctor as isDoctorRole,
} from "@/lib/auth/permissions";
import { Feature } from "@workspace/types";
import { parseUserRole } from "@/lib/access-control/parse-user-role";

export function usePermissions() {
  const { user } = useAuth();
  const role = parseUserRole(user?.role);
  const tierCanAccess = usePermissionStore((s) => s.canAccess);
  const invoicingOk = tierCanAccess(Feature.INVOICING);

  return useMemo(
    () => ({
      canStartConsultation: canStartConsultation(role),
      canManageStaff: canManageStaff(role),
      canManageClinic: canManageClinic(role),
      canManageBilling: canManageBilling(role) && invoicingOk,
      canViewReports: canViewReports(role),
      canManageInventory: canManageInventory(role),
      canExportData: canExportData(role),
      canCreatePrescription: canCreatePrescription(role),
      canViewPatients: canViewPatients(role),
      canCreatePatient: canCreatePatient(role),
      canEditPatient: canEditPatient(role),
      canDeletePatient: canDeletePatient(role),
      canViewAppointments: canViewAppointments(role),
      canCreateAppointment: canCreateAppointment(role),
      canViewInvoices: canViewInvoices(role) && invoicingOk,
      canCreateInvoice: canCreateInvoice(role) && invoicingOk,
      canViewPrescriptions: canViewPrescriptions(role),
      canManageTemplates: canManageTemplates(role),
      canViewPlatformAnalytics: canViewPlatformAnalytics(role),
      canViewSystemLogs: canViewSystemLogs(role),
      canManageTenants: canManageTenants(role),
      isAdmin: isAdmin(role),
      isDoctor: isDoctorRole(role),
      role,
    }),
    [role, invoicingOk],
  );
}