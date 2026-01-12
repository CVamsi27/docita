import { api } from "@/lib/api-client";
import type { Invoice } from "@workspace/types";

/**
 * Invoices API Client
 */
export const invoicesApi = {
  getAll: (params?: { patientId?: string; status?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.patientId) searchParams.set("patientId", params.patientId);
    if (params?.status) searchParams.set("status", params.status);
    return api.get<Invoice[]>(`/invoices?${searchParams}`);
  },

  getById: (id: string) => api.get<Invoice>(`/invoices/${id}`),

  create: (data: Partial<Invoice>) => api.post<Invoice>("/invoices", data),

  update: (id: string, data: Partial<Invoice>) =>
    api.patch<Invoice>(`/invoices/${id}`, data),

  markPaid: (id: string) => api.post(`/invoices/${id}/pay`, {}),

  print: (id: string) => api.get(`/invoices/${id}/print`),
};
