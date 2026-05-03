import { api } from "@/lib/api-client";
import type {
  CreateMedicalConditionInput,
  CreateMetricCategoryInput,
  CreateMetricDefinitionInput,
  CreatePatientAllergyInput,
  CreatePatientFamilyHistoryInput,
  CreatePatientMetricValueInput,
  CreatePatientRequest,
  CreatePatientSocialHistoryInput,
  CreatePatientSurgicalHistoryInput,
  MetricCategoryResponse,
  MetricDefinitionResponse,
  MetricHistoryQueryInput,
  MetricHistoryResponse,
  Patient,
  PatientAllergy,
  PatientFamilyHistory,
  PatientMedicalCondition,
  PatientSocialHistory,
  PatientSurgicalHistory,
  UpdateMedicalConditionInput,
  UpdatePatientAllergyInput,
  UpdatePatientFamilyHistoryInput,
  UpdatePatientRequest,
  UpdatePatientSurgicalHistoryInput,
  UpsertMetricSelectionsInput,
} from "@workspace/types";
import {
  createMedicalConditionSchema,
  createMetricCategorySchema,
  createMetricDefinitionSchema,
  createPatientAllergySchema,
  createPatientFamilyHistorySchema,
  createPatientMetricValueSchema,
  createPatientRequestSchema,
  createPatientSocialHistorySchema,
  createPatientSurgicalHistorySchema,
  listPatientsResponseSchema,
  metricCategoryResponseSchema,
  metricDefinitionResponseSchema,
  metricHistoryQuerySchema,
  metricHistoryResponseSchema,
  metricRecordResponseSchema,
  patientResponseSchema,
  updateMedicalConditionSchema,
  updatePatientAllergySchema,
  updatePatientFamilyHistorySchema,
  updatePatientRequestSchema,
  updatePatientSurgicalHistorySchema,
  upsertMetricSelectionsSchema,
} from "@workspace/types";

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

  getMedicalHistory: (id: string) => api.get(`/patients/${id}/timeline`),

  getMetricCategories: (id: string) =>
    api
      .get<MetricCategoryResponse[]>(`/patients/${id}/metrics/categories`)
      .then((response) =>
        response.map((category) =>
          metricCategoryResponseSchema.parse(category),
        ),
      ),

  createMetricCategory: (id: string, data: CreateMetricCategoryInput) =>
    api
      .post(
        `/patients/${id}/metrics/categories`,
        createMetricCategorySchema.parse(data),
      )
      .then((response) => metricCategoryResponseSchema.parse(response)),

  createMetricDefinition: (id: string, data: CreateMetricDefinitionInput) =>
    api
      .post(
        `/patients/${id}/metrics/definitions`,
        createMetricDefinitionSchema.parse(data),
      )
      .then((response) => metricDefinitionResponseSchema.parse(response)),

  getSelectedMetrics: (id: string) =>
    api
      .get<MetricDefinitionResponse[]>(`/patients/${id}/metrics/selected`)
      .then((response) =>
        response.map((definition) =>
          metricDefinitionResponseSchema.parse(definition),
        ),
      ),

  updateSelectedMetrics: (id: string, data: UpsertMetricSelectionsInput) =>
    api
      .put(
        `/patients/${id}/metrics/selected`,
        upsertMetricSelectionsSchema.parse(data),
      )
      .then((response) =>
        (response as MetricDefinitionResponse[]).map((definition) =>
          metricDefinitionResponseSchema.parse(definition),
        ),
      ),

  recordMetricValue: (id: string, data: CreatePatientMetricValueInput) =>
    api
      .post(
        `/patients/${id}/metrics/values`,
        createPatientMetricValueSchema.parse(data),
      )
      .then((response) => metricRecordResponseSchema.parse(response)),

  getMetricHistory: (id: string, query?: MetricHistoryQueryInput) => {
    const parsedQuery = query
      ? metricHistoryQuerySchema.parse(query)
      : undefined;
    const searchParams = new URLSearchParams();
    if (parsedQuery?.categoryId)
      searchParams.set("categoryId", parsedQuery.categoryId);
    if (parsedQuery?.definitionId)
      searchParams.set("definitionId", parsedQuery.definitionId);
    if (parsedQuery?.from) searchParams.set("from", parsedQuery.from);
    if (parsedQuery?.to) searchParams.set("to", parsedQuery.to);
    if (parsedQuery?.limit)
      searchParams.set("limit", String(parsedQuery.limit));
    const queryString = searchParams.toString();
    return api
      .get<MetricHistoryResponse>(
        `/patients/${id}/metrics/history${queryString ? `?${queryString}` : ""}`,
      )
      .then((response) => metricHistoryResponseSchema.parse(response));
  },

  create: (data: CreatePatientRequest) =>
    api
      .post<Patient>("/patients", createPatientRequestSchema.parse(data))
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

  createCondition: (
    patientId: string,
    data: CreateMedicalConditionInput,
  ): Promise<PatientMedicalCondition> =>
    api.post<PatientMedicalCondition>(
      `/patients/${patientId}/medical-history/conditions`,
      createMedicalConditionSchema.parse(data),
    ),

  updateCondition: (
    patientId: string,
    conditionId: string,
    data: UpdateMedicalConditionInput,
  ): Promise<PatientMedicalCondition> =>
    api.patch<PatientMedicalCondition>(
      `/patients/${patientId}/medical-history/conditions/${conditionId}`,
      updateMedicalConditionSchema.parse(data),
    ),

  deleteCondition: (patientId: string, conditionId: string): Promise<void> =>
    api.delete(
      `/patients/${patientId}/medical-history/conditions/${conditionId}`,
    ),

  createAllergy: (
    patientId: string,
    data: CreatePatientAllergyInput,
  ): Promise<PatientAllergy> =>
    api.post<PatientAllergy>(
      `/patients/${patientId}/medical-history/allergies`,
      createPatientAllergySchema.parse(data),
    ),

  updateAllergy: (
    patientId: string,
    allergyId: string,
    data: UpdatePatientAllergyInput,
  ): Promise<PatientAllergy> =>
    api.patch<PatientAllergy>(
      `/patients/${patientId}/medical-history/allergies/${allergyId}`,
      updatePatientAllergySchema.parse(data),
    ),

  deleteAllergy: (patientId: string, allergyId: string): Promise<void> =>
    api.delete(
      `/patients/${patientId}/medical-history/allergies/${allergyId}`,
    ),

  createSurgicalHistory: (
    patientId: string,
    data: CreatePatientSurgicalHistoryInput,
  ): Promise<PatientSurgicalHistory> =>
    api.post<PatientSurgicalHistory>(
      `/patients/${patientId}/medical-history/surgical`,
      createPatientSurgicalHistorySchema.parse(data),
    ),

  updateSurgicalHistory: (
    patientId: string,
    surgicalId: string,
    data: UpdatePatientSurgicalHistoryInput,
  ): Promise<PatientSurgicalHistory> =>
    api.patch<PatientSurgicalHistory>(
      `/patients/${patientId}/medical-history/surgical/${surgicalId}`,
      updatePatientSurgicalHistorySchema.parse(data),
    ),

  deleteSurgicalHistory: (
    patientId: string,
    surgicalId: string,
  ): Promise<void> =>
    api.delete(
      `/patients/${patientId}/medical-history/surgical/${surgicalId}`,
    ),

  createFamilyHistory: (
    patientId: string,
    data: CreatePatientFamilyHistoryInput,
  ): Promise<PatientFamilyHistory> =>
    api.post<PatientFamilyHistory>(
      `/patients/${patientId}/medical-history/family`,
      createPatientFamilyHistorySchema.parse(data),
    ),

  updateFamilyHistory: (
    patientId: string,
    familyId: string,
    data: UpdatePatientFamilyHistoryInput,
  ): Promise<PatientFamilyHistory> =>
    api.patch<PatientFamilyHistory>(
      `/patients/${patientId}/medical-history/family/${familyId}`,
      updatePatientFamilyHistorySchema.parse(data),
    ),

  deleteFamilyHistory: (patientId: string, familyId: string): Promise<void> =>
    api.delete(
      `/patients/${patientId}/medical-history/family/${familyId}`,
    ),

  upsertSocialHistory: (
    patientId: string,
    data: CreatePatientSocialHistoryInput,
  ): Promise<PatientSocialHistory> =>
    api.post<PatientSocialHistory>(
      `/patients/${patientId}/medical-history/social`,
      createPatientSocialHistorySchema.parse(data),
    ),
};
