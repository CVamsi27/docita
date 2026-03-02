import { api } from "@/lib/api-client";
import type { VitalSign } from "@workspace/types";

export const consultationApi = {
  
  getByAppointmentId: (appointmentId: string) =>
    api.get<unknown>(`/consultations/appointment/${appointmentId}`),

  
  create: (data: Record<string, unknown>) =>
    api.post<unknown>("/consultations", data),

  
  update: (id: string, data: Record<string, unknown>) =>
    api.patch<unknown>(`/consultations/${id}`, data),

  
  addVitals: (consultationId: string, vitals: VitalSign) =>
    api.post(`/consultations/${consultationId}/vitals`, vitals),

  
  complete: (id: string) => api.post(`/consultations/${id}/complete`, {}),
};
