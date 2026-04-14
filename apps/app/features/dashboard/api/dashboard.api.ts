import { api } from "@/lib/api-client";

export const dashboardApi = {
  getOverview: () => api.get("/analytics/overview"),

  // Backend contract is days/period-based (not start/end).
  // We keep the signature but translate into a rough days window.
  getAppointmentStats: (_startDate: string, _endDate: string) =>
    api.get("/analytics/appointments"),

  getRevenueStats: (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Number.isFinite(start.getTime()) && Number.isFinite(end.getTime())
      ? Math.max(
          1,
          Math.min(
            365,
            Math.ceil(
              (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
            ),
          ),
        )
      : 30;
    return api.get(`/analytics/revenue?period=daily&days=${days}`);
  },

  getPatientStats: () => api.get("/analytics/patients"),

  getTopDiseases: (limit: number = 10) =>
    api.get(`/analytics/top-diagnoses?limit=${limit}`),
};
