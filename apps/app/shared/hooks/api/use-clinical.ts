"use client";

import { useMutation, type UseQueryOptions } from "@tanstack/react-query";
import {
  CreateLabTestOrderRequest,
  CreatePrescriptionRequest,
  CreateTemplateRequest,
  Document,
  DocumentContractResponse,
  enqueuePdfJobResponseSchema,
  Feature,
  LabTest,
  LabTestOrder,
  ListDocumentsContractQuery,
  ListTemplatesContractQuery,
  Patient,
  pdfJobStatusResponseSchema,
  Prescription,
  TemplateContractResponse,
  UpdateLabTestOrderRequest,
  UpdateTemplateRequest,
  VitalSign,
} from "@workspace/types";
import { useAPIMutation, useAPIQuery } from "@/lib/api/api-core";
import { useTierFeatureEnabled } from "@/hooks/api/tier-feature-guards";
import type { ApiError } from "@/lib/errors";
import { withQueryString } from "@/lib/http/query-string";
import { api } from "@/lib/api/api-client";

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 60000;

export const useVitalSigns = (patientId: string) => {
  const tierPatientsOk = useDataAccessContext().isTierFeatureEnabled(
    Feature.BASIC_PATIENT_MANAGEMENT,
  );
  return useAPIQuery<VitalSign[]>(
    queryKeys.clinical.vitals.patient(patientId),
    `/patients/${patientId}/vitals`,
    { enabled: tierPatientsOk && !!patientId },
  );
};

export const useSaveVitals = (appointmentId: string) =>
  useAPIMutation<VitalSign, Partial<VitalSign>>(
    `/appointments/${appointmentId}/vitals`,
    "POST",
    {
      invalidateKeys: [queryKeys.clinical.vitals.all()],
    },
  );

type PrescriptionListRow = Prescription & { patient: Patient };

export const usePrescriptions = (
  filters?: {
    search?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
    patientId?: string;
    limit?: number;
  },
  options?: Omit<
    UseQueryOptions<PrescriptionListRow[], APIRequestError>,
    "queryKey" | "queryFn"
  >,
) =>
  useAPIQuery<PrescriptionListRow[], APIRequestError>(
    queryKeys.prescriptions.list(filters),
    withQueryString("/prescriptions", filters),
    { gcTime: 5 * 60 * 1000, ...options },
  );

export const usePatientPrescriptions = (
  patientId: string,
  options?: { limit?: number },
  queryOptions?: { enabled?: boolean },
) => {
  return useAPIQuery<(Prescription & { patient: Patient })[]>(
    queryKeys.prescriptions.byPatient(patientId),
    withQueryString("/prescriptions", {
      patientId,
      limit: options?.limit,
    }),
    queryOptions,
  );
};

export const usePrescription = (id: string) =>
  useAPIQuery<Prescription & { patient: Patient }>(
    queryKeys.prescriptions.detail(id),
    `/prescriptions/${id}`,
  );

export const useCreatePrescription = () =>
  useAPIMutation<Prescription, CreatePrescriptionRequest>(
    "/prescriptions",
    "POST",
    {
      invalidateKeys: [queryKeys.prescriptions.all()],
    },
  );

export const useUpdatePrescription = (id: string) =>
  useAPIMutation<Prescription, Partial<Prescription>>(
    `/prescriptions/${id}`,
    "PATCH",
    {
      invalidateKeys: [
        queryKeys.prescriptions.all(),
        queryKeys.prescriptions.detail(id),
      ],
    },
  );

export const useDeletePrescription = (id: string) =>
  useAPIMutation<void, void>(`/prescriptions/${id}`, "DELETE", {
    invalidateKeys: [queryKeys.prescriptions.all()],
  });

export const useDownloadPrescriptionPDF = () => {
  const fetcher = useDataAccessFetcher();
  return useMutation({
    mutationFn: async (prescriptionId: string) => {
      const enqueueResponse = await fetcher<unknown>(
        `/prescriptions/${prescriptionId}/pdf?async=true`,
      );
      const { jobId } = enqueuePdfJobResponseSchema.parse(enqueueResponse);

      const deadline = Date.now() + POLL_TIMEOUT_MS;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        const statusResponse = await fetcher<unknown>(
          `/prescriptions/${prescriptionId}/pdf/status?jobId=${jobId}`,
        );
        const status = pdfJobStatusResponseSchema.parse(statusResponse);

        if (status.status === "COMPLETED" && status.pdfUrl) {
          if (typeof window !== "undefined") {
            window.open(status.pdfUrl, "_blank");
          }
          return;
        }

        if (status.status === "FAILED") {
          throw new Error("PDF generation failed");
        }
      }

      throw new Error("PDF generation timed out");
    },
  });
};

export const useLabTests = () => {
  const labOk = useDataAccessContext().isTierFeatureEnabled(Feature.LAB_TESTS);
  return useAPIQuery<{ id: string; status: string; createdAt: Date }[]>(
    queryKeys.clinical.labTests.orders(),
    "/clinical/lab-tests/orders",
    { enabled: labOk },
  );
};

export const useLabTestsStats = () => {
  const labOk = useDataAccessContext().isTierFeatureEnabled(Feature.LAB_TESTS);
  return useAPIQuery<{ totalOrders: number; pendingOrders: number }>(
    queryKeys.clinical.labTests.stats(),
    "/clinical/lab-tests/stats",
    { enabled: labOk },
  );
};

export const useCreateLabTestOrder = () =>
  useAPIMutation<
    { id: string; status: string },
    CreateLabTestOrderRequest
  >("/clinical/lab-tests/orders", "POST", {
    invalidateKeys: [
      queryKeys.clinical.labTests.orders(),
      queryKeys.clinical.labTests.ordersInvalidation(),
    ],
  });

