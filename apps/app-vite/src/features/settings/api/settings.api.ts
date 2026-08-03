import { api } from "@/lib/api/api-client";

export const settingsApi = {
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post("/auth/change-password", data),
};

export const complianceApi = {
  getSummary: <T>() => api.get<T>(`/clinics/current/compliance`),
  getRecentAuditLogs: <T>() => api.get<T>("/audit/recent?limit=5"),
  getDataSubjectRequests: <T>() =>
    api.get<T>(`/clinics/current/data-subject-requests`),
  createDataSubjectRequest: <T>(data: unknown) =>
    api.post<T>(`/clinics/current/data-subject-requests`, data),
  updateDataSubjectRequestStatus: <T>(
    requestId: string,
    status: string,
  ) =>
    api.patch<T>(`/clinics/current/data-subject-requests/${requestId}`, {
      status,
    }),
};
