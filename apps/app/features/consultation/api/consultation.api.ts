import { api } from "@/lib/api-client";
import type { VitalSign } from "@workspace/types";

export const consultationApi = {
  // Consultation is represented by the appointment in the API.
  getByAppointmentId: (appointmentId: string) =>
    api.get<unknown>(`/appointments/${appointmentId}`),

  // Start consultation for an appointment (requires doctor role).
  create: (data: Record<string, unknown>) => {
    const appointmentId = String(data.appointmentId ?? "").trim();
    if (!appointmentId) {
      throw new Error("appointmentId is required to start a consultation");
    }
    return api.post<unknown>(`/appointments/${appointmentId}/start-consultation`, {});
  },

  // Patch appointment details during consultation (server validates fields).
  update: (appointmentId: string, data: Record<string, unknown>) =>
    api.patch<unknown>(`/appointments/${appointmentId}`, data),

  addVitals: (appointmentId: string, vitals: VitalSign) =>
    api.post(`/appointments/${appointmentId}/vitals`, vitals),

  // Mark appointment as completed.
  complete: (appointmentId: string) =>
    api.patch(`/appointments/${appointmentId}`, { status: "completed" }),
};
