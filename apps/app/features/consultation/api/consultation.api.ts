import { api } from "@/lib/api-client";
import type { VitalSign } from "@workspace/types";

/**
 * Consultation API Client
 * Centralized API functions for consultation operations
 */
export const consultationApi = {
  /**
   * Get consultation by appointment ID
   */
  getByAppointmentId: (appointmentId: string) =>
    api.get<unknown>(`/consultations/appointment/${appointmentId}`),

  /**
   * Create new consultation
   */
  create: (data: Record<string, unknown>) =>
    api.post<unknown>("/consultations", data),

  /**
   * Update consultation
   */
  update: (id: string, data: Record<string, unknown>) =>
    api.patch<unknown>(`/consultations/${id}`, data),

  /**
   * Add vital signs
   */
  addVitals: (consultationId: string, vitals: VitalSign) =>
    api.post(`/consultations/${consultationId}/vitals`, vitals),

  /**
   * Complete consultation
   */
  complete: (id: string) => api.post(`/consultations/${id}/complete`, {}),
};
