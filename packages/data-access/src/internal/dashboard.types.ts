import type {
  InternalClinicListEntry,
  InternalDashboardStats,
  InternalDashboardTrends,
} from "@workspace/types";
export type {
  InternalDashboardStats,
  InternalDashboardTrends,
} from "@workspace/types";
export type InternalDashboardClinic = InternalClinicListEntry;

export const defaultInternalDashboardStats: InternalDashboardStats = {
  clinics: 0,
  users: 0,
  doctors: 0,
  patients: 0,
  invoices: 0,
  prescriptions: 0,
};

export const defaultInternalDashboardTrends: InternalDashboardTrends = {
  clinicsThisMonth: 0,
  usersThisMonth: 0,
  doctorsThisMonth: 0,
  patientsThisMonth: 0,
  invoicesPercentChange: 0,
  prescriptionsPercentChange: 0,
};