export const useUpdateLabTestOrder = (id: string) =>
  useAPIMutation<
    { id: string; status: string },
    UpdateLabTestOrderRequest
  >(`/clinical/lab-tests/orders/${id}/status`, "PUT", {
    invalidateKeys: [
      queryKeys.clinical.labTests.orders(),
      queryKeys.clinical.labTests.ordersInvalidation(),
    ],
  });

export const useLabTestOrders = (filters?: {
  search?: string;
  status?: string;
  date?: string;
  patientId?: string;
}) => {
  const labOk = useDataAccessContext().isTierFeatureEnabled(Feature.LAB_TESTS);
  return useAPIQuery<LabTestOrder[]>(
    queryKeys.clinical.labTests.ordersList(filters),
    withQueryString("/clinical/lab-tests/orders", filters),
    { enabled: labOk },
  );
};

export const useLabTestStats = () => {
  const labOk = useDataAccessContext().isTierFeatureEnabled(Feature.LAB_TESTS);
  return useAPIQuery<{
    pending: number;
    inProgress: number;
    completed: number;
    urgent: number;
    total: number;
  }>(queryKeys.clinical.labTests.statsDashboard(), "/clinical/lab-tests/stats", {
    enabled: labOk,
  });
};

export const useLabTestCatalog = () => {
  const labOk = useDataAccessContext().isTierFeatureEnabled(Feature.LAB_TESTS);
  return useAPIQuery<LabTest[]>(
    queryKeys.clinical.labTests.catalog(),
    "/clinical/lab-tests",
    { enabled: labOk },
  );
};

export const useDocuments = (filters?: ListDocumentsContractQuery) => {
  const docsOk = useDataAccessContext().isTierFeatureEnabled(
    Feature.DOCUMENT_ARCHIVAL,
  );
  return useAPIQuery<DocumentContractResponse[]>(
    queryKeys.clinical.documents.list(filters),
    withQueryString("/medical-documents", filters),
    { enabled: docsOk },
  );
};

export const useDocument = (id: string) => {
  const docsOk = useDataAccessContext().isTierFeatureEnabled(
    Feature.DOCUMENT_ARCHIVAL,
  );
  return useAPIQuery<Document>(
    queryKeys.clinical.documents.detail(id),
    `/medical-documents/${id}`,
    {
      enabled: docsOk && id.length > 0,
    },
  );
};

/**
 * `/medical-documents` is a separate domain from `/documents` (general uploads):
 * sign/revoke workflow for clinical certificates and notes. Type lives here
 * since the backend hasn't published a Zod schema for it yet.
 */
export interface MedicalDocument {
  id: string;
  type: string;
  title: string;
  status: string;
  createdAt: string;
  signedAt?: string;
  validFrom?: string;
  validUntil?: string;
  pdfUrl?: string | null;
}

export interface CreateMedicalDocumentInput {
  type: string;
  patientId: string;
  title: string;
  content: Record<string, unknown>;
  doctorId: string;
  pdfUrl?: string;
}

export const useMedicalDocuments = (patientId: string) => {
  const docsOk = useDataAccessContext().isTierFeatureEnabled(
    Feature.DOCUMENT_ARCHIVAL,
  );
  return useAPIQuery<MedicalDocument[]>(
    queryKeys.clinical.medicalDocuments.byPatient(patientId),
    withQueryString("/medical-documents", { patientId }),
    { enabled: docsOk && patientId.length > 0 },
  );
};

export const useSignMedicalDocument = () =>
  useAPIMutation<MedicalDocument, string>(
    (id) => `/medical-documents/${id}/sign`,
    "PATCH",
    {
      invalidateKeys: [queryKeys.clinical.medicalDocuments.all()],
      body: () => ({}),
    },
  );

export const useRevokeMedicalDocument = () =>
  useAPIMutation<MedicalDocument, string>(
    (id) => `/medical-documents/${id}/revoke`,
    "PATCH",
    {
      invalidateKeys: [queryKeys.clinical.medicalDocuments.all()],
      body: () => ({}),
    },
  );

export const useCreateMedicalDocument = () =>
  useAPIMutation<MedicalDocument, CreateMedicalDocumentInput>(
    "/medical-documents",
    "POST",
    { invalidateKeys: [queryKeys.clinical.medicalDocuments.all()] },
  );

export const useTemplates = (filters?: ListTemplatesContractQuery) =>
  useAPIQuery<TemplateContractResponse[]>(
    queryKeys.clinical.templates.list(filters),
    withQueryString("/templates", filters),
  );

export const useTemplate = (id: string) =>
  useAPIQuery<TemplateContractResponse>(
    queryKeys.clinical.templates.detail(id),
    `/templates/${id}`,
  );

export const useCreateTemplate = () =>
  useAPIMutation<TemplateContractResponse, CreateTemplateRequest>(
    "/templates",
    "POST",
    {
      invalidateKeys: [queryKeys.clinical.templates.all()],
    },
  );

export const useUpdateTemplate = () =>
  useAPIMutation<TemplateContractResponse, UpdateTemplateRequest & { id: string }>(
    (template) => `/templates/${template.id}`,
    "PATCH",
    {
      body: ({ id: _id, ...body }) => body,
      invalidateKeys: [["templates"]],
    },
  );

export const useDeleteTemplate = () =>
  useAPIMutation<void, { id: string }>(
    (variables) => `/templates/${variables.id}`,
    "DELETE",
    {
      body: () => undefined,
      invalidateKeys: [["templates"]],
    },
  );
