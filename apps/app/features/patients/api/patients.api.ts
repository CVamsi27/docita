import { api } from "@/lib/api-client";
import type {
  CreatePatientRequest,
  Patient,
  UpdatePatientRequest,
} from "@workspace/types";
import {
  createPatientRequestSchema,
  listPatientsResponseSchema,
  patientResponseSchema,
  updatePatientRequestSchema,
} from "@workspace/types";

export interface PatientMetricCategoryInput {
  key: string;
  name: string;
  description?: string;
  order?: number;
}

export interface PatientMetricOptionInput {
  value: string;
  label: string;
  order?: number;
}

export interface PatientMetricDefinitionInput {
  categoryId: string;
  key: string;
  label: string;
  valueType: string;
  unit?: string;
  cardinality?: string;
  scope?: string;
  isTrackedByDefault?: boolean;
  isPatientScoped?: boolean;
  order?: number;
  options?: PatientMetricOptionInput[];
}

export interface UpsertPatientMetricSelectionsInput {
  items: Array<{
    definitionId: string;
    isTracked: boolean;
  }>;
}

export interface RecordPatientMetricValueInput {
  definitionId: string;
  appointmentId?: string;
  recordedAt?: string;
  source?: string;
  notes?: string;
  valueString?: string;
  valueNumber?: number;
  valueBoolean?: boolean;
  valueDate?: string;
  valueJson?: Record<string, unknown>;
  optionId?: string;
  optionIds?: string[];
}

export interface PatientMetricHistoryQuery {
  categoryId?: string;
  definitionId?: string;
  from?: string;
  to?: string;
  limit?: number;
}

export const patientsApi = {
  getAll: (params?: {
    limit?: number;
    page?: number;
    search?: string;
    cursor?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.cursor) searchParams.set("cursor", params.cursor);
    if (params?.search) searchParams.set("search", params.search);
    const query = searchParams.toString();
    return api
      .get<{
        items: Patient[];
        nextCursor?: string;
        hasMore?: boolean;
        count?: number;
        total?: number;
      }>(`/patients${query ? `?${query}` : ""}`)
      .then((response) => {
        const total =
          typeof response.count === "number"
            ? response.count
            : typeof response.total === "number"
              ? response.total
              : response.items.length;
        const effectiveLimit = params?.limit ?? 20;
        const currentPage = params?.page ?? 1;
        const hasMore =
          typeof response.hasMore === "boolean"
            ? response.hasMore
            : currentPage * effectiveLimit < total;

        const normalized = {
          items: response.items,
          total,
        };

        const parsed = listPatientsResponseSchema.parse(normalized);

        return {
          ...response,
          items: parsed.items,
          hasMore,
          total: parsed.total,
          count: total,
        };
      });
  },

  getById: (id: string) =>
    api.get<Patient>(`/patients/${id}`).then((response) => {
      return patientResponseSchema.parse(response);
    }),

  getMedicalHistory: (id: string) =>
    api.get(`/patients/${id}/medical-history-timeline`),

  getMetricCategories: (id: string) =>
    api.get(`/patients/${id}/metrics/categories`),

  createMetricCategory: (id: string, data: PatientMetricCategoryInput) =>
    api.post(`/patients/${id}/metrics/categories`, data),

  createMetricDefinition: (id: string, data: PatientMetricDefinitionInput) =>
    api.post(`/patients/${id}/metrics/definitions`, data),

  getSelectedMetrics: (id: string) => api.get(`/patients/${id}/metrics/selected`),

  updateSelectedMetrics: (
    id: string,
    data: UpsertPatientMetricSelectionsInput,
  ) => api.put(`/patients/${id}/metrics/selected`, data),

  recordMetricValue: (id: string, data: RecordPatientMetricValueInput) =>
    api.post(`/patients/${id}/metrics/values`, data),

  getMetricHistory: (id: string, query?: PatientMetricHistoryQuery) => {
    const searchParams = new URLSearchParams();
    if (query?.categoryId) searchParams.set("categoryId", query.categoryId);
    if (query?.definitionId)
      searchParams.set("definitionId", query.definitionId);
    if (query?.from) searchParams.set("from", query.from);
    if (query?.to) searchParams.set("to", query.to);
    if (query?.limit) searchParams.set("limit", String(query.limit));
    const queryString = searchParams.toString();
    return api.get(
      `/patients/${id}/metrics/history${queryString ? `?${queryString}` : ""}`,
    );
  },

  create: (data: CreatePatientRequest) =>
    api
      .post<Patient>(
        "/patients",
        createPatientRequestSchema.parse(data),
      )
      .then((response) => {
        return patientResponseSchema.parse(response);
      }),

  update: (id: string, data: UpdatePatientRequest) =>
    api
      .patch<Patient>(`/patients/${id}`, updatePatientRequestSchema.parse(data))
      .then((response) => {
        return patientResponseSchema.parse(response);
      }),

  delete: (id: string) => api.delete(`/patients/${id}`),
};
