import { useAPIMutation } from "../core/use-api-mutation";
import { useAPIQuery } from "../core/use-api-query";
// FIXME: remove or substitute: 
import type {
  BulkImportJobStatusResponse,
  BulkImportStartResponse,
  OcrImportCommitRequest,
  OcrImportCommitResponse,
} from "@workspace/types";

export const useProcessOCR = () =>
  useAPIMutation<
    {
      text?: string;
      documentType?: "PRESCRIPTION" | "CASE_SHEET" | "LAB_REPORT" | "GENERAL";
      confidence?: number;
      method?: string;
      message?: string;
      fields?: {
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
        vitals?: {
          bp?: string;
          temp?: string;
          pulse?: string;
          respiratoryRate?: string;
          spO2?: string;
          glucose?: string;
        };
        medications?: Array<{
          name: string;
          dosage: string;
          frequency: string;
          route?: string;
          duration?: string;
        }>;
        fieldConfidence?: Record<string, number>;
      };
      suggestedCorrections?: Record<string, string>;
      firstName?: string;
      lastName?: string;
      age?: string;
      gender?: string;
      phoneNumber?: string;
      diagnosis?: string;
      vitals?: { bp?: string; temp?: string; pulse?: string };
    },
    FormData
  >("/imports/ocr/process", "POST");

export const useOcrCommitImport = () =>
  useAPIMutation<OcrImportCommitResponse, OcrImportCommitRequest>(
    "/imports/ocr/commit",
    "POST",
  );

export const useBulkImportTemplate = (entityType: string) =>
  useAPIQuery<{ template: string; format: string }>(
    ["import-template", entityType],
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
    ["bulk-import-job", jobId ?? ""],
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
        ) {
          return false;
        }
        return 1000;
      },
    },
  );
