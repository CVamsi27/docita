import { api } from "@/lib/api-client";

/**
 * Dashboard & Analytics API Client
 */
export const dashboardApi = {
  getOverview: () => api.get("/analytics/overview"),

  getAppointmentStats: (startDate: string, endDate: string) =>
    api.get(`/analytics/appointments?start=${startDate}&end=${endDate}`),

  getRevenueStats: (startDate: string, endDate: string) =>
    api.get(`/analytics/revenue?start=${startDate}&end=${endDate}`),

  getPatientStats: () => api.get("/analytics/patients"),

  getTopDiseases: (limit: number = 10) =>
    api.get(`/analytics/diseases?limit=${limit}`),
};
