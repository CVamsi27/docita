import { useMutation } from "@tanstack/react-query";
import {
  CreateLabTestOrderRequest,
  CreatePrescriptionRequest,
  CreateTemplateRequest,
  Document,
  DocumentContractResponse,
  LabTest,
  LabTestOrder,
  ListDocumentsContractQuery,
  ListTemplatesContractQuery,
  Patient,
  Prescription,
  TemplateContractResponse,
  UpdateLabTestOrderRequest,
  UpdateTemplateRequest,
  VitalSign,
} from "@workspace/types";
import {
  API_URL,
  useAPIMutation,
  useAPIQuery,
} from "@/lib/api-core";
import { withQueryString } from "@/lib/http/query-string";

export const useVitalSigns = (patientId: string) =>
  useAPIQuery<VitalSign[]>(
    ["vitals", patientId],
    `/patients/${patientId}/vitals`,
    { enabled: !!patientId },
  );

export const useSaveVitals = (appointmentId: string) =>
  useAPIMutation<VitalSign, Partial<VitalSign>>(
    `/appointments/${appointmentId}/vitals`,
    "POST",
    {
      invalidateKeys: [["vitals"]],
    },
  );

export const usePrescriptions = (filters?: {
  search?: string;
  date?: string;
}) =>
  useAPIQuery<(Prescription & { patient: Patient })[]>(
    ["prescriptions", filters || {}],
    withQueryString("/prescriptions", filters),
  );

export const usePatientPrescriptions = (
  patientId: string,
  options?: { limit?: number },
  queryOptions?: { enabled?: boolean },
) => {
  return useAPIQuery<{
    items: (Prescription & { patient: Patient })[];
    count: number;
  }>(
    ["prescriptions", "patient", patientId],
    withQueryString(`/patients/${patientId}/prescriptions`, {
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
      const token = localStorage.getItem("docita_token");
      const response = await fetch(
        `${API_URL}/prescriptions/${prescriptionId}/pdf`,
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
          },
        },
      );
      if (!response.ok) {
        throw new Error(`Failed to download PDF: ${response.statusText}`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `prescription-${prescriptionId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
  });
};

export const useLabTests = () =>
  useAPIQuery<{ id: string; status: string; createdAt: Date }[]>(
    ["lab-tests"],
    "/clinical/lab-tests/orders",
  );

export const useLabTestsStats = () =>
  useAPIQuery<{ totalOrders: number; pendingOrders: number }>(
    ["lab-tests", "stats"],
    "/clinical/lab-tests/stats",
  );

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
}) =>
  useAPIQuery<LabTestOrder[]>(
    ["lab-test-orders", filters || {}],
    withQueryString("/clinical/lab-tests/orders", filters),
  );

export const useLabTestStats = () =>
  useAPIQuery<{
    pending: number;
    inProgress: number;
    completed: number;
    urgent: number;
    total: number;
  }>(["lab-test-stats"], "/clinical/lab-tests/stats");

export const useLabTestCatalog = () =>
  useAPIQuery<LabTest[]>(["lab-test-catalog"], "/clinical/lab-tests");

export const useDocuments = (filters?: ListDocumentsContractQuery) =>
  useAPIQuery<DocumentContractResponse[]>(
    ["documents", filters || {}],
    withQueryString("/medical-documents", filters),
  );

export const useDocument = (id: string) =>
  useAPIQuery<Document>(["documents", id], `/medical-documents/${id}`);

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
      invalidateKeys: [["templates"]],
    },
  );

export const useDeleteTemplate = () =>
  useAPIMutation<void, { id: string }>(
    (variables) => `/templates/${variables.id}`,
    "DELETE",
    {
      invalidateKeys: [["templates"]],
    },
  );
