export const DASHBOARD_REPOSITORY_TOKEN = 'IDashboardRepository';

export interface DashboardStatsSnapshot {
  totalPatients: number;
  totalDoctors: number;
  newPatientsThisMonth: number;
  todayAppointments: number;
  totalAppointments: number;
  activePrescriptions: number;
  recentActivity: Array<{
    id: string;
    startTime: Date;
    status: string;
    type: string;
    createdAt: Date;
    patient: {
      id: string;
      firstName: string;
      lastName: string;
    } | null;
  }>;
  upcomingAppointments: Array<{
    id: string;
    startTime: Date;
    endTime: Date;
    status: string;
    type: string;
    patient: {
      id: string;
      firstName: string;
      lastName: string;
    } | null;
  }>;
  pendingReports: number;
  uncodedVisits: number;
  monthlyRevenue: number;
}

export interface IDashboardRepository {
  getStatsSnapshot(clinicId: string): Promise<DashboardStatsSnapshot>;
}
