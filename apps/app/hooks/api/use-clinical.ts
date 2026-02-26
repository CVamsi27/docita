import { useMutation } from "@tanstack/react-query";
import {
  ClinicalTemplate,
  CreatePrescriptionInput,
  Document,
  LabTest,
  LabTestOrder,
  Patient,
  Prescription,
  VitalSign,
} from "@workspace/types";
import {
  API_URL,
  useAPIMutation,
  useAPIQuery,
} from "../../lib/api-core";

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
    `/prescriptions${filters ? `?${new URLSearchParams(filters as Record<string, string>).toString()}` : ""}`,
  );

export const usePatientPrescriptions = (
  patientId: string,
  options?: { limit?: number },
  queryOptions?: { enabled?: boolean },
) => {
  const params = new URLSearchParams();
  if (options?.limit) params.append("limit", options.limit.toString());
  const queryString = params.toString();

  return useAPIQuery<{
    items: (Prescription & { patient: Patient })[];
    count: number;
  }>(
    ["prescriptions", "patient", patientId],
    `/patients/${patientId}/prescriptions?${queryString}`,
    queryOptions,
  );
};

export const usePrescription = (id: string) =>
  useAPIQuery<Prescription & { patient: Patient }>(
    ["prescriptions", id],
    `/prescriptions/${id}`,
  );

export const useCreatePrescription = () =>
  useAPIMutation<Prescription, CreatePrescriptionInput>(
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
    "/lab-tests/orders",
  );

export const useLabTestsStats = () =>
  useAPIQuery<{ totalOrders: number; pendingOrders: number }>(
    ["lab-tests", "stats"],
    "/lab-tests/orders/stats",
  );

export const useCreateLabTestOrder = () =>
  useAPIMutation<
    { id: string; status: string },
    {
      patientId: string;
      labTestId: string;
      appointmentId?: string;
      notes?: string;
    }
  >("/lab-tests/orders", "POST", {
    invalidateKeys: [["lab-tests"], ["lab-test-orders"]],
  });

export const useUpdateLabTestOrder = (id: string) =>
  useAPIMutation<
    { id: string; status: string },
    {
      status?: string;
      result?: Record<string, unknown>;
      resultUrl?: string;
      notes?: string;
    }
  >(`/lab-tests/orders/${id}`, "PATCH", {
    invalidateKeys: [["lab-tests"], ["lab-test-orders"]],
  });

export const useLabTestOrders = (filters?: {
  search?: string;
  status?: string;
  date?: string;
}) =>
  useAPIQuery<LabTestOrder[]>(
    ["lab-test-orders", filters || {}],
    `/lab-tests/orders${filters ? `?${new URLSearchParams(filters as Record<string, string>).toString()}` : ""}`,
  );

export const useLabTestStats = () =>
  useAPIQuery<{
    pending: number;
    inProgress: number;
    completed: number;
    urgent: number;
    total: number;
  }>(["lab-test-stats"], "/lab-tests/orders/stats");

export const useLabTestCatalog = () =>
  useAPIQuery<LabTest[]>(["lab-test-catalog"], "/lab-tests/catalog");

export const useDocuments = (filters?: {
  search?: string;
  type?: string;
  patientId?: string;
}) =>
  useAPIQuery<Document[]>(
    ["documents", filters || {}],
    `/documents${filters ? `?${new URLSearchParams(filters as Record<string, string>).toString()}` : ""}`,
  );

export const useDocument = (id: string) =>
  useAPIQuery<Document>(["documents", id], `/documents/${id}`);

export const useTemplates = (filters?: {
  search?: string;
  speciality?: string;
}) =>
  useAPIQuery<ClinicalTemplate[]>(
    ["templates", filters || {}],
    `/clinical/templates${filters ? `?${new URLSearchParams(filters as Record<string, string>).toString()}` : ""}`,
  );

export const useTemplate = (id: string) =>
  useAPIQuery<ClinicalTemplate>(["templates", id], `/clinical/templates/${id}`);

export const useCreateTemplate = () =>
  useAPIMutation<ClinicalTemplate, Partial<ClinicalTemplate>>(
    "/clinical/templates",
    "POST",
    {
      invalidateKeys: [["templates"]],
    },
  );

export const useUpdateTemplate = () =>
  useAPIMutation<ClinicalTemplate, Partial<ClinicalTemplate>>(
    (template) => `/clinical/templates/${(template as ClinicalTemplate).id}`,
    "PATCH",
    {
      invalidateKeys: [["templates"]],
    },
  );

export const useDeleteTemplate = () =>
  useAPIMutation<void, { id: string }>(
    (variables) => `/clinical/templates/${variables.id}`,
    "DELETE",
    {
      invalidateKeys: [["templates"]],
    },
  );

