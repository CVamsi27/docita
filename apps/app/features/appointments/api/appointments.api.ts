import { api } from "@/lib/api-client";
import {
  appointmentResponseSchema,
  createAppointmentRequestSchema,
  updateAppointmentRequestSchema,
  type Appointment,
  type CreateAppointmentRequest,
  type UpdateAppointmentRequest,
} from "@workspace/types";
import { z } from "zod";

const appointmentsListResponseSchema = z.union([
  z.array(appointmentResponseSchema),
  z.object({
    items: z.array(appointmentResponseSchema),
    nextCursor: z.string().optional(),
    hasMore: z.boolean().optional(),
    count: z.number().optional(),
  }),
]);

const normalizeAppointments = (
  response: z.infer<typeof appointmentsListResponseSchema>,
): Appointment[] => {
  return Array.isArray(response) ? response : response.items;
};

export const appointmentsApi = {
  
  getAll: (params?: {
    date?: string;
    startDate?: string;
    endDate?: string;
    doctorId?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.date) searchParams.set("date", params.date);
    if (params?.startDate) searchParams.set("startDate", params.startDate);
    if (params?.endDate) searchParams.set("endDate", params.endDate);
    if (params?.doctorId) searchParams.set("doctorId", params.doctorId);
    const query = searchParams.toString();
    return api
      .get<unknown>(`/appointments${query ? `?${query}` : ""}`)
      .then((response) => {
        const parsed = appointmentsListResponseSchema.parse(response);
        return normalizeAppointments(parsed);
      });
  },

  
  getById: (id: string) =>
    api.get<unknown>(`/appointments/${id}`).then((response) => {
      return appointmentResponseSchema.parse(response);
    }),

  
  create: (data: CreateAppointmentRequest) =>
    api
      .post<unknown>("/appointments", createAppointmentRequestSchema.parse(data))
      .then((response) => {
        return appointmentResponseSchema.parse(response);
      }),

  
  update: (id: string, data: UpdateAppointmentRequest) =>
    api
      .patch<unknown>(
        `/appointments/${id}`,
        updateAppointmentRequestSchema.parse(data),
      )
      .then((response) => {
        return appointmentResponseSchema.parse(response);
      }),

  
  delete: (id: string) => api.delete(`/appointments/${id}`),

  
  checkIn: (id: string) => api.post(`/appointments/${id}/check-in`, {}),
};
