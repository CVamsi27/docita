import { api } from "@/lib/api-client";
import type {
  Appointment,
  CreateAppointmentInput,
  UpdateAppointmentInput,
} from "@workspace/types";

/**
 * Appointments API Client
 * Centralized API functions for appointment operations
 */
export const appointmentsApi = {
  /**
   * Get all appointments with optional filtering
   */
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
    return api.get<Appointment[]>(`/appointments${query ? `?${query}` : ""}`);
  },

  /**
   * Get a single appointment by ID
   */
  getById: (id: string) => api.get<Appointment>(`/appointments/${id}`),

  /**
   * Create a new appointment
   */
  create: (data: CreateAppointmentInput) =>
    api.post<Appointment>("/appointments", data),

  /**
   * Update an existing appointment
   */
  update: (id: string, data: UpdateAppointmentInput) =>
    api.patch<Appointment>(`/appointments/${id}`, data),

  /**
   * Delete an appointment
   */
  delete: (id: string) => api.delete(`/appointments/${id}`),

  /**
   * Check-in an appointment
   */
  checkIn: (id: string) => api.post(`/appointments/${id}/check-in`, {}),
};
