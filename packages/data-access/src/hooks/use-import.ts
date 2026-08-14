import { queryKeys } from "../lib/query-keys-clinician";
import { useAPIMutation } from "../core/use-api-mutation";
import { useAPIQuery } from "../core/use-api-query";
import type {
  BulkImportJobStatusResponse,
  BulkImportStartResponse,
  OcrImportCommitRequest,
  OcrImportCommitResponse,
} from "@workspace/types";

export interface ProcessOcrMedication {
  name: string;
  dosage: string;
  frequency: string;
  route?: string;
  duration?: string;
}

export interface ProcessOcrVitals {
  bp?: string;
  temp?: string;
  pulse?: string;
  respiratoryRate?: string;
  spO2?: string;
  glucose?: string;
}

export interface ProcessOcrInvoiceItem {
  description?: string;
  quantity?: number | string;
  unitPrice?: number | string;
  total?: number | string;
}

export interface ProcessOcrInvoice {
  total?: number | string | null;
  tax?: number | string | null;
  subtotal?: number | string | null;
  items?: ProcessOcrInvoiceItem[];
}

export interface ProcessOcrFields {
  firstName?: string;
  lastName?: string;
  age?: string;
  gender?: string;
  phoneNumber?: string;
  email?: string;
  bloodType?: string;
  diagnosis?: string;
  symptoms?: string[];
  allergies?: string[];
  medicalHistory?: string[];
  vitals?: ProcessOcrVitals;
  medications?: ProcessOcrMedication[];
  fieldConfidence?: Record<string, number>;
  invoice?: ProcessOcrInvoice;
}

export interface ProcessOcrResponse {
  text?: string;
  documentType?: "PRESCRIPTION" | "CASE_SHEET" | "LAB_REPORT" | "GENERAL";
  confidence?: number;
  method?: string;
  message?: string;
  fields?: ProcessOcrFields;
  suggestedCorrections?: Record<string, string>;
  firstName?: string;
  lastName?: string;
  age?: string;
  gender?: string;
  phoneNumber?: string;
  diagnosis?: string;
  vitals?: Pick<ProcessOcrVitals, "bp" | "temp" | "pulse">;
}

export const useProcessOCR = () =>
  useAPIMutation<ProcessOcrResponse, FormData>("/imports/ocr/process", "POST");

export const useOcrCommitImport = () =>
  useAPIMutation<OcrImportCommitResponse, OcrImportCommitRequest>(
    "/imports/ocr/commit",
    "POST",
  );

export const useBulkImportTemplate = (entityType: string) =>
  useAPIQuery<{ template: string; format: string }>(
    queryKeys.importJobs.template(entityType),
    `/imports/template?entityType=${entityType}`,
    { staleTime: 1000 * 60 * 60 },
  );

export const useBulkImport = () =>
  useAPIMutation<
    BulkImportStartResponse,
    {
      entityType: string;
      fileName: string;
      fileBase64: string;
      dpdpAttestation?: { confirmedByOperator: true; noticeVersion: string };
    }
  >("/imports/bulk", "POST");

export const useBulkImportJobStatus = (jobId: string | null) =>
  useAPIQuery<BulkImportJobStatusResponse>(
    queryKeys.importJobs.bulkJob(jobId ?? ""),
    `/imports/bulk/${jobId ?? "pending"}`,
    {
      enabled: !!jobId,
      staleTime: 0,
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        if (
          status === "COMPLETED" ||
          status === "FAILED" ||
          status === "PARTIALLY_COMPLETED"
        ) return false;
        return 1000;
      },
    },
  );
