import { api } from "@/lib/api-client";
import type { UpdateAppointmentRequest, VitalSign } from "@workspace/types";
import {
  appointmentResponseSchema,
  startConsultationResponseSchema,
  updateAppointmentRequestSchema,
  vitalSignSchema,
} from "@workspace/types";

export const consultationApi = {
  // Consultation is represented by the appointment in the API.
  getByAppointmentId: (appointmentId: string) =>
    api.validate(`/appointments/${appointmentId}`, appointmentResponseSchema),

  // Start consultation for an appointment (requires doctor role).
  create: (data: { appointmentId: string }) => {
    const appointmentId = String(data.appointmentId ?? "").trim();
    if (!appointmentId) {
      throw new Error("appointmentId is required to start a consultation");
    }
    return api
      .post(`/appointments/${appointmentId}/start-consultation`, {})
      .then((res) => startConsultationResponseSchema.parse(res));
  },

  // Patch appointment details during consultation (server validates fields).
  update: (appointmentId: string, data: UpdateAppointmentRequest) =>
    api
      .patch(
        `/appointments/${appointmentId}`,
        updateAppointmentRequestSchema.parse(data),
      )
      .then((res) => appointmentResponseSchema.parse(res)),

  addVitals: (appointmentId: string, vitals: VitalSign) =>
    api.post(`/appointments/${appointmentId}/vitals`, vitalSignSchema.parse(vitals)),

  // Mark appointment as completed.
  complete: (appointmentId: string) =>
    api.patch(`/appointments/${appointmentId}`, { status: "completed" }),
};
