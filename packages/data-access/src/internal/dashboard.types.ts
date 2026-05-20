/** Internal admin portal dashboard API shapes (until dedicated Zod contracts exist). */

export interface InternalDashboardClinic {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  tier?: string;
  currency?: string;
  type?: string;
  active?: boolean;
  settings?: Record<string, unknown>;
  _count?: {
    users: number;
    patients: number;
  };
}

export interface InternalDashboardTrends {
  clinicsThisMonth: number;
  usersThisMonth: number;
  doctorsThisMonth: number;
  patientsThisMonth: number;
  invoicesPercentChange: number;
  prescriptionsPercentChange: number;
}

export interface InternalDashboardStats {
  clinics: number;
  users: number;
  doctors: number;
  patients: number;
  invoices: number;
  prescriptions: number;
  trends?: InternalDashboardTrends;
}

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
