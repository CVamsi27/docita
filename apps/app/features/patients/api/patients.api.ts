import { api } from "@/lib/api-client";
import type {
  CreatePatientInput,
  Patient,
  UpdatePatientInput,
} from "@workspace/types";

/**
 * Patient API Client
 * Centralized API functions for patient-related operations
 */
export const patientsApi = {
  /**
   * Get all patients with optional filtering
   */
  getAll: (params?: { limit?: number; search?: string; cursor?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.cursor) searchParams.set("cursor", params.cursor);
    if (params?.search) searchParams.set("search", params.search);
    searchParams.set("_cb", String(Date.now()));
    const query = searchParams.toString();
    return api.get<{
      items: Patient[];
      nextCursor?: string;
      hasMore: boolean;
      count: number;
    }>(`/patients${query ? `?${query}` : ""}`);
  },

  /**
   * Get a single patient by ID
   */
  getById: (id: string) => api.get<Patient>(`/patients/${id}`),

  /**
   * Get patient's medical history timeline
   */
  getMedicalHistory: (id: string) =>
    api.get(`/patients/${id}/medical-history-timeline`),

  /**
   * Create a new patient
   */
  create: (data: CreatePatientInput) => api.post<Patient>("/patients", data),

  /**
   * Update an existing patient
   */
  update: (id: string, data: UpdatePatientInput) =>
    api.patch<Patient>(`/patients/${id}`, data),

  /**
   * Delete a patient
   */
  delete: (id: string) => api.delete(`/patients/${id}`),
};
