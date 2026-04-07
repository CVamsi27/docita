export interface DashboardClinic {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  tier?: string;
  type?: string;
  active?: boolean;
  _count?: {
    users: number;
    patients: number;
  };
}

export interface DashboardTrends {
  clinicsThisMonth: number;
  usersThisMonth: number;
  doctorsThisMonth: number;
  patientsThisMonth: number;
  invoicesPercentChange: number;
  prescriptionsPercentChange: number;
}

export interface DashboardStats {
  clinics: number;
  users: number;
  doctors: number;
  patients: number;
  invoices: number;
  prescriptions: number;
  trends?: DashboardTrends;
}

export const defaultDashboardStats: DashboardStats = {
  clinics: 0,
  users: 0,
  doctors: 0,
  patients: 0,
  invoices: 0,
  prescriptions: 0,
};

export const defaultDashboardTrends: DashboardTrends = {
  clinicsThisMonth: 0,
  usersThisMonth: 0,
  doctorsThisMonth: 0,
  patientsThisMonth: 0,
  invoicesPercentChange: 0,
  prescriptionsPercentChange: 0,
};
