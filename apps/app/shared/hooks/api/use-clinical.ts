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
  const tierPatientsOk = useTierFeatureEnabled(Feature.BASIC_PATIENT_MANAGEMENT);
  return useAPIQuery<VitalSign[]>(
    ["vitals", patientId],
    `/patients/${patientId}/vitals`,
    { enabled: tierPatientsOk && !!patientId },
  );
};

export const useSaveVitals = (appointmentId: string) =>
  useAPIMutation<VitalSign, Partial<VitalSign>>(
    `/appointments/${appointmentId}/vitals`,
    "POST",
    {
      invalidateKeys: [["vitals"]],
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
    UseQueryOptions<PrescriptionListRow[], ApiError>,
    "queryKey" | "queryFn"
  >,
) =>
  useAPIQuery<PrescriptionListRow[]>(
    ["prescriptions", filters || {}],
    withQueryString("/prescriptions", filters),
    { gcTime: 5 * 60 * 1000, ...options },
  );

export const usePatientPrescriptions = (
  patientId: string,
  options?: { limit?: number },
  queryOptions?: { enabled?: boolean },
) => {
  return useAPIQuery<(Prescription & { patient: Patient })[]>(
    ["prescriptions", "patient", patientId],
    withQueryString("/prescriptions", {
      patientId,
      limit: options?.limit,
    }),
    queryOptions,
  );
};

export const usePrescription = (id: string) =>
  useAPIQuery<Prescription & { patient: Patient }>(
    ["prescriptions", id],
    `/prescriptions/${id}`,
  );

export const useCreatePrescription = () =>
  useAPIMutation<Prescription, CreatePrescriptionRequest>(
    "/prescriptions",
    "POST",
    {
      invalidateKeys: [["prescriptions"]],
    },
  );

export const useUpdatePrescription = (id: string) =>
  useAPIMutation<Prescription, Partial<Prescription>>(
    `/prescriptions/${id}`,
    "PATCH",
    {
      invalidateKeys: [["prescriptions"], ["prescriptions", id]],
    },
  );

export const useDeletePrescription = (id: string) =>
  useAPIMutation<void, void>(`/prescriptions/${id}`, "DELETE", {
    invalidateKeys: [["prescriptions"]],
  });

export const useDownloadPrescriptionPDF = () => {
  return useMutation({
    mutationFn: async (prescriptionId: string) => {
      const enqueueResponse = await api.get(
        `/prescriptions/${prescriptionId}/pdf?async=true`,
      );
      const { jobId } = enqueuePdfJobResponseSchema.parse(enqueueResponse);

      const deadline = Date.now() + POLL_TIMEOUT_MS;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        const statusResponse = await api.get(
          `/prescriptions/${prescriptionId}/pdf/status?jobId=${jobId}`,
        );
        const status = pdfJobStatusResponseSchema.parse(statusResponse);

        if (status.status === "COMPLETED" && status.pdfUrl) {
          window.open(status.pdfUrl, "_blank");
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
  const labOk = useTierFeatureEnabled(Feature.LAB_TESTS);
  return useAPIQuery<{ id: string; status: string; createdAt: Date }[]>(
    ["lab-tests"],
    "/clinical/lab-tests/orders",
    { enabled: labOk },
  );
};

export const useLabTestsStats = () => {
  const labOk = useTierFeatureEnabled(Feature.LAB_TESTS);
  return useAPIQuery<{ totalOrders: number; pendingOrders: number }>(
    ["lab-tests", "stats"],
    "/clinical/lab-tests/stats",
    { enabled: labOk },
  );
};

export const useCreateLabTestOrder = () =>
  useAPIMutation<
    { id: string; status: string },
    CreateLabTestOrderRequest
  >("/clinical/lab-tests/orders", "POST", {
    invalidateKeys: [["lab-tests"], ["lab-test-orders"]],
  });

export const useUpdateLabTestOrder = (id: string) =>
  useAPIMutation<
    { id: string; status: string },
    UpdateLabTestOrderRequest
  >(`/clinical/lab-tests/orders/${id}/status`, "PUT", {
    invalidateKeys: [["lab-tests"], ["lab-test-orders"]],
  });

export const useLabTestOrders = (filters?: {
  search?: string;
  status?: string;
  date?: string;
  patientId?: string;
}) => {
  const labOk = useTierFeatureEnabled(Feature.LAB_TESTS);
  return useAPIQuery<LabTestOrder[]>(
    ["lab-test-orders", filters || {}],
    withQueryString("/clinical/lab-tests/orders", filters),
    { enabled: labOk },
  );
};

export const useLabTestStats = () => {
  const labOk = useTierFeatureEnabled(Feature.LAB_TESTS);
  return useAPIQuery<{
    pending: number;
    inProgress: number;
    completed: number;
    urgent: number;
    total: number;
  }>(["lab-test-stats"], "/clinical/lab-tests/stats", { enabled: labOk });
};

export const useLabTestCatalog = () => {
  const labOk = useTierFeatureEnabled(Feature.LAB_TESTS);
  return useAPIQuery<LabTest[]>(["lab-test-catalog"], "/clinical/lab-tests", {
    enabled: labOk,
  });
};

export const useDocuments = (filters?: ListDocumentsContractQuery) => {
  const docsOk = useTierFeatureEnabled(Feature.DOCUMENT_ARCHIVAL);
  return useAPIQuery<DocumentContractResponse[]>(
    ["documents", filters || {}],
    withQueryString("/medical-documents", filters),
    { enabled: docsOk },
  );
};

export const useDocument = (id: string) => {
  const docsOk = useTierFeatureEnabled(Feature.DOCUMENT_ARCHIVAL);
  return useAPIQuery<Document>(["documents", id], `/medical-documents/${id}`, {
    enabled: docsOk && id.length > 0,
  });
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
  const docsOk = useTierFeatureEnabled(Feature.DOCUMENT_ARCHIVAL);
  return useAPIQuery<MedicalDocument[]>(
    ["medical-documents", patientId],
    `/medical-documents?patientId=${patientId}`,
    { enabled: docsOk && patientId.length > 0 },
  );
};

export const useSignMedicalDocument = () =>
  useAPIMutation<MedicalDocument, string>(
    (id) => `/medical-documents/${id}/sign`,
    "PATCH",
    { invalidateKeys: [["medical-documents"]], body: () => ({}) },
  );

export const useRevokeMedicalDocument = () =>
  useAPIMutation<MedicalDocument, string>(
    (id) => `/medical-documents/${id}/revoke`,
    "PATCH",
    { invalidateKeys: [["medical-documents"]], body: () => ({}) },
  );

export const useCreateMedicalDocument = () =>
  useAPIMutation<MedicalDocument, CreateMedicalDocumentInput>(
    "/medical-documents",
    "POST",
    { invalidateKeys: [["medical-documents"]] },
  );

export const useTemplates = (filters?: ListTemplatesContractQuery) =>
  useAPIQuery<TemplateContractResponse[]>(
    ["templates", filters || {}],
    withQueryString("/templates", filters),
  );

export const useTemplate = (id: string) =>
  useAPIQuery<TemplateContractResponse>(["templates", id], `/templates/${id}`);

export const useCreateTemplate = () =>
  useAPIMutation<TemplateContractResponse, CreateTemplateRequest>(
    "/templates",
    "POST",
    {
      invalidateKeys: [["templates"]],
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
